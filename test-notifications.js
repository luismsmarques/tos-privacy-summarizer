// Script de teste para o sistema de notificações
// Execute este script no console do popup para testar

console.log('=== TESTE DO SISTEMA DE NOTIFICAÇÕES ===');

// Testar diferentes tipos de notificação
function testNotifications() {
    console.log('Testando notificações...');
    
    // Notificação de sucesso
    showSuccessNotification('Teste de notificação de sucesso!');
    
    setTimeout(() => {
        // Notificação de aviso
        showWarningNotification('Aviso', 'Esta é uma notificação de aviso');
    }, 1000);
    
    setTimeout(() => {
        // Notificação de erro
        showErrorNotification('api_key_missing');
    }, 2000);
    
    setTimeout(() => {
        // Notificação de informação
        showInfoNotification('Informação', 'Esta é uma notificação informativa');
    }, 3000);
}

// Testar diferentes tipos de erro
function testErrorTypes() {
    console.log('Testando tipos de erro...');
    
    const errorTypes = [
        'api_key_missing',
        'api_key_invalid', 
        'network_error',
        'page_error',
        'processing_error',
        'onboarding_incomplete',
        'quota_exceeded',
        'content_too_long'
    ];
    
    errorTypes.forEach((type, index) => {
        setTimeout(() => {
            showErrorNotification(type);
        }, index * 2000);
    });
}

// Executar testes
console.log('Iniciando testes...');
testNotifications();

setTimeout(() => {
    console.log('Testando tipos de erro em 10 segundos...');
    testErrorTypes();
}, 10000);

console.log('Testes iniciados - observe as notificações!');
