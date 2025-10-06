// Script para testar a API do dashboard
// ToS Privacy Summarizer - Debug Tool
//
// Este script testa os endpoints da API do dashboard para verificar
// se estão retornando os dados corretos.
//
// Uso: node test-api.js
// Requisitos: Backend rodando em http://localhost:3000

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do backend
const envPath = path.join(__dirname, '../backend/.env');
dotenv.config({ path: envPath });

const API_BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🔍 Testando API do dashboard...');
    console.log('🌐 URL base:', API_BASE_URL);
    console.log('');
    
    try {
        // Testar health check
        console.log('1️⃣ Testando health check...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        const healthData = await healthResponse.json();
        
        if (healthResponse.ok) {
            console.log('✅ Health check OK:', healthData.status);
        } else {
            console.log('❌ Health check falhou:', healthData);
        }
        
        // Testar endpoint de overview (sem autenticação)
        console.log('\n2️⃣ Testando endpoint de overview...');
        const overviewResponse = await fetch(`${API_BASE_URL}/api/analytics/overview`);
        const overviewData = await overviewResponse.json();
        
        if (overviewResponse.ok && overviewData.success) {
            console.log('✅ Overview API OK');
            console.log('📊 Dados retornados:');
            console.log('  - Total Users:', overviewData.data.total_users);
            console.log('  - Successful Summaries:', overviewData.data.successful_summaries);
            console.log('  - Failed Summaries:', overviewData.data.failed_summaries);
            console.log('  - Avg Duration (ms):', overviewData.data.avg_duration);
            console.log('  - Today Requests:', overviewData.data.today_requests);
        } else {
            console.log('❌ Overview API falhou:', overviewData.error || 'Erro desconhecido');
        }
        
        // Testar endpoint de summaries
        console.log('\n3️⃣ Testando endpoint de summaries...');
        const summariesResponse = await fetch(`${API_BASE_URL}/api/analytics/summaries`);
        const summariesData = await summariesResponse.json();
        
        if (summariesResponse.ok && summariesData.success) {
            console.log('✅ Summaries API OK');
            console.log('📊 Dados retornados:');
            console.log('  - Total Summaries:', summariesData.data.total_summaries);
            console.log('  - Successful:', summariesData.data.successful);
            console.log('  - Failed:', summariesData.data.failed);
            console.log('  - Avg Duration:', summariesData.data.avg_duration);
        } else {
            console.log('❌ Summaries API falhou:', summariesData.error || 'Erro desconhecido');
        }
        
        // Testar endpoint de summaries-history
        console.log('\n4️⃣ Testando endpoint de summaries-history...');
        const historyResponse = await fetch(`${API_BASE_URL}/api/analytics/summaries-history?limit=5`);
        const historyData = await historyResponse.json();
        
        if (historyResponse.ok && historyData.success) {
            console.log('✅ Summaries History API OK');
            console.log('📊 Dados retornados:');
            console.log('  - Total Records:', historyData.data.length);
            console.log('  - Pagination:', historyData.pagination);
            
            if (historyData.data.length > 0) {
                console.log('  - Último resumo:');
                const lastSummary = historyData.data[0];
                console.log(`    ID: ${lastSummary.summary_id}`);
                console.log(`    User: ${lastSummary.user_id}`);
                console.log(`    Success: ${lastSummary.success}`);
                console.log(`    Duration: ${lastSummary.duration}ms`);
            }
        } else {
            console.log('❌ Summaries History API falhou:', historyData.error || 'Erro desconhecido');
        }
        
        // Testar endpoint de realtime
        console.log('\n5️⃣ Testando endpoint de realtime...');
        const realtimeResponse = await fetch(`${API_BASE_URL}/api/analytics/realtime`);
        const realtimeData = await realtimeResponse.json();
        
        if (realtimeResponse.ok && realtimeData.success) {
            console.log('✅ Realtime API OK');
            console.log('📊 Dados retornados:');
            console.log('  - Active Users:', realtimeData.data.active_users);
            console.log('  - Requests Per Minute:', realtimeData.data.requests_per_minute);
            console.log('  - Current Response Time:', realtimeData.data.current_response_time);
            console.log('  - Uptime:', realtimeData.data.uptime);
            
            if (realtimeData.data.activity && realtimeData.data.activity.length > 0) {
                console.log('  - Activity Data:', realtimeData.data.activity.length, 'dias');
            }
        } else {
            console.log('❌ Realtime API falhou:', realtimeData.error || 'Erro desconhecido');
        }
        
        // Testar autenticação admin
        console.log('\n6️⃣ Testando autenticação admin...');
        const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: process.env.ADMIN_PASSWORD || 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok && loginData.success) {
            console.log('✅ Login admin OK');
            console.log('🔑 Token recebido:', loginData.token ? 'Sim' : 'Não');
            
            // Testar endpoint protegido com token
            if (loginData.token) {
                console.log('\n7️⃣ Testando endpoint protegido com token...');
                const protectedResponse = await fetch(`${API_BASE_URL}/api/analytics/users`, {
                    headers: {
                        'Authorization': `Bearer ${loginData.token}`
                    }
                });
                
                const protectedData = await protectedResponse.json();
                
                if (protectedResponse.ok && protectedData.success) {
                    console.log('✅ Endpoint protegido OK');
                    console.log('📊 Dados retornados:');
                    console.log('  - Total Users:', protectedData.data.length);
                    console.log('  - Count:', protectedData.count);
                } else {
                    console.log('❌ Endpoint protegido falhou:', protectedData.error || 'Erro desconhecido');
                }
            }
        } else {
            console.log('❌ Login admin falhou:', loginData.error || 'Erro desconhecido');
        }
        
        console.log('\n✅ Teste da API concluído');
        
    } catch (error) {
        console.error('❌ Erro no teste da API:', error);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n🔧 Possíveis soluções:');
            console.error('1. Verificar se o backend está rodando em http://localhost:3000');
            console.error('2. Executar: cd backend && npm start');
            console.error('3. Verificar se a porta 3000 está disponível');
        } else if (error.code === 'ENOTFOUND') {
            console.error('\n🔧 Possíveis soluções:');
            console.error('1. Verificar conectividade de rede');
            console.error('2. Verificar se o servidor está acessível');
        }
    }
}

// Executar teste
console.log('🚀 Iniciando teste da API...');
console.log('📅 Data/Hora:', new Date().toLocaleString('pt-PT'));
console.log('');

testAPI().catch(console.error);
