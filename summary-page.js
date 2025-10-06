// Summary page script
console.log('Summary page script carregado');

// Elementos do DOM
const loadingContainer = document.getElementById('loadingContainer');
const pageInfo = document.getElementById('pageInfo');
const summaryContent = document.getElementById('summaryContent');
const pageTitle = document.getElementById('pageTitle');
const pageType = document.getElementById('pageType');
const pageUrl = document.getElementById('pageUrl');
const themeToggle = document.getElementById('themeToggle');
const backButton = document.getElementById('backButton');

// Elementos do modal de feedback
const feedbackModal = document.getElementById('feedbackModal');
const feedbackModalClose = document.getElementById('feedbackModalClose');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackCancel = document.getElementById('feedbackCancel');
const feedbackSubmit = document.getElementById('feedbackSubmit');
const feedbackSuccess = document.getElementById('feedbackSuccess');
const feedbackType = document.getElementById('feedbackType');
const feedbackSection = document.getElementById('feedbackSection');
const feedbackDescription = document.getElementById('feedbackDescription');
const feedbackSuggestion = document.getElementById('feedbackSuggestion');

// Estado da aplicação
let summaryData = null;
let pageData = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de resumo...');
    
    // Inicializar tema
    initializeTheme();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Obter dados da URL ou storage
    loadSummaryData();
});

// Configurar event listeners
function setupEventListeners() {
    // Toggle de tema
    themeToggle.addEventListener('click', toggleTheme);
    
    // Botão voltar
    backButton.addEventListener('click', () => {
        window.close();
    });
    
    // Atalho de teclado para voltar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (feedbackModal.classList.contains('show')) {
                closeFeedbackModal();
            } else {
                window.close();
            }
        }
    });
    
    // Event listeners do modal de feedback
    feedbackModalClose.addEventListener('click', closeFeedbackModal);
    feedbackCancel.addEventListener('click', closeFeedbackModal);
    feedbackForm.addEventListener('submit', handleFeedbackSubmit);
    
    // Fechar modal ao clicar fora dele
    feedbackModal.addEventListener('click', (e) => {
        if (e.target === feedbackModal) {
            closeFeedbackModal();
        }
    });
}

// Carregar dados do resumo
async function loadSummaryData() {
    try {
        console.log('Carregando dados do resumo...');
        
        // Tentar obter dados da URL
        const urlParams = new URLSearchParams(window.location.search);
        const summaryParam = urlParams.get('summary');
        
        if (summaryParam) {
            console.log('Dados encontrados na URL');
            summaryData = JSON.parse(decodeURIComponent(summaryParam));
            pageData = {
                title: urlParams.get('title') || 'Página Analisada',
                type: urlParams.get('type') || 'Documento',
                url: urlParams.get('url') || window.location.href
            };
        } else {
            // Tentar obter do storage
            console.log('Procurando dados no storage...');
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['lastSummary', 'lastPageData'], resolve);
            });
            
            if (result.lastSummary) {
                console.log('Dados encontrados no storage');
                summaryData = result.lastSummary;
                pageData = result.lastPageData || {
                    title: 'Página Analisada',
                    type: 'Documento',
                    url: 'URL não disponível'
                };
            } else {
                console.log('Nenhum dado encontrado');
                showNoDataMessage();
                return;
            }
        }
        
        // Exibir dados
        displaySummary();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showErrorMessage('Erro ao carregar o resumo');
    }
}

// Exibir resumo
function displaySummary() {
    console.log('Exibindo resumo:', summaryData);
    
    // Esconder loading
    loadingContainer.classList.add('hidden');
    
    // Mostrar informações da página
    if (pageData) {
        pageTitle.textContent = pageData.title;
        pageType.textContent = pageData.type;
        pageUrl.textContent = pageData.url;
        pageInfo.classList.remove('hidden');
    }
    
    // Renderizar resumo
    if (summaryData) {
        summaryContent.innerHTML = formatStructuredSummary(summaryData);
        summaryContent.classList.remove('hidden');
    } else {
        showNoDataMessage();
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
                <div class="section-feedback">
                    <button class="feedback-button" onclick="openFeedbackModal('resumo_conciso')" title="Reportar problema nesta secção">
                        <span class="material-symbols-outlined">feedback</span>
                        Reportar erro
                    </button>
                </div>
                <h3>
                    <span class="material-symbols-outlined">description</span>
                    Resumo Conciso
                </h3>
                <p>${data.resumo_conciso}</p>
            </div>
        `;
    } else if (data.summary) {
        html += `
            <div class="summary-section">
                <div class="section-feedback">
                    <button class="feedback-button" onclick="openFeedbackModal('resumo_conciso')" title="Reportar problema nesta secção">
                        <span class="material-symbols-outlined">feedback</span>
                        Reportar erro
                    </button>
                </div>
                <h3>
                    <span class="material-symbols-outlined">description</span>
                    Resumo
                </h3>
                <p>${data.summary}</p>
            </div>
        `;
    }
    
    // Pontos chave
    if (data.pontos_chave && data.pontos_chave.length > 0) {
        html += `
            <div class="summary-section">
                <div class="section-feedback">
                    <button class="feedback-button" onclick="openFeedbackModal('pontos_chave')" title="Reportar problema nesta secção">
                        <span class="material-symbols-outlined">feedback</span>
                        Reportar erro
                    </button>
                </div>
                <h3>
                    <span class="material-symbols-outlined">key</span>
                    Pontos Chave
                </h3>
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
                <div class="section-feedback">
                    <button class="feedback-button" onclick="openFeedbackModal('alertas_privacidade')" title="Reportar problema nesta secção">
                        <span class="material-symbols-outlined">feedback</span>
                        Reportar erro
                    </button>
                </div>
                <h3>
                    <span class="material-symbols-outlined">warning</span>
                    Alertas de Privacidade
                </h3>
                <div class="privacy-alerts">
                    ${data.alertas_privacidade.map(alert => `
                        <div class="alert-item alert-${alert.tipo}">
                            <span class="material-symbols-outlined alert-icon">warning</span>
                            <div class="alert-text">${alert.texto}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Botão de feedback geral no final
    if (html) {
        html += `
            <div style="text-align: center; margin-top: 32px;">
                <button class="feedback-button" onclick="openFeedbackModal('geral')" style="margin-top: 0;">
                    <span class="material-symbols-outlined">feedback</span>
                    O resumo não captou o ponto X? Reportar erro de análise
                </button>
            </div>
        `;
    }
    
    console.log('HTML estruturado gerado:', html);
    return html || '<p>Resumo não disponível</p>';
}

// Mostrar mensagem de sem dados
function showNoDataMessage() {
    loadingContainer.classList.add('hidden');
    summaryContent.innerHTML = `
        <div class="summary-section">
            <h3>
                <span class="material-symbols-outlined">info</span>
                Nenhum Resumo Disponível
            </h3>
            <p>Não foi possível encontrar dados do resumo. Por favor, gere um novo resumo usando a extensão.</p>
        </div>
    `;
    summaryContent.classList.remove('hidden');
}

// Mostrar mensagem de erro
function showErrorMessage(message) {
    loadingContainer.classList.add('hidden');
    summaryContent.innerHTML = `
        <div class="summary-section">
            <h3>
                <span class="material-symbols-outlined">error</span>
                Erro
            </h3>
            <p>${message}</p>
        </div>
    `;
    summaryContent.classList.remove('hidden');
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

// Listener para mensagens do popup (se necessário)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Summary page recebeu mensagem:', request.action);
    
    if (request.action === 'updateSummary') {
        summaryData = request.summary;
        pageData = request.pageData;
        displaySummary();
    }
});

// ===== FUNÇÕES DE FEEDBACK =====

// Abrir modal de feedback
function openFeedbackModal(section = 'geral') {
    console.log('Abrindo modal de feedback para secção:', section);
    
    // Resetar formulário
    feedbackForm.reset();
    feedbackSuccess.classList.add('hidden');
    
    // Definir secção automaticamente se especificada
    if (section !== 'geral') {
        feedbackSection.value = section;
    }
    
    // Mostrar modal
    feedbackModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Focar no primeiro campo
    setTimeout(() => {
        feedbackType.focus();
    }, 100);
}

// Fechar modal de feedback
function closeFeedbackModal() {
    console.log('Fechando modal de feedback');
    
    feedbackModal.classList.remove('show');
    document.body.style.overflow = '';
    
    // Resetar formulário após animação
    setTimeout(() => {
        feedbackForm.reset();
        feedbackSuccess.classList.add('hidden');
    }, 300);
}

// Lidar com submissão do feedback
async function handleFeedbackSubmit(e) {
    e.preventDefault();
    
    console.log('Submetendo feedback...');
    
    // Desabilitar botão de submit
    feedbackSubmit.disabled = true;
    feedbackSubmit.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Enviando...';
    
    try {
        // Coletar dados do formulário
        const feedbackData = {
            type: feedbackType.value,
            section: feedbackSection.value,
            description: feedbackDescription.value.trim(),
            suggestion: feedbackSuggestion.value.trim(),
            pageUrl: pageData?.url || 'N/A',
            pageTitle: pageData?.title || 'N/A',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            summaryId: generateSummaryId()
        };
        
        console.log('Dados do feedback:', feedbackData);
        
        // Enviar feedback para o backend
        await sendFeedbackToBackend(feedbackData);
        
        // Mostrar mensagem de sucesso
        feedbackSuccess.classList.remove('hidden');
        feedbackForm.style.display = 'none';
        
        // Fechar modal após 2 segundos
        setTimeout(() => {
            closeFeedbackModal();
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        alert('Erro ao enviar feedback. Tente novamente.');
    } finally {
        // Reabilitar botão
        feedbackSubmit.disabled = false;
        feedbackSubmit.innerHTML = '<span class="material-symbols-outlined">send</span> Enviar Feedback';
    }
}

// Enviar feedback para o backend
async function sendFeedbackToBackend(feedbackData) {
    const backendUrl = 'https://tos-privacy-summarizer.vercel.app/api/feedback';
    
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Feedback enviado com sucesso:', result);
        
    } catch (error) {
        console.error('❌ Erro ao enviar feedback para o backend:', error);
        
        // Fallback: salvar localmente se o backend falhar
        console.log('💾 Salvando feedback localmente como fallback...');
        await saveFeedbackLocally(feedbackData);
    }
}

// Salvar feedback localmente (fallback)
async function saveFeedbackLocally(feedbackData) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['feedbackData'], (result) => {
            const existingFeedback = result.feedbackData || [];
            existingFeedback.push(feedbackData);
            
            chrome.storage.local.set({ feedbackData: existingFeedback }, () => {
                console.log('Feedback salvo localmente:', feedbackData);
                resolve();
            });
        });
    });
}

// Gerar ID único para o resumo
function generateSummaryId() {
    return 'summary_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Criar botão de feedback para uma secção
function createFeedbackButton(section) {
    const button = document.createElement('button');
    button.className = 'feedback-button';
    button.innerHTML = `
        <span class="material-symbols-outlined">feedback</span>
        Reportar erro
    `;
    button.title = 'Reportar problema nesta secção';
    button.addEventListener('click', () => openFeedbackModal(section));
    
    return button;
}
