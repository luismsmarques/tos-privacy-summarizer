// Test API - Version 2.0.0
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.json({
    success: true,
    message: 'Test API v2.0.0 working!',
    timestamp: new Date().toISOString(),
    version: '2.0.0-simple-analytics',
    system: 'new-analytics-system',
    debug: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      deployTime: '2025-10-05T13:20:00Z'
    }
  });
}
