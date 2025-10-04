const express = require('express');
const router = express.Router();

// Mock data para desenvolvimento
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
  }
};

// Endpoint principal para analytics
router.get('/', (req, res) => {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Determinar endpoint baseado na query
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
        responseData = {
          activeUsers: Math.floor(Math.random() * 50) + 20,
          requestsPerMinute: Math.floor(Math.random() * 30) + 15,
          avgResponseTime: (Math.random() * 2 + 1.5).toFixed(1),
          errorRate: (Math.random() * 3).toFixed(1),
          timestamp: new Date().toISOString()
        };
        break;
      default:
        responseData = mockData.overview;
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
      error: 'Failed to fetch analytics data'
    });
  }
});

module.exports = router;
