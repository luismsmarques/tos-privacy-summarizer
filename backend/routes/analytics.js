import express from 'express';
import db from '../utils/database.js';
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
    
    // Se overview está vazio, tentar usar a view
    if (!overview || Object.keys(overview).length === 0) {
      console.log('⚠️ Overview vazio, tentando usar view...');
      try {
        const viewResult = await db.query('SELECT * FROM analytics_overview');
        const viewData = viewResult.rows[0] || {};
        console.log('📊 Dados da view:', viewData);
        
        res.json({
          success: true,
          data: viewData,
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
      data: overview,
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

// Endpoint para obter dados de utilizadores
router.get('/users', async (req, res) => {
  try {
    console.log('👥 Obtendo dados de utilizadores...');
    
    if (!db.isConnected) {
      const connected = await db.connect();
      if (!connected) {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível conectar à base de dados'
        });
      }
    }
    
    const usersData = await db.getAnalyticsUsers();
    res.json({
      success: true,
      data: usersData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter dados de utilizadores:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de utilizadores: ' + error.message
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
    
    const summariesData = await db.getAnalyticsSummaries();
    res.json({
      success: true,
      data: summariesData,
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
    // Mock data para tempo real (pode ser implementado depois)
    const realtimeData = {
      active_users: 0,
      requests_per_minute: 0,
      current_response_time: 0,
      uptime: 100
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

// Função para registrar novo utilizador
async function registerUser(userId, deviceId) {
  try {
    await db.createUser(userId, deviceId);
  } catch (error) {
    console.error('Error registering user:', error);
  }
}

// Função para registrar novo resumo
async function registerSummary(userId, success = true, duration = 0, type = 'unknown', textLength = 0) {
  try {
    const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.createSummary(summaryId, userId, success, duration, type, textLength);
  } catch (error) {
    console.error('Error registering summary:', error);
  }
}

// Exportar funções para uso em outras rotas
export { router, registerUser, registerSummary };
