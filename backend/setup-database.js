// Script para executar schema.sql na base de dados Neon Postgres
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSchema() {
    console.log('🚀 Executando schema.sql na base de dados Neon...');
    
    let pool = null;
    
    try {
        // Criar pool de conexões
        const databaseUrl = process.env.ANALYTICS_URL || process.env.DATABASE_URL;
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        // Ler ficheiro schema.sql
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📄 Schema carregado:', schema.length, 'caracteres');
        
        // Dividir em statements individuais
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log('📝 Encontrados', statements.length, 'statements SQL');
        
        // Executar cada statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    console.log(`⏳ Executando statement ${i + 1}/${statements.length}...`);
                    await pool.query(statement);
                    console.log(`✅ Statement ${i + 1} executado com sucesso`);
                } catch (error) {
                    console.warn(`⚠️ Statement ${i + 1} falhou:`, error.message);
                    // Continuar com os próximos statements
                }
            }
        }
        
        // Verificar se as tabelas foram criadas
        console.log('🔍 Verificando tabelas criadas...');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📊 Tabelas criadas:');
        tables.rows.forEach(table => {
            console.log(`  - ${table.table_name}`);
        });
        
        // Verificar views criadas
        const views = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('👁️ Views criadas:');
        views.rows.forEach(view => {
            console.log(`  - ${view.table_name}`);
        });
        
        console.log('🎉 Schema executado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao executar schema:', error);
        throw error;
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Executar schema
runSchema().then(() => {
    console.log('✅ Schema concluído');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Schema falhou:', error);
    process.exit(1);
});
