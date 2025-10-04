// Script para corrigir configuração da API
// Execute no console do Chrome (F12) na página da extensão

console.log('🔧 Corrigindo configuração da API...');

// Forçar configuração para API compartilhada
chrome.storage.local.set({
    apiType: 'shared',
    geminiApiKey: 'SHARED_API',
    onboardingCompleted: true,
    sharedCredits: 5
}, function() {
    console.log('✅ Configuração corrigida!');
    console.log('📋 Configurações aplicadas:');
    console.log('- apiType: shared');
    console.log('- geminiApiKey: SHARED_API');
    console.log('- onboardingCompleted: true');
    console.log('- sharedCredits: 5');
    
    // Verificar configuração
    chrome.storage.local.get(['apiType', 'geminiApiKey', 'onboardingCompleted', 'sharedCredits'], function(result) {
        console.log('🔍 Configuração atual:', result);
    });
});

// Instruções para o utilizador
console.log(`
🎯 INSTRUÇÕES:

1. Execute este script no console (F12)
2. Recarregue a extensão
3. Teste novamente

Se ainda não funcionar:
1. Vá às configurações da extensão
2. Limpe todos os dados
3. Reconfigure usando "Créditos Gratuitos"
`);
