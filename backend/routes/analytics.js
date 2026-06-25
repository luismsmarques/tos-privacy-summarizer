import express from 'express';
import db from '../utils/database.js';
import authService from '../utils/auth.js';
import auditLogger from '../utils/audit-logger.js';

const router = express.Router(); 

// Middleware para logging de requests (desabilitado temporariamente)
router.use(async (req, res, next) => {
  // Skip logging for now to avoid connection issues
  next();
});

// Endpoint de debug para verificar conexão
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Debug endpoint chamado');
    
    // Verificar variáveis de ambiente
    const envCheck = {
      ANALYTICS_URL: process.env.ANALYTICS_URL ? 'Configurada' : 'Não configurada',
      DATABASE_URL: process.env.DATABASE_URL ? 'Configurada' : 'Não configurada',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    };
    
    // Tentar conectar à base de dados
    let dbStatus = 'Desconectada';
    let dbError = null;
    
    try {
      if (!db.isConnected) {
        const connected = await db.connect();
        dbStatus = connected ? 'Conectada' : 'Falha na conexão';
      } else {
        dbStatus = 'Já conectada';
      }
    } catch (error) {
      dbStatus = 'Erro na conexão';
      dbError = error.message;
    }
    
    // Tentar uma query simples
    let queryTest = 'Não testado';
    let queryError = null;
    
    try {
      const result = await db.query('SELECT 1 as test');
      queryTest = 'Sucesso: ' + JSON.stringify(result.rows[0]);
    } catch (error) {
      queryTest = 'Falha';
      queryError = error.message;
    }
    
    res.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        environment: envCheck,
        database: {
          status: dbStatus,
          error: dbError,
          queryTest: queryTest,
          queryError: queryError
        }
      }
    });
  } catch (error) {
    console.error('Erro no debug:', error);
    res.status(500).json({
      success: false,
      error: 'Erro no debug: ' + error.message
    });
  }
});

// Endpoint para verificar tabelas
router.get('/tables', async (req, res) => {
  try {
    console.log('🔍 Verificando tabelas...');
    
    // Listar todas as tabelas
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Verificar se as tabelas principais existem
    const requiredTables = ['users', 'summaries', 'requests'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    // Testar queries em cada tabela existente
    const tableTests = {};
    for (const table of tables) {
      try {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        tableTests[table] = {
          exists: true,
          count: countResult.rows[0].count
        };
      } catch (error) {
        tableTests[table] = {
          exists: true,
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      tables: {
        all: tables,
        required: requiredTables,
        missing: missingTables,
        tests: tableTests
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar tabelas: ' + error.message
    });
  }
});

// Endpoint para verificar resumos na base de dados
router.get('/debug/summaries', async (req, res) => {
  try {
    console.log('🔍 Verificando resumos na base de dados...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    // Verificar tabela summaries
    const summariesResult = await db.query('SELECT COUNT(*) as count FROM summaries');
    const summariesCount = summariesResult.rows[0].count;
    
    // Verificar estrutura da tabela
    const columnsResult = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'summaries' 
      ORDER BY ordinal_position
    `);
    
    // Verificar últimos resumos com todas as colunas disponíveis
    const recentSummaries = await db.query(`
      SELECT 
        summary_id, user_id, success, duration, text_length, created_at,
        COALESCE(type, document_type, 'unknown') as document_type,
        url, summary, title, word_count, processing_time, updated_at
      FROM summaries 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        total_summaries: summariesCount,
        columns: columnsResult.rows,
        recent_summaries: recentSummaries.rows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao verificar resumos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar resumos: ' + error.message
    });
  }
});

// Endpoint para inserir dados de teste
router.post('/seed', async (req, res) => {
  try {
    console.log('🌱 Inserindo dados de teste...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    // Inserir utilizadores de teste
    await db.query(`
      INSERT INTO users (user_id, device_id, total_requests, summaries_generated, credits)
      VALUES 
        ('user_001', 'device_001', 15, 12, 3),
        ('user_002', 'device_002', 8, 6, 4),
        ('user_003', 'device_003', 25, 20, 0),
        ('user_004', 'device_004', 3, 2, 5),
        ('user_005', 'device_005', 18, 15, 2)
      ON CONFLICT (user_id) DO NOTHING
    `);
    
    // Inserir resumos de teste
    await db.query(`
      INSERT INTO summaries (summary_id, user_id, success, duration, type, text_length)
      VALUES 
        ('sum_001', 'user_001', true, 2500, 'terms_of_service', 5000),
        ('sum_002', 'user_001', true, 3200, 'privacy_policy', 8000),
        ('sum_003', 'user_002', true, 1800, 'terms_of_service', 3000),
        ('sum_004', 'user_002', false, 5000, 'privacy_policy', 12000),
        ('sum_005', 'user_003', true, 2800, 'terms_of_service', 6000),
        ('sum_006', 'user_003', true, 2100, 'privacy_policy', 4500),
        ('sum_007', 'user_004', true, 1500, 'terms_of_service', 2500),
        ('sum_008', 'user_005', true, 3500, 'privacy_policy', 9000),
        ('sum_009', 'user_005', true, 2200, 'terms_of_service', 4000),
        ('sum_010', 'user_001', true, 1900, 'privacy_policy', 3500)
      ON CONFLICT (summary_id) DO NOTHING
    `);
    
    // Inserir requests de teste
    await db.query(`
      INSERT INTO requests (method, path, status_code, duration, user_agent, ip_address, user_id)
      VALUES 
        ('POST', '/api/gemini/proxy', 200, 2500, 'Chrome/91.0', '192.168.1.1', 'user_001'),
        ('POST', '/api/gemini/proxy', 200, 3200, 'Firefox/89.0', '192.168.1.2', 'user_002'),
        ('POST', '/api/gemini/proxy', 200, 1800, 'Safari/14.0', '192.168.1.3', 'user_003'),
        ('POST', '/api/gemini/proxy', 500, 5000, 'Chrome/91.0', '192.168.1.4', 'user_004'),
        ('POST', '/api/gemini/proxy', 200, 2800, 'Edge/91.0', '192.168.1.5', 'user_005'),
        ('GET', '/api/analytics/overview', 200, 150, 'Chrome/91.0', '192.168.1.1', 'user_001'),
        ('GET', '/api/analytics/users', 200, 200, 'Firefox/89.0', '192.168.1.2', 'user_002'),
        ('POST', '/api/gemini/proxy', 200, 2100, 'Safari/14.0', '192.168.1.3', 'user_003'),
        ('POST', '/api/gemini/proxy', 200, 3500, 'Chrome/91.0', '192.168.1.4', 'user_004'),
        ('POST', '/api/gemini/proxy', 200, 2200, 'Edge/91.0', '192.168.1.5', 'user_005')
    `);
    
    console.log('✅ Dados de teste inseridos com sucesso');
    
    res.json({
      success: true,
      message: 'Dados de teste inseridos com sucesso',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados de teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao inserir dados de teste: ' + error.message
    });
  }
});

// Função para calcular mudanças percentuais baseadas em dados históricos
async function calculatePercentageChanges() {
  try {
    console.log('📊 Calculando mudanças percentuais...');
    
    // Calcular mudança de utilizadores (mês passado vs. atual)
    const usersChange = await calculateUsersChange();
    
    // Calcular mudança de resumos (semana passada vs. atual)
    const summariesChange = await calculateSummariesChange();
    
    // Calcular mudança de requests (ontem vs. hoje)
    const requestsChange = await calculateRequestsChange();
    
    // Calcular mudança de taxa de sucesso (semana passada vs. atual)
    const successChange = await calculateSuccessChange();
    
    return {
      usersChange: usersChange,
      summariesChange: summariesChange,
      requestsChange: requestsChange,
      successChange: successChange
    };
  } catch (error) {
    console.error('❌ Erro ao calcular mudanças percentuais:', error);
    return {
      usersChange: 0,
      summariesChange: 0,
      requestsChange: 0,
      successChange: 0
    };
  }
}

// Calcular mudança de utilizadores (mês passado vs. atual)
async function calculateUsersChange() {
  try {
    const currentMonth = await db.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    const lastMonth = await db.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    const current = parseInt(currentMonth.rows[0].count);
    const previous = parseInt(lastMonth.rows[0].count);
    
    if (previous === 0) return current > 0 ? 100 : 0;
    
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  } catch (error) {
    console.error('Erro ao calcular mudança de utilizadores:', error);
    return 0;
  }
}

// Calcular mudança de resumos (semana passada vs. atual)
async function calculateSummariesChange() {
  try {
    const currentWeek = await db.query(`
      SELECT COUNT(*) as count 
      FROM summaries 
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `);
    
    const lastWeek = await db.query(`
      SELECT COUNT(*) as count 
      FROM summaries 
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
      AND created_at < DATE_TRUNC('week', CURRENT_DATE)
    `);
    
    const current = parseInt(currentWeek.rows[0].count);
    const previous = parseInt(lastWeek.rows[0].count);
    
    if (previous === 0) return current > 0 ? 100 : 0;
    
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  } catch (error) {
    console.error('Erro ao calcular mudança de resumos:', error);
    return 0;
  }
}

// Calcular mudança de requests (ontem vs. hoje)
async function calculateRequestsChange() {
  try {
    const today = await db.query(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE DATE(timestamp) = CURRENT_DATE
    `);
    
    const yesterday = await db.query(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE DATE(timestamp) = CURRENT_DATE - INTERVAL '1 day'
    `);
    
    const current = parseInt(today.rows[0].count);
    const previous = parseInt(yesterday.rows[0].count);
    
    if (previous === 0) return current > 0 ? 100 : 0;
    
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  } catch (error) {
    console.error('Erro ao calcular mudança de requests:', error);
    return 0;
  }
}

// Calcular mudança de taxa de sucesso (semana passada vs. atual)
async function calculateSuccessChange() {
  try {
    const currentWeek = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN success = true THEN 1 END) as successful
      FROM summaries 
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `);
    
    const lastWeek = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN success = true THEN 1 END) as successful
      FROM summaries 
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
      AND created_at < DATE_TRUNC('week', CURRENT_DATE)
    `);
    
    const currentTotal = parseInt(currentWeek.rows[0].total);
    const currentSuccessful = parseInt(currentWeek.rows[0].successful);
    const previousTotal = parseInt(lastWeek.rows[0].total);
    const previousSuccessful = parseInt(lastWeek.rows[0].successful);
    
    if (currentTotal === 0 || previousTotal === 0) return 0;
    
    const currentRate = (currentSuccessful / currentTotal) * 100;
    const previousRate = (previousSuccessful / previousTotal) * 100;
    
    return Math.round((currentRate - previousRate) * 10) / 10;
  } catch (error) {
    console.error('Erro ao calcular mudança de taxa de sucesso:', error);
    return 0;
  }
}

// Endpoint para obter analytics overview
router.get('/overview', async (req, res) => {
  try {
    console.log('📊 Iniciando overview analytics...');
    
    // Verificar se a base de dados está conectada
    if (!db.isConnected) {
      console.log('🔌 Tentando conectar à base de dados...');
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    console.log('📈 Obtendo dados de overview...');
    const overview = await db.getAnalyticsOverview();
    
    console.log('✅ Overview obtido:', overview);
    
    // Calcular mudanças percentuais
    console.log('📊 Calculando mudanças percentuais...');
    const percentageChanges = await calculatePercentageChanges();
    console.log('📈 Mudanças percentuais calculadas:', percentageChanges);
    
    // Combinar dados atuais com mudanças percentuais
    const enhancedOverview = {
      ...overview,
      ...percentageChanges
    };
    
    console.log('🎯 Overview final:', enhancedOverview);
    
    // Se overview está vazio, tentar usar a view
    if (!overview || Object.keys(overview).length === 0) {
      console.log('⚠️ Overview vazio, tentando usar view...');
      try {
        const viewResult = await db.query('SELECT * FROM analytics_overview');
        const viewData = viewResult.rows[0] || {};
        console.log('📊 Dados da view:', viewData);
        
        // Combinar dados da view com mudanças percentuais
        const enhancedViewData = {
          ...viewData,
          ...percentageChanges
        };
        
        res.json({
          success: true,
          data: enhancedViewData,
          timestamp: new Date().toISOString(),
          source: 'view'
        });
        return;
      } catch (viewError) {
        console.error('❌ Erro ao usar view:', viewError);
      }
    }
    
    res.json({
      success: true,
      data: enhancedOverview,
      timestamp: new Date().toISOString(),
      source: 'query'
    });
  } catch (error) {
    console.error('❌ Erro ao obter overview:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de overview: ' + error.message
    });
  }
});

// Endpoint removido - duplicado com o endpoint autenticado abaixo

// Endpoint para obter histórico de resumos (dados individuais)
router.get('/summaries-history', async (req, res) => {
  try {
    console.log('📄 Obtendo histórico de resumos...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    // Parâmetros de filtro opcionais
    const { 
      limit = 100, 
      offset = 0, 
      type, 
      status, 
      date_from, 
      date_to,
      search 
    } = req.query;
    
    // Construir query base - tentar incluir colunas opcionais se existirem
    let query = `
      SELECT 
        s.id,
        s.summary_id,
        s.user_id,
        s.success,
        s.duration,
        s.text_length,
        s.created_at,
        COALESCE(s.type, s.document_type, 'unknown') as document_type,
        s.url,
        s.summary,
        s.title,
        s.word_count,
        s.processing_time,
        s.updated_at
      FROM summaries s
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Aplicar filtros
    if (type) {
      paramCount++;
      query += ` AND (s.type = $${paramCount} OR s.document_type = $${paramCount})`;
      queryParams.push(type);
    }
    
    if (status) {
      paramCount++;
      if (status === 'success') {
        query += ` AND s.success = $${paramCount}`;
        queryParams.push(true);
      } else if (status === 'failed') {
        query += ` AND s.success = $${paramCount}`;
        queryParams.push(false);
      }
    }
    
    if (date_from) {
      paramCount++;
      query += ` AND s.created_at >= $${paramCount}`;
      queryParams.push(date_from);
    }
    
    if (date_to) {
      paramCount++;
      query += ` AND s.created_at <= $${paramCount}`;
      queryParams.push(date_to);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (s.summary_id ILIKE $${paramCount} OR s.user_id ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }
    
    // Ordenar e limitar
    query += ` ORDER BY s.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    console.log('Query:', query);
    console.log('Params:', queryParams);
    
    const result = await db.query(query, queryParams);
    
    // Obter contagem total para paginação
    let countQuery = `
      SELECT COUNT(*) as total
      FROM summaries s
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (type) {
      countParamCount++;
      countQuery += ` AND (s.type = $${countParamCount} OR s.document_type = $${countParamCount})`;
      countParams.push(type);
    }
    
    if (status) {
      countParamCount++;
      if (status === 'success') {
        countQuery += ` AND s.success = $${countParamCount}`;
        countParams.push(true);
      } else if (status === 'failed') {
        countQuery += ` AND s.success = $${countParamCount}`;
        countParams.push(false);
      }
    }
    
    if (date_from) {
      countParamCount++;
      countQuery += ` AND s.created_at >= $${countParamCount}`;
      countParams.push(date_from);
    }
    
    if (date_to) {
      countParamCount++;
      countQuery += ` AND s.created_at <= $${countParamCount}`;
      countParams.push(date_to);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (s.summary_id ILIKE $${countParamCount} OR s.user_id ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Adicionar campos em falta para compatibilidade com o frontend
    const processedData = result.rows.map(row => ({
      ...row,
      url: row.url || null,
      summary: row.summary || null,
      updated_at: row.updated_at || row.created_at
    }));
    
    res.json({
      success: true,
      data: processedData,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter histórico de resumos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter histórico de resumos: ' + error.message
    });
  }
});

// Endpoint para obter dados de resumos
router.get('/summaries', async (req, res) => {
  try {
    console.log('📄 Obtendo dados de resumos...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    // Obter dados básicos de resumos
    const summariesData = await db.getAnalyticsSummaries();
    
    // Obter dados de tipos de documentos para o gráfico
    const documentTypesData = await getDocumentTypesData();
    
    const enhancedSummariesData = {
      ...summariesData,
      documentTypes: documentTypesData
    };
    
    res.json({
      success: true,
      data: enhancedSummariesData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter dados de resumos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de resumos: ' + error.message
    });
  }
});

// Endpoint consolidado de INSIGHTS reais para a secção Analytics do dashboard.
// Tudo é derivado da tabela `summaries` (fonte fiável e rica: ratings, tipos,
// domínios, durações) e de `summary_cache`. Cada sub-query é tolerante a falhas
// para que um problema pontual de schema não derrube a resposta inteira.
router.get('/insights', async (req, res) => {
  try {
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({ success: false, error: 'Base de dados indisponível' });
      }
    }

    // Janela temporal em dias (1..365), default 30.
    let days = parseInt(req.query.days, 10);
    if (!Number.isFinite(days) || days < 1) days = 30;
    if (days > 365) days = 365;
    const win = [days];

    const safe = async (fn, fallback) => {
      try { return await fn(); } catch (e) { console.error('insights sub-query falhou:', e.message); return fallback; }
    };

    const [metricsRow, prevRow, docTypes, ratingsRow, topDomains, daily, hourly, cacheRow] = await Promise.all([
      // Métricas do período
      safe(async () => (await db.query(`
        SELECT
          COUNT(*)                                            AS total_summaries,
          COUNT(*) FILTER (WHERE success = true)              AS successful,
          COUNT(*) FILTER (WHERE success = false)            AS failed,
          AVG(duration) FILTER (WHERE success = true)         AS avg_duration,
          COUNT(DISTINCT user_id)                             AS active_users,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)  AS today_summaries
        FROM summaries
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      `, win)).rows[0] || {}, {}),

      // Total do período anterior (igual duração) para variação %
      safe(async () => (await db.query(`
        SELECT COUNT(*) AS prev_total
        FROM summaries
        WHERE created_at >= NOW() - (2 * $1 * INTERVAL '1 day')
          AND created_at <  NOW() - ($1 * INTERVAL '1 day')
      `, win)).rows[0] || {}, {}),

      // Distribuição por tipo de documento (apenas sucessos)
      safe(async () => (await db.query(`
        SELECT
          CASE
            WHEN COALESCE(type, document_type) = 'terms_of_service' THEN 'Termos de Serviço'
            WHEN COALESCE(type, document_type) = 'privacy_policy'   THEN 'Políticas de Privacidade'
            ELSE 'Outros'
          END AS document_type,
          COUNT(*) AS count
        FROM summaries
        WHERE success = true AND created_at >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY 1 ORDER BY count DESC
      `, win)).rows, []),

      // Ratings médios + distribuição de risco
      safe(async () => (await db.query(`
        SELECT
          AVG(rating_complexidade)                          AS avg_complexidade,
          AVG(rating_boas_praticas)                         AS avg_boas_praticas,
          AVG(risk_score)                                   AS avg_risk_score,
          COUNT(*) FILTER (WHERE risk_score IS NOT NULL)    AS rated_count,
          COUNT(*) FILTER (WHERE risk_score BETWEEN 1 AND 3) AS risk_low,
          COUNT(*) FILTER (WHERE risk_score BETWEEN 4 AND 6) AS risk_medium,
          COUNT(*) FILTER (WHERE risk_score >= 7)            AS risk_high
        FROM summaries
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      `, win)).rows[0] || {}, {}),

      // Top domínios processados (com risco médio)
      safe(async () => (await db.query(`
        SELECT
          substring(url from '^https?://(?:www\\.)?([^/:?#]+)') AS domain,
          COUNT(*)         AS count,
          AVG(risk_score)  AS avg_risk
        FROM summaries
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
          AND url IS NOT NULL AND url <> ''
        GROUP BY domain
        HAVING substring(url from '^https?://(?:www\\.)?([^/:?#]+)') IS NOT NULL
        ORDER BY count DESC
        LIMIT 10
      `, win)).rows, []),

      // Atividade diária (série temporal)
      safe(async () => (await db.query(`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
          COUNT(*)                                    AS summaries,
          AVG(duration) FILTER (WHERE success = true) AS avg_duration
        FROM summaries
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1
      `, win)).rows, []),

      // Atividade por dia-da-semana x hora (heatmap)
      safe(async () => (await db.query(`
        SELECT
          EXTRACT(DOW  FROM created_at)::int AS dow,
          EXTRACT(HOUR FROM created_at)::int AS hour,
          COUNT(*)                           AS count
        FROM summaries
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY 1, 2
      `, win)).rows, []),

      // Cache persistente (reutilizações vs entradas)
      safe(async () => (await db.query(`
        SELECT COALESCE(SUM(hits), 0) AS cache_hits, COUNT(*) AS cache_entries
        FROM summary_cache
      `)).rows[0] || {}, {})
    ]);

    const num = (v) => (v == null ? 0 : Number(v));
    const total = num(metricsRow.total_summaries);
    const failed = num(metricsRow.failed);
    const prevTotal = num(prevRow.prev_total);
    const cacheHits = num(cacheRow.cache_hits);
    const cacheEntries = num(cacheRow.cache_entries);
    const cacheDenom = cacheHits + cacheEntries;

    const documentTypes = {};
    docTypes.forEach((r) => { documentTypes[r.document_type] = num(r.count); });

    res.json({
      success: true,
      range_days: days,
      metrics: {
        total_summaries: total,
        successful: num(metricsRow.successful),
        failed,
        success_rate: total > 0 ? +(num(metricsRow.successful) / total * 100).toFixed(1) : 0,
        failure_rate: total > 0 ? +(failed / total * 100).toFixed(2) : 0,
        avg_duration_ms: Math.round(num(metricsRow.avg_duration)),
        active_users: num(metricsRow.active_users),
        today_summaries: num(metricsRow.today_summaries),
        cache_hit_rate: cacheDenom > 0 ? +(cacheHits / cacheDenom * 100).toFixed(1) : 0,
        cache_hits: cacheHits,
        cache_entries: cacheEntries
      },
      comparison: {
        summaries_change_pct: prevTotal > 0 ? +(((total - prevTotal) / prevTotal) * 100).toFixed(1) : null
      },
      document_types: documentTypes,
      ratings: {
        avg_complexidade: ratingsRow.avg_complexidade != null ? +Number(ratingsRow.avg_complexidade).toFixed(1) : null,
        avg_boas_praticas: ratingsRow.avg_boas_praticas != null ? +Number(ratingsRow.avg_boas_praticas).toFixed(1) : null,
        avg_risk_score: ratingsRow.avg_risk_score != null ? +Number(ratingsRow.avg_risk_score).toFixed(1) : null,
        rated_count: num(ratingsRow.rated_count)
      },
      risk_distribution: {
        low: num(ratingsRow.risk_low),
        medium: num(ratingsRow.risk_medium),
        high: num(ratingsRow.risk_high)
      },
      top_domains: topDomains.map((r) => ({
        domain: r.domain,
        count: num(r.count),
        avg_risk: r.avg_risk != null ? +Number(r.avg_risk).toFixed(1) : null
      })),
      daily_activity: daily.map((r) => ({
        date: r.date,
        summaries: num(r.summaries),
        avg_duration: Math.round(num(r.avg_duration))
      })),
      hourly_activity: hourly.map((r) => ({ dow: num(r.dow), hour: num(r.hour), count: num(r.count) })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter insights:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter insights: ' + error.message });
  }
});

// Endpoint de RECEITA & CRÉDITOS para o dashboard admin.
// Receita vem de processed_payments (amount_cents). Para pagamentos antigos
// sem montante guardado, estima-se a 1€/crédito e sinaliza-se como estimativa.
// Créditos consumidos derivam dos resumos com sucesso (o consumo decrementa
// 1 crédito por resumo e não é registado em credits_history).
router.get('/revenue', async (req, res) => {
  try {
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({ success: false, error: 'Base de dados indisponível' });
      }
    }
    // Garante as tabelas/colunas de receita e custo antes de consultar.
    await db.ensurePaymentsTable();
    await db.ensureApiCostsTable();

    let days = parseInt(req.query.days, 10);
    if (!Number.isFinite(days) || days < 1) days = 30;
    if (days > 365) days = 365;
    const win = [days];

    const safe = async (fn, fallback) => {
      try { return await fn(); } catch (e) { console.error('revenue sub-query falhou:', e.message); return fallback; }
    };

    // Expressão de receita por linha, com fallback para linhas legadas.
    const REV = `COALESCE(amount_cents, credits * 100)`;

    const [periodRow, globalRow, byPackage, daily, topBuyers, recent, consumedRow, costRow, dailyCost] = await Promise.all([
      safe(async () => (await db.query(`
        SELECT
          COUNT(*)                          AS payments,
          COALESCE(SUM(${REV}), 0)          AS revenue_cents,
          COALESCE(SUM(credits), 0)         AS credits_sold,
          COUNT(*) FILTER (WHERE amount_cents IS NULL) AS legacy_rows,
          COUNT(DISTINCT user_id)           AS paying_users
        FROM processed_payments
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      `, win)).rows[0] || {}, {}),

      safe(async () => (await db.query(`
        SELECT
          (SELECT COUNT(*) FROM users)                                    AS total_users,
          (SELECT COUNT(DISTINCT user_id) FROM processed_payments)        AS paying_users_all,
          (SELECT COALESCE(SUM(credits), 0) FROM users)                   AS outstanding_credits,
          (SELECT COALESCE(SUM(${REV}), 0) FROM processed_payments)       AS revenue_all_cents,
          (SELECT COUNT(*) FROM processed_payments)                       AS payments_all
      `)).rows[0] || {}, {}),

      safe(async () => (await db.query(`
        SELECT COALESCE(package, '(desconhecido)') AS package,
               COUNT(*)                  AS payments,
               COALESCE(SUM(${REV}), 0)  AS revenue_cents,
               COALESCE(SUM(credits), 0) AS credits
        FROM processed_payments
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY 1 ORDER BY revenue_cents DESC
      `, win)).rows, []),

      safe(async () => (await db.query(`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
               COUNT(*)                  AS payments,
               COALESCE(SUM(${REV}), 0)  AS revenue_cents
        FROM processed_payments
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1
      `, win)).rows, []),

      safe(async () => (await db.query(`
        SELECT user_id,
               COUNT(*)                  AS payments,
               COALESCE(SUM(${REV}), 0)  AS revenue_cents,
               COALESCE(SUM(credits), 0) AS credits
        FROM processed_payments
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY user_id ORDER BY revenue_cents DESC LIMIT 10
      `, win)).rows, []),

      safe(async () => (await db.query(`
        SELECT session_id, user_id, credits, amount_cents, currency, package, created_at
        FROM processed_payments
        ORDER BY created_at DESC LIMIT 20
      `)).rows, []),

      safe(async () => (await db.query(`
        SELECT COUNT(*) AS credits_consumed
        FROM summaries
        WHERE success = true AND created_at >= NOW() - ($1 * INTERVAL '1 day')
      `, win)).rows[0] || {}, {}),

      // Custo de API no período (chamadas reais vs cache hits)
      safe(async () => (await db.query(`
        SELECT
          COALESCE(SUM(cost_micros) FILTER (WHERE cached = false), 0) AS cost_micros,
          COUNT(*) FILTER (WHERE cached = false)                      AS api_calls,
          COUNT(*) FILTER (WHERE cached = true)                       AS cache_hits,
          COALESCE(SUM(input_tokens), 0)                              AS input_tokens,
          COALESCE(SUM(output_tokens), 0)                             AS output_tokens
        FROM api_costs
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
      `, win)).rows[0] || {}, {}),

      // Série diária de custo
      safe(async () => (await db.query(`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
               COALESCE(SUM(cost_micros) FILTER (WHERE cached = false), 0) AS cost_micros
        FROM api_costs
        WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1
      `, win)).rows, [])
    ]);

    const num = (v) => (v == null ? 0 : Number(v));
    const revenueCents = num(periodRow.revenue_cents);
    const payments = num(periodRow.payments);
    const totalUsers = num(globalRow.total_users);
    const payingAll = num(globalRow.paying_users_all);
    const revenueAll = num(globalRow.revenue_all_cents);

    // Custo & margem (cost em micro-euros: 1 cêntimo = 10.000 micros)
    const costMicros = num(costRow.cost_micros);
    const apiCalls = num(costRow.api_calls);
    const cacheHits = num(costRow.cache_hits);
    const costCents = costMicros / 10000;
    const avgCostPerCallMicros = apiCalls > 0 ? costMicros / apiCalls : 0;
    const cacheSavingsMicros = Math.round(cacheHits * avgCostPerCallMicros);
    const marginCents = +(revenueCents - costCents).toFixed(2);

    res.json({
      success: true,
      range_days: days,
      currency: 'EUR',
      revenue_estimated: num(periodRow.legacy_rows) > 0,
      metrics: {
        revenue_cents: revenueCents,
        payments,
        avg_order_cents: payments > 0 ? Math.round(revenueCents / payments) : 0,
        credits_sold: num(periodRow.credits_sold),
        credits_consumed: num(consumedRow.credits_consumed),
        paying_users: num(periodRow.paying_users),
        paying_users_all: payingAll,
        total_users: totalUsers,
        conversion_rate: totalUsers > 0 ? +((payingAll / totalUsers) * 100).toFixed(1) : 0,
        arppu_cents: payingAll > 0 ? Math.round(revenueAll / payingAll) : 0,
        arpu_cents: totalUsers > 0 ? Math.round(revenueAll / totalUsers) : 0,
        outstanding_credits: num(globalRow.outstanding_credits),
        revenue_all_cents: revenueAll,
        payments_all: num(globalRow.payments_all),
        // Custo & margem (cêntimos de EUR)
        cost_cents: +costCents.toFixed(2),
        margin_cents: marginCents,
        margin_pct: revenueCents > 0 ? +((marginCents / revenueCents) * 100).toFixed(1) : null,
        api_calls: apiCalls,
        cache_hits: cacheHits,
        avg_cost_per_call_cents: +((avgCostPerCallMicros) / 10000).toFixed(3),
        cache_savings_cents: +(cacheSavingsMicros / 10000).toFixed(2),
        input_tokens: num(costRow.input_tokens),
        output_tokens: num(costRow.output_tokens)
      },
      daily_cost: dailyCost.map((r) => ({ date: r.date, cost_cents: num(r.cost_micros) / 10000 })),
      by_package: byPackage.map((r) => ({
        package: r.package, payments: num(r.payments), revenue_cents: num(r.revenue_cents), credits: num(r.credits)
      })),
      daily_revenue: daily.map((r) => ({ date: r.date, payments: num(r.payments), revenue_cents: num(r.revenue_cents) })),
      top_buyers: topBuyers.map((r) => ({
        user_id: r.user_id, payments: num(r.payments), revenue_cents: num(r.revenue_cents), credits: num(r.credits)
      })),
      recent_payments: recent.map((r) => ({
        session_id: r.session_id, user_id: r.user_id, credits: num(r.credits),
        amount_cents: r.amount_cents != null ? num(r.amount_cents) : null,
        currency: r.currency, package: r.package, created_at: r.created_at
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter receita:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter receita: ' + error.message });
  }
});

// ===== CONFIGURAÇÕES (admin) =====
// Persistência autoritativa das settings de administração. Apenas chaves
// na whitelist são aceites (evita guardar segredos como a chave da API).
const SETTINGS_WHITELIST = [
  'sessionTimeout', 'accessLogs', 'autoBackup', 'encryption',
  'backupFrequency', 'backupRetention', 'debugMode', 'logLevel',
  'performanceMonitoring', 'cacheEnabled', 'apiTimeout', 'retryAttempts'
];

router.get('/settings', async (req, res) => {
  try {
    if (!db.isConnected) await db.connect();
    const data = await db.getAllSettings();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Erro ao obter settings:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter configurações: ' + error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    if (!db.isConnected) await db.connect();
    const incoming = (req.body && typeof req.body === 'object') ? req.body : {};
    const clean = {};
    for (const k of SETTINGS_WHITELIST) {
      if (Object.prototype.hasOwnProperty.call(incoming, k)) clean[k] = incoming[k];
    }
    const data = await db.saveSettings(clean);
    auditLogger.logUserAction(req.user?.userId || 'admin', 'settings_update', { keys: Object.keys(clean) }, {})
      .catch((e) => console.error('audit settings_update falhou:', e.message));
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Erro ao guardar settings:', error);
    res.status(500).json({ success: false, error: 'Erro ao guardar configurações: ' + error.message });
  }
});

// ===== LIMPEZA DE DADOS (danger zone) =====
// Ações destrutivas: cada uma fica registada na auditoria (severidade crítica).
router.post('/cleanup', async (req, res) => {
  try {
    if (!db.isConnected) await db.connect();
    const target = (req.body && req.body.target) || '';
    let deleted = 0;

    if (target === 'inactive_users') {
      // Inativos: sem atividade há mais de 90 dias.
      const cond = `last_seen IS NOT NULL AND last_seen < NOW() - INTERVAL '90 days'`;
      const sub = `(SELECT user_id FROM users WHERE ${cond})`;
      for (const t of ['credits_history', 'summaries', 'requests', 'processed_payments', 'api_costs']) {
        await db.query(`DELETE FROM ${t} WHERE user_id IN ${sub}`).catch(() => {});
      }
      deleted = (await db.query(`DELETE FROM users WHERE ${cond}`)).rowCount || 0;
    } else if (target === 'old_summaries') {
      deleted = (await db.query(`DELETE FROM summaries WHERE created_at < NOW() - INTERVAL '365 days'`)).rowCount || 0;
    } else if (target === 'logs') {
      await auditLogger.ensureAuditTable();
      deleted = (await db.query(`DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '90 days'`)).rowCount || 0;
    } else if (target === 'cache') {
      await db.ensureSummaryCacheTable().catch(() => {});
      deleted = (await db.query(`DELETE FROM summary_cache`)).rowCount || 0;
    } else {
      return res.status(400).json({ success: false, error: 'Alvo de limpeza inválido' });
    }

    auditLogger.logUserAction(req.user?.userId || 'admin', `cleanup_${target}`, { target, deleted }, { critical: true })
      .catch((e) => console.error('audit cleanup falhou:', e.message));
    res.json({ success: true, target, deleted });
  } catch (error) {
    console.error('❌ Erro no cleanup:', error);
    res.status(500).json({ success: false, error: 'Erro ao limpar dados: ' + error.message });
  }
});

// Coortes semanais de novos utilizadores + retenção e ativação.
router.get('/cohorts', async (req, res) => {
  try {
    if (!db.isConnected) await db.connect();
    const rows = (await db.query(`
      SELECT
        to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS cohort,
        COUNT(*)                                               AS users,
        COUNT(*) FILTER (WHERE summaries_generated > 0)        AS activated,
        COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '30 days') AS active_30d
      FROM users
      WHERE created_at >= NOW() - INTERVAL '180 days'
      GROUP BY 1 ORDER BY 1
    `)).rows;

    const num = (v) => (v == null ? 0 : Number(v));
    res.json({
      success: true,
      cohorts: rows.map((r) => {
        const users = num(r.users);
        return {
          cohort: r.cohort,
          users,
          activated: num(r.activated),
          active_30d: num(r.active_30d),
          activation_pct: users > 0 ? +((num(r.activated) / users) * 100).toFixed(0) : 0,
          retention_pct: users > 0 ? +((num(r.active_30d) / users) * 100).toFixed(0) : 0
        };
      })
    });
  } catch (error) {
    console.error('❌ Erro ao obter coortes:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter coortes: ' + error.message });
  }
});

// ===== AUDITORIA & SEGURANÇA =====

// Resumo de auditoria: totais, distribuição por tipo/severidade, série diária
// e eventos de segurança recentes. Severidade: 0=DEBUG 1=INFO 2=WARN 3=ERROR 4=CRITICAL.
router.get('/audit-summary', async (req, res) => {
  try {
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) return res.status(500).json({ success: false, error: 'Base de dados indisponível' });
    }
    await auditLogger.ensureAuditTable();

    let days = parseInt(req.query.days, 10);
    if (!Number.isFinite(days) || days < 1) days = 7;
    if (days > 365) days = 365;
    const win = [days];

    const safe = async (fn, fallback) => {
      try { return await fn(); } catch (e) { console.error('audit-summary sub-query falhou:', e.message); return fallback; }
    };

    const [totals, byType, bySeverity, daily, recent] = await Promise.all([
      safe(async () => (await db.query(`
        SELECT
          COUNT(*)                                                AS events,
          COUNT(*) FILTER (WHERE type = 'security_event')         AS security_events,
          COUNT(*) FILTER (WHERE action = 'failed_login')         AS failed_logins,
          COUNT(*) FILTER (WHERE severity >= 4)                   AS critical,
          COUNT(*) FILTER (WHERE severity = 3)                    AS errors,
          COUNT(DISTINCT user_id)                                 AS distinct_users
        FROM audit_logs
        WHERE timestamp >= NOW() - ($1 * INTERVAL '1 day')
      `, win)).rows[0] || {}, {}),

      safe(async () => (await db.query(`
        SELECT type, COUNT(*) AS count
        FROM audit_logs
        WHERE timestamp >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY type ORDER BY count DESC
      `, win)).rows, []),

      safe(async () => (await db.query(`
        SELECT severity, COUNT(*) AS count
        FROM audit_logs
        WHERE timestamp >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY severity ORDER BY severity
      `, win)).rows, []),

      safe(async () => (await db.query(`
        SELECT to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS date, COUNT(*) AS count
        FROM audit_logs
        WHERE timestamp >= NOW() - ($1 * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1
      `, win)).rows, []),

      safe(async () => (await db.query(`
        SELECT id, type, user_id, action, severity, timestamp, details
        FROM audit_logs
        WHERE timestamp >= NOW() - ($1 * INTERVAL '1 day')
          AND (type IN ('security_event', 'auth_event') OR severity >= 3)
        ORDER BY timestamp DESC LIMIT 10
      `, win)).rows, [])
    ]);

    const num = (v) => (v == null ? 0 : Number(v));
    res.json({
      success: true,
      range_days: days,
      totals: {
        events: num(totals.events),
        security_events: num(totals.security_events),
        failed_logins: num(totals.failed_logins),
        critical: num(totals.critical),
        errors: num(totals.errors),
        distinct_users: num(totals.distinct_users)
      },
      by_type: byType.map((r) => ({ type: r.type, count: num(r.count) })),
      by_severity: bySeverity.map((r) => ({ severity: num(r.severity), count: num(r.count) })),
      daily: daily.map((r) => ({ date: r.date, count: num(r.count) })),
      recent_security: recent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter audit-summary:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter resumo de auditoria: ' + error.message });
  }
});

// Lista filtrável e paginada de eventos de auditoria.
router.get('/audit-logs', async (req, res) => {
  try {
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) return res.status(500).json({ success: false, error: 'Base de dados indisponível' });
    }
    await auditLogger.ensureAuditTable();

    const { type, action, user_id } = req.query;
    let minSeverity = parseInt(req.query.severity, 10);
    let days = parseInt(req.query.days, 10);
    let limit = parseInt(req.query.limit, 10);
    let offset = parseInt(req.query.offset, 10);
    if (!Number.isFinite(days) || days < 1) days = 30;
    if (days > 365) days = 365;
    if (!Number.isFinite(limit) || limit < 1) limit = 50;
    if (limit > 200) limit = 200;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const where = [`timestamp >= NOW() - ($1 * INTERVAL '1 day')`];
    const params = [days];
    const add = (clause, val) => { params.push(val); where.push(clause.replace('?', `$${params.length}`)); };
    if (type) add('type = ?', type);
    if (Number.isFinite(minSeverity)) add('severity >= ?', minSeverity);
    if (action) add('action ILIKE ?', `%${action}%`);
    if (user_id) add('user_id ILIKE ?', `%${user_id}%`);
    const whereSql = where.join(' AND ');

    const totalRow = await db.query(`SELECT COUNT(*) AS total FROM audit_logs WHERE ${whereSql}`, params);
    const total = Number(totalRow.rows[0]?.total || 0);

    const pageParams = params.slice();
    pageParams.push(limit); const limitIdx = pageParams.length;
    pageParams.push(offset); const offsetIdx = pageParams.length;
    const rows = await db.query(`
      SELECT id, type, user_id, action, table_name, record_id,
             old_values, new_values, details, metadata, severity, timestamp
      FROM audit_logs
      WHERE ${whereSql}
      ORDER BY timestamp DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, pageParams);

    res.json({
      success: true,
      data: rows.rows,
      pagination: { total, limit, offset, hasMore: offset + rows.rows.length < total }
    });
  } catch (error) {
    console.error('❌ Erro ao obter audit-logs:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter logs de auditoria: ' + error.message });
  }
});

// Função para obter dados de tipos de documentos
async function getDocumentTypesData() {
  try {
    console.log('📊 Obtendo dados de tipos de documentos...');
    
    const result = await db.query(`
      SELECT 
        CASE 
          WHEN type = 'terms_of_service' THEN 'Termos de Serviço'
          WHEN type = 'privacy_policy' THEN 'Políticas de Privacidade'
          WHEN type = 'unknown' THEN 'Outros'
          ELSE COALESCE(type, 'Outros')
        END as document_type,
        COUNT(*) as count
      FROM summaries 
      WHERE success = true
      GROUP BY 
        CASE 
          WHEN type = 'terms_of_service' THEN 'Termos de Serviço'
          WHEN type = 'privacy_policy' THEN 'Políticas de Privacidade'
          WHEN type = 'unknown' THEN 'Outros'
          ELSE COALESCE(type, 'Outros')
        END
      ORDER BY count DESC
    `);
    
    // Converter resultado para objeto
    const documentTypes = {};
    result.rows.forEach(row => {
      documentTypes[row.document_type] = parseInt(row.count);
    });
    
    console.log('📊 Tipos de documentos obtidos:', documentTypes);
    return documentTypes;
    
  } catch (error) {
    console.error('Erro ao obter tipos de documentos:', error);
    return {};
  }
}

// Endpoint para obter dados de performance
router.get('/performance', async (req, res) => {
  try {
    const performanceData = await db.getAnalyticsPerformance();
    res.json({
      success: true,
      data: performanceData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter dados de performance:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de performance'
    });
  }
});

// Endpoint para obter dados de créditos
router.get('/credits', async (req, res) => {
  try {
    // Mock data para créditos (pode ser implementado depois)
    const creditsData = {
      total_credits_consumed: 0,
      total_credits_purchased: 0,
      active_users_with_credits: 0,
      average_credits_per_user: 5
    };
    res.json({
      success: true,
      data: creditsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter dados de créditos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de créditos'
    });
  }
});

// Endpoint para dados em tempo real
router.get('/realtime', async (req, res) => {
  try {
    console.log('📊 Obtendo dados em tempo real...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    // Obter dados básicos em tempo real
    const basicRealtimeData = {
      active_users: 0,
      requests_per_minute: 0,
      current_response_time: 0,
      uptime: 100
    };
    
    // Obter dados de atividade dos últimos 7 dias para o gráfico
    const activityData = await getActivityData();
    
    const realtimeData = {
      ...basicRealtimeData,
      activity: activityData
    };
    
    res.json({
      success: true,
      data: realtimeData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter dados em tempo real:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados em tempo real'
    });
  }
});

// Função para obter dados de atividade dos últimos 7 dias
async function getActivityData() {
  try {
    console.log('📈 Obtendo dados de atividade dos últimos 7 dias...');
    
    const result = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as summaries,
        COUNT(DISTINCT user_id) as users
      FROM summaries 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    // Criar array com todos os dias da semana (incluindo dias sem dados)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Procurar dados para este dia
      const dayData = result.rows.find(row => row.date === dateStr);
      
      // Nome do dia da semana em português
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayName = dayNames[date.getDay()];
      
      last7Days.push({
        date: dayName,
        summaries: dayData ? parseInt(dayData.summaries) : 0,
        users: dayData ? parseInt(dayData.users) : 0
      });
    }
    
    console.log('📊 Dados de atividade obtidos:', last7Days);
    return last7Days;
    
  } catch (error) {
    console.error('Erro ao obter dados de atividade:', error);
    return [];
  }
}

// Função para registrar novo utilizador
async function registerUser(userId, deviceId) {
  try {
    await db.createUser(userId, deviceId);
  } catch (error) {
    console.error('Error registering user:', error);
  }
}

// Função para registrar novo resumo
async function registerSummary(userId, success = true, duration = 0, documentType = 'unknown', textLength = 0, url = null, summary = null, title = null, ratings = null) {
  try {
    const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Verificar conexão à base de dados
    if (!db.isConnected) {
      console.log('🔌 Conectando à base de dados...');
      const connected = await db.connect();
      if (!connected) {
        throw new Error('Não foi possível conectar à base de dados');
      }
    }

    const result = await db.createSummary(summaryId, userId, success, duration, textLength, url, summary, title, ratings, documentType);
    return result;
  } catch (error) {
    console.error('❌ Error registering summary:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      summaryId: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    throw error;
  }
}

// Endpoint para testar conexão à base de dados
router.post('/test-db-connection', async (req, res) => {
  try {
    console.log('🧪 Testando conexão à base de dados...');
    
    if (!db.isConnected) {
      console.log('🔌 Conectando à base de dados...');
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    // Testar query simples
    console.log('🧪 Executando query de teste...');
    const result = await db.query('SELECT NOW() as current_time, COUNT(*) as total_summaries FROM summaries');
    console.log('🧪 Query de teste executada com sucesso:', result.rows[0]);
    
    // Criar usuário de teste
    console.log('🧪 Criando usuário de teste...');
    try {
      await db.createUser('test_user', 'test_device');
    } catch (error) {
      console.log('⚠️ Usuário de teste já existe ou erro:', error.message);
    }
    
    // Testar inserção de resumo de teste
    console.log('🧪 Testando inserção de resumo...');
    const testSummaryId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testResult = await db.createSummary(
      testSummaryId,
      'test_user',
      true,
      1000,
      100,
      'https://test.com',
      'Teste de conexão',
      'Teste'
    );
    console.log('🧪 Resumo de teste criado:', testResult);
    
    // Verificar se o resumo foi criado
    const verifyResult = await db.query('SELECT * FROM summaries WHERE summary_id = $1', [testSummaryId]);
    console.log('🧪 Verificação do resumo criado:', verifyResult.rows[0]);
    
    res.json({
      success: true,
      message: 'Conexão à base de dados funcionando corretamente',
      testResults: {
        connection: 'OK',
        query: result.rows[0],
        insert: testResult,
        verify: verifyResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro no teste de conexão: ' + error.message,
      details: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Endpoint para obter histórico de resumos de um utilizador
router.get('/user-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`📊 Obtendo histórico para utilizador: ${userId}, limit: ${limit}, offset: ${offset}`);
    
    const summaries = await db.getUserSummaries(userId, parseInt(limit), parseInt(offset));
    const stats = await db.getUserSummaryStats(userId);
    
    res.json({
      success: true,
      data: summaries,
      stats: stats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: stats.total_summaries
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter histórico de resumos',
      details: error.message
    });
  }
});

// Endpoint para obter estatísticas de um utilizador
router.get('/user-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 Obtendo estatísticas para utilizador: ${userId}`);
    
    // Obter estatísticas do utilizador
    const stats = await db.getUserSummaryStats(userId);
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas do utilizador',
      details: error.message
    });
  }
});

// Endpoint para executar migração SQL direta
router.post('/migrate-sql', async (req, res) => {
  try {
    console.log('🔄 Executando migração SQL direta...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        throw new Error('Não foi possível conectar à base de dados');
      }
    }

    const migrationsApplied = [];
    
    // Migração 1: Adicionar colunas básicas
    try {
      console.log('📝 Migração 1: Adicionar colunas url, summary, updated_at');
      await db.query(`
        ALTER TABLE summaries 
        ADD COLUMN IF NOT EXISTS url TEXT,
        ADD COLUMN IF NOT EXISTS summary TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      migrationsApplied.push('Colunas url, summary, updated_at adicionadas');
    } catch (error) {
      console.log('⚠️ Migração 1 já aplicada ou erro:', error.message);
    }
    
    // Migração 2: Adicionar colunas extras
    try {
      console.log('📝 Migração 2: Adicionar colunas title, word_count, processing_time, document_type');
      await db.query(`
        ALTER TABLE summaries 
        ADD COLUMN IF NOT EXISTS title TEXT,
        ADD COLUMN IF NOT EXISTS word_count INTEGER,
        ADD COLUMN IF NOT EXISTS processing_time DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'unknown'
      `);
      migrationsApplied.push('Colunas title, word_count, processing_time, document_type adicionadas');
    } catch (error) {
      console.log('⚠️ Migração 2 já aplicada ou erro:', error.message);
    }

    // Migração 3: Renomear coluna type para document_type se necessário
    try {
      console.log('📝 Migração 3: Renomear coluna type para document_type');
      await db.query(`
        DO $$ 
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'summaries' AND column_name = 'type')
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'summaries' AND column_name = 'document_type') THEN
                ALTER TABLE summaries RENAME COLUMN type TO document_type;
            END IF;
        END $$;
      `);
      migrationsApplied.push('Coluna type renomeada para document_type');
    } catch (error) {
      console.log('⚠️ Migração 3 já aplicada ou erro:', error.message);
    }

    // Migração 4: Atualizar registros existentes
    try {
      console.log('📝 Migração 4: Atualizar registros existentes');
      await db.query(`
        UPDATE summaries 
        SET updated_at = created_at 
        WHERE updated_at IS NULL
      `);
      
      await db.query(`
        UPDATE summaries 
        SET document_type = 'unknown' 
        WHERE document_type IS NULL
      `);
      
      migrationsApplied.push('Registros existentes atualizados');
    } catch (error) {
      console.log('⚠️ Migração 4 já aplicada ou erro:', error.message);
    }

    // Verificar estrutura final
    const columnsResult = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'summaries' 
      ORDER BY ordinal_position
    `);

    console.log('✅ Migração SQL direta concluída com sucesso');
    
    res.json({
      success: true,
      message: 'Migração SQL direta concluída com sucesso',
      migrationsApplied: migrationsApplied,
      columns: columnsResult.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na migração SQL direta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na migração SQL direta: ' + error.message
    });
  }
});

// Endpoint para migrar base de dados (adicionar colunas em falta)
router.post('/migrate', async (req, res) => {
  try {
    console.log('🔄 Executando migração da base de dados...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        throw new Error('Não foi possível conectar à base de dados');
      }
    }

    const migrationsApplied = [];
    
    // Migração 1: Adicionar colunas básicas
    try {
      console.log('📝 Migração 1: Adicionar colunas url, summary, updated_at');
      await db.query(`
        ALTER TABLE summaries 
        ADD COLUMN IF NOT EXISTS url TEXT,
        ADD COLUMN IF NOT EXISTS summary TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      migrationsApplied.push('Colunas url, summary, updated_at adicionadas');
    } catch (error) {
      console.log('⚠️ Migração 1 já aplicada ou erro:', error.message);
    }
    
    // Migração 2: Adicionar colunas extras
    try {
      console.log('📝 Migração 2: Adicionar colunas title, word_count, processing_time');
      await db.query(`
        ALTER TABLE summaries 
        ADD COLUMN IF NOT EXISTS title TEXT,
        ADD COLUMN IF NOT EXISTS word_count INTEGER,
        ADD COLUMN IF NOT EXISTS processing_time DECIMAL(10,2)
      `);
      migrationsApplied.push('Colunas title, word_count, processing_time adicionadas');
    } catch (error) {
      console.log('⚠️ Migração 2 já aplicada ou erro:', error.message);
    }

    // Migração 3: Adicionar trigger para updated_at
    try {
      console.log('📝 Migração 3: Adicionar trigger update_summaries_updated_at');
      // Verificar se o trigger já existe
      const triggerCheck = await db.query(`
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_summaries_updated_at'
      `);
      
      if (triggerCheck.rows.length === 0) {
        await db.query(`
          CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
        migrationsApplied.push('Trigger update_summaries_updated_at criado');
      } else {
        migrationsApplied.push('Trigger update_summaries_updated_at já existe');
      }
    } catch (error) {
      console.log('⚠️ Migração 3 já aplicada ou erro:', error.message);
    }

    // Migração 4: Atualizar registros existentes
    try {
      console.log('📝 Migração 4: Atualizar updated_at para registros existentes');
      await db.query(`
        UPDATE summaries 
        SET updated_at = created_at 
        WHERE updated_at IS NULL
      `);
      migrationsApplied.push('Registros existentes atualizados');
    } catch (error) {
      console.log('⚠️ Migração 4 já aplicada ou erro:', error.message);
    }

    console.log('✅ Migração concluída com sucesso');
    
    res.json({
      success: true,
      message: 'Migração da base de dados concluída com sucesso',
      migrationsApplied: migrationsApplied,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na migração: ' + error.message
    });
  }
});

// Endpoint temporário para histórico de resumos (compatível com schema atual)
router.get('/summaries-history-temp', async (req, res) => {
  try {
    console.log('📄 Obtendo histórico de resumos (versão temporária)...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        throw new Error('Não foi possível conectar à base de dados');
      }
    }

    const {
      limit = 100,
      offset = 0,
      type,
      status,
      date_from,
      date_to,
      search 
    } = req.query;
    
    // Query que funciona com o schema atual
    let query = `
      SELECT 
        s.id,
        s.summary_id,
        s.user_id,
        s.success,
        s.duration,
        s.type as document_type,
        s.text_length,
        s.created_at
      FROM summaries s
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Aplicar filtros
    if (type) {
      paramCount++;
      query += ` AND (s.type = $${paramCount} OR s.document_type = $${paramCount})`;
      queryParams.push(type);
    }
    
    if (status) {
      paramCount++;
      if (status === 'success') {
        query += ` AND s.success = $${paramCount}`;
        queryParams.push(true);
      } else if (status === 'failed') {
        query += ` AND s.success = $${paramCount}`;
        queryParams.push(false);
      }
    }
    
    if (date_from) {
      paramCount++;
      query += ` AND s.created_at >= $${paramCount}`;
      queryParams.push(date_from);
    }
    
    if (date_to) {
      paramCount++;
      query += ` AND s.created_at <= $${paramCount}`;
      queryParams.push(date_to);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (s.summary_id ILIKE $${paramCount} OR s.user_id ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }
    
    // Ordenar e limitar
    query += ` ORDER BY s.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    console.log('Query:', query);
    console.log('Params:', queryParams);
    
    const result = await db.query(query, queryParams);
    
    // Obter contagem total para paginação
    let countQuery = `
      SELECT COUNT(*) as total
      FROM summaries s
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (type) {
      countParamCount++;
      countQuery += ` AND (s.type = $${countParamCount} OR s.document_type = $${countParamCount})`;
      countParams.push(type);
    }
    
    if (status) {
      countParamCount++;
      if (status === 'success') {
        countQuery += ` AND s.success = $${countParamCount}`;
        countParams.push(true);
      } else if (status === 'failed') {
        countQuery += ` AND s.success = $${countParamCount}`;
        countParams.push(false);
      }
    }
    
    if (date_from) {
      countParamCount++;
      countQuery += ` AND s.created_at >= $${countParamCount}`;
      countParams.push(date_from);
    }
    
    if (date_to) {
      countParamCount++;
      countQuery += ` AND s.created_at <= $${countParamCount}`;
      countParams.push(date_to);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (s.summary_id ILIKE $${countParamCount} OR s.user_id ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Adicionar campos em falta para compatibilidade com o frontend
    const processedData = result.rows.map(row => ({
      ...row,
      url: null, // Campo não disponível no schema atual
      summary: null, // Campo não disponível no schema atual
      updated_at: row.created_at // Usar created_at como fallback
    }));
    
    res.json({
      success: true,
      data: processedData,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter histórico de resumos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter histórico de resumos: ' + error.message
    });
  }
});


// GET /users - Obter lista de utilizadores (sem autenticação para desenvolvimento)
router.get('/users', async (req, res) => {
    try {
        console.log('📊 Obter lista de utilizadores');
        
        // Verificar conexão com base de dados
        if (!db.isConnected) {
            const connected = await db.connect();
            if (!connected) {
                console.error('❌ Não foi possível conectar à base de dados');
                return res.status(500).json({
                    success: false,
                    error: 'Não foi possível conectar à base de dados'
                });
            }
        }
        
        // Query para obter utilizadores com estatísticas
        const query = `
            SELECT 
                u.user_id,
                u.created_at,
                u.updated_at as last_used,
                u.credits,
                COUNT(s.id) as summaries_count,
                COALESCE(SUM(s.text_length), 0) as total_words,
                COALESCE(AVG(s.duration), 0) as avg_processing_time
            FROM users u
            LEFT JOIN summaries s ON u.user_id = s.user_id
            GROUP BY u.user_id, u.created_at, u.updated_at, u.credits
            ORDER BY u.created_at DESC
        `;
        
        console.log('🔍 Executando query:', query);
        const result = await db.query(query);
        console.log('📊 Resultado da query:', result.rows.length, 'linhas');
        
        const users = result.rows.map(row => ({
            user_id: row.user_id,
            created_at: row.created_at,
            last_used: row.last_used,
            credits: parseInt(row.credits),
            summaries_count: parseInt(row.summaries_count),
            total_words: parseInt(row.total_words),
            avg_processing_time: parseFloat(row.avg_processing_time)
        }));
        
        console.log(`✅ ${users.length} utilizadores encontrados`);
        console.log('📋 Primeiro utilizador:', users[0]);
        
        res.json({
            success: true,
            data: users,
            count: users.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao obter utilizadores:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter dados de utilizadores',
            details: error.message
        });
    }
});

// Exportar funções para uso em outras rotas
export { router, registerUser, registerSummary };
