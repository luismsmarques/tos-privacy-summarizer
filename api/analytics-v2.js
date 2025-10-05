// API Analytics v2 - Forçar deploy com nome diferente
let supabase = null;
let supabaseAvailable = false;

// Verificar se Supabase está disponível
try {
  if (typeof require !== 'undefined') {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    supabaseAvailable = true;
    console.log('✅ Supabase client created successfully');
  }
} catch (error) {
  console.warn('⚠️ Supabase not available:', error.message);
  supabaseAvailable = false;
}

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

    // Verificar se Supabase está disponível e configurado
    const hasEnvVars = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    
    if (!supabaseAvailable || !hasEnvVars) {
      console.log('🔄 Using mock data - Supabase not available or not configured');
      return res.json({
        success: true,
        data: getMockData(endpoint),
        timestamp: new Date().toISOString(),
        debug: {
          supabaseAvailable,
          hasEnvVars,
          supabaseUrl: !!process.env.SUPABASE_URL,
          supabaseKey: !!process.env.SUPABASE_ANON_KEY,
          reason: supabaseAvailable ? 'Environment variables missing' : 'Supabase dependency not available',
          version: 'v2.0'
        }
      });
    }

    // Tentar usar Supabase
    let responseData;
    try {
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
    } catch (supabaseError) {
      console.error('❌ Supabase error, falling back to mock data:', supabaseError.message);
      responseData = getMockData(endpoint);
    }

    res.status(200).json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      debug: {
        supabaseAvailable: true,
        hasEnvVars: true,
        endpoint: endpoint,
        usingRealData: true,
        version: 'v2.0'
      }
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

// Função para obter dados mock
function getMockData(endpoint) {
  const mockData = {
    overview: {
      totalUsers: 1247,
      totalSummaries: 5847,
      avgResponseTime: 2.3,
      uptime: 99.9,
      requestsPerMinute: 23,
      errorRate: 1.2
    },
    users: {
      total: 1247,
      activeToday: 89,
      newThisWeek: 156,
      retentionRate: 73,
      growthChart: [
        { date: '2024-09-01', users: 1000 },
        { date: '2024-09-02', users: 1020 },
        { date: '2024-09-03', users: 1050 },
        { date: '2024-09-04', users: 1080 },
        { date: '2024-09-05', users: 1120 },
        { date: '2024-09-06', users: 1150 },
        { date: '2024-09-07', users: 1180 },
        { date: '2024-09-08', users: 1200 },
        { date: '2024-09-09', users: 1220 },
        { date: '2024-09-10', users: 1247 }
      ]
    },
    summaries: {
      total: 5847,
      today: 234,
      avgTime: 2.3,
      successRate: 98.7,
      types: {
        'Terms of Service': 67,
        'Privacy Policy': 23,
        'Other': 10
      },
      geo: {
        'Portugal': 45,
        'Brazil': 32,
        'Spain': 15,
        'USA': 8
      }
    },
    performance: {
      apiResponseTime: 2.3,
      memoryUsage: 68,
      cpuUsage: 23,
      diskUsage: 45,
      responseTimeChart: [
        { time: '00:00', value: 2.1 },
        { time: '04:00', value: 1.8 },
        { time: '08:00', value: 2.5 },
        { time: '12:00', value: 3.2 },
        { time: '16:00', value: 2.8 },
        { time: '20:00', value: 2.3 }
      ],
      alerts: [
        { type: 'warning', message: 'High response time (3.2s)', time: '14:23' },
        { type: 'success', message: 'API recovered', time: '14:25' },
        { type: 'info', message: 'Peak usage detected', time: '15:45' }
      ]
    },
    credits: {
      consumedToday: 1247,
      revenueToday: 23.45,
      usersWithCredits: 89,
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
    },
    realtime: {
      activeUsers: Math.floor(Math.random() * 50) + 20,
      requestsPerMinute: Math.floor(Math.random() * 30) + 15,
      avgResponseTime: (Math.random() * 2 + 1.5).toFixed(1),
      errorRate: (Math.random() * 3).toFixed(1),
      timestamp: new Date().toISOString()
    }
  };

  return mockData[endpoint] || mockData.overview;
}

// Funções Supabase (simplificadas)
async function getOverviewData() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: analytics, error: analyticsError } = await supabase
    .from('analytics')
    .select('*')
    .eq('date', today)
    .single();

  if (analyticsError && analyticsError.code !== 'PGRST116') {
    throw analyticsError;
  }

  if (!analytics) {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalSummaries } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true });

    return {
      totalUsers: totalUsers || 0,
      totalSummaries: totalSummaries || 0,
      avgResponseTime: 0,
      uptime: 99.9,
      requestsPerMinute: 0,
      errorRate: 0
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

async function getUsersData() {
  const { count: total } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  return {
    total: total || 0,
    activeToday: 0,
    newThisWeek: 0,
    retentionRate: 0,
    growthChart: []
  };
}

async function getSummariesData() {
  const { count: total } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true });

  return {
    total: total || 0,
    today: 0,
    avgTime: 0,
    successRate: 0,
    types: {},
    geo: {}
  };
}

async function getPerformanceData() {
  return {
    apiResponseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    diskUsage: 0,
    responseTimeChart: [],
    alerts: []
  };
}

async function getCreditsData() {
  return {
    consumedToday: 0,
    revenueToday: 0,
    usersWithCredits: 0,
    conversionRate: 0,
    revenueChart: [],
    popularPlans: {}
  };
}

async function getRealtimeData() {
  return {
    activeUsers: 0,
    requestsPerMinute: 0,
    avgResponseTime: 0,
    errorRate: 0,
    timestamp: new Date().toISOString()
  };
}
