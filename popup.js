// Popup script para gerir a UI e comunicação
document.addEventListener('DOMContentLoaded', function() {
        const summarizeButton = document.getElementById('summarizeButton');
        const openSettingsButton = document.getElementById('openSettings');
        const themeToggle = document.getElementById('themeToggle');
        const summaryResult = document.getElementById('summaryResult');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const statusMessage = document.getElementById('statusMessage');
        
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
    
    // Listener para mensagens do background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Popup recebeu mensagem:', request.action);
        
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
    
    // Listener para o botão de resumir
    summarizeButton.addEventListener('click', async function() {
        try {
            showLoading();
            disableButton();
            clearStatus();
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
            
            // Determinar tipo de erro e mostrar notificação apropriada
            if (error.message.includes('tab ativa')) {
                showErrorNotification('page_error', 'Não foi possível aceder à página atual');
            } else if (error.message.includes('não pode ser processada')) {
                showErrorNotification('page_error', 'Esta página não pode ser processada pela extensão');
            } else {
                showErrorNotification('processing_error', error.message);
            }
        }
    });
    
    // Funções auxiliares para UI
    function showLoading() {
        loadingIndicator.style.display = 'block';
        summaryResult.style.display = 'none';
        startTime = Date.now();
        currentStep = 0;
        updateProgressStep(0);
        startProgressAnimation();
        updateStatusProcessing(); // Atualizar status para processando
    }
    
    function hideLoading() {
        loadingIndicator.style.display = 'none';
        summaryResult.style.display = 'block';
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        restoreStatus(); // Restaurar status normal
    }

    function startProgressAnimation() {
        const steps = [
            { text: 'A preparar análise...', progress: 10 },
            { text: 'Extraindo texto da página...', progress: 25 },
            { text: 'Enviando para análise IA...', progress: 50 },
            { text: 'Processando com Gemini...', progress: 75 },
            { text: 'Formatando resultado...', progress: 90 },
            { text: 'Finalizando...', progress: 100 }
        ];
        
        let stepIndex = 0;
        
        progressInterval = setInterval(() => {
            if (stepIndex < steps.length) {
                const step = steps[stepIndex];
                updateProgressStep(stepIndex);
                updateProgressText(step.text, step.progress);
                stepIndex++;
            }
        }, 2000); // Mudar passo a cada 2 segundos
    }

    function updateProgressStep(stepIndex) {
        // Atualizar ícones dos passos
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step${i}`);
            const iconElement = stepElement.querySelector('.loading-step-icon');
            
            if (i < stepIndex) {
                stepElement.classList.add('completed');
                stepElement.classList.remove('active');
                iconElement.textContent = '✓';
            } else if (i === stepIndex) {
                stepElement.classList.add('active');
                stepElement.classList.remove('completed');
                iconElement.textContent = i;
            } else {
                stepElement.classList.remove('active', 'completed');
                iconElement.textContent = i;
            }
        }
    }

    function updateProgressText(text, percentage) {
        progressText.textContent = text;
        progressFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
        
        // Atualizar tempo estimado
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, (15000 - elapsed) / 1000);
        estimatedTime.textContent = `Tempo restante: ~${Math.round(remaining)} segundos`;
    }
    
    function disableButton() {
        summarizeButton.disabled = true;
        summarizeButton.textContent = '⏳ Processando...';
    }
    
    function enableButton() {
        summarizeButton.disabled = false;
        summarizeButton.textContent = '🔍 Extrair & Resumir';
    }
    
    function clearStatus() {
        statusMessage.innerHTML = '';
        statusMessage.className = '';
    }
    
    function showStatus(message, type) {
        statusMessage.innerHTML = message;
        statusMessage.className = type;
    }
    
    function clearSummary() {
        summaryResult.innerHTML = '';
    }
    
    function displaySummary(summary) {
        console.log('=== INICIANDO DISPLAY SUMMARY ===');
        console.log('Resumo recebido:', summary.substring(0, 200) + '...');
        
        try {
            // Limpar possíveis blocos de código Markdown que possam ter escapado
            let cleanSummary = summary
                .replace(/^```json\s*/gm, '')
                .replace(/^```\s*/gm, '')
                .replace(/\s*```$/gm, '')
                .replace(/^```json\s*/gm, '')
                .replace(/^```\s*/gm, '')
                .replace(/\s*```\s*$/gm, '')
                .trim();

            console.log('Resumo limpo:', cleanSummary.substring(0, 200) + '...');

            // Tentar fazer parse do JSON
            const summaryData = JSON.parse(cleanSummary);
            console.log('JSON parseado com sucesso:', summaryData);
            
            // Verificar se tem as propriedades esperadas
            if (!summaryData.resumo_conciso || !summaryData.pontos_chave) {
                throw new Error('JSON não tem estrutura esperada');
            }
            
            const htmlSummary = convertJsonToHtml(summaryData);
            summaryResult.innerHTML = htmlSummary;
            console.log('HTML gerado e inserido com sucesso');
            
        } catch (error) {
            console.warn('Erro ao fazer parse do JSON:', error);
            console.log('Resposta original completa:', summary);
            
            // Tentar extrair JSON manualmente se estiver dentro de texto
            try {
                const jsonMatch = summary.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    console.log('Tentando extrair JSON manualmente...');
                    const extractedJson = jsonMatch[0];
                    const summaryData = JSON.parse(extractedJson);
                    console.log('JSON extraído com sucesso:', summaryData);
                    
                    const htmlSummary = convertJsonToHtml(summaryData);
                    summaryResult.innerHTML = htmlSummary;
                    console.log('HTML gerado a partir do JSON extraído');
                    return;
                }
            } catch (extractError) {
                console.warn('Falha na extração manual:', extractError);
            }
            
            // Fallback para Markdown se não for JSON
            console.log('Usando fallback Markdown...');
            const htmlSummary = convertMarkdownToHtml(summary);
            summaryResult.innerHTML = htmlSummary;
        }
    }
    
    // Função para converter JSON estruturado para HTML
    function convertJsonToHtml(data) {
        console.log('Convertendo JSON para HTML:', data);
        let html = '';

        // Resumo Conciso
        html += '<div class="summary-section">';
        html += '<h2><span class="material-symbols-outlined">description</span> Resumo Conciso</h2>';
        html += '<p>' + escapeHtml(data.resumo_conciso) + '</p>';
        html += '</div>';

        // Pontos-Chave
        html += '<div class="summary-section">';
        html += '<h2><span class="material-symbols-outlined">key</span> Pontos-Chave</h2>';
        html += '<ul class="key-points">';
        data.pontos_chave.forEach(point => {
            html += '<li>' + escapeHtml(point) + '</li>';
        });
        html += '</ul>';
        html += '</div>';

        // Alertas de Privacidade
        html += '<div class="summary-section">';
        html += '<h2><span class="material-symbols-outlined">warning</span> Alertas de Privacidade</h2>';

        if (data.alertas_privacidade && data.alertas_privacidade.length > 0) {
            html += '<div class="privacy-alerts">';
            data.alertas_privacidade.forEach(alert => {
                const icon = getAlertIcon(alert.tipo);
                const alertClass = getAlertClass(alert.tipo);
                html += `<div class="alert-item ${alertClass}">`;
                html += `<span class="alert-icon material-symbols-outlined">${icon}</span>`;
                html += `<span class="alert-text">${escapeHtml(alert.texto)}</span>`;
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<div class="no-alerts"><span class="material-symbols-outlined">check_circle</span> Não foram encontrados alertas específicos</div>';
        }

        html += '</div>';

        console.log('HTML gerado:', html.substring(0, 200) + '...');
        return html;
    }

    // Função para escapar HTML e evitar XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Função para obter o ícone correto baseado no tipo de alerta
    function getAlertIcon(tipo) {
        const iconMap = {
            'partilha_dados': 'group',
            'propriedade_conteudo': 'image',
            'alteracoes_termos': 'sync_alt',
            'jurisdicao': 'gavel',
            'outros_riscos': 'error',
            'sem_alertas': 'check_circle'
        };
        return iconMap[tipo] || 'error';
    }
    
    // Função para obter a classe CSS baseada no tipo de alerta
    function getAlertClass(tipo) {
        const classMap = {
            'partilha_dados': 'alert-data-sharing',
            'propriedade_conteudo': 'alert-content-ownership',
            'alteracoes_termos': 'alert-terms-changes',
            'jurisdicao': 'alert-jurisdiction',
            'outros_riscos': 'alert-other-risks',
            'sem_alertas': 'alert-no-alerts'
        };
        return classMap[tipo] || 'alert-other-risks';
    }
    
    // Função melhorada para converter Markdown para HTML
    function convertMarkdownToHtml(markdown) {
        let html = markdown;
        
        // Headers (fazer em ordem decrescente para evitar conflitos)
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold e Italic
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        
        // Separador horizontal
        html = html.replace(/^---$/gim, '<hr>');
        
        // Listas (melhorar o processamento)
        html = html.replace(/^[\s]*[-*] (.*$)/gim, '<li>$1</li>');
        
        // Quebras de linha
        html = html.replace(/\n/gim, '<br>');
        
        // Agrupar itens de lista consecutivos em <ul>
        html = html.replace(/(<li>.*?<\/li>)(<br><li>.*?<\/li>)*/gims, function(match) {
            return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
        });
        
        // Limpar <br> desnecessários antes de headers
        html = html.replace(/<br><h([1-6])/gim, '<h$1');
        
        // Limpar <br> desnecessários antes de <ul>
        html = html.replace(/<br><ul>/gim, '<ul>');
        
        // Limpar <br> desnecessários após </ul>
        html = html.replace(/<\/ul><br>/gim, '</ul>');
        
        return html;
    }
    
    // Função para atualizar o indicador de status no header
    function updateStatusIndicator(result) {
        const statusIndicator = document.getElementById('statusIndicator');
        const icon = statusIndicator.querySelector('.material-symbols-outlined');
        
        if (!result.onboardingCompleted) {
            // Onboarding não completado
            statusIndicator.className = 'status-indicator status-warning';
            icon.textContent = 'waving_hand';
            statusIndicator.title = 'Complete a configuração inicial';
        } else if (!result.geminiApiKey) {
            // API key não configurada
            statusIndicator.className = 'status-indicator status-error';
            icon.textContent = 'key_off';
            statusIndicator.title = 'Configure a chave da API Gemini';
        } else {
            // Tudo configurado
            statusIndicator.className = 'status-indicator status-ready';
            icon.textContent = 'check_circle';
            statusIndicator.title = 'Extensão configurada e pronta para usar';
        }
    }

    // Função para atualizar status durante processamento
    function updateStatusProcessing() {
        const statusIndicator = document.getElementById('statusIndicator');
        const icon = statusIndicator.querySelector('.material-symbols-outlined');
        
        statusIndicator.className = 'status-indicator status-configuring';
        icon.textContent = 'sync';
        statusIndicator.title = 'Processando...';
    }

    // Função para restaurar status após processamento
    function restoreStatus() {
        chrome.storage.local.get(['onboardingCompleted', 'geminiApiKey'], function(result) {
            updateStatusIndicator(result);
        });
    }

    // Sistema de Notificações
    function showNotification(type, title, message, duration = 5000) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconMap = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        
        notification.innerHTML = `
            <span class="material-symbols-outlined notification-icon">${iconMap[type]}</span>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="closeNotification(this)">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove após duração especificada
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
                message: 'Ocorreu um erro ao processar o conteúdo. Tente novamente ou contacte o suporte se o problema persistir.'
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

        showNotification('error', error.title, error.message, 8000);
    }

    function showSuccessNotification(message) {
        showNotification('success', 'Sucesso!', message, 4000);
    }

    function showWarningNotification(title, message) {
        showNotification('warning', title, message, 6000);
    }

    function showInfoNotification(title, message) {
        showNotification('info', title, message, 5000);
    }
    
    // Funções de tema
    function initializeTheme() {
        chrome.storage.local.get(['theme'], function(result) {
            const theme = result.theme || 'light';
            setTheme(theme);
        });
    }
    
    function toggleTheme() {
        chrome.storage.local.get(['theme'], function(result) {
            const currentTheme = result.theme || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
            chrome.storage.local.set({ theme: newTheme });
        });
    }
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = themeToggle.querySelector('.material-symbols-outlined');
        themeIcon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
        themeToggle.title = theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro';
    }
    
    console.log('Popup script carregado');
});
