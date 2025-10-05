import express from 'express';
const router = express.Router();

// Simulação de base de dados em memória (em produção usar PostgreSQL/MongoDB)
let analyticsData = {
  users: new Map(),
  summaries: new Map(),
  performance: new Map(),
  credits: new Map(),
  requests: []
};

// Middleware para logging de requests
router.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const requestData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent') || 'unknown',
      ip: req.ip || req.connection.remoteAddress
    };
    
    // Armazenar request
    analyticsData.requests.push(requestData);
    
    // Manter apenas últimos 1000 requests
    if (analyticsData.requests.length > 1000) {
      analyticsData.requests = analyticsData.requests.slice(-1000);
    }
    
    // Atualizar métricas de performance
    updatePerformanceMetrics(requestData);
  });
  
  next();
});

// Endpoint para obter analytics overview
router.get('/overview', async (req, res) => {
  try {
    const overview = await getOverviewData();
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
    const usersData = await getUsersData();
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
    const summariesData = await getSummariesData();
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
    const performanceData = await getPerformanceData();
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
    const creditsData = await getCreditsData();
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
    const realtimeData = await getRealtimeData();
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
function registerUser(userId, deviceId) {
  const now = new Date();
  analyticsData.users.set(userId, {
    userId,
    deviceId,
    firstSeen: now,
    lastSeen: now,
    totalRequests: 0,
    summariesGenerated: 0
  });
}

// Função para registrar novo resumo
function registerSummary(userId, success = true, duration = 0) {
  const now = new Date();
  const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  analyticsData.summaries.set(summaryId, {
    summaryId,
    userId,
    timestamp: now,
    success,
    duration,
    type: 'unknown' // Será determinado pelo content.js
  });
  
  // Atualizar contador do utilizador
  if (analyticsData.users.has(userId)) {
    const user = analyticsData.users.get(userId);
    user.lastSeen = now;
    user.totalRequests++;
    if (success) {
      user.summariesGenerated++;
    }
    analyticsData.users.set(userId, user);
  }
}

// Função para atualizar métricas de performance
function updatePerformanceMetrics(requestData) {
  const now = new Date();
  const hour = now.getHours();
  
  if (!analyticsData.performance.has(hour)) {
    analyticsData.performance.set(hour, {
      hour,
      requests: 0,
      avgResponseTime: 0,
      errors: 0,
      totalDuration: 0
    });
  }
  
  const hourData = analyticsData.performance.get(hour);
  hourData.requests++;
  hourData.totalDuration += requestData.duration;
  hourData.avgResponseTime = hourData.totalDuration / hourData.requests;
  
  if (requestData.statusCode >= 400) {
    hourData.errors++;
  }
  
  analyticsData.performance.set(hour, hourData);
}

// Função para obter dados de overview
async function getOverviewData() {
  const totalUsers = analyticsData.users.size;
  const totalSummaries = analyticsData.summaries.size;
  
  // Calcular tempo médio de resposta dos últimos 100 requests
  const recentRequests = analyticsData.requests.slice(-100);
  const avgResponseTime = recentRequests.length > 0 
    ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length / 1000
    : 0;
  
  // Calcular uptime (assumindo 99.9% se não há erros recentes)
  const recentErrors = recentRequests.filter(req => req.statusCode >= 400).length;
  const uptime = recentRequests.length > 0 
    ? ((recentRequests.length - recentErrors) / recentRequests.length) * 100
    : 99.9;
  
  // Calcular requests por minuto
  const now = Date.now();
  const lastMinuteRequests = analyticsData.requests.filter(req => 
    new Date(req.timestamp).getTime() > now - 60000
  ).length;
  
  // Calcular taxa de erro
  const errorRate = recentRequests.length > 0 
    ? (recentErrors / recentRequests.length) * 100
    : 0;
  
  return {
    totalUsers,
    totalSummaries,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    uptime: Math.round(uptime * 100) / 100,
    requestsPerMinute: lastMinuteRequests,
    errorRate: Math.round(errorRate * 100) / 100
  };
}

// Função para obter dados de utilizadores
async function getUsersData() {
  const users = Array.from(analyticsData.users.values());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const activeToday = users.filter(user => 
    new Date(user.lastSeen) >= today
  ).length;
  
  const newThisWeek = users.filter(user => 
    new Date(user.firstSeen) >= weekAgo
  ).length;
  
  // Calcular taxa de retenção (simplificado)
  const retentionRate = users.length > 0 
    ? (activeToday / users.length) * 100
    : 0;
  
  // Gerar gráfico de crescimento (últimos 7 dias)
  const growthChart = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const usersOnDate = users.filter(user => 
      new Date(user.firstSeen) <= date
    ).length;
    
    growthChart.push({
      date: date.toISOString().split('T')[0],
      users: usersOnDate
    });
  }
  
  return {
    total: users.length,
    activeToday,
    newThisWeek,
    retentionRate: Math.round(retentionRate * 100) / 100,
    growthChart
  };
}

// Função para obter dados de resumos
async function getSummariesData() {
  const summaries = Array.from(analyticsData.summaries.values());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const todaySummaries = summaries.filter(summary => 
    new Date(summary.timestamp) >= today
  ).length;
  
  const successfulSummaries = summaries.filter(summary => summary.success);
  const avgTime = successfulSummaries.length > 0
    ? successfulSummaries.reduce((sum, s) => sum + s.duration, 0) / successfulSummaries.length / 1000
    : 0;
  
  const successRate = summaries.length > 0
    ? (successfulSummaries.length / summaries.length) * 100
    : 0;
  
  // Simular tipos de documento (em produção seria determinado pelo content.js)
  const types = {
    'Terms of Service': Math.floor(summaries.length * 0.6),
    'Privacy Policy': Math.floor(summaries.length * 0.3),
    'Other': Math.floor(summaries.length * 0.1)
  };
  
  // Simular distribuição geográfica (em produção seria determinado pelo IP)
  const geo = {
    'Portugal': Math.floor(summaries.length * 0.4),
    'Brazil': Math.floor(summaries.length * 0.3),
    'Spain': Math.floor(summaries.length * 0.15),
    'USA': Math.floor(summaries.length * 0.15)
  };
  
  return {
    total: summaries.length,
    today: todaySummaries,
    avgTime: Math.round(avgTime * 100) / 100,
    successRate: Math.round(successRate * 100) / 100,
    types,
    geo
  };
}

// Função para obter dados de performance
async function getPerformanceData() {
  const recentRequests = analyticsData.requests.slice(-100);
  const avgResponseTime = recentRequests.length > 0
    ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length / 1000
    : 0;
  
  // Simular métricas de sistema (em produção seria obtido do sistema)
  const memoryUsage = Math.floor(Math.random() * 30) + 50; // 50-80%
  const cpuUsage = Math.floor(Math.random() * 20) + 10; // 10-30%
  const diskUsage = Math.floor(Math.random() * 20) + 30; // 30-50%
  
  // Gerar gráfico de tempo de resposta por hora
  const responseTimeChart = [];
  for (let i = 0; i < 24; i++) {
    const hourData = analyticsData.performance.get(i);
    responseTimeChart.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      value: hourData ? Math.round(hourData.avgResponseTime / 1000 * 100) / 100 : 0
    });
  }
  
  // Simular alertas
  const alerts = [];
  if (avgResponseTime > 3) {
    alerts.push({
      type: 'warning',
      message: `High response time (${avgResponseTime.toFixed(1)}s)`,
      time: new Date().toLocaleTimeString()
    });
  }
  
  if (recentRequests.filter(req => req.statusCode >= 400).length > 5) {
    alerts.push({
      type: 'error',
      message: 'High error rate detected',
      time: new Date().toLocaleTimeString()
    });
  }
  
  return {
    apiResponseTime: Math.round(avgResponseTime * 100) / 100,
    memoryUsage,
    cpuUsage,
    diskUsage,
    responseTimeChart,
    alerts
  };
}

// Função para obter dados de créditos
async function getCreditsData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Contar créditos consumidos hoje
  const todaySummaries = Array.from(analyticsData.summaries.values()).filter(summary => 
    new Date(summary.timestamp) >= today && summary.success
  ).length;
  
  // Simular receita (em produção seria obtido do Stripe)
  const revenueToday = todaySummaries * 0.02; // €0.02 por resumo
  
  // Simular utilizadores com créditos
  const usersWithCredits = Math.floor(analyticsData.users.size * 0.1);
  
  // Simular taxa de conversão
  const conversionRate = Math.random() * 20 + 5; // 5-25%
  
  // Gerar gráfico de receita (últimos 7 dias)
  const revenueChart = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const summariesOnDate = Array.from(analyticsData.summaries.values()).filter(summary => {
      const summaryDate = new Date(summary.timestamp);
      return summaryDate.getFullYear() === date.getFullYear() &&
             summaryDate.getMonth() === date.getMonth() &&
             summaryDate.getDate() === date.getDate() &&
             summary.success;
    }).length;
    
    revenueChart.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.round(summariesOnDate * 0.02 * 100) / 100
    });
  }
  
  // Simular planos populares
  const popularPlans = {
    '10 credits': Math.floor(usersWithCredits * 0.5),
    '50 credits': Math.floor(usersWithCredits * 0.3),
    '100 credits': Math.floor(usersWithCredits * 0.2)
  };
  
  return {
    consumedToday: todaySummaries,
    revenueToday: Math.round(revenueToday * 100) / 100,
    usersWithCredits,
    conversionRate: Math.round(conversionRate * 100) / 100,
    revenueChart,
    popularPlans
  };
}

// Função para obter dados em tempo real
async function getRealtimeData() {
  const now = Date.now();
  const lastMinute = analyticsData.requests.filter(req => 
    new Date(req.timestamp).getTime() > now - 60000
  );
  
  const activeUsers = new Set(lastMinute.map(req => req.ip)).size;
  const requestsPerMinute = lastMinute.length;
  
  const avgResponseTime = lastMinute.length > 0
    ? lastMinute.reduce((sum, req) => sum + req.duration, 0) / lastMinute.length / 1000
    : 0;
  
  const errorRate = lastMinute.length > 0
    ? (lastMinute.filter(req => req.statusCode >= 400).length / lastMinute.length) * 100
    : 0;
  
  return {
    activeUsers,
    requestsPerMinute,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    timestamp: new Date().toISOString()
  };
}

// Exportar funções para uso em outras rotas
export { router, registerUser, registerSummary };
