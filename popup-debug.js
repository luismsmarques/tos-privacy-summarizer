// Script de debug para executar no console do popup da extensão
// Para usar: abra o popup, pressione F12, cole este código no console

console.log('=== DEBUG EXTENSÃO ===');

// Verificar estado do storage
chrome.storage.local.get(['onboardingCompleted', 'geminiApiKey', 'theme'], function(result) {
    console.log('Estado do storage:');
    console.log('- Onboarding:', result.onboardingCompleted);
    console.log('- API Key:', result.geminiApiKey ? 'Configurada' : 'Não configurada');
    console.log('- Tema:', result.theme || 'light');
});

// Testar comunicação simples
chrome.runtime.sendMessage({ action: 'test' }, function(response) {
    if (chrome.runtime.lastError) {
        console.error('Erro de comunicação:', chrome.runtime.lastError);
    } else {
        console.log('Background respondeu:', response);
    }
});

// Verificar se o popup está a escutar mensagens
console.log('Popup listeners ativos:', chrome.runtime.onMessage.hasListeners());

console.log('Debug completo - verifique os logs acima');
