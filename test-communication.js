// Script de teste para verificar a comunicação entre scripts
// Execute este script no console do popup para debug

console.log('=== TESTE DE COMUNICAÇÃO ===');

// Testar se o background script está a responder
chrome.runtime.sendMessage({ action: 'test' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Erro de comunicação:', chrome.runtime.lastError);
    } else {
        console.log('Background script respondeu:', response);
    }
});

// Verificar se o content script está ativo
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
            console.log('Content script está ativo na página:', window.location.href);
            return { status: 'active', url: window.location.href };
        }
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.error('Erro ao executar script:', chrome.runtime.lastError);
        } else {
            console.log('Content script status:', results[0].result);
        }
    });
});

console.log('Teste iniciado - verifique os logs acima');
