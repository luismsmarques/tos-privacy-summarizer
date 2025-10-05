export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verificar variáveis de ambiente sem usar Supabase
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_ANON_KEY;
    
    return res.json({
      status: 'success',
      message: 'Simple API test working',
      debug: {
        environmentVariables: {
          hasUrl,
          hasKey,
          urlLength: process.env.SUPABASE_URL?.length || 0,
          keyLength: process.env.SUPABASE_ANON_KEY?.length || 0,
          urlPrefix: process.env.SUPABASE_URL?.substring(0, 30) || 'NOT_SET',
          keyPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 30) || 'NOT_SET'
        },
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
      }
    });
    
  } catch (error) {
    return res.json({
      status: 'error',
      message: 'Simple API test failed',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
}
