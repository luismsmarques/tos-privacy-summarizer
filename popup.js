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
    const refreshButton = document.getElementById('refreshButton');

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
            contentType.textContent = 'A analisar...';
            complexityText.textContent = 'A calcular...';
            timeSaved.textContent = 'A calcular...';
            return;
        }

        // Tipo de conteúdo
        const typeMap = {
            'terms_of_service': 'Termos de Serviço',
            'privacy_policy': 'Política de Privacidade',
            'unknown': 'Outros'
        };
        contentType.textContent = typeMap[analysis.type] || 'Outros';

        // Complexidade
        const complexity = calculateComplexity(analysis.textLength);
        updateComplexityIndicator(complexity);
        complexityText.textContent = complexity.text;

        // Tempo poupança
        const estimatedReadingTime = Math.ceil(analysis.textLength / 200); // 200 chars por minuto
        timeSaved.textContent = `≈ ${estimatedReadingTime} minutos de leitura`;
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

    // Atualizar indicador de complexidade
    function updateComplexityIndicator(complexity) {
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
                creditsText.textContent = 'Conta Premium (Ilimitado)';
                creditsBadge.textContent = 'PREMIUM';
                creditsBadge.classList.add('premium');
                actionButtonCost.textContent = '(Gratuito)';
            } else {
                creditsText.textContent = `${credits} Créditos Grátis Restantes`;
                creditsBadge.textContent = 'GRÁTIS';
                creditsBadge.classList.remove('premium');
                actionButtonCost.textContent = `(${credits > 0 ? '1' : '0'} Crédito)`;
            }
            
            // Desabilitar botão se não há créditos
            if (!hasApiKey && credits <= 0) {
                actionButton.disabled = true;
                actionButtonText.textContent = 'Sem Créditos';
            }
        } catch (error) {
            console.error('Erro ao carregar créditos:', error);
        }
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Botão principal
        actionButton.addEventListener('click', handleSummarize);
        
        // Botão de refresh
        refreshButton.addEventListener('click', handleRefresh);
        
        // Toggle de tema
        themeToggle.addEventListener('click', toggleTheme);
        
        // Botão de configurações
        settingsBtn.addEventListener('click', openSettings);
        
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
        document.getElementById('privacyLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('privacy-policy.html') });
        });
        
        document.getElementById('termsLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('TERMS-OF-SERVICE.md') });
        });
        
        document.getElementById('buyCreditsLink').addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: Implementar compra de créditos
            console.log('Comprar créditos');
        });
    }

    // Handler para resumir
    async function handleSummarize() {
        if (isProcessing) return;
        
        try {
            console.log('Iniciando processo de resumo...');
            isProcessing = true;
            actionButton.disabled = true;
            actionButtonText.textContent = 'Processando...';
            
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
                    
                    // Fallback: se não receber resposta em 10 segundos, mostrar erro
                    setTimeout(() => {
                        if (isProcessing) {
                            console.log('Timeout - não recebeu resumo em 10 segundos');
                            showError('Timeout: O resumo demorou muito para ser processado. Tente novamente.');
                            resetButton();
                        }
                    }, 10000);
                }
            });
            
        } catch (error) {
            console.error('Erro ao iniciar resumo:', error);
            showError('Erro ao iniciar análise: ' + error.message);
            resetButton();
        }
    }

    // Handler para refresh
    async function handleRefresh() {
        console.log('Atualizando análise da página...');
        await analyzeCurrentPage();
    }

    // Mostrar progresso
    function showProgress() {
        progressContainer.classList.remove('hidden');
        summaryContainer.classList.add('hidden');
        errorContainer.classList.add('hidden');
        
        // Simular progresso
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            progressFill.style.width = `${progress}%`;
            
            if (progress < 30) {
                progressText.textContent = 'Extraindo texto da página...';
            } else if (progress < 60) {
                progressText.textContent = 'Enviando para análise IA...';
            } else if (progress < 90) {
                progressText.textContent = 'Processando com Gemini...';
            }
        }, 500);
        
        // Limpar intervalo quando receber resultado
        window.progressInterval = interval;
    }

    // Esconder progresso
    function hideProgress() {
        if (window.progressInterval) {
            clearInterval(window.progressInterval);
            window.progressInterval = null;
        }
        progressContainer.classList.add('hidden');
    }

    // Mostrar resumo
    function showSummary(summary) {
        console.log('Mostrando resumo:', summary);
        hideProgress();
        summaryContainer.classList.remove('hidden');
        
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
        
        // Renderizar resumo
        if (parsedSummary.summary) {
            console.log('Renderizando resumo:', parsedSummary.summary);
            summaryContent.innerHTML = formatSummary(parsedSummary.summary);
        } else {
            console.log('Nenhum resumo encontrado no objeto');
            summaryContent.innerHTML = '<p>Resumo não disponível</p>';
        }
        
        resetButton();
    }

    // Formatar resumo
    function formatSummary(summary) {
        console.log('Formatando resumo:', summary);
        
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
        errorContainer.classList.remove('hidden');
        errorMessage.textContent = message;
        resetButton();
    }

    // Resetar botão
    function resetButton() {
        isProcessing = false;
        actionButton.disabled = false;
        actionButtonText.textContent = 'Extrair & Resumir';
    }

    // Toggle tema
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        chrome.storage.local.set({ theme: newTheme });
        
        // Atualizar ícone
        const icon = themeToggle.querySelector('.material-symbols-outlined');
        icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    // Inicializar tema
    function initializeTheme() {
        chrome.storage.local.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            
            // Atualizar ícone
            const icon = themeToggle.querySelector('.material-symbols-outlined');
            icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
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