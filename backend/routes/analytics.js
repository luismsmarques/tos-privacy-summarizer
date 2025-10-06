import express from 'express';
import db from '../utils/database.js';
import authService from '../utils/auth.js';

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
        url, summary, title, word_count, processing_time, focus, updated_at
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
        s.focus,
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
async function registerSummary(userId, success = true, duration = 0, documentType = 'unknown', textLength = 0, url = null, summary = null, title = null, focus = 'privacy') {
  try {
    console.log(`📝 Criando resumo: userId=${userId}, success=${success}, duration=${duration}, documentType=${documentType}, textLength=${textLength}, url=${url}, title=${title}, focus=${focus}`);
    console.log(`📝 Summary content length: ${summary ? summary.length : 0}`);
    
    const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 Generated summaryId: ${summaryId}`);
    
    // Verificar conexão à base de dados
    if (!db.isConnected) {
      console.log('🔌 Conectando à base de dados...');
      const connected = await db.connect();
      if (!connected) {
        throw new Error('Não foi possível conectar à base de dados');
      }
    }
    
    console.log('📝 Chamando db.createSummary...');
    const result = await db.createSummary(summaryId, userId, success, duration, textLength, url, summary, title, focus);
    console.log(`✅ Resumo criado com sucesso: ${summaryId}`, result);
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
      'Teste',
      'privacy'
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
      console.log('📝 Migração 2: Adicionar colunas title, word_count, processing_time, focus, document_type');
      await db.query(`
        ALTER TABLE summaries 
        ADD COLUMN IF NOT EXISTS title TEXT,
        ADD COLUMN IF NOT EXISTS word_count INTEGER,
        ADD COLUMN IF NOT EXISTS processing_time DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS focus VARCHAR(50) DEFAULT 'privacy',
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'unknown'
      `);
      migrationsApplied.push('Colunas title, word_count, processing_time, focus, document_type adicionadas');
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
      console.log('📝 Migração 2: Adicionar colunas title, word_count, processing_time, focus');
      await db.query(`
        ALTER TABLE summaries 
        ADD COLUMN IF NOT EXISTS title TEXT,
        ADD COLUMN IF NOT EXISTS word_count INTEGER,
        ADD COLUMN IF NOT EXISTS processing_time DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS focus VARCHAR(50) DEFAULT 'privacy'
      `);
      migrationsApplied.push('Colunas title, word_count, processing_time, focus adicionadas');
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

// Endpoint para popular dados de teste
router.post('/seed', async (req, res) => {
  try {
    console.log('🌱 Populando base de dados com dados de teste...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }

    // Executar migração primeiro (adicionar colunas em falta)
    try {
      console.log('🔄 Executando migração da base de dados...');
      
      // Adicionar colunas em falta
      await db.query(`
        ALTER TABLE summaries 
        ADD COLUMN IF NOT EXISTS url TEXT,
        ADD COLUMN IF NOT EXISTS summary TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);

      // Adicionar trigger para updated_at
      await db.query(`
        CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);

      // Atualizar registros existentes
      await db.query(`
        UPDATE summaries 
        SET updated_at = created_at 
        WHERE updated_at IS NULL
      `);

      console.log('✅ Migração concluída com sucesso');
    } catch (migrationError) {
      console.log('⚠️ Migração já executada ou erro:', migrationError.message);
    }
    
    // Criar utilizadores de teste
    const testUsers = [
      { userId: 'test_user_1', deviceId: 'device_1' },
      { userId: 'test_user_2', deviceId: 'device_2' },
      { userId: 'test_user_3', deviceId: 'device_3' }
    ];
    
    for (const user of testUsers) {
      try {
        await db.createUser(user.userId, user.deviceId);
        console.log(`✅ Utilizador criado: ${user.userId}`);
      } catch (error) {
        console.log(`⚠️ Utilizador já existe: ${user.userId}`);
      }
    }
    
    // Criar resumos de teste com datas históricas
    const now = new Date();
    const testSummaries = [
      { userId: 'test_user_1', success: true, duration: 2500, type: 'terms_of_service', textLength: 1500, daysAgo: 6 },
      { userId: 'test_user_1', success: true, duration: 1800, type: 'privacy_policy', textLength: 1200, daysAgo: 5 },
      { userId: 'test_user_2', success: true, duration: 3200, type: 'terms_of_service', textLength: 2000, daysAgo: 4 },
      { userId: 'test_user_2', success: true, duration: 2100, type: 'privacy_policy', textLength: 1800, daysAgo: 3 },
      { userId: 'test_user_3', success: true, duration: 2800, type: 'terms_of_service', textLength: 1600, daysAgo: 2 },
      { userId: 'test_user_1', success: true, duration: 1900, type: 'privacy_policy', textLength: 1400, daysAgo: 1 },
      { userId: 'test_user_2', success: true, duration: 2400, type: 'terms_of_service', textLength: 1700, daysAgo: 0 }
    ];
    
    for (const summary of testSummaries) {
      const summaryId = `test_summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date(now.getTime() - (summary.daysAgo * 24 * 60 * 60 * 1000));
      
      try {
        // Inserir com data específica
        await db.query(`
          INSERT INTO summaries (summary_id, user_id, success, duration, type, text_length, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (summary_id) DO NOTHING
        `, [summaryId, summary.userId, summary.success, summary.duration, summary.type, summary.textLength, createdAt]);
        
        console.log(`✅ Resumo criado: ${summaryId} (${summary.daysAgo} dias atrás)`);
      } catch (error) {
        console.log(`⚠️ Resumo já existe: ${summaryId}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Base de dados populada com dados de teste',
      usersCreated: testUsers.length,
      summariesCreated: testSummaries.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao popular dados de teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao popular dados de teste: ' + error.message
    });
  }
});

// GET /users - Obter lista de utilizadores
router.get('/users', (req, res, next) => authService.authenticateToken(req, res, next), async (req, res) => {
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
