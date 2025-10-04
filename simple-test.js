// Script de teste para executar no console do popup
// Instruções: Abra o popup da extensão, pressione F12, cole este código

console.log('=== TESTE SIMPLES ===');

// Teste 1: Verificar se chrome.runtime está disponível
console.log('chrome.runtime disponível:', !!chrome.runtime);

// Teste 2: Verificar storage
chrome.storage.local.get(['geminiApiKey'], function(result) {
    console.log('API Key no storage:', result.geminiApiKey ? 'Presente' : 'Ausente');
});

// Teste 3: Simular uma mensagem de progresso
setTimeout(() => {
    console.log('Enviando mensagem de teste...');
    chrome.runtime.sendMessage({
        action: 'progressUpdate',
        step: 1,
        text: 'Teste de comunicação',
        progress: 50
    });
}, 1000);

// Teste 4: Simular resultado final
setTimeout(() => {
    console.log('Enviando resultado de teste...');
    chrome.runtime.sendMessage({
        action: 'displaySummary',
        summary: '{"resumo_conciso": "Este é um teste de comunicação", "pontos_chave": ["Teste 1", "Teste 2"], "alertas_privacidade": []}'
    });
}, 2000);

console.log('Testes iniciados - aguarde 2 segundos');
