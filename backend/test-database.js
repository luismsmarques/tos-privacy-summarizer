// Script para testar a conexão com a base de dados e verificar dados
import pkg from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const { Pool } = pkg;

async function testDatabase() {
    console.log('🔍 Testando conexão com a base de dados...');
    
    const pool = new Pool({
        connectionString: process.env.ANALYTICS_URL || process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        const client = await pool.connect();
        console.log('✅ Conexão estabelecida com sucesso');
        
        // Verificar tabelas existentes
        console.log('\n📋 Verificando tabelas existentes...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('Tabelas encontradas:', tablesResult.rows.map(row => row.table_name));
        
        // Verificar dados na tabela summaries
        console.log('\n📊 Verificando dados na tabela summaries...');
        const summariesCount = await client.query('SELECT COUNT(*) as count FROM summaries');
        console.log('Total de resumos:', summariesCount.rows[0].count);
        
        // Verificar resumos bem-sucedidos
        const successfulCount = await client.query('SELECT COUNT(*) as count FROM summaries WHERE success = true');
        console.log('Resumos bem-sucedidos:', successfulCount.rows[0].count);
        
        // Verificar resumos falhados
        const failedCount = await client.query('SELECT COUNT(*) as count FROM summaries WHERE success = false');
        console.log('Resumos falhados:', failedCount.rows[0].count);
        
        // Verificar tempo médio
        const avgTime = await client.query('SELECT AVG(duration) as avg_duration FROM summaries WHERE success = true');
        console.log('Tempo médio (ms):', avgTime.rows[0].avg_duration);
        console.log('Tempo médio (s):', (avgTime.rows[0].avg_duration / 1000).toFixed(1));
        
        // Verificar dados na tabela users
        console.log('\n👥 Verificando dados na tabela users...');
        const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
        console.log('Total de utilizadores:', usersCount.rows[0].count);
        
        // Verificar dados na tabela requests
        console.log('\n📡 Verificando dados na tabela requests...');
        const requestsCount = await client.query('SELECT COUNT(*) as count FROM requests');
        console.log('Total de requests:', requestsCount.rows[0].count);
        
        // Verificar requests de hoje
        const todayRequests = await client.query('SELECT COUNT(*) as count FROM requests WHERE DATE(timestamp) = CURRENT_DATE');
        console.log('Requests de hoje:', todayRequests.rows[0].count);
        
        // Verificar últimos resumos
        console.log('\n📄 Últimos 5 resumos:');
        const recentSummaries = await client.query(`
            SELECT 
                summary_id, 
                user_id, 
                success, 
                duration, 
                text_length, 
                created_at,
                COALESCE(type, document_type, 'unknown') as document_type
            FROM summaries 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        recentSummaries.rows.forEach((summary, index) => {
            console.log(`${index + 1}. ID: ${summary.summary_id}, User: ${summary.user_id}, Success: ${summary.success}, Duration: ${summary.duration}ms, Type: ${summary.document_type}, Created: ${summary.created_at}`);
        });
        
        // Testar query do analytics overview
        console.log('\n📈 Testando query do analytics overview...');
        const overviewResult = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM summaries WHERE success = true) as successful_summaries,
                (SELECT COUNT(*) FROM summaries WHERE success = false) as failed_summaries,
                (SELECT AVG(duration) FROM summaries WHERE success = true) as avg_duration,
                (SELECT COUNT(*) FROM requests WHERE timestamp >= CURRENT_DATE) as today_requests
        `);
        
        const overview = overviewResult.rows[0];
        console.log('Overview Analytics:');
        console.log('- Total Users:', overview.total_users);
        console.log('- Successful Summaries:', overview.successful_summaries);
        console.log('- Failed Summaries:', overview.failed_summaries);
        console.log('- Avg Duration (ms):', overview.avg_duration);
        console.log('- Avg Duration (s):', overview.avg_duration ? (overview.avg_duration / 1000).toFixed(1) : 'N/A');
        console.log('- Today Requests:', overview.today_requests);
        
        client.release();
        console.log('\n✅ Teste concluído com sucesso');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await pool.end();
    }
}

// Executar teste
testDatabase().catch(console.error);
