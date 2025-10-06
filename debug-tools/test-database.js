// Script para testar a conexão com a base de dados e verificar dados reais
// ToS Privacy Summarizer - Debug Tool
// 
// Este script testa a conexão com a base de dados Neon Postgres e verifica
// os dados reais para debug do dashboard.
//
// Uso: node test-database.js
// Requisitos: npm install pg dotenv (no diretório backend)

import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do backend
const envPath = path.join(__dirname, '../backend/.env');
dotenv.config({ path: envPath });

const { Pool } = pkg;

async function testDatabase() {
    console.log('🔍 Testando conexão com a base de dados...');
    console.log('📁 Carregando configurações de:', envPath);
    
    // Verificar se as variáveis de ambiente estão configuradas
    const databaseUrl = process.env.ANALYTICS_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ Erro: ANALYTICS_URL ou DATABASE_URL não configurada');
        console.error('   Verifique o arquivo .env no diretório backend');
        return;
    }
    
    console.log('🔗 URL da base de dados configurada:', databaseUrl.substring(0, 50) + '...');
    
    const pool = new Pool({
        connectionString: databaseUrl,
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
        
        const tables = tablesResult.rows.map(row => row.table_name);
        console.log('Tabelas encontradas:', tables);
        
        // Verificar tabelas obrigatórias
        const requiredTables = ['users', 'summaries', 'requests'];
        const missingTables = requiredTables.filter(table => !tables.includes(table));
        if (missingTables.length > 0) {
            console.warn('⚠️ Tabelas obrigatórias em falta:', missingTables);
        } else {
            console.log('✅ Todas as tabelas obrigatórias estão presentes');
        }
        
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
        
        // Calcular taxa de sucesso
        const totalSummaries = parseInt(summariesCount.rows[0].count);
        const successfulSummaries = parseInt(successfulCount.rows[0].count);
        const successRate = totalSummaries > 0 ? (successfulSummaries / totalSummaries * 100).toFixed(1) : '0';
        console.log('Taxa de sucesso:', successRate + '%');
        
        // Verificar tempo médio
        const avgTime = await client.query('SELECT AVG(duration) as avg_duration FROM summaries WHERE success = true');
        const avgDurationMs = avgTime.rows[0].avg_duration;
        const avgDurationSec = avgDurationMs ? (avgDurationMs / 1000).toFixed(1) : 'N/A';
        console.log('Tempo médio (ms):', avgDurationMs);
        console.log('Tempo médio (s):', avgDurationSec);
        
        // Verificar dados na tabela users
        console.log('\n👥 Verificando dados na tabela users...');
        const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
        console.log('Total de utilizadores:', usersCount.rows[0].count);
        
        // Verificar utilizadores ativos (últimos 7 dias)
        const activeUsers = await client.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE last_seen >= CURRENT_DATE - INTERVAL '7 days'
        `);
        console.log('Utilizadores ativos (7 dias):', activeUsers.rows[0].count);
        
        // Verificar dados na tabela requests
        console.log('\n📡 Verificando dados na tabela requests...');
        const requestsCount = await client.query('SELECT COUNT(*) as count FROM requests');
        console.log('Total de requests:', requestsCount.rows[0].count);
        
        // Verificar requests de hoje
        const todayRequests = await client.query('SELECT COUNT(*) as count FROM requests WHERE DATE(timestamp) = CURRENT_DATE');
        console.log('Requests de hoje:', todayRequests.rows[0].count);
        
        // Verificar requests dos últimos 7 dias
        const weekRequests = await client.query(`
            SELECT COUNT(*) as count 
            FROM requests 
            WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        `);
        console.log('Requests (últimos 7 dias):', weekRequests.rows[0].count);
        
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
        
        if (recentSummaries.rows.length === 0) {
            console.log('Nenhum resumo encontrado');
        } else {
            recentSummaries.rows.forEach((summary, index) => {
                const durationSec = (summary.duration / 1000).toFixed(1);
                const createdDate = new Date(summary.created_at).toLocaleString('pt-PT');
                console.log(`${index + 1}. ID: ${summary.summary_id}`);
                console.log(`   User: ${summary.user_id}`);
                console.log(`   Success: ${summary.success}`);
                console.log(`   Duration: ${durationSec}s`);
                console.log(`   Type: ${summary.document_type}`);
                console.log(`   Created: ${createdDate}`);
                console.log('');
            });
        }
        
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
        
        // Verificar tipos de documentos
        console.log('\n📋 Verificando tipos de documentos:');
        const documentTypes = await client.query(`
            SELECT 
                COALESCE(type, document_type, 'unknown') as doc_type,
                COUNT(*) as count
            FROM summaries 
            WHERE success = true
            GROUP BY COALESCE(type, document_type, 'unknown')
            ORDER BY count DESC
        `);
        
        documentTypes.rows.forEach(row => {
            console.log(`- ${row.doc_type}: ${row.count} resumos`);
        });
        
        // Verificar performance por hora (últimas 24h)
        console.log('\n⏰ Performance por hora (últimas 24h):');
        const hourlyPerformance = await client.query(`
            SELECT 
                EXTRACT(hour FROM created_at) as hour,
                COUNT(*) as summaries_count,
                AVG(duration) as avg_duration
            FROM summaries 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY EXTRACT(hour FROM created_at)
            ORDER BY hour DESC
            LIMIT 10
        `);
        
        if (hourlyPerformance.rows.length === 0) {
            console.log('Nenhuma atividade nas últimas 24 horas');
        } else {
            hourlyPerformance.rows.forEach(row => {
                const avgSec = (row.avg_duration / 1000).toFixed(1);
                console.log(`- ${row.hour}:00 - ${row.summaries_count} resumos, ${avgSec}s média`);
            });
        }
        
        client.release();
        console.log('\n✅ Teste concluído com sucesso');
        
        // Resumo final
        console.log('\n📊 RESUMO FINAL:');
        console.log(`- Total de utilizadores: ${usersCount.rows[0].count}`);
        console.log(`- Total de resumos: ${summariesCount.rows[0].count}`);
        console.log(`- Resumos bem-sucedidos: ${successfulCount.rows[0].count}`);
        console.log(`- Resumos falhados: ${failedCount.rows[0].count}`);
        console.log(`- Taxa de sucesso: ${successRate}%`);
        console.log(`- Tempo médio: ${avgDurationSec}s`);
        console.log(`- Requests hoje: ${todayRequests.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n🔧 Possíveis soluções:');
            console.error('1. Verificar se ANALYTICS_URL está configurada no .env');
            console.error('2. Verificar se a base de dados Neon está ativa');
            console.error('3. Verificar conectividade de rede');
        } else if (error.code === 'ENOTFOUND') {
            console.error('\n🔧 Possíveis soluções:');
            console.error('1. Verificar se a URL da base de dados está correta');
            console.error('2. Verificar conectividade DNS');
        }
    } finally {
        await pool.end();
    }
}

// Executar teste
console.log('🚀 Iniciando teste de base de dados...');
console.log('📅 Data/Hora:', new Date().toLocaleString('pt-PT'));
console.log('');

testDatabase().catch(console.error);