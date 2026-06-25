// Script para página de configurações
document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const testApiKeyBtn = document.getElementById('testApiKey');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const autoDetectToggle = document.getElementById('autoDetectToggle');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const resetSettingsBtn = document.getElementById('resetSettings');
    const exportSettingsBtn = document.getElementById('exportSettings');
    const viewPrivacyPolicyBtn = document.getElementById('viewPrivacyPolicy');
    const viewTermsOfServiceBtn = document.getElementById('viewTermsOfService');
    const showOnboardingBtn = document.getElementById('showOnboarding');
    const lastUpdateSpan = document.getElementById('lastUpdate');
    const themeToggle = document.getElementById('themeToggle');
    
    // Elementos de idioma
    const languageSelect = document.getElementById('languageSelect');
    const autoDetectLanguageToggle = document.getElementById('autoDetectLanguageToggle');
    
    // Aguardar inicialização do i18n
    const initI18n = async () => {
        // Aguardar o i18n estar pronto
        while (!window.i18n || !window.i18n.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Configurar event listeners de idioma
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                window.i18n.setLanguage(e.target.value);
                window.i18n.updateUI();
                showStatus(window.i18n.t('messages.language_changed') + ' ' + e.target.options[e.target.selectedIndex].text, 'success');
            });
        }
        
        if (autoDetectLanguageToggle) {
            autoDetectLanguageToggle.addEventListener('click', () => {
                const enabled = autoDetectLanguageToggle.classList.contains('active');
                window.i18n.setAutoDetect(!enabled);
                setToggleState(autoDetectLanguageToggle, !enabled);
            });
        }
        
        // Atualizar UI com traduções
        window.i18n.updateUI();
        
        // Carregar configurações de idioma
        loadLanguageSettings();
    };
    
    // Inicializar i18n
    initI18n();
    
    // Inicializar tema
    initializeTheme();
    
    // Carregar configurações existentes
    loadSettings();
    
    // Event listeners
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    testApiKeyBtn.addEventListener('click', testApiKey);
    autoDetectToggle.addEventListener('click', () => toggleSetting('autoDetect', autoDetectToggle));
    notificationsToggle.addEventListener('click', () => toggleSetting('notifications', notificationsToggle));
    resetSettingsBtn.addEventListener('click', resetSettings);
    exportSettingsBtn.addEventListener('click', exportSettings);
    viewPrivacyPolicyBtn.addEventListener('click', () => openDocument('privacy-policy.html'));
    viewTermsOfServiceBtn.addEventListener('click', () => openDocument('terms-of-service.html'));
    showOnboardingBtn.addEventListener('click', () => openDocument('onboarding.html'));
    
    // Event listener para o botão de tema
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        console.log('Theme toggle event listener added');
    } else {
        console.error('Theme toggle button not found');
    }
    
    // Definir data de atualização
    lastUpdateSpan.textContent = new Date().toLocaleDateString('pt-PT');
    
    // Função para carregar configurações de idioma
    function loadLanguageSettings() {
        chrome.storage.local.get(['language', 'autoDetectLanguage'], function(result) {
            if (languageSelect) {
                languageSelect.value = result.language || 'pt';
            }
            if (autoDetectLanguageToggle) {
                setToggleState(autoDetectLanguageToggle, result.autoDetectLanguage !== false);
            }
        });
    }
    
    // Função para carregar configurações
    function loadSettings() {
        chrome.storage.local.get(['geminiApiKey', 'autoDetect', 'notifications'], function(result) {
            if (result.geminiApiKey) {
                apiKeyInput.value = result.geminiApiKey;
            }
            
            // Configurar toggles
            setToggleState(autoDetectToggle, result.autoDetect !== false); // Default: true
            setToggleState(notificationsToggle, result.notifications !== false); // Default: true
        });
    }
    
    // Função para guardar chave da API
    function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus(window.i18n.t('errors.invalid_api_key'), 'error');
            return;
        }
        
        if (!isValidApiKey(apiKey)) {
            showStatus('Formato de chave da API inválido. Verifique se copiou a chave completa, sem espaços.', 'error');
            return;
        }
        
        chrome.storage.local.set({
            geminiApiKey: apiKey,
            apiType: 'own', // Ao guardar uma chave própria, passar a usá-la em vez dos créditos partilhados
            onboardingCompleted: true // Marcar onboarding como completado
        }, function() {
            showStatus(window.i18n.t('messages.api_key_saved'), 'success');
            console.log('API Key guardada (modo: API própria):', apiKey.substring(0, 10) + '...');
        });
    }
    
    // Função para testar chave da API
    function testApiKey() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus('Por favor, introduza uma chave da API primeiro.', 'warning');
            return;
        }
        
        showStatus('🧪 A testar chave da API...', 'warning');
        
        // Testar a API com uma chamada simples
        testGeminiApi(apiKey)
            .then(result => {
                if (result.success) {
                    showStatus(window.i18n.t('messages.api_key_tested'), 'success');
                } else {
                    showStatus(`❌ Erro na chave da API: ${result.error}`, 'error');
                }
            })
            .catch(error => {
                showStatus(`❌ Erro ao testar API: ${error.message}`, 'error');
            });
    }
    
    // Função para testar API Gemini
    async function testGeminiApi(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            
            if (!response.ok) {
                const errorData = await response.text();
                return { success: false, error: `HTTP ${response.status}: ${errorData}` };
            }
            
            const data = await response.json();
            
            if (data.models && data.models.length > 0) {
                return { success: true, models: data.models.length };
            } else {
                return { success: false, error: 'Nenhum modelo encontrado' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Função para validar formato da chave da API
    function isValidApiKey(apiKey) {
        // Não assumir um prefixo fixo ("AIza"): o formato das chaves do Google
        // AI mudou ao longo do tempo e nem todas começam por "AIza". Validação
        // leve de sanidade — o validador real é o botão "Testar" (chamada à API).
        return /^[A-Za-z0-9_-]{20,}$/.test(apiKey);
    }
    
    // Função para alternar configurações
    function toggleSetting(settingName, toggleElement) {
        const isActive = toggleElement.classList.contains('active');
        const newValue = !isActive;
        
        setToggleState(toggleElement, newValue);
        
        chrome.storage.local.set({ [settingName]: newValue }, function() {
            console.log(`${settingName} definido para:`, newValue);
        });
    }
    
    // Função para definir estado do toggle
    function setToggleState(toggleElement, isActive) {
        if (isActive) {
            toggleElement.classList.add('active');
        } else {
            toggleElement.classList.remove('active');
        }
    }
    
    // Função para mostrar mensagens de status
    function showStatus(message, type) {
        apiKeyStatus.textContent = message;
        apiKeyStatus.className = `status-message status-${type}`;
        apiKeyStatus.style.display = 'block';
        
        // Esconder após 5 segundos para mensagens de sucesso
        if (type === 'success') {
            setTimeout(() => {
                apiKeyStatus.style.display = 'none';
            }, 5000);
        }
    }
    
    // Função para repor configurações
    function resetSettings() {
        if (confirm('Tem a certeza que quer repor todas as configurações? Esta ação não pode ser desfeita.')) {
            // Limpar chave API de forma segura primeiro
            clearApiKeySecurely().then(() => {
                // Limpar resto das configurações
                chrome.storage.local.clear(function() {
                    showStatus('🔄 Configurações repostas com sucesso! Chave API removida com segurança.', 'success');
                    
                    // Limpar campos
                    apiKeyInput.value = '';
                    setToggleState(autoDetectToggle, true);
                    setToggleState(notificationsToggle, true);
                    
                    console.log('Configurações repostas - chave API removida com segurança');
                });
            }).catch(error => {
                console.error('Erro ao limpar chave API:', error);
                showStatus('❌ Erro ao limpar chave API. Tente novamente.', 'error');
            });
        }
    }
    
    // Função para limpar chave API de forma segura
    async function clearApiKeySecurely() {
        try {
            // Obter chave atual
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['geminiApiKey'], resolve);
            });
            
            if (result.geminiApiKey && result.geminiApiKey !== 'SHARED_API') {
                // Sobrescrever com dados aleatórios antes de remover
                const randomData = Array.from({length: 50}, () => Math.random().toString(36).charAt(2)).join('');
                await new Promise((resolve) => {
                    chrome.storage.local.set({ geminiApiKey: randomData }, resolve);
                });
                
                // Aguardar um pouco
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Remover completamente
                await new Promise((resolve) => {
                    chrome.storage.local.remove(['geminiApiKey'], resolve);
                });

                // Voltar a usar a API partilhada (créditos)
                await new Promise((resolve) => {
                    chrome.storage.local.set({ apiType: 'shared' }, resolve);
                });

                console.log('Chave API removida de forma segura; modo reposto para API partilhada');
            }
        } catch (error) {
            console.error('Erro ao limpar chave API:', error);
            throw error;
        }
    }
    
    // Função para exportar configurações
    function exportSettings() {
        chrome.storage.local.get(null, function(items) {
            // Remover a chave da API por segurança
            const exportData = { ...items };
            if (exportData.geminiApiKey) {
                exportData.geminiApiKey = '[OCULTO]';
            }
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'tos-summarizer-settings.json';
            link.click();
            
            showStatus('📤 Configurações exportadas com sucesso!', 'success');
        });
    }
    
    // Função para importar configurações (futuro)
    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                
                // Validar estrutura
                if (settings.geminiApiKey && settings.geminiApiKey !== '[OCULTO]') {
                    chrome.storage.local.set(settings, function() {
                        showStatus('📥 Configurações importadas com sucesso!', 'success');
                        loadSettings(); // Recarregar configurações
                    });
                } else {
                    showStatus('❌ Ficheiro de configurações inválido.', 'error');
                }
            } catch (error) {
                showStatus('❌ Erro ao importar configurações: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }
    
    // Função para abrir documentos legais
    function openDocument(filename) {
        chrome.tabs.create({
            url: chrome.runtime.getURL(filename)
        });
    }
    
    // Funções de tema
    function initializeTheme() {
        chrome.storage.local.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            if (typeof syncThemeSegment === 'function') syncThemeSegment(theme);

            // Atualizar ícone do botão
            if (themeToggle) {
                const icon = themeToggle.querySelector('.material-icons');
                if (icon) {
                    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
                }
            }
        });
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        chrome.storage.local.set({ theme: newTheme });
        if (typeof syncThemeSegment === 'function') syncThemeSegment(newTheme);

        // Atualizar ícone do botão
        if (themeToggle) {
            const icon = themeToggle.querySelector('.material-icons');
            if (icon) {
                icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
            }
        }
    }
    
    // ---- Segmented controls (mockup-faithful visuals) ----
    // "Default focus" segment: visual-only selection, persisted as a preference.
    const defaultFocusSegment = document.getElementById('defaultFocusSegment');
    if (defaultFocusSegment) {
        const focusBtns = defaultFocusSegment.querySelectorAll('[data-focus]');
        chrome.storage.local.get(['defaultFocus'], (result) => {
            const current = result.defaultFocus || 'general';
            focusBtns.forEach((b) => {
                b.classList.toggle('is-active', b.dataset.focus === current);
            });
        });
        focusBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                focusBtns.forEach((b) => b.classList.remove('is-active'));
                btn.classList.add('is-active');
                chrome.storage.local.set({ defaultFocus: btn.dataset.focus });
            });
        });
    }

    // "Theme" segment: drives the real theme (light/dark/auto), kept in sync
    // with the header theme toggle and the persisted `theme` value.
    const themeSegment = document.getElementById('themeSegment');
    function syncThemeSegment(theme) {
        if (!themeSegment) return;
        themeSegment.querySelectorAll('[data-theme-choice]').forEach((b) => {
            b.classList.toggle('is-active', b.dataset.themeChoice === theme);
        });
    }
    if (themeSegment) {
        chrome.storage.local.get(['theme'], (result) => {
            syncThemeSegment(result.theme || 'light');
        });
        themeSegment.querySelectorAll('[data-theme-choice]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const choice = btn.dataset.themeChoice;
                let applied = choice;
                if (choice === 'auto') {
                    applied = window.matchMedia &&
                        window.matchMedia('(prefers-color-scheme: dark)').matches
                        ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', applied);
                chrome.storage.local.set({ theme: choice });
                syncThemeSegment(choice);
                if (themeToggle) {
                    const icon = themeToggle.querySelector('.material-icons');
                    if (icon) icon.textContent = applied === 'dark' ? 'light_mode' : 'dark_mode';
                }
            });
        });
    }

    console.log('Página de configurações carregada');
    console.log('Theme toggle button:', themeToggle);
    console.log('Theme toggle button found:', !!themeToggle);
});
