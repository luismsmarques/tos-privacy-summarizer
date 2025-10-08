// Popup script para gerir a UI e comunicação
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup script carregado');

    // Sistema de logging melhorado
    const Logger = {
        log: (message, data = null) => {
            console.log(`[ToS-Popup] ${message}`, data || '');
        },
        error: (message, error = null) => {
            console.error(`[ToS-Popup ERROR] ${message}`, error || '');
            if (error && error.stack) {
                console.error('Stack trace:', error.stack);
            }
        },
        warn: (message, data = null) => {
            console.warn(`[ToS-Popup WARNING] ${message}`, data || '');
        }
    };

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
    const historyBtn = document.getElementById('historyBtn');

    // Context elements
    const pageUrl = document.getElementById('pageUrl');
    const contentType = document.getElementById('contentType');
    const complexityIndicator = document.getElementById('complexityIndicator');
    const complexityText = document.getElementById('complexityText');
    const timeSaved = document.getElementById('timeSaved');
    const creditsText = document.getElementById('creditsText');
    const creditsBadge = document.getElementById('creditsBadge');
    
    // Connection Status elements
    const connectionIcon = document.getElementById('connectionIcon');
    const connectionType = document.getElementById('connectionType');
    const connectionDescription = document.getElementById('connectionDescription');
    const connectionBadge = document.getElementById('connectionBadge');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const creditsStatus = document.getElementById('creditsStatus');
    
    // Quick Actions elements
    const quickActionsServer = document.getElementById('quickActionsServer');
    const quickActionsOwn = document.getElementById('quickActionsOwn');

    // Estado da aplicação
    let isProcessing = false;
    let currentTab = null;
    let pageAnalysis = null;
    let processingStartTime = null;
    let progressInterval = null;

    // Aguardar inicialização do i18n
    const initI18n = async () => {
        // Aguardar o i18n estar pronto
        while (!window.i18n || !window.i18n.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('[I18n] Popup i18n initialized');
        
        // Atualizar UI com traduções
        window.i18n.updateUI();
        
        // Configurar listener para mudanças de idioma
        document.addEventListener('languageChanged', () => {
            window.i18n.updateUI();
        });
    };

    // Inicializar i18n
    initI18n();

    // Inicializar aplicação
    initializeApp();

    // Função de inicialização
    async function initializeApp() {
        console.log('Inicializando aplicação...');
        
        // Inicializar tema
        initializeTheme();
        
        // Obter aba atual
        await getCurrentTab();
        
        // Tentar fallback imediatamente se temos a aba
        if (currentTab) {
            console.log('Tentando fallback imediato...');
            updateContextUI(null);
        }
        
        // Analisar página atual
        await analyzeCurrentPage();
        
        // Se não há análise após 2 segundos, tentar fallback
        setTimeout(() => {
            console.log('Timeout de inicialização - tentando fallback...');
            if (!pageAnalysis || !pageAnalysis.textLength) {
                console.log('Nenhuma análise disponível após timeout, forçando fallback');
                updateContextUI(null);
            }
        }, 2000);
        
        // Carregar créditos
        await loadCredits();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Configurar verificação periódica de status premium
        setupPremiumStatusCheck();
        
        console.log('Aplicação inicializada');
    }

    // Configurar verificação periódica de status premium
    function setupPremiumStatusCheck() {
        // Verificar status premium a cada 30 segundos
        setInterval(async () => {
            try {
                const result = await chrome.storage.local.get(['geminiApiKey', 'lastPremiumCheck']);
                const hasApiKey = !!result.geminiApiKey && result.geminiApiKey !== 'SHARED_API';
                const lastCheck = result.lastPremiumCheck || 0;
                
                // Só verificar se passou tempo suficiente desde a última verificação
                if (Date.now() - lastCheck > 30000) { // 30 segundos
                    await chrome.storage.local.set({ lastPremiumCheck: Date.now() });
                    
                    // Recarregar créditos para sincronizar status
                    await loadCredits();
                    
                    Logger.log('Verificação periódica de status premium realizada');
                }
            } catch (error) {
                Logger.warn('Erro na verificação periódica de status premium:', error);
            }
        }, 30000); // Verificar a cada 30 segundos
    }

    // Obter aba atual
    async function getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            currentTab = tab;
            console.log('Aba atual obtida:', tab);
            console.log('URL da aba:', tab.url);
            console.log('Título da aba:', tab.title);
            
            // Atualizar URL na UI
            if (pageUrl) {
                pageUrl.textContent = tab.url || 'URL não disponível';
            }
            
            // ATUALIZAÇÃO DIRETA: Definir complexidade padrão imediatamente
            if (complexityText) {
                complexityText.textContent = 'Média';
                console.log('✅ Complexidade definida diretamente como: Média');
            }
            if (complexityIndicator) {
                const dots = complexityIndicator.querySelectorAll('.complexity-dot');
                dots.forEach((dot, index) => {
                    dot.classList.remove('active', 'high');
                    if (index < 2) { // Nível 2 = Média
                        dot.classList.add('active');
                    }
                });
                console.log('✅ Indicador de complexidade atualizado diretamente');
            }
        } catch (error) {
            console.error('Erro ao obter aba atual:', error);
        }
    }

    // Analisar página atual
    async function analyzeCurrentPage() {
        if (!currentTab) return;
        
        try {
            console.log('Analisando página atual...', currentTab.url);
            
            // Injetar content script se necessário
            await injectContentScript();
            
            // Solicitar análise da página com timeout
            const timeoutId = setTimeout(() => {
                console.log('Timeout na análise da página, usando fallback');
                updateContextUI(null);
            }, 3000); // 3 segundos de timeout
            
            chrome.tabs.sendMessage(currentTab.id, { action: 'analyzePage' }, (response) => {
                clearTimeout(timeoutId);
                console.log('Resposta do content script:', response);
                console.log('Chrome runtime error:', chrome.runtime.lastError);
                
                if (chrome.runtime.lastError) {
                    console.log('Content script não disponível, injetando...', chrome.runtime.lastError.message);
                    injectContentScript().then(() => {
                        setTimeout(() => analyzeCurrentPage(), 500);
                    });
                    return;
                }
                
                if (response && response.success) {
                    console.log('Análise recebida com sucesso:', response.analysis);
                    pageAnalysis = response.analysis;
                    updateContextUI(response.analysis);
                } else {
                    console.log('Análise não disponível ou falhou:', response);
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
        console.log('updateContextUI chamada com:', analysis);
        
        // Sempre tentar usar fallback se não há análise válida
        if (!analysis || !analysis.textLength || analysis.textLength === 0) {
            console.log('Análise inválida ou vazia, tentando fallback...');
            
            // Tentar fallback: estimar baseado na URL atual
            const fallbackAnalysis = createFallbackAnalysis();
            if (fallbackAnalysis) {
                console.log('Usando análise de fallback:', fallbackAnalysis);
                updateUIWithAnalysis(fallbackAnalysis);
            } else {
                console.log('Fallback falhou, definindo textos padrão');
                if (contentType) contentType.textContent = 'A analisar...';
                if (complexityText) complexityText.textContent = 'A calcular...';
                if (timeSaved) timeSaved.textContent = 'A calcular...';
            }
            return;
        }

        console.log('Atualizando UI com análise válida:', analysis);
        updateUIWithAnalysis(analysis);
    }

    // Função auxiliar para atualizar UI com análise
    function updateUIWithAnalysis(analysis) {
        // Tipo de conteúdo
        const typeMap = {
            'terms_of_service': window.i18n.t('document_types.terms_of_service'),
            'privacy_policy': window.i18n.t('document_types.privacy_policy'),
            'unknown': window.i18n.t('document_types.unknown')
        };
        if (contentType) {
            contentType.textContent = typeMap[analysis.type] || window.i18n.t('document_types.unknown');
            console.log('Tipo de conteúdo definido como:', contentType.textContent);
        }

        // Complexidade
        const complexity = calculateComplexity(analysis.textLength);
        console.log('Complexidade calculada:', complexity);
        updateComplexityIndicator(complexity);
        if (complexityText) {
            complexityText.textContent = complexity.text;
            console.log('Texto de complexidade definido como:', complexityText.textContent);
        }

        // Tempo poupança
        const estimatedReadingTime = calculateReadingTime(analysis.textLength, analysis.type, complexity);
        if (timeSaved) {
            timeSaved.textContent = `≈ ${estimatedReadingTime} minutos de leitura`;
            console.log('Tempo poupança definido como:', timeSaved.textContent);
        }
    }

    // Criar análise de fallback baseada na URL
    function createFallbackAnalysis() {
        console.log('createFallbackAnalysis chamada, currentTab:', currentTab);
        
        if (!currentTab) {
            console.log('currentTab não disponível para fallback');
            return null;
        }
        
        try {
            const url = currentTab.url.toLowerCase();
            const title = currentTab.title.toLowerCase();
            
            console.log('URL para fallback:', url);
            console.log('Título para fallback:', title);
            
            // Detectar tipo baseado na URL/título
            let type = 'unknown';
            if (url.includes('termos') || url.includes('terms') || 
                title.includes('termos') || title.includes('terms')) {
                type = 'terms_of_service';
                console.log('Tipo detectado: Termos de Serviço');
            } else if (url.includes('privacidade') || url.includes('privacy') || 
                       title.includes('privacidade') || title.includes('privacy')) {
                type = 'privacy_policy';
                console.log('Tipo detectado: Política de Privacidade');
            } else {
                console.log('Tipo detectado: Desconhecido');
            }
            
            // Estimar tamanho baseado no tipo (valores típicos)
            let estimatedLength = 2000; // Padrão
            if (type === 'privacy_policy') {
                estimatedLength = 3000; // Políticas são geralmente mais longas
            } else if (type === 'terms_of_service') {
                estimatedLength = 2500; // Termos são geralmente médios
            }
            
            console.log('Tamanho estimado:', estimatedLength);
            
            const fallbackResult = {
                textLength: estimatedLength,
                type: type,
                url: currentTab.url,
                title: currentTab.title,
                isLegalPage: true,
                complexity: calculateTextComplexity(estimatedLength),
                timestamp: new Date().toISOString(),
                domain: new URL(currentTab.url).hostname,
                isFallback: true
            };
            
            console.log('Análise de fallback criada:', fallbackResult);
            return fallbackResult;
        } catch (error) {
            console.error('Erro ao criar análise de fallback:', error);
            return null;
        }
    }

    // Função auxiliar para calcular complexidade do texto (para fallback)
    function calculateTextComplexity(textLength) {
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

    // Carregar créditos e atualizar status da API
    async function loadCredits() {
        try {
            const result = await chrome.storage.local.get(['sharedCredits', 'geminiApiKey', 'apiType', 'userId']);
            let credits = result.sharedCredits || 5;
            const hasApiKey = !!result.geminiApiKey && result.geminiApiKey !== 'SHARED_API';
            const userId = result.userId;
            
            // Sincronizar créditos com a base de dados se temos userId
            if (userId && !hasApiKey) {
                try {
                    Logger.log('Sincronizando créditos com a base de dados...', { userId, localCredits: credits });
                    
                    const syncResponse = await fetch('https://tos-privacy-summarizer.vercel.app/api/users/sync-credits', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: userId,
                            localCredits: credits
                        })
                    });
                    
                    if (syncResponse.ok) {
                        const syncData = await syncResponse.json();
                        Logger.log('Sincronização realizada:', syncData);
                        
                        if (syncData.success && syncData.action === 'update_local') {
                            // Atualizar créditos locais com os da base de dados
                            credits = syncData.credits;
                            await chrome.storage.local.set({ sharedCredits: credits });
                            Logger.log('Créditos atualizados da base de dados:', credits);
                        }
                    } else {
                        Logger.warn('Falha na sincronização de créditos:', syncResponse.status);
                    }
                } catch (syncError) {
                    Logger.warn('Erro ao sincronizar créditos:', syncError);
                    // Continuar com créditos locais se a sincronização falhar
                }
            }
            
            // Atualizar status da conexão
            updateConnectionStatus(hasApiKey, credits);
            
            if (hasApiKey) {
                // Usando API própria - mostrar status premium
                if (creditsStatus) creditsStatus.style.display = 'flex';
                if (creditsText) creditsText.textContent = 'Conta Premium Ativa';
                if (creditsBadge) {
                    creditsBadge.textContent = 'PREMIUM';
                    creditsBadge.classList.add('premium');
                }
                if (actionButtonCost) actionButtonCost.textContent = '(Gratuito)';
            } else {
                // Usando créditos grátis - mostrar seção de créditos
                if (creditsStatus) creditsStatus.style.display = 'flex';
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
    
    // Atualizar status da conexão
    function updateConnectionStatus(hasApiKey, credits) {
        if (hasApiKey) {
            // Usando API própria do utilizador
            if (connectionIcon) connectionIcon.textContent = 'key';
            if (connectionType) connectionType.textContent = 'Sua Chave Gemini';
            if (connectionDescription) connectionDescription.textContent = 'Usando sua chave API pessoal';
            if (statusText) statusText.textContent = 'ATIVO';
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator';
            }
            
            // Ocultar créditos quando usa API própria
            if (creditsStatus) creditsStatus.style.display = 'none';
        } else {
            // Usando API da extensão (Vercel)
            if (connectionIcon) connectionIcon.textContent = 'cloud';
            if (connectionType) connectionType.textContent = 'API do Servidor';
            if (connectionDescription) connectionDescription.textContent = 'Conectado e pronto para análise';
            if (statusText) statusText.textContent = 'ATIVO';
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator';
            }
            
            // Mostrar créditos quando usa API do servidor
            if (creditsStatus) {
                creditsStatus.style.display = 'flex';
                if (creditsText) creditsText.textContent = `${credits} Créditos Grátis Restantes`;
            }
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
        
        // Botão de histórico
        if (historyBtn) {
            historyBtn.addEventListener('click', openHistory);
        }
        
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
                chrome.tabs.create({ url: chrome.runtime.getURL('checkout.html') });
            });
        }
        
        // Modal de créditos
        const closeCreditsModal = document.getElementById('closeCreditsModal');
        if (closeCreditsModal) {
            closeCreditsModal.addEventListener('click', hideCreditsModal);
        }
        
        const buyCreditsModalBtn = document.getElementById('buyCreditsModalBtn');
        if (buyCreditsModalBtn) {
            buyCreditsModalBtn.addEventListener('click', () => {
                chrome.tabs.create({ url: chrome.runtime.getURL('checkout.html') });
                hideCreditsModal();
            });
        }
        
        const useOwnApiModalBtn = document.getElementById('useOwnApiModalBtn');
        if (useOwnApiModalBtn) {
            useOwnApiModalBtn.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
                hideCreditsModal();
            });
        }
        
        // Botão Configurar API na área de quick actions
        const configureApiLink = document.getElementById('configureApiLink');
        if (configureApiLink) {
            configureApiLink.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.runtime.openOptionsPage();
            });
        }
        
        // Botão para alternar para API do servidor
        const switchToServerApiLink = document.getElementById('switchToServerApiLink');
        if (switchToServerApiLink) {
            switchToServerApiLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchToServerApi();
            });
        }
        
        // Botão para gerir API própria
        const manageApiLink = document.getElementById('manageApiLink');
        if (manageApiLink) {
            manageApiLink.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.runtime.openOptionsPage();
            });
        }
    }

    // Handler para resumir
    async function handleSummarize() {
        if (isProcessing) return;
        
        try {
            // Verificar créditos antes de iniciar
            const result = await chrome.storage.local.get(['sharedCredits', 'geminiApiKey', 'apiType']);
            const credits = result.sharedCredits || 5;
            const hasApiKey = !!result.geminiApiKey && result.geminiApiKey !== 'SHARED_API';
            
            if (!hasApiKey && credits <= 0) {
                console.log('Créditos insuficientes, mostrando modal');
                showCreditsModal();
                return;
            }
            
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
                action: 'summarizeText'
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

    // Handler para voltar
    function handleBack() {
        console.log('Voltando ao estado inicial...');
        
        // Esconder resumo
        if (summaryContainer) summaryContainer.classList.add('hidden');
        
        // Esconder risk score display
        const riskScoreDisplay = document.getElementById('riskScoreDisplay');
        if (riskScoreDisplay) riskScoreDisplay.classList.add('hidden');
        
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
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            
            if (progressText) {
                if (progress < 30) {
                    progressText.textContent = 'Extraindo texto da página...';
                } else if (progress < 60) {
                    progressText.textContent = 'Enviando para análise IA...';
                } else if (progress < 90) {
                    progressText.textContent = 'Processando com Gemini...';
                }
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
        if (progressContainer) progressContainer.classList.add('hidden');
    }

    // Mostrar resumo
    function showSummary(summary, ratings = null, documentType = null) {
        console.log('Mostrando resumo:', summary, 'Ratings:', ratings, 'DocumentType:', documentType);
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
        
        // Adicionar ratings e documentType ao objeto parseado
        if (ratings) {
            parsedSummary.ratings = ratings;
        }
        if (documentType) {
            parsedSummary.documentType = documentType;
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
            
            // Exibir ratings no popup se disponíveis
            if (parsedSummary.ratings) {
                console.log('✅ Ratings encontrados no parsedSummary:', parsedSummary.ratings);
                displayRiskScoreInPopup(parsedSummary.ratings);
            } else {
                console.log('❌ Nenhum rating encontrado no parsedSummary');
                console.log('📋 Chaves disponíveis:', Object.keys(parsedSummary));
            }
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

    // Mostrar modal de créditos insuficientes
    function showCreditsModal() {
        const creditsModal = document.getElementById('creditsModal');
        if (creditsModal) {
            creditsModal.classList.remove('hidden');
            console.log('Modal de créditos mostrado');
        }
    }

    // Esconder modal de créditos
    function hideCreditsModal() {
        const creditsModal = document.getElementById('creditsModal');
        if (creditsModal) {
            creditsModal.classList.add('hidden');
            console.log('Modal de créditos escondido');
        }
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

    // Abrir histórico
    function openHistory() {
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    }
    
    // Alternar para API do servidor
    async function switchToServerApi() {
        try {
            // Confirmar ação com o utilizador
            if (!confirm('Tem a certeza que quer alternar para a API do servidor? A sua chave API pessoal será removida localmente.')) {
                return;
            }
            
            // Remover a chave API própria de forma segura
            await chrome.storage.local.remove(['geminiApiKey']);
            
            // Configurar para usar API do servidor
            await chrome.storage.local.set({
                geminiApiKey: 'SHARED_API',
                apiType: 'shared',
                sharedCredits: 5, // Resetar créditos para 5
                apiKeyRemovedAt: Date.now() // Timestamp para auditoria
            });
            
            // Recarregar status
            await loadCredits();
            
            console.log('Alternado para API do servidor - chave removida com segurança');
        } catch (error) {
            console.error('Erro ao alternar para API do servidor:', error);
        }
    }
    
    // Função para limpar chave API de forma segura
    async function clearApiKeySecurely() {
        try {
            // Sobrescrever com dados aleatórios antes de remover
            const randomData = Array.from({length: 50}, () => Math.random().toString(36).charAt(2)).join('');
            await chrome.storage.local.set({ geminiApiKey: randomData });
            
            // Aguardar um pouco
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Remover completamente
            await chrome.storage.local.remove(['geminiApiKey']);
            
            console.log('Chave API removida de forma segura');
        } catch (error) {
            console.error('Erro ao limpar chave API:', error);
        }
    }

    // Listener para mensagens do background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Popup recebeu mensagem:', request.action, request);
        
        // Função async para lidar com mensagens que precisam de await
        const handleMessage = async () => {
            switch (request.action) {
                case 'displaySummary':
                    console.log('Processando displaySummary:', request.summary);
                    if (request.summary && request.summary.startsWith('Erro')) {
                        showError(request.summary);
                    } else {
                        showSummary(request.summary, request.ratings, request.documentType);
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
                    await loadCredits();
                    break;
                    
                case 'paymentSuccess':
                    console.log('Pagamento realizado com sucesso, sincronizando créditos...');
                    await loadCredits();
                    break;
                    
                default:
                    console.log('Ação não reconhecida:', request.action);
            }
        };
        
        // Executar função async
        handleMessage().catch(error => {
            console.error('Erro ao processar mensagem:', error);
        });
        
        return true; // Manter canal aberto
    });

    // Carregar estatísticas do histórico
    async function loadHistoryStats(userId) {
        try {
            const response = await fetch(`https://tos-privacy-summarizer.vercel.app/api/analytics/user-history/${userId}?limit=1`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    updateHistoryIndicator(data.stats);
                }
            }
        } catch (error) {
            Logger.warn('Erro ao carregar estatísticas do histórico:', error);
        }
    }

    // Atualizar indicador de histórico
    function updateHistoryIndicator(stats) {
        if (!historyBtn) return;
        
        const totalSummaries = stats.total_summaries || 0;
        
        // Adicionar badge com número de resumos se houver
        if (totalSummaries > 0) {
            let badge = historyBtn.querySelector('.history-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'history-badge';
                historyBtn.appendChild(badge);
            }
            badge.textContent = totalSummaries;
            badge.style.display = totalSummaries > 0 ? 'block' : 'none';
        }
    }

    // Função para exibir risk score no popup
    function displayRiskScoreInPopup(ratings) {
        console.log('🎯 displayRiskScoreInPopup chamada com:', ratings);
        
        const riskScoreDisplay = document.getElementById('riskScoreDisplay');
        const riskScoreNumber = document.getElementById('riskScoreNumber');
        const riskScoreLabel = document.getElementById('riskScoreLabel');
        const riskScoreMain = document.getElementById('riskScoreMain');
        const complexityBar = document.getElementById('complexityBar');
        const complexityTextMain = document.getElementById('complexityTextMain');
        const practicesBar = document.getElementById('practicesBar');
        const practicesText = document.getElementById('practicesText');
        
        console.log('🔍 Elementos encontrados:', {
            riskScoreDisplay: !!riskScoreDisplay,
            riskScoreNumber: !!riskScoreNumber,
            riskScoreLabel: !!riskScoreLabel,
            riskScoreMain: !!riskScoreMain,
            complexityBar: !!complexityBar,
            complexityTextMain: !!complexityTextMain,
            practicesBar: !!practicesBar,
            practicesText: !!practicesText
        });
        
        if (!riskScoreDisplay || !ratings) {
            console.log('❌ Elementos não encontrados ou ratings inválidos');
            return;
        }
        
        const { risk_score, complexidade, boas_praticas } = ratings;
        
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
        if (complexityTextMain) complexityTextMain.textContent = `${complexidade}/10`;
        
        if (practicesBar) practicesBar.style.width = `${(boas_praticas / 10) * 100}%`;
        if (practicesText) practicesText.textContent = `${boas_praticas}/10`;
        
        // Mostrar o display
        riskScoreDisplay.classList.remove('hidden');
        
        console.log('✅ Risk score display atualizado no popup:', {
            risk_score,
            complexidade,
            boas_praticas,
            riskClass,
            riskLabel
        });
    }
});