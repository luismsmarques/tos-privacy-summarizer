#!/usr/bin/env node

// Script para testar a integração completa do sistema de ratings
// Usando fetch nativo do Node.js (disponível a partir da v18)

const BACKEND_URL = 'https://tos-privacy-summarizer.vercel.app';

// Texto de teste para análise
const testText = `
Política de Privacidade

Esta política descreve como coletamos, usamos e compartilhamos suas informações pessoais.

1. Informações que Coletamos
Coletamos informações que você nos fornece diretamente, como nome, endereço de email e informações de pagamento. Também coletamos informações automaticamente quando você usa nossos serviços, incluindo dados de uso, cookies e informações do dispositivo.

2. Como Usamos Suas Informações
Usamos suas informações para fornecer, manter e melhorar nossos serviços, processar transações, enviar comunicações técnicas e administrativas, e personalizar sua experiência.

3. Compartilhamento de Informações
Podemos compartilhar suas informações com terceiros para fins de marketing, análise de dados e publicidade direcionada. Também compartilhamos informações quando necessário para cumprir obrigações legais ou proteger nossos direitos.

4. Segurança dos Dados
Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.

5. Seus Direitos
Você tem o direito de acessar, corrigir ou excluir suas informações pessoais. Você também pode optar por não receber comunicações de marketing.

6. Alterações nesta Política
Podemos atualizar esta política periodicamente. As alterações entrarão em vigor imediatamente após a publicação.

7. Jurisdição
Esta política é regida pelas leis do Brasil e qualquer disputa será resolvida através de arbitragem vinculativa.
`;

async function testRatingsIntegration() {
    console.log('🧪 Testando integração completa do sistema de ratings...\n');
    
    try {
        // 1. Testar criação de usuário
        console.log('1️⃣ Criando usuário de teste...');
        const userResponse = await fetch(`${BACKEND_URL}/api/users/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                deviceId: `test_device_${Date.now()}`
            })
        });
        
        if (!userResponse.ok) {
            throw new Error(`Erro ao criar usuário: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        const userId = userData.userId;
        console.log(`✅ Usuário criado: ${userId}\n`);
        
        // 2. Testar análise com ratings
        console.log('2️⃣ Testando análise com sistema de ratings...');
        const analysisResponse = await fetch(`${BACKEND_URL}/api/gemini/proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                text: testText,
                focus: 'privacy',
                apiType: 'shared',
                url: 'https://test.com/privacy',
                title: 'Política de Privacidade - Teste'
            })
        });
        
        if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            throw new Error(`Erro na análise: ${analysisResponse.status} - ${errorText}`);
        }
        
        const analysisData = await analysisResponse.json();
        console.log('✅ Análise concluída com sucesso!');
        
        // 3. Verificar estrutura da resposta
        console.log('\n3️⃣ Verificando estrutura da resposta...');
        console.log('📊 Resposta recebida:', {
            hasSummary: !!analysisData.summary,
            hasRatings: !!analysisData.ratings,
            hasCredits: analysisData.credits !== undefined,
            hasApiType: !!analysisData.apiType,
            hasDocumentType: !!analysisData.documentType
        });
        
        // 4. Verificar ratings
        if (analysisData.ratings) {
            console.log('\n4️⃣ Verificando ratings calculados...');
            const ratings = analysisData.ratings;
            console.log('📈 Ratings:', {
                complexidade: ratings.complexidade,
                boas_praticas: ratings.boas_praticas,
                risk_score: ratings.risk_score
            });
            
            // Validar ranges
            const isValidComplexidade = ratings.complexidade >= 1 && ratings.complexidade <= 10;
            const isValidBoasPraticas = ratings.boas_praticas >= 1 && ratings.boas_praticas <= 10;
            const isValidRiskScore = ratings.risk_score >= 1 && ratings.risk_score <= 10;
            
            console.log('✅ Validação dos ratings:', {
                complexidade_valid: isValidComplexidade,
                boas_praticas_valid: isValidBoasPraticas,
                risk_score_valid: isValidRiskScore
            });
            
            if (!isValidComplexidade || !isValidBoasPraticas || !isValidRiskScore) {
                throw new Error('Ratings fora do range esperado (1-10)');
            }
        } else {
            throw new Error('Ratings não encontrados na resposta');
        }
        
        // 5. Verificar resumo
        if (analysisData.summary) {
            console.log('\n5️⃣ Verificando estrutura do resumo...');
            let summaryObj;
            try {
                summaryObj = JSON.parse(analysisData.summary);
            } catch (e) {
                console.log('⚠️ Resumo não é JSON válido, usando como texto');
                summaryObj = { summary: analysisData.summary };
            }
            
            console.log('📝 Estrutura do resumo:', {
                hasResumoConciso: !!summaryObj.resumo_conciso,
                hasPontosChave: !!summaryObj.pontos_chave,
                hasAlertasPrivacidade: !!summaryObj.alertas_privacidade,
                pontosChaveCount: summaryObj.pontos_chave ? summaryObj.pontos_chave.length : 0,
                alertasCount: summaryObj.alertas_privacidade ? summaryObj.alertas_privacidade.length : 0
            });
        }
        
        // 6. Verificar documentType
        if (analysisData.documentType) {
            console.log('\n6️⃣ Verificando tipo de documento...');
            console.log('📄 Tipo detectado:', analysisData.documentType);
            
            const validTypes = ['privacy_policy', 'terms_of_service', 'unknown'];
            if (!validTypes.includes(analysisData.documentType)) {
                throw new Error(`Tipo de documento inválido: ${analysisData.documentType}`);
            }
        }
        
        // 7. Testar histórico
        console.log('\n7️⃣ Testando histórico do usuário...');
        const historyResponse = await fetch(`${BACKEND_URL}/api/analytics/user-history/${userId}?limit=1`);
        
        if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log('✅ Histórico acessível:', {
                success: historyData.success,
                hasData: !!historyData.data,
                dataLength: historyData.data ? historyData.data.length : 0
            });
            
            if (historyData.data && historyData.data.length > 0) {
                const latestSummary = historyData.data[0];
                console.log('📊 Último resumo no histórico:', {
                    hasRatings: !!(latestSummary.rating_complexidade || latestSummary.rating_boas_praticas || latestSummary.risk_score),
                    complexidade: latestSummary.rating_complexidade,
                    boas_praticas: latestSummary.rating_boas_praticas,
                    risk_score: latestSummary.risk_score
                });
            }
        } else {
            console.log('⚠️ Histórico não acessível:', historyResponse.status);
        }
        
        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('✅ Sistema de ratings totalmente integrado e funcionando');
        
    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Executar teste
testRatingsIntegration();
