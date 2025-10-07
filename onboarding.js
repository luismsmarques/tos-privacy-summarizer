// Script para o onboarding da extensão
let currentStep = 0;
const totalSteps = 5;

// Inicializar quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('Onboarding carregado');
    
    // Inicializar tema
    initializeTheme();
    
    updateProgress();
    updateStepIndicators();
    setupEventListeners();
});

// Configurar todos os event listeners
function setupEventListeners() {
    // Botão "Começar Configuração" (Passo 1)
    const startConfigBtn = document.getElementById('startConfigBtn');
    if (startConfigBtn) {
        startConfigBtn.addEventListener('click', nextStep);
    }
    
    // Link "Saltar configuração" (Passo 1)
    const skipOnboardingLink = document.getElementById('skipOnboardingLink');
    if (skipOnboardingLink) {
        skipOnboardingLink.addEventListener('click', function(e) {
            e.preventDefault();
            skipOnboarding();
        });
    }
    
    // Botões do Passo 2 - Opções de API
    const prevStep2Btn = document.getElementById('prevStep2Btn');
    if (prevStep2Btn) {
        prevStep2Btn.addEventListener('click', prevStep);
    }
    
    const useSharedApiBtn = document.getElementById('useSharedApiBtn');
    if (useSharedApiBtn) {
        useSharedApiBtn.addEventListener('click', useSharedApi);
    }
    
    const buyCreditsBtn = document.getElementById('buyCreditsBtn');
    if (buyCreditsBtn) {
        buyCreditsBtn.addEventListener('click', buyCredits);
    }
    
    const useOwnApiBtn = document.getElementById('useOwnApiBtn');
    if (useOwnApiBtn) {
        useOwnApiBtn.addEventListener('click', useOwnApi);
    }
    
    const testAndNextBtn = document.getElementById('testAndNextBtn');
    if (testAndNextBtn) {
        testAndNextBtn.addEventListener('click', testAndNext);
    }
    
    // Botões do Passo 3
    const prevStep3Btn = document.getElementById('prevStep3Btn');
    if (prevStep3Btn) {
        prevStep3Btn.addEventListener('click', prevStep);
    }
    
    const nextStep3Btn = document.getElementById('nextStep3Btn');
    if (nextStep3Btn) {
        nextStep3Btn.addEventListener('click', nextStep);
    }
    
    // Botões do Passo 4
    const prevStep4Btn = document.getElementById('prevStep4Btn');
    if (prevStep4Btn) {
        prevStep4Btn.addEventListener('click', prevStep);
    }
    
    const nextStep4Btn = document.getElementById('nextStep4Btn');
    if (nextStep4Btn) {
        nextStep4Btn.addEventListener('click', nextStep);
    }
    
    // Botão "Começar a Usar" (Passo 5)
    const completeOnboardingBtn = document.getElementById('completeOnboardingBtn');
    if (completeOnboardingBtn) {
        completeOnboardingBtn.addEventListener('click', completeOnboarding);
    }
    
    // Event listeners para checkboxes
    const autoDetectCheckbox = document.getElementById('autoDetect');
    if (autoDetectCheckbox) {
        autoDetectCheckbox.addEventListener('change', function() {
            console.log('Auto-detect:', this.checked);
        });
    }
    
    const notificationsCheckbox = document.getElementById('notifications');
    if (notificationsCheckbox) {
        notificationsCheckbox.addEventListener('change', function() {
            console.log('Notifications:', this.checked);
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    console.log('Event listeners configurados');
}

// Função para avançar para o próximo passo
function nextStep() {
    if (currentStep < totalSteps - 1) {
        currentStep++;
        showStep(currentStep);
        updateProgress();
        updateStepIndicators();
    }
}

// Função para voltar ao passo anterior
function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
        updateProgress();
        updateStepIndicators();
    }
}

// Função para mostrar um passo específico
function showStep(stepIndex) {
    // Esconder todos os passos
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    // Mostrar o passo atual
    const currentStepElement = document.getElementById(`step${stepIndex + 1}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    console.log(`Passo atual: ${stepIndex + 1}`);
}

// Função para atualizar a barra de progresso
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progress = ((currentStep + 1) / totalSteps) * 100;
        progressFill.style.width = `${progress}%`;
    }
}

// Função para atualizar os indicadores de passo
function updateStepIndicators() {
    const dots = document.querySelectorAll('.step-dot');
    dots.forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        
        if (index < currentStep) {
            dot.classList.add('completed');
        } else if (index === currentStep) {
            dot.classList.add('active');
        }
    });
}

// Função para usar API compartilhada
async function useSharedApi() {
    console.log('Utilizador escolheu API compartilhada');
    
    try {
        // Verificar créditos disponíveis
        const credits = await getSharedCredits();
        
        if (credits <= 0) {
            showStatus('Não tem créditos disponíveis. Compre mais créditos para continuar.', 'error', document.getElementById('apiKeyStatus'));
            return;
        }
        
        // Configurar API compartilhada
        await saveSharedApiConfig();
        
        // Marcar onboarding como completado
        await saveApiKey('SHARED_API'); // Usar um identificador especial
        
        showStatus('✅ Configurado com sucesso! Pode começar a usar a extensão.', 'success', document.getElementById('apiKeyStatus'));
        
        // Aguardar um pouco e avançar
        setTimeout(() => {
            nextStep();
        }, 1500);
        
    } catch (error) {
        console.error('Erro ao configurar API compartilhada:', error);
        showStatus('❌ Erro ao configurar API compartilhada. Tente novamente.', 'error', document.getElementById('apiKeyStatus'));
    }
}

// Função para comprar créditos
function buyCredits() {
    console.log('Utilizador quer comprar créditos');
    
    // Abrir página de checkout da extensão
    chrome.tabs.create({
        url: chrome.runtime.getURL('checkout.html')
    });
    
    showStatus('Redirecionando para página de compra...', 'info', document.getElementById('apiKeyStatus'));
}

// Função para usar chave própria
function useOwnApi() {
    console.log('Utilizador escolheu usar chave própria');
    
    // Mostrar secção de chave da API
    const apiKeySection = document.getElementById('apiKeySection');
    const testAndNextBtn = document.getElementById('testAndNextBtn');
    
    if (apiKeySection) {
        apiKeySection.style.display = 'block';
    }
    
    if (testAndNextBtn) {
        testAndNextBtn.style.display = 'inline-block';
    }
    
    // Marcar opção como selecionada
    const ownApiOption = document.getElementById('ownApiOption');
    if (ownApiOption) {
        ownApiOption.classList.add('selected');
    }
    
    const sharedApiOption = document.getElementById('sharedApiOption');
    if (sharedApiOption) {
        sharedApiOption.classList.remove('selected');
    }
}

// Função para obter créditos compartilhados
async function getSharedCredits() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['sharedCredits'], function(result) {
            const credits = result.sharedCredits || 5; // 5 créditos gratuitos por padrão
            resolve(credits);
        });
    });
}

// Função para decrementar créditos
async function decrementSharedCredits() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['sharedCredits'], function(result) {
            const currentCredits = result.sharedCredits || 5;
            const newCredits = Math.max(0, currentCredits - 1);
            
            chrome.storage.local.set({ sharedCredits: newCredits }, function() {
                resolve(newCredits);
            });
        });
    });
}

// Função para guardar configuração da API compartilhada
async function saveSharedApiConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.set({
            apiType: 'shared',
            sharedCredits: 5, // Créditos iniciais
            lastUsed: Date.now()
        }, resolve);
    });
}

// Função para testar a API key e avançar (apenas para chaves próprias)
async function testAndNext() {
    const apiKeyInput = document.getElementById('apiKey');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    
    if (!apiKeyInput || !apiKeyInput.value.trim()) {
        showStatus('Por favor, introduza uma chave da API válida.', 'error', apiKeyStatus);
        return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    
    // Validar formato básico
    if (!apiKey.startsWith('AIza')) {
        showStatus('Formato de chave da API inválido. Deve começar com "AIza".', 'error', apiKeyStatus);
        return;
    }
    
    showStatus('Testando chave da API...', 'info', apiKeyStatus);
    
    try {
        // Testar a API key
        const isValid = await testApiKey(apiKey);
        
        if (isValid) {
            // Guardar a API key no storage
            await saveApiKey(apiKey);
            showStatus('✅ Chave da API válida e guardada!', 'success', apiKeyStatus);
            
            // Aguardar um pouco e avançar
            setTimeout(() => {
                nextStep();
            }, 1500);
        } else {
            showStatus('❌ Chave da API inválida. Verifique se copiou corretamente.', 'error', apiKeyStatus);
        }
    } catch (error) {
        console.error('Erro ao testar API key:', error);
        showStatus(`❌ Erro ao testar chave da API: ${error.message}`, 'error', apiKeyStatus);
    }
}

// Função para testar a API key
async function testApiKey(apiKey) {
    const TEST_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models?key=';
    
    try {
        const response = await fetch(`${TEST_API_URL}${apiKey}`);
        
        if (response.ok) {
            const data = await response.json();
            return data.models && data.models.length > 0;
        } else {
            console.error('Erro na resposta da API:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Erro de rede ao testar API key:', error);
        return false;
    }
}

// Função para guardar a API key
async function saveApiKey(apiKey) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ 
            geminiApiKey: apiKey,
            apiType: apiKey === 'SHARED_API' ? 'shared' : 'own',
            onboardingCompleted: true
        }, resolve);
    });
}

// Função para completar o onboarding
function completeOnboarding() {
    // Guardar configurações finais
    const autoDetect = document.getElementById('autoDetect');
    const notifications = document.getElementById('notifications');
    
    chrome.storage.local.set({
        autoDetect: autoDetect ? autoDetect.checked : true,
        notifications: notifications ? notifications.checked : true,
        onboardingCompleted: true
    }, function() {
        console.log('Onboarding completado');
        
        // Fechar a aba de onboarding
        window.close();
        
        // Se não conseguir fechar (alguns navegadores não permitem), mostrar mensagem
        setTimeout(() => {
            alert('Onboarding completado! Pode fechar esta janela e começar a usar a extensão.');
        }, 100);
    });
}

// Função para saltar o onboarding
function skipOnboarding() {
    chrome.storage.local.set({
        onboardingCompleted: true
    }, function() {
        console.log('Onboarding saltado');
        window.close();
    });
}

// Função para mostrar mensagens de status
function showStatus(message, type, element) {
    if (!element) return;
    
    element.innerHTML = message;
    element.className = `${type}-message`;
    
    // Limpar mensagem após alguns segundos para mensagens de sucesso/info
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.innerHTML = '';
            element.className = '';
        }, 3000);
    }
}

// Funções de tema
function initializeTheme() {
    chrome.storage.local.get(['theme'], (result) => {
        const theme = result.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        // Atualizar ícone do botão
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
                const icon = themeToggle.querySelector('.material-icons');
                icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    chrome.storage.local.set({ theme: newTheme });
    
    // Atualizar ícone do botão
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

// Função para abrir links externos
function openExternalLink(url) {
    chrome.tabs.create({ url: url });
}

console.log('Onboarding script carregado');