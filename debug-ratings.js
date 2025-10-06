// Script de debug para testar exibição de ratings
// Execute este código no console do popup da extensão

console.log('🔍 DEBUG: Testando exibição de ratings...');

// 1. Verificar se os elementos HTML existem
const elements = {
    riskScoreDisplay: document.getElementById('riskScoreDisplay'),
    riskScoreNumber: document.getElementById('riskScoreNumber'),
    riskScoreLabel: document.getElementById('riskScoreLabel'),
    riskScoreMain: document.getElementById('riskScoreMain'),
    complexityBar: document.getElementById('complexityBar'),
    complexityText: document.getElementById('complexityText'),
    practicesBar: document.getElementById('practicesBar'),
    practicesText: document.getElementById('practicesText')
};

console.log('📋 Elementos HTML encontrados:', elements);

// 2. Verificar se a função displayRiskScore existe
if (typeof displayRiskScore === 'function') {
    console.log('✅ Função displayRiskScore encontrada');
} else {
    console.log('❌ Função displayRiskScore NÃO encontrada');
}

// 3. Testar com dados simulados
const testRatings = {
    risk_score: 7,
    complexidade: 8,
    boas_praticas: 4
};

console.log('🧪 Testando com ratings simulados:', testRatings);

// 4. Chamar a função displayRiskScore se existir
if (typeof displayRiskScore === 'function') {
    try {
        displayRiskScore(testRatings);
        console.log('✅ Função displayRiskScore executada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao executar displayRiskScore:', error);
    }
} else {
    console.log('⚠️ Tentando executar manualmente...');
    
    // Executar manualmente o código da função
    const { riskScoreDisplay, riskScoreNumber, riskScoreLabel, riskScoreMain, complexityBar, complexityText, practicesBar, practicesText } = elements;
    
    if (!riskScoreDisplay) {
        console.error('❌ Elemento riskScoreDisplay não encontrado');
        return;
    }
    
    const { risk_score, complexidade, boas_praticas } = testRatings;
    
    // Definir classe de risco
    const riskClass = risk_score <= 3 ? 'low' : risk_score <= 6 ? 'medium' : 'high';
    const riskLabel = risk_score <= 3 ? 'Baixo Risco' : risk_score <= 6 ? 'Risco Médio' : 'Alto Risco';
    
    // Atualizar elementos
    if (riskScoreNumber) riskScoreNumber.textContent = `${risk_score}/10`;
    if (riskScoreLabel) riskScoreLabel.textContent = riskLabel;
    if (riskScoreMain) {
        riskScoreMain.className = `risk-score-main ${riskClass}`;
    }
    
    // Atualizar barras de rating
    if (complexityBar) complexityBar.style.width = `${(complexidade / 10) * 100}%`;
    if (complexityText) complexityText.textContent = `${complexidade}/10`;
    if (practicesBar) practicesBar.style.width = `${(boas_praticas / 10) * 100}%`;
    if (practicesText) practicesText.textContent = `${boas_praticas}/10`;
    
    // Mostrar o display
    riskScoreDisplay.classList.remove('hidden');
    
    console.log(`✅ Risk score exibido manualmente: ${risk_score}/10 (${riskClass})`);
}

// 5. Verificar se o elemento está visível
setTimeout(() => {
    const riskScoreDisplay = document.getElementById('riskScoreDisplay');
    if (riskScoreDisplay) {
        const isVisible = !riskScoreDisplay.classList.contains('hidden');
        const computedStyle = window.getComputedStyle(riskScoreDisplay);
        console.log('👁️ Status de visibilidade:', {
            hasHiddenClass: riskScoreDisplay.classList.contains('hidden'),
            isVisible: isVisible,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity
        });
    }
}, 1000);

console.log('🔍 Debug concluído. Verifique os resultados acima.');
