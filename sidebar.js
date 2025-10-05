// Sidebar script para o painel lateral persistente
document.addEventListener('DOMContentLoaded', function() {
    const summarizeButton = document.getElementById('summarizeButton');
    const openSettingsButton = document.getElementById('openSettings');
    const themeToggle = document.getElementById('themeToggle');
    const closeSidebarButton = document.getElementById('closeSidebar');
    const summaryResult = document.getElementById('summaryResult');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const statusIndicator = document.getElementById('statusIndicator');

    // Elementos do progresso
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const estimatedTime = document.getElementById('estimatedTime');
    
    // Estado do progresso
    let currentStep = 0;
    let progressInterval;
    let startTime;
    
    // Inicializar tema
    initializeTheme();
    
    // Verificar status da extensão
    checkExtensionStatus();

    // Listener para mensagens do background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Sidebar recebeu mensagem:', request.action);
        
        if (request.action === 'displaySummary') {
            console.log('Exibindo resumo...');
            hideLoading();
            enableButton();
            clearSummary(); // Limpar antes de exibir novo resumo

            if (request.summary.startsWith('Erro')) {
                // Analisar tipo de erro e mostrar notificação apropriada
                if (request.summary.includes('Chave da API não configurada')) {
                    showErrorNotification('api_key_missing');
                } else if (request.summary.includes('API Gemini')) {
                    showErrorNotification('api_key_invalid');
                } else if (request.summary.includes('rede') || request.summary.includes('network')) {
                    showErrorNotification('network_error');
                } else if (request.summary.includes('extrair texto')) {
                    showErrorNotification('page_error');
                } else {
                    showErrorNotification('processing_error', request.summary);
                }
            } else {
                displaySummary(request.summary);
                showSuccessNotification('Resumo gerado com sucesso!');
            }
        } else if (request.action === 'progressUpdate') {
            // Atualizar progresso em tempo real
            updateProgressStep(request.step);
            updateProgressText(request.text, request.progress);
        }
    });
    
    // Listener para o botão de configurações
    openSettingsButton.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
    
    // Listener para o toggle de tema
    themeToggle.addEventListener('click', function() {
        toggleTheme();
    });
    
    // Listener para fechar o painel
    closeSidebarButton.addEventListener('click', function() {
        window.close();
    });
    
    // Listener para o botão de resumir
    summarizeButton.addEventListener('click', async function() {
        try {
            showLoading();
            disableButton();
            clearSummary();
            
            // Obter a tab ativa
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('Não foi possível obter a tab ativa');
            }
            
            // Verificar se a URL é válida
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('Esta página não pode ser processada');
            }
            
            // Injetar o content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            
            console.log('Content script injetado com sucesso');
            
        } catch (error) {
            console.error('Erro ao executar resumo:', error);
            hideLoading();
            enableButton();
            
            // Determinar tipo de erro e mostrar notificação
            if (error.message.includes('tab')) {
                showErrorNotification('page_error');
            } else if (error.message.includes('página não pode ser processada')) {
                showErrorNotification('page_error');
            } else {
                showErrorNotification('processing_error', error.message);
            }
        }
    });

    // Função para inicializar tema
    function initializeTheme() {
        chrome.storage.local.get(['theme'], function(result) {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        });
    }

    // Função para alternar tema
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        chrome.storage.local.set({ theme: newTheme });
        updateThemeIcon(newTheme);
    }

    // Função para atualizar ícone do tema
    function updateThemeIcon(theme) {
        const themeIcon = themeToggle.querySelector('.material-symbols-outlined');
        themeIcon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
    }

    // Função para verificar status da extensão
    function checkExtensionStatus() {
        chrome.storage.local.get(['onboardingCompleted', 'geminiApiKey'], function(result) {
            updateStatusIndicator(result);
        });
    }

    // Função para atualizar indicador de status
    function updateStatusIndicator(result) {
        const { onboardingCompleted, geminiApiKey } = result;
        
        let statusClass = 'status-ready';
        let statusIcon = 'check_circle';
        let statusTitle = 'Extensão configurada e pronta para usar!';
        
        if (!onboardingCompleted) {
            statusClass = 'status-warning';
            statusIcon = 'warning';
            statusTitle = 'Configuração inicial necessária';
        } else if (!geminiApiKey || geminiApiKey === 'SHARED_API') {
            statusClass = 'status-configuring';
            statusIcon = 'settings';
            statusTitle = 'Usando API compartilhada';
        }
        
        statusIndicator.className = `status-indicator ${statusClass}`;
        statusIndicator.querySelector('.material-symbols-outlined').textContent = statusIcon;
        statusIndicator.title = statusTitle;
    }

    // Função para atualizar status durante processamento
    function updateStatusProcessing() {
        statusIndicator.className = 'status-indicator status-configuring';
        statusIndicator.querySelector('.material-symbols-outlined').textContent = 'sync';
        statusIndicator.title = 'Processando...';
    }

    // Função para restaurar status
    function restoreStatus() {
        checkExtensionStatus();
    }

    // Função para mostrar loading
    function showLoading() {
        loadingIndicator.style.display = 'block';
        updateStatusProcessing();
        startProgressAnimation();
    }

    // Função para esconder loading
    function hideLoading() {
        loadingIndicator.style.display = 'none';
        restoreStatus();
        stopProgressAnimation();
    }

    // Função para desabilitar botão
    function disableButton() {
        summarizeButton.disabled = true;
        summarizeButton.textContent = 'Processando...';
    }

    // Função para habilitar botão
    function enableButton() {
        summarizeButton.disabled = false;
        summarizeButton.innerHTML = '<span class="material-symbols-outlined">search</span>Extrair & Resumir';
    }

    // Função para limpar resumo
    function clearSummary() {
        summaryResult.innerHTML = '';
    }

    // Função para iniciar animação de progresso
    function startProgressAnimation() {
        startTime = Date.now();
        currentStep = 0;
        
        progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / 15000) * 100, 95); // 15 segundos máximo
            
            progressFill.style.width = progress + '%';
            progressPercentage.textContent = Math.round(progress) + '%';
            
            // Atualizar tempo estimado
            const remaining = Math.max(0, 15 - Math.floor(elapsed / 1000));
            estimatedTime.textContent = `Tempo estimado: ${remaining} segundos`;
        }, 100);
    }

    // Função para parar animação de progresso
    function stopProgressAnimation() {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        
        progressFill.style.width = '100%';
        progressPercentage.textContent = '100%';
        estimatedTime.textContent = 'Processamento concluído';
    }

    // Função para atualizar passo do progresso
    function updateProgressStep(step) {
        // Remover classe active de todos os passos
        document.querySelectorAll('.loading-step').forEach(stepEl => {
            stepEl.classList.remove('active', 'completed');
        });
        
        // Marcar passos anteriores como completos
        for (let i = 1; i < step; i++) {
            const stepEl = document.getElementById(`step${i}`);
            if (stepEl) {
                stepEl.classList.add('completed');
            }
        }
        
        // Marcar passo atual como ativo
        const currentStepEl = document.getElementById(`step${step}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        currentStep = step;
    }

    // Função para atualizar texto do progresso
    function updateProgressText(text, progress) {
        progressText.textContent = text;
        if (progress !== undefined) {
            progressFill.style.width = progress + '%';
            progressPercentage.textContent = progress + '%';
        }
    }

    // Função para exibir resumo
    function displaySummary(summary) {
        try {
            // Tentar fazer parse do JSON
            let summaryData;
            try {
                summaryData = JSON.parse(summary);
            } catch (e) {
                // Se não conseguir fazer parse direto, tentar extrair JSON manualmente
                const jsonMatch = summary.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    summaryData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Não foi possível extrair JSON válido');
                }
            }
            
            // Converter para HTML
            const htmlContent = convertJsonToHtml(summaryData);
            summaryResult.innerHTML = htmlContent;
            
        } catch (error) {
            console.error('Erro ao processar resumo:', error);
            summaryResult.innerHTML = `
                <div style="color: var(--md-sys-color-error); padding: 20px; text-align: center;">
                    <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: 16px;">error</span>
                    <h3>Erro ao processar resumo</h3>
                    <p>O resumo foi gerado mas não pôde ser formatado corretamente.</p>
                    <details style="margin-top: 16px; text-align: left;">
                        <summary>Ver resumo original</summary>
                        <pre style="background: var(--md-sys-color-surface-container-high); padding: 16px; border-radius: 8px; margin-top: 8px; overflow-x: auto;">${escapeHtml(summary)}</pre>
                    </details>
                </div>
            `;
        }
    }

    // Função para converter JSON para HTML
    function convertJsonToHtml(data) {
        let html = '';
        
        // Resumo conciso
        if (data.resumo_conciso) {
            html += `
                <div class="summary-section">
                    <h2>
                        <span class="material-symbols-outlined">description</span>
                        Resumo Conciso
                    </h2>
                    <p>${escapeHtml(data.resumo_conciso)}</p>
                </div>
            `;
        }
        
        // Pontos chave
        if (data.pontos_chave && data.pontos_chave.length > 0) {
            html += `
                <div class="summary-section">
                    <h2>
                        <span class="material-symbols-outlined">key</span>
                        Pontos Chave
                    </h2>
                    <ul class="key-points">
                        ${data.pontos_chave.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Alertas de privacidade
        if (data.alertas_privacidade && data.alertas_privacidade.length > 0) {
            html += `
                <div class="summary-section">
                    <h2>
                        <span class="material-symbols-outlined">security</span>
                        Alertas de Privacidade
                    </h2>
                    <div class="privacy-alerts">
                        ${data.alertas_privacidade.map(alert => {
                            if (alert.tipo === 'sem_alertas') {
                                return `
                                    <div class="no-alerts">
                                        <span class="material-symbols-outlined">check_circle</span>
                                        ${escapeHtml(alert.texto)}
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="alert-item alert-${alert.tipo.replace('_', '-')}">
                                        <span class="alert-icon">${getAlertIcon(alert.tipo)}</span>
                                        <span>${escapeHtml(alert.texto)}</span>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    // Função para obter ícone do alerta
    function getAlertIcon(type) {
        const icons = {
            'partilha_dados': 'group',
            'propriedade_conteudo': 'image',
            'alteracoes_termos': 'sync_alt',
            'jurisdicao': 'gavel',
            'outros_riscos': 'warning',
            'sem_alertas': 'check_circle'
        };
        return icons[type] || 'info';
    }

    // Função para escapar HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Sistema de notificações
    function showNotification(type, title, message, duration = 5000) {
        const container = document.getElementById('notificationContainer');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = getNotificationIcon(type);
        
        notification.innerHTML = `
            <span class="notification-icon material-symbols-outlined">${icon}</span>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="closeNotification(this)">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remover após duração especificada
        setTimeout(() => {
            closeNotification(notification.querySelector('.notification-close'));
        }, duration);
    }

    function closeNotification(closeButton) {
        const notification = closeButton.closest('.notification');
        notification.classList.add('hide');
        
        setTimeout(() => {
            notification.remove();
        }, 300);
    }

    function getNotificationIcon(type) {
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    // Funções específicas para diferentes tipos de erro
    function showErrorNotification(errorType, details = '') {
        const errorMessages = {
            api_key_missing: {
                title: 'Chave da API Necessária',
                message: 'Configure a sua chave da API Gemini nas configurações da extensão para continuar.'
            },
            api_key_invalid: {
                title: 'Chave da API Inválida',
                message: 'A chave da API não é válida. Verifique se copiou corretamente e tente novamente.'
            },
            network_error: {
                title: 'Erro de Conexão',
                message: 'Não foi possível conectar à API. Verifique a sua ligação à internet e tente novamente.'
            },
            page_error: {
                title: 'Erro na Página',
                message: 'Não foi possível extrair texto desta página. Certifique-se de que está numa página com Termos de Serviço ou Política de Privacidade.'
            },
            processing_error: {
                title: 'Erro no Processamento',
                message: 'Ocorreu um erro ao processar o conteúdo. Verifique os logs da extensão para mais detalhes.'
            },
            onboarding_incomplete: {
                title: 'Configuração Incompleta',
                message: 'Complete a configuração inicial da extensão para começar a usar.'
            },
            quota_exceeded: {
                title: 'Limite de Uso Atingido',
                message: 'Atingiu o limite de uso da API. Tente novamente mais tarde ou verifique a sua conta Gemini.'
            },
            content_too_long: {
                title: 'Conteúdo Muito Longo',
                message: 'O documento é muito extenso para ser processado. Tente numa página com conteúdo mais curto.'
            }
        };

        const error = errorMessages[errorType] || {
            title: 'Erro Desconhecido',
            message: details || 'Ocorreu um erro inesperado. Tente novamente.'
        };

        showNotification('error', error.title, error.message);
    }

    function showSuccessNotification(message) {
        showNotification('success', 'Sucesso', message);
    }

    function showWarningNotification(title, message) {
        showNotification('warning', title, message);
    }

    function showInfoNotification(title, message) {
        showNotification('info', title, message);
    }

    // Tornar funções globais para uso nos event listeners
    window.closeNotification = closeNotification;
});
