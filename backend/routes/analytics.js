import express from 'express';
import db from '../utils/database.js';
const router = express.Router();

// Middleware para logging de requests
router.use(async (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    // Log request to database
    await db.logRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      req.get('User-Agent') || 'unknown',
      req.ip || req.connection.remoteAddress,
      req.userId || null
    );
    
    // Update performance metrics
    const hour = new Date().getHours();
    await db.updatePerformanceMetrics(
      hour,
      1, // 1 request
      duration,
      res.statusCode >= 400 ? 1 : 0, // 1 error if status >= 400
      duration
    );
  });
  
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

// Endpoint para obter analytics overview
router.get('/overview', async (req, res) => {
  try {
    // Verificar se a base de dados está conectada
    if (!db.isConnected) {
      await db.connect();
    }
    
    const overview = await db.getAnalyticsOverview();
    res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter overview:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de overview'
    });
  }
});

// Endpoint para obter dados de utilizadores
router.get('/users', async (req, res) => {
  try {
    const usersData = await db.getAnalyticsUsers();
    res.json({
      success: true,
      data: usersData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter dados de utilizadores:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de utilizadores'
    });
  }
});

// Endpoint para obter dados de resumos
router.get('/summaries', async (req, res) => {
  try {
    const summariesData = await db.getAnalyticsSummaries();
    res.json({
      success: true,
      data: summariesData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter dados de resumos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de resumos'
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
