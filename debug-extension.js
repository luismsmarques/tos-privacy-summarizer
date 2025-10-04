// Script de teste para verificar o estado da extensão
// Execute este script no console do popup para debug

console.log('=== DEBUG EXTENSÃO ===');

chrome.storage.local.get(['onboardingCompleted', 'geminiApiKey', 'theme'], function(result) {
    console.log('Estado atual:');
    console.log('- Onboarding completado:', result.onboardingCompleted);
    console.log('- API Key configurada:', !!result.geminiApiKey);
    console.log('- API Key (primeiros 10 chars):', result.geminiApiKey ? result.geminiApiKey.substring(0, 10) + '...' : 'Não configurada');
    console.log('- Tema:', result.theme || 'light');
    
    if (result.onboardingCompleted && result.geminiApiKey) {
        console.log('✅ Extensão deve estar funcionando corretamente');
    } else if (!result.onboardingCompleted) {
        console.log('⚠️ Onboarding não foi completado');
    } else if (!result.geminiApiKey) {
        console.log('⚠️ API Key não está configurada');
    }
});

// Função para forçar atualização do estado
function forceUpdateState() {
    chrome.storage.local.set({ 
        onboardingCompleted: true,
        geminiApiKey: 'AIzaTest123...' // Chave de teste
    }, function() {
        console.log('Estado atualizado - recarregue o popup');
    });
}

console.log('Para forçar atualização, execute: forceUpdateState()');
