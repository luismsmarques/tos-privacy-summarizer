// Script para testar conexão com Neon Postgres
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function testDatabase() {
    console.log('🧪 Testando conexão com Neon Postgres...');
    
    let pool = null;
    
    try {
        // Test 1: Conexão básica
        console.log('1️⃣ Testando conexão básica...');
        const databaseUrl = process.env.ANALYTICS_URL || process.env.DATABASE_URL;
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT 1 as test');
        client.release();
        console.log('✅ Conexão básica OK:', result.rows[0]);
        
        // Test 2: Verificar se as tabelas existem
        console.log('2️⃣ Verificando tabelas...');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('📊 Tabelas encontradas:', tables.rows.map(r => r.table_name));
        
        // Test 3: Testar inserção de dados
        console.log('3️⃣ Testando inserção de dados...');
        const testUser = await pool.query(`
            INSERT INTO users (user_id, device_id, credits)
            VALUES ('test_user_' || EXTRACT(EPOCH FROM NOW()), 'test_device', 5)
            RETURNING user_id, credits
        `);
        console.log('✅ Utilizador de teste criado:', testUser.rows[0]);
        
        // Test 4: Testar consulta
        console.log('4️⃣ Testando consulta...');
        const userCount = await pool.query('SELECT COUNT(*) as total FROM users');
        console.log('👥 Total de utilizadores:', userCount.rows[0].total);
        
        // Test 5: Limpar dados de teste
        console.log('5️⃣ Limpando dados de teste...');
        await pool.query(`DELETE FROM users WHERE user_id LIKE 'test_user_%'`);
        console.log('🧹 Dados de teste removidos');
        
        console.log('🎉 Todos os testes passaram! Base de dados funcionando corretamente.');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        
        if (error.message.includes('relation "users" does not exist')) {
            console.log('💡 Solução: Execute o schema.sql primeiro');
            console.log('   Pode executar manualmente no dashboard do Neon');
        }
        
        if (error.message.includes('connection')) {
            console.log('💡 Solução: Verifique a variável de ambiente DATABASE_URL');
        }
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Executar teste
testDatabase().then(() => {
    console.log('✅ Teste concluído');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Teste falhou:', error);
    process.exit(1);
});
