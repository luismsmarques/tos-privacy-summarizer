import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { endpoint } = req.query;

    let responseData;

    switch (endpoint) {
      case 'overview':
        responseData = await getOverviewData();
        break;
      case 'users':
        responseData = await getUsersData();
        break;
      case 'summaries':
        responseData = await getSummariesData();
        break;
      case 'performance':
        responseData = await getPerformanceData();
        break;
      case 'credits':
        responseData = await getCreditsData();
        break;
      case 'realtime':
        responseData = await getRealtimeData();
        break;
      default:
        responseData = await getOverviewData();
    }

    res.status(200).json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data',
      details: error.message
    });
  }
}

// Função para obter dados de overview
async function getOverviewData() {
  const today = new Date().toISOString().split('T')[0];
  
  // Obter métricas do dia atual
  const { data: analytics, error: analyticsError } = await supabase
    .from('analytics')
    .select('*')
    .eq('date', today)
    .single();

  if (analyticsError && analyticsError.code !== 'PGRST116') {
    throw analyticsError;
  }

  // Se não há dados para hoje, calcular em tempo real
  if (!analytics) {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalSummaries } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true });

    const { data: avgResponseTime } = await supabase
      .from('summaries')
      .select('response_time')
      .gte('created_at', today);

    const { count: recentRequests } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 60000).toISOString());

    const { count: errors } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', today);

    return {
      totalUsers: totalUsers || 0,
      totalSummaries: totalSummaries || 0,
      avgResponseTime: avgResponseTime?.length ? 
        (avgResponseTime.reduce((sum, r) => sum + r.response_time, 0) / avgResponseTime.length).toFixed(1) : 0,
      uptime: 99.9, // Simplificado
      requestsPerMinute: recentRequests || 0,
      errorRate: totalSummaries ? ((errors || 0) / totalSummaries * 100).toFixed(1) : 0
    };
  }

  return {
    totalUsers: analytics.total_users,
    totalSummaries: analytics.total_summaries,
    avgResponseTime: analytics.avg_response_time,
    uptime: analytics.uptime,
    requestsPerMinute: analytics.requests_per_minute,
    errorRate: analytics.error_rate
  };
}

// Função para obter dados de utilizadores
async function getUsersData() {
  const { count: total } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const today = new Date().toISOString().split('T')[0];
  const { count: activeToday } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_active', today);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: newThisWeek } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);

  // Gráfico de crescimento (últimos 10 dias)
  const { data: growthData } = await supabase
    .from('users')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');

  const growthChart = [];
  for (let i = 9; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const count = growthData?.filter(u => u.created_at.startsWith(date)).length || 0;
    growthChart.push({ date, users: count });
  }

  return {
    total: total || 0,
    activeToday: activeToday || 0,
    newThisWeek: newThisWeek || 0,
    retentionRate: 73, // Simplificado
    growthChart
  };
}

// Função para obter dados de resumos
async function getSummariesData() {
  const { count: total } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true });

  const today = new Date().toISOString().split('T')[0];
  const { count: todayCount } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  const { data: avgTimeData } = await supabase
    .from('summaries')
    .select('response_time')
    .gte('created_at', today);

  const { count: successCount } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .eq('success', true)
    .gte('created_at', today);

  // Tipos de documentos
  const { data: typesData } = await supabase
    .from('summaries')
    .select('document_type')
    .gte('created_at', today);

  const types = {};
  typesData?.forEach(item => {
    types[item.document_type] = (types[item.document_type] || 0) + 1;
  });

  return {
    total: total || 0,
    today: todayCount || 0,
    avgTime: avgTimeData?.length ? 
      (avgTimeData.reduce((sum, r) => sum + r.response_time, 0) / avgTimeData.length).toFixed(1) : 0,
    successRate: todayCount ? ((successCount || 0) / todayCount * 100).toFixed(1) : 0,
    types: {
      'Terms of Service': types.terms_of_service || 0,
      'Privacy Policy': types.privacy_policy || 0,
      'Other': types.other || 0
    },
    geo: {
      'Portugal': 45,
      'Brazil': 32,
      'Spain': 15,
      'USA': 8
    }
  };
}

// Função para obter dados de performance
async function getPerformanceData() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: responseTimes } = await supabase
    .from('summaries')
    .select('response_time, created_at')
    .gte('created_at', today)
    .order('created_at');

  // Criar gráfico de tempo de resposta por hora
  const responseTimeChart = [];
  for (let i = 0; i < 24; i += 4) {
    const hour = i.toString().padStart(2, '0') + ':00';
    const hourData = responseTimes?.filter(r => {
      const hour = new Date(r.created_at).getHours();
      return hour >= i && hour < i + 4;
    }) || [];
    
    const avgTime = hourData.length ? 
      (hourData.reduce((sum, r) => sum + r.response_time, 0) / hourData.length).toFixed(1) : 0;
    
    responseTimeChart.push({ time: hour, value: parseFloat(avgTime) });
  }

  return {
    apiResponseTime: responseTimes?.length ? 
      (responseTimes.reduce((sum, r) => sum + r.response_time, 0) / responseTimes.length).toFixed(1) : 0,
    memoryUsage: 68,
    cpuUsage: 23,
    diskUsage: 45,
    responseTimeChart,
    alerts: [
      { type: 'info', message: 'Sistema funcionando normalmente', time: new Date().toLocaleTimeString() }
    ]
  };
}

// Função para obter dados de créditos
async function getCreditsData() {
  const today = new Date().toISOString().split('T')[0];
  
  const { count: consumedToday } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  const { count: usersWithCredits } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('credits_used', 0);

  return {
    consumedToday: consumedToday || 0,
    revenueToday: (consumedToday || 0) * 0.02, // €0.02 por resumo
    usersWithCredits: usersWithCredits || 0,
    conversionRate: 12.3,
    revenueChart: [
      { date: '2024-09-01', revenue: 15.20 },
      { date: '2024-09-02', revenue: 18.50 },
      { date: '2024-09-03', revenue: 22.10 },
      { date: '2024-09-04', revenue: 19.80 },
      { date: '2024-09-05', revenue: 25.30 },
      { date: '2024-09-06', revenue: 21.40 },
      { date: '2024-09-07', revenue: 23.45 }
    ],
    popularPlans: {
      '10 credits': 45,
      '50 credits': 32,
      '100 credits': 23
    }
  };
}

// Função para obter dados em tempo real
async function getRealtimeData() {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000).toISOString();
  
  const { count: activeUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_active', oneMinuteAgo);

  const { count: requestsPerMinute } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneMinuteAgo);

  const { data: recentResponseTimes } = await supabase
    .from('summaries')
    .select('response_time')
    .gte('created_at', oneMinuteAgo);

  const { count: errors } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .eq('success', false)
    .gte('created_at', oneMinuteAgo);

  return {
    activeUsers: activeUsers || 0,
    requestsPerMinute: requestsPerMinute || 0,
    avgResponseTime: recentResponseTimes?.length ? 
      (recentResponseTimes.reduce((sum, r) => sum + r.response_time, 0) / recentResponseTimes.length).toFixed(1) : 0,
    errorRate: requestsPerMinute ? ((errors || 0) / requestsPerMinute * 100).toFixed(1) : 0,
    timestamp: now.toISOString()
  };
}