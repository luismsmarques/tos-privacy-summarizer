import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function updateSchema() {
    try {
        console.log('🔄 Atualizando schema da base de dados...');
        
        // Adicionar colunas de rating se não existirem
        const alterQueries = [
            'ALTER TABLE summaries ADD COLUMN IF NOT EXISTS rating_complexidade INTEGER DEFAULT 0;',
            'ALTER TABLE summaries ADD COLUMN IF NOT EXISTS rating_boas_praticas INTEGER DEFAULT 0;',
            'ALTER TABLE summaries ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;'
        ];
        
        for (const query of alterQueries) {
            try {
                await pool.query(query);
                console.log(`✅ Query executada: ${query.split(' ')[5]}`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`⚠️ Coluna já existe: ${query.split(' ')[5]}`);
                } else {
                    console.error(`❌ Erro na query: ${error.message}`);
                }
            }
        }
        
        // Verificar se as colunas foram adicionadas
        const checkQuery = `
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'summaries' 
            AND column_name IN ('rating_complexidade', 'rating_boas_praticas', 'risk_score')
            ORDER BY column_name;
        `;
        
        const result = await pool.query(checkQuery);
        console.log('\n📊 Colunas de rating na tabela summaries:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
        });
        
        console.log('\n✅ Schema atualizado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar schema:', error);
    } finally {
        await pool.end();
    }
}

updateSchema();
