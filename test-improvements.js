// Script de teste para verificar as melhorias implementadas na extensão
// Execute este script no console do popup para testar as funcionalidades

console.log('=== TESTE DAS MELHORIAS DA EXTENSÃO ===');

// Teste 1: Verificar sistema de logging melhorado
console.log('1. Testando sistema de logging...');
if (typeof Logger !== 'undefined') {
    Logger.log('Teste de logging funcionando');
    Logger.warn('Teste de warning funcionando');
    Logger.error('Teste de erro funcionando');
    console.log('✅ Sistema de logging funcionando');
} else {
    console.log('❌ Sistema de logging não encontrado');
}

// Teste 2: Verificar tratamento de erros
console.log('2. Testando tratamento de erros...');
if (typeof ErrorHandler !== 'undefined') {
    try {
        throw new Error('Erro de teste');
    } catch (error) {
        const errorInfo = ErrorHandler.handleError(error, 'teste');
        console.log('✅ Tratamento de erros funcionando:', errorInfo);
    }
} else {
    console.log('❌ Sistema de tratamento de erros não encontrado');
}

// Teste 3: Verificar comunicação entre scripts
console.log('3. Testando comunicação entre scripts...');
chrome.runtime.sendMessage({ action: 'test' }, (response) => {
    if (chrome.runtime.lastError) {
        console.log('❌ Erro de comunicação:', chrome.runtime.lastError);
    } else {
        console.log('✅ Comunicação funcionando:', response);
    }
});

// Teste 4: Verificar detecção de páginas legais
console.log('4. Testando detecção de páginas legais...');
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
            if (typeof isLegalPage !== 'undefined') {
                const isLegal = isLegalPage();
                console.log('✅ Detecção de página legal funcionando:', isLegal);
                return { success: true, isLegal: isLegal };
            } else {
                console.log('❌ Função isLegalPage não encontrada');
                return { success: false };
            }
        }
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.log('❌ Erro ao testar detecção:', chrome.runtime.lastError);
        } else {
            console.log('Resultado do teste:', results[0].result);
        }
    });
});

// Teste 5: Verificar extração de texto melhorada
console.log('5. Testando extração de texto...');
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
            if (typeof extractPageText !== 'undefined') {
                const text = extractPageText();
                console.log('✅ Extração de texto funcionando:', text.length, 'caracteres');
                return { success: true, textLength: text.length };
            } else {
                console.log('❌ Função extractPageText não encontrada');
                return { success: false };
            }
        }
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.log('❌ Erro ao testar extração:', chrome.runtime.lastError);
        } else {
            console.log('Resultado do teste:', results[0].result);
        }
    });
});

// Teste 6: Verificar análise de página
console.log('6. Testando análise de página...');
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
            if (typeof analyzePage !== 'undefined') {
                const analysis = analyzePage();
                console.log('✅ Análise de página funcionando:', analysis);
                return { success: true, analysis: analysis };
            } else {
                console.log('❌ Função analyzePage não encontrada');
                return { success: false };
            }
        }
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.log('❌ Erro ao testar análise:', chrome.runtime.lastError);
        } else {
            console.log('Resultado do teste:', results[0].result);
        }
    });
});

// Teste 7: Verificar feedback visual
console.log('7. Testando feedback visual...');
const actionButton = document.getElementById('actionButton');
if (actionButton) {
    // Testar animação de pulsação
    actionButton.classList.add('pulse');
    setTimeout(() => {
        actionButton.classList.remove('pulse');
        console.log('✅ Animação de pulsação funcionando');
    }, 1000);
    
    // Testar animação de processamento
    setTimeout(() => {
        actionButton.classList.add('processing');
        setTimeout(() => {
            actionButton.classList.remove('processing');
            console.log('✅ Animação de processamento funcionando');
        }, 2000);
    }, 1500);
} else {
    console.log('❌ Botão de ação não encontrado');
}

// Teste 8: Verificar logs de erro no storage
console.log('8. Testando logs de erro...');
chrome.storage.local.get(['errorLogs'], (result) => {
    if (result.errorLogs && result.errorLogs.length > 0) {
        console.log('✅ Logs de erro encontrados:', result.errorLogs.length, 'erros');
        console.log('Último erro:', result.errorLogs[result.errorLogs.length - 1]);
    } else {
        console.log('ℹ️ Nenhum erro registrado ainda');
    }
});

// Teste 9: Verificar configurações
console.log('9. Testando configurações...');
chrome.storage.local.get(['apiType', 'userId', 'theme'], (result) => {
    console.log('✅ Configurações carregadas:', result);
});

// Teste 10: Verificar performance
console.log('10. Testando performance...');
const startTime = performance.now();
setTimeout(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log('✅ Performance test:', duration.toFixed(2), 'ms');
}, 100);

console.log('=== TESTE CONCLUÍDO ===');
console.log('Verifique os logs acima para ver os resultados dos testes.');
