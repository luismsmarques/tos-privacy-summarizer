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
            window.close();
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
