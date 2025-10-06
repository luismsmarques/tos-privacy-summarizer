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
    viewTermsOfServiceBtn.addEventListener('click', () => openDocument('TERMS-OF-SERVICE.md'));
    showOnboardingBtn.addEventListener('click', () => openDocument('onboarding.html'));
    
    // Definir data de atualização
    lastUpdateSpan.textContent = new Date().toLocaleDateString('pt-PT');
    
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
            showStatus('Por favor, introduza uma chave da API válida.', 'error');
            return;
        }
        
        if (!isValidApiKey(apiKey)) {
            showStatus('Formato de chave da API inválido. Deve começar com "AIza".', 'error');
            return;
        }
        
        chrome.storage.local.set({ 
            geminiApiKey: apiKey,
            onboardingCompleted: true // Marcar onboarding como completado
        }, function() {
            showStatus('✅ Chave da API guardada com sucesso!', 'success');
            console.log('API Key guardada:', apiKey.substring(0, 10) + '...');
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
                    showStatus('✅ Chave da API válida! Conectado com sucesso.', 'success');
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
        // Chaves da Gemini API geralmente começam com "AIza"
        return apiKey.startsWith('AIza') && apiKey.length > 30;
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
                
                console.log('Chave API removida de forma segura');
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
    
    console.log('Página de configurações carregada');
});
