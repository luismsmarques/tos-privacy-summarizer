// Vercel serverless function para analytics
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
      // URL do backend para obter dados reais
      const backendUrl = process.env.BACKEND_URL || 'https://tos-privacy-summarizer.vercel.app';
      
      // Determinar endpoint baseado na query
      const { endpoint } = req.query;
      
      let apiEndpoint;
      switch (endpoint) {
        case 'overview':
          apiEndpoint = '/api/analytics/overview';
          break;
        case 'users':
          apiEndpoint = '/api/analytics/users';
          break;
        case 'summaries':
          apiEndpoint = '/api/analytics/summaries';
          break;
        case 'performance':
          apiEndpoint = '/api/analytics/performance';
          break;
        case 'credits':
          apiEndpoint = '/api/analytics/credits';
          break;
        case 'realtime':
          apiEndpoint = '/api/analytics/realtime';
          break;
        default:
          apiEndpoint = '/api/analytics/overview';
      }
      
      // Fazer chamada para o backend
      const response = await fetch(`${backendUrl}${apiEndpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const data = await response.json();
      
      res.status(200).json(data);

    } catch (error) {
      console.error('Analytics API error:', error);
      
      // Fallback para mock data se o backend não estiver disponível
      const mockData = {
        overview: {
          totalUsers: 0,
          totalSummaries: 0,
          avgResponseTime: 0,
          uptime: 0,
          requestsPerMinute: 0,
          errorRate: 0
        },
        users: {
          total: 0,
          activeToday: 0,
          newThisWeek: 0,
          retentionRate: 0,
          growthChart: []
        },
        summaries: {
          total: 0,
          today: 0,
          avgTime: 0,
          successRate: 0,
          types: {},
          geo: {}
        },
        performance: {
          apiResponseTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          diskUsage: 0,
          responseTimeChart: [],
          alerts: []
        },
        credits: {
          consumedToday: 0,
          revenueToday: 0,
          usersWithCredits: 0,
          conversionRate: 0,
          revenueChart: [],
          popularPlans: {}
        },
        realtime: {
          activeUsers: 0,
          requestsPerMinute: 0,
          avgResponseTime: 0,
          errorRate: 0,
          timestamp: new Date().toISOString()
        }
      };
      
      const { endpoint } = req.query;
      let responseData;
      switch (endpoint) {
        case 'overview':
          responseData = mockData.overview;
          break;
        case 'users':
          responseData = mockData.users;
          break;
        case 'summaries':
          responseData = mockData.summaries;
          break;
        case 'performance':
          responseData = mockData.performance;
          break;
        case 'credits':
          responseData = mockData.credits;
          break;
        case 'realtime':
          responseData = mockData.realtime;
          break;
        default:
          responseData = mockData.overview;
      }
      
      res.status(200).json({
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
        fallback: true
      });
    }
}