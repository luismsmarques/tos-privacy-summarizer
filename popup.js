// Popup script para gerir a UI e comunicação
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup script carregado');

    // Elementos do DOM
    const actionButton = document.getElementById('actionButton');
    const actionButtonText = document.getElementById('actionButtonText');
    const actionButtonCost = document.getElementById('actionButtonCost');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const summaryContainer = document.getElementById('summaryContainer');
    const summaryContent = document.getElementById('summaryContent');
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    const themeToggle = document.getElementById('themeToggle');
    const settingsBtn = document.getElementById('settingsBtn');
    const backBtn = document.getElementById('backBtn');

    // Context elements
    const pageUrl = document.getElementById('pageUrl');
    const contentType = document.getElementById('contentType');
    const complexityIndicator = document.getElementById('complexityIndicator');
    const complexityText = document.getElementById('complexityText');
    const timeSaved = document.getElementById('timeSaved');
    const creditsText = document.getElementById('creditsText');
    const creditsBadge = document.getElementById('creditsBadge');

    // Focus selector
    const focusOptions = document.querySelectorAll('.focus-option');

    // Estado da aplicação
    let isProcessing = false;
    let currentTab = null;
    let currentFocus = 'privacy';
    let pageAnalysis = null;

    // Inicializar aplicação
    initializeApp();

    // Função de inicialização
    async function initializeApp() {
        console.log('Inicializando aplicação...');
        
        // Inicializar tema
        initializeTheme();
        
        // Obter aba atual
        await getCurrentTab();
        
        // Analisar página atual
        await analyzeCurrentPage();
        
        // Carregar créditos
        await loadCredits();
        
        // Configurar event listeners
        setupEventListeners();
        
        console.log('Aplicação inicializada');
    }

    // Obter aba atual
    async function getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            currentTab = tab;
            console.log('Aba atual:', tab.url);
            
            // Atualizar URL na UI
            if (pageUrl) {
                pageUrl.textContent = tab.url || 'URL não disponível';
            }
        } catch (error) {
            console.error('Erro ao obter aba atual:', error);
        }
    }

    // Analisar página atual
    async function analyzeCurrentPage() {
        if (!currentTab) return;
        
        try {
            console.log('Analisando página atual...');
            
            // Injetar content script se necessário
            await injectContentScript();
            
            // Solicitar análise da página
            chrome.tabs.sendMessage(currentTab.id, { action: 'analyzePage' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Content script não disponível, injetando...');
                    injectContentScript().then(() => {
                        setTimeout(() => analyzeCurrentPage(), 500);
                    });
                    return;
                }
                
                if (response && response.success) {
                    pageAnalysis = response.analysis;
                    updateContextUI(response.analysis);
                } else {
                    console.log('Análise não disponível');
                    updateContextUI(null);
                }
            });
        } catch (error) {
            console.error('Erro ao analisar página:', error);
            updateContextUI(null);
        }
    }

    // Injetar content script
    async function injectContentScript() {
        if (!currentTab) return;
        
        try {
            // Verificar se o content script já está injetado
            try {
                await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
                console.log('Content script já está ativo');
                return;
            } catch (e) {
                console.log('Content script não encontrado, injetando...');
            }
            
            // Injetar o content script
            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['content.js']
            });
            
            console.log('Content script injetado com sucesso');
            
            // Aguardar o content script estar pronto
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            console.error('Erro ao injetar content script:', error);
            throw error;
        }
    }

    // Atualizar UI de contexto
    function updateContextUI(analysis) {
        if (!analysis) {
            if (contentType) contentType.textContent = 'A analisar...';
            if (complexityText) complexityText.textContent = 'A calcular...';
            if (timeSaved) timeSaved.textContent = 'A calcular...';
            return;
        }

        // Tipo de conteúdo
        const typeMap = {
            'terms_of_service': 'Termos de Serviço',
            'privacy_policy': 'Política de Privacidade',
            'unknown': 'Outros'
        };
        if (contentType) {
            contentType.textContent = typeMap[analysis.type] || 'Outros';
        }

        // Complexidade
        const complexity = calculateComplexity(analysis.textLength);
        updateComplexityIndicator(complexity);
        if (complexityText) {
            complexityText.textContent = complexity.text;
        }

        // Tempo poupança
        const estimatedReadingTime = calculateReadingTime(analysis.textLength, analysis.type, complexity);
        if (timeSaved) {
            timeSaved.textContent = `≈ ${estimatedReadingTime} minutos de leitura`;
        }
    }

    // Calcular complexidade baseada no tamanho do texto
    function calculateComplexity(textLength) {
        if (textLength < 1000) {
            return { level: 1, text: 'Baixa' };
        } else if (textLength < 3000) {
            return { level: 2, text: 'Média' };
        } else if (textLength < 6000) {
            return { level: 3, text: 'Alta' };
        } else if (textLength < 10000) {
            return { level: 4, text: 'Muito Alta' };
        } else {
            return { level: 5, text: 'Extrema' };
        }
    }

    // Calcular tempo de leitura baseado no tipo de documento e complexidade
    function calculateReadingTime(textLength, documentType, complexity) {
        // Velocidades base por tipo de documento (caracteres por minuto)
        let baseSpeed;
        
        switch (documentType) {
            case 'privacy_policy':
                baseSpeed = 150; // Políticas de privacidade são mais complexas
                break;
            case 'terms_of_service':
                baseSpeed = 180; // Termos de serviço são ligeiramente mais simples
                break;
            case 'unknown':
            default:
                baseSpeed = 200; // Velocidade padrão para documentos desconhecidos
                break;
        }
        
        // Ajustar velocidade baseada na complexidade do texto
        if (complexity.level >= 5) {
            baseSpeed *= 0.6; // 40% mais lento para textos extremamente complexos
        } else if (complexity.level >= 4) {
            baseSpeed *= 0.7; // 30% mais lento para textos muito complexos
        } else if (complexity.level >= 3) {
            baseSpeed *= 0.8; // 20% mais lento para textos complexos
        } else if (complexity.level >= 2) {
            baseSpeed *= 0.9; // 10% mais lento para textos de complexidade média
        }
        // Para complexidade baixa (level 1), manter velocidade base
        
        // Calcular tempo final
        const readingTime = Math.ceil(textLength / baseSpeed);
        
        // Garantir tempo mínimo de 1 minuto
        return Math.max(readingTime, 1);
    }

    // Atualizar indicador de complexidade
    function updateComplexityIndicator(complexity) {
        if (!complexityIndicator) return;
        
        const dots = complexityIndicator.querySelectorAll('.complexity-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('active', 'high');
            if (index < complexity.level) {
                if (complexity.level >= 4) {
                    dot.classList.add('high');
                } else {
                    dot.classList.add('active');
                }
            }
        });
    }

    // Carregar créditos
    async function loadCredits() {
        try {
            const result = await chrome.storage.local.get(['sharedCredits', 'apiKey']);
            const credits = result.sharedCredits || 5;
            const hasApiKey = !!result.apiKey;
            
            if (hasApiKey) {
                if (creditsText) creditsText.textContent = 'Conta Premium (Ilimitado)';
                if (creditsBadge) {
                    creditsBadge.textContent = 'PREMIUM';
                    creditsBadge.classList.add('premium');
                }
                if (actionButtonCost) actionButtonCost.textContent = '(Gratuito)';
            } else {
                if (creditsText) creditsText.textContent = `${credits} Créditos Grátis Restantes`;
                if (creditsBadge) {
                    creditsBadge.textContent = 'GRÁTIS';
                    creditsBadge.classList.remove('premium');
                }
                if (actionButtonCost) actionButtonCost.textContent = `(${credits > 0 ? '1' : '0'} Crédito)`;
            }
            
            // Desabilitar botão se não há créditos
            if (!hasApiKey && credits <= 0 && actionButton) {
                actionButton.disabled = true;
                if (actionButtonText) actionButtonText.textContent = 'Sem Créditos';
            }
        } catch (error) {
            console.error('Erro ao carregar créditos:', error);
        }
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Botão principal
        if (actionButton) {
            actionButton.addEventListener('click', handleSummarize);
        }
        
        // Botão voltar
        if (backBtn) {
            backBtn.addEventListener('click', handleBack);
        }
        
        // Toggle de tema
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Botão de configurações
        if (settingsBtn) {
            settingsBtn.addEventListener('click', openSettings);
        }
        
        // Focus selector
        focusOptions.forEach(option => {
            option.addEventListener('click', () => {
                focusOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                currentFocus = option.dataset.focus;
                console.log('Foco alterado para:', currentFocus);
            });
        });
        
        // Links do footer
        const privacyLink = document.getElementById('privacyLink');
        if (privacyLink) {
            privacyLink.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.tabs.create({ url: chrome.runtime.getURL('privacy-policy.html') });
            });
        }
        
        const termsLink = document.getElementById('termsLink');
        if (termsLink) {
            termsLink.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.tabs.create({ url: chrome.runtime.getURL('terms-of-service.html') });
            });
        }
        
        const buyCreditsLink = document.getElementById('buyCreditsLink');
        if (buyCreditsLink) {
            buyCreditsLink.addEventListener('click', (e) => {
                e.preventDefault();
                // TODO: Implementar compra de créditos
                console.log('Comprar créditos');
            });
        }
    }

    // Handler para resumir
    async function handleSummarize() {
        if (isProcessing) return;
        
        try {
            console.log('Iniciando processo de resumo...');
            isProcessing = true;
            if (actionButton) actionButton.disabled = true;
            if (actionButtonText) actionButtonText.textContent = 'Processando...';
            
            // Mostrar progresso
            showProgress();
            
            // Garantir que o content script está injetado
            await injectContentScript();
            
            // Aguardar um pouco para o content script estar pronto
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Solicitar resumo
            console.log('Enviando mensagem para content script...');
            chrome.tabs.sendMessage(currentTab.id, { 
                action: 'summarizeText',
                focus: currentFocus
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Erro ao comunicar com content script:', chrome.runtime.lastError);
                    showError('Erro ao comunicar com a página. Tente recarregar a página.');
                    resetButton();
                } else {
                    console.log('Resposta do content script:', response);
                    
                    // Fallback: se não receber resposta em 30 segundos, mostrar erro
                    setTimeout(() => {
                        if (isProcessing) {
                            console.log('Timeout - não recebeu resumo em 30 segundos');
                            showError('Timeout: O resumo demorou muito para ser processado. O documento pode ser muito complexo. Tente novamente.');
                            resetButton();
                        }
                    }, 30000);
                }
            });
            
        } catch (error) {
            console.error('Erro ao iniciar resumo:', error);
            showError('Erro ao iniciar análise: ' + error.message);
            resetButton();
        }
    }

    // Handler para voltar
    function handleBack() {
        console.log('Voltando ao estado inicial...');
        
        // Esconder resumo
        if (summaryContainer) summaryContainer.classList.add('hidden');
        
        // Mostrar zonas originais
        const valueZone = document.querySelector('.value-zone');
        const contextZone = document.querySelector('.context-zone');
        const actionZone = document.querySelector('.action-zone');
        
        if (valueZone) valueZone.classList.remove('hidden');
        if (contextZone) contextZone.classList.remove('hidden');
        if (actionZone) actionZone.classList.remove('hidden');
        
        // Restaurar altura original
        // document.body.style.height = '';
        // document.body.style.minHeight = '';
        
        // Esconder botão voltar
        if (backBtn) backBtn.classList.add('hidden');
    }

    // Mostrar progresso
    function showProgress() {
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (summaryContainer) summaryContainer.classList.add('hidden');
        if (errorContainer) errorContainer.classList.add('hidden');
        
        // Simular progresso
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10; // Reduzir velocidade para dar mais tempo
            if (progress > 85) progress = 85; // Parar em 85% para aguardar resposta real
            
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            
            if (progressText) {
                if (progress < 20) {
                    progressText.textContent = 'Extraindo texto da página...';
                } else if (progress < 40) {
                    progressText.textContent = 'Enviando para análise IA...';
                } else if (progress < 60) {
                    progressText.textContent = 'IA analisando complexidade e risco...';
                } else if (progress < 80) {
                    progressText.textContent = 'Calculando ratings de segurança...';
                } else {
                    progressText.textContent = 'Finalizando análise...';
                }
            }
        }, 800); // Aumentar intervalo para 800ms
        
        // Limpar intervalo quando receber resultado
        window.progressInterval = interval;
    }

    // Esconder progresso
    function hideProgress() {
        if (window.progressInterval) {
            clearInterval(window.progressInterval);
            window.progressInterval = null;
        }
        if (progressContainer) progressContainer.classList.add('hidden');
    }

    // Mostrar resumo
    function showSummary(summary) {
        console.log('Mostrando resumo:', summary);
        hideProgress();
        
        // Parsear JSON se necessário
        let parsedSummary;
        try {
            // Se já é um objeto, usar diretamente
            if (typeof summary === 'object') {
                parsedSummary = summary;
            } else {
                // Tentar parsear como JSON
                parsedSummary = JSON.parse(summary);
            }
        } catch (e) {
            console.log('Não é JSON válido, usando como texto:', e);
            parsedSummary = { summary: summary };
        }
        
        console.log('Resumo parseado:', parsedSummary);
        
        // Mostrar resumo inline no popup
        displaySummaryInline(parsedSummary);
        
        resetButton();
    }

    // Mostrar resumo inline no popup
    function displaySummaryInline(parsedSummary) {
        console.log('Exibindo resumo inline:', parsedSummary);
        
        // Esconder zonas que não são necessárias quando há resumo
        document.querySelector('.value-zone').classList.add('hidden');
        document.querySelector('.context-zone').classList.add('hidden');
        document.querySelector('.action-zone').classList.add('hidden');
        
        // Mostrar container do resumo
        summaryContainer.classList.remove('hidden');
        
        // Renderizar resumo baseado na estrutura
        if (parsedSummary.resumo_conciso || parsedSummary.summary) {
            console.log('Renderizando resumo com estrutura:', Object.keys(parsedSummary));
            summaryContent.innerHTML = formatStructuredSummary(parsedSummary);
        } else {
            console.log('Nenhum resumo encontrado no objeto');
            summaryContent.innerHTML = '<p>Resumo não disponível</p>';
        }
        
        // Expandir altura do popup
        // document.body.style.height = '600px';
        // document.body.style.minHeight = '600px';
        
        // Mostrar botão voltar
        backBtn.classList.remove('hidden');
    }

    // Abrir página dedicada para o resumo
    function openSummaryPage(summaryData) {
        try {
            console.log('Abrindo página de resumo...');
            
            // Preparar dados da página
            const pageData = {
                title: currentTab?.title || 'Página Analisada',
                type: pageAnalysis?.type || 'Documento',
                url: currentTab?.url || 'URL não disponível'
            };
            
            // Salvar dados no storage para a página de resumo
            chrome.storage.local.set({
                lastSummary: summaryData,
                lastPageData: pageData
            });
            
            // Criar URL para a página de resumo
            const summaryUrl = chrome.runtime.getURL('summary-page.html');
            
            // Abrir nova aba
            chrome.tabs.create({
                url: summaryUrl,
                active: true
            });
            
            console.log('Página de resumo aberta');
            
        } catch (error) {
            console.error('Erro ao abrir página de resumo:', error);
            showError('Erro ao abrir página de resumo');
        }
    }

    // Formatar resumo estruturado
    function formatStructuredSummary(data) {
        console.log('Formatando resumo estruturado:', data);
        
        let html = '';
        
        // Rating de Risco e Complexidade (se disponível)
        if (data.riskScore || data.complexityRating) {
            html += `
                <div class="summary-section rating-section">
                    <h3>📊 Análise de Risco e Complexidade</h3>
                    <div class="rating-container">
                        ${data.riskScore ? `
                            <div class="rating-item">
                                <div class="rating-label">Nível de Risco</div>
                                <div class="rating-score risk-${data.riskScore.level}">
                                    <div class="score-circle">
                                        <span class="score-number">${data.riskScore.score}</span>
                                        <span class="score-max">/100</span>
                                    </div>
                                    <div class="score-description">${data.riskScore.description}</div>
                                </div>
                            </div>
                        ` : ''}
                        ${data.complexityRating ? `
                            <div class="rating-item">
                                <div class="rating-label">Complexidade</div>
                                <div class="rating-score complexity-${data.complexityRating.level}">
                                    <div class="score-circle">
                                        <span class="score-number">${data.complexityRating.rating}</span>
                                        <span class="score-max">/10</span>
                                    </div>
                                    <div class="score-description">${data.complexityRating.description}</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Resumo conciso
        if (data.resumo_conciso) {
            html += `
                <div class="summary-section">
                    <h3>📋 Resumo Conciso</h3>
                    <p>${data.resumo_conciso}</p>
                </div>
            `;
        } else if (data.summary) {
            html += `
                <div class="summary-section">
                    <h3>📋 Resumo</h3>
                    <p>${data.summary}</p>
                </div>
            `;
        }
        
        // Pontos chave
        if (data.pontos_chave && data.pontos_chave.length > 0) {
            html += `
                <div class="summary-section">
                    <h3>🔑 Pontos Chave</h3>
                    <ul class="key-points">
                        ${data.pontos_chave.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Boas Práticas (se disponível)
        if (data.goodPractices && data.goodPractices.practices && data.goodPractices.practices.length > 0) {
            html += `
                <div class="summary-section">
                    <h3>✅ Boas Práticas Identificadas</h3>
                    <div class="good-practices">
                        ${data.goodPractices.practices.map(practice => `
                            <div class="practice-item">
                                <span class="material-icons practice-icon">check_circle</span>
                                <div class="practice-text">${practice}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Alertas de privacidade
        if (data.alertas_privacidade && data.alertas_privacidade.length > 0) {
            html += `
                <div class="summary-section">
                    <h3>⚠️ Alertas de Privacidade</h3>
                    <div class="privacy-alerts">
                        ${data.alertas_privacidade.map(alert => `
                            <div class="alert-item alert-${alert.tipo}">
                                <span class="material-icons alert-icon">warning</span>
                                <div class="alert-text">${alert.texto}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        console.log('HTML estruturado gerado:', html);
        return html || '<p>Resumo não disponível</p>';
    }

    // Formatar resumo simples (fallback)
    function formatSummary(summary) {
        console.log('Formatando resumo simples:', summary);
        
        if (!summary || summary.trim() === '') {
            return '<p>Resumo não disponível</p>';
        }
        
        // Converter markdown para HTML básico
        let html = summary
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Envolver em parágrafos se não começar com tag HTML
        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }
        
        console.log('HTML formatado:', html);
        return html;
    }

    // Mostrar erro
    function showError(message) {
        hideProgress();
        if (errorContainer) errorContainer.classList.remove('hidden');
        if (errorMessage) errorMessage.textContent = message;
        resetButton();
    }

    // Resetar botão
    function resetButton() {
        isProcessing = false;
        if (actionButton) actionButton.disabled = false;
        if (actionButtonText) actionButtonText.textContent = 'Extrair & Resumir';
    }

    // Toggle tema
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        chrome.storage.local.set({ theme: newTheme });
        
        // Atualizar ícone
        const icon = themeToggle.querySelector('.material-icons');
        if (icon) {
            icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    }

    // Inicializar tema
    function initializeTheme() {
        chrome.storage.local.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            
            // Atualizar ícone
            const icon = themeToggle.querySelector('.material-icons');
            if (icon) {
                icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
            }
        });
    }

    // Abrir configurações
    function openSettings() {
        chrome.runtime.openOptionsPage();
    }

    // Listener para mensagens do background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Popup recebeu mensagem:', request.action, request);
        
        switch (request.action) {
            case 'displaySummary':
                console.log('Processando displaySummary:', request.summary);
                if (request.summary && request.summary.startsWith('Erro')) {
                    showError(request.summary);
                } else {
                    showSummary(request.summary);
                }
                break;
                
            case 'progressUpdate':
                console.log('Atualizando progresso:', request.progress, request.message);
                if (progressFill) {
                    progressFill.style.width = `${request.progress}%`;
                }
                if (progressText && request.message) {
                    progressText.textContent = request.message;
                }
                break;
                
            case 'updateCredits':
                console.log('Atualizando créditos');
                loadCredits();
                break;
                
            default:
                console.log('Ação não reconhecida:', request.action);
        }
        
        return true; // Manter canal aberto
    });
});