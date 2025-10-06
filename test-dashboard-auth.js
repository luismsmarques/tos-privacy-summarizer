#!/usr/bin/env node

// Script para testar autenticação do dashboard
const BACKEND_URL = 'https://tos-privacy-summarizer.vercel.app';

async function testDashboardAuth() {
    console.log('🔐 Testando autenticação do dashboard...\n');
    
    try {
        // 1. Testar acesso ao dashboard sem token
        console.log('1️⃣ Testando acesso sem token...');
        const dashboardResponse = await fetch(`${BACKEND_URL}/dashboard`);
        console.log('Status:', dashboardResponse.status);
        
        if (dashboardResponse.status === 401) {
            console.log('✅ Dashboard protegido corretamente');
        } else {
            console.log('⚠️ Dashboard pode não estar protegido');
        }
        
        // 2. Testar login com credenciais padrão
        console.log('\n2️⃣ Testando login com credenciais padrão...');
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        console.log('Status do login:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login bem-sucedido!');
            console.log('Token recebido:', loginData.token ? 'Sim' : 'Não');
            
            // 3. Testar acesso ao dashboard com token
            console.log('\n3️⃣ Testando acesso ao dashboard com token...');
            const protectedResponse = await fetch(`${BACKEND_URL}/dashboard`, {
                headers: {
                    'Cookie': `adminToken=${loginData.token}`
                }
            });
            
            console.log('Status do dashboard protegido:', protectedResponse.status);
            
            if (protectedResponse.ok) {
                console.log('✅ Dashboard acessível com token válido');
            } else {
                console.log('❌ Dashboard ainda não acessível com token');
            }
            
        } else {
            const errorData = await loginResponse.json();
            console.log('❌ Login falhou:', errorData.error);
        }
        
        // 4. Testar endpoint de analytics
        console.log('\n4️⃣ Testando endpoint de analytics...');
        const analyticsResponse = await fetch(`${BACKEND_URL}/api/analytics/overview`);
        console.log('Status do analytics:', analyticsResponse.status);
        
        if (analyticsResponse.ok) {
            console.log('✅ Analytics acessível');
        } else {
            console.log('❌ Analytics não acessível');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Executar teste
testDashboardAuth();
