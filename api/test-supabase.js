import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🔍 Starting Supabase debug v2...');
    
    // Verificar variáveis de ambiente
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_ANON_KEY;
    
    console.log('Environment variables check:', { hasUrl, hasKey });
    
    if (!hasUrl || !hasKey) {
      return res.json({
        status: 'error',
        message: 'Missing environment variables',
        debug: {
          hasUrl,
          hasKey,
          urlLength: process.env.SUPABASE_URL?.length || 0,
          keyLength: process.env.SUPABASE_ANON_KEY?.length || 0,
          urlPrefix: process.env.SUPABASE_URL?.substring(0, 20) || 'NOT_SET',
          keyPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 20) || 'NOT_SET'
        }
      });
    }
    
    console.log('✅ Environment variables are set');
    
    // Tentar conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    console.log('🔗 Supabase client created');
    
    // Testar conexão básica
    console.log('🧪 Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError);
      return res.json({
        status: 'error',
        message: 'Supabase connection failed',
        error: {
          message: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        }
      });
    }
    
    console.log('✅ Supabase connection successful');
    
    // Testar todas as tabelas
    console.log('📊 Testing all tables...');
    
    const tables = ['users', 'summaries', 'analytics'];
    const tableResults = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        tableResults[table] = {
          count: count || 0,
          error: error ? error.message : null
        };
        
        console.log(`📋 Table ${table}: ${count || 0} records`);
      } catch (err) {
        tableResults[table] = {
          count: 0,
          error: err.message
        };
        console.error(`❌ Error testing table ${table}:`, err.message);
      }
    }
    
    // Testar função getOverviewData específica
    console.log('🎯 Testing getOverviewData function...');
    const today = new Date().toISOString().split('T')[0];
    
    const { data: analytics, error: analyticsError } = await supabase
      .from('analytics')
      .select('*')
      .eq('date', today)
      .single();
    
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalSummaries } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true });
    
    // Sucesso
    return res.json({
      status: 'success',
      message: 'Supabase debug v2 completed successfully',
      debug: {
        environmentVariables: {
          hasUrl,
          hasKey,
          urlPrefix: process.env.SUPABASE_URL?.substring(0, 30) + '...',
          keyPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 30) + '...'
        },
        connection: 'success',
        tables: tableResults,
        overviewTest: {
          today,
          analyticsRecord: analytics ? 'found' : 'not found',
          analyticsError: analyticsError ? analyticsError.message : null,
          totalUsers: totalUsers || 0,
          totalSummaries: totalSummaries || 0
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('💥 Debug function error:', error);
    return res.json({
      status: 'error',
      message: 'Debug function failed',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  }
}
