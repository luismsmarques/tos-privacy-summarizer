// Summary page script
console.log('Summary page script carregado');

// Elementos do DOM
const loadingContainer = document.getElementById('loadingContainer');
const analysisCard = document.getElementById('analysisCard');
const pageInfo = document.getElementById('pageInfo');
const summaryContent = document.getElementById('summaryContent');
const pageTitle = document.getElementById('pageTitle');
const pageType = document.getElementById('pageType');
const pageUrl = document.getElementById('pageUrl');
const pageAvatar = document.getElementById('pageAvatar');
const pageRisk = document.getElementById('pageRisk');
const ratingsContainer = document.getElementById('ratingsContainer');
const detailType = document.getElementById('detailType');
const detailLength = document.getElementById('detailLength');
const detailModel = document.getElementById('detailModel');
const themeToggle = document.getElementById('themeToggle');
const backButton = document.getElementById('backButton');
const backButtonInline = document.getElementById('backButtonInline');
const exportButton = document.getElementById('exportButton');
const shareButton = document.getElementById('shareButton');

// Mapeia uma pontuação 1-10 para a classe de cor do design system.
// 1-3 -> is-low, 4-7 -> is-mid, 8-10 -> is-high.
function riskClassFor(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return '';
    if (n <= 3) return 'is-low';
    if (n <= 7) return 'is-mid';
    return 'is-high';
}

// Mostra/esconde o cartão de análise completo (moldura de 2 colunas)
function revealAnalysisCard() {
    if (analysisCard) analysisCard.classList.remove('hidden');
}

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

    // Botões voltar (cabeçalho da app + cabeçalho do documento)
    if (backButton) backButton.addEventListener('click', () => window.close());
    if (backButtonInline) backButtonInline.addEventListener('click', () => window.close());

    // Exportar / Partilhar
    if (exportButton) exportButton.addEventListener('click', exportSummary);
    if (shareButton) shareButton.addEventListener('click', shareSummary);

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
    
    // Esconder loading e mostrar a moldura do cartão
    loadingContainer.classList.add('hidden');
    revealAnalysisCard();

    // Mostrar informações da página (cabeçalho do documento)
    if (pageData) {
        pageTitle.textContent = pageData.title;
        pageInfo.classList.remove('hidden');

        // Sub-linha: "url · data" (a data só aparece se existir nos dados)
        if (pageUrl) pageUrl.textContent = pageData.url || '-';
        if (pageType) {
            const date = pageData.date || (summaryData && summaryData.date);
            if (date) {
                pageType.textContent = ` · ${date}`;
                pageType.classList.remove('hidden');
            } else {
                pageType.textContent = '';
                pageType.classList.add('hidden');
            }
        }

        // Avatar: inicial do título (apenas estética)
        if (pageAvatar) {
            const initial = (pageData.title || 'D').trim().charAt(0).toUpperCase();
            pageAvatar.textContent = initial || 'D';
        }

        // Detalhes (coluna direita) — usa os dados existentes, sem inventar valores
        if (detailType) detailType.textContent = pageData.type || '-';
        if (detailLength) {
            detailLength.textContent = summaryData && summaryData.length_words
                ? `${summaryData.length_words} palavras`
                : (pageData.length || '-');
        }
        if (detailModel) {
            detailModel.textContent =
                (summaryData && summaryData.model) || pageData.model || '-';
        }
    }

    // Ratings / meters + badge de risco no cabeçalho
    displayRatings(summaryData && summaryData.ratings);

    // Renderizar resumo
    if (summaryData) {
        summaryContent.innerHTML = formatStructuredSummary(summaryData);
        summaryContent.classList.remove('hidden');
    } else {
        showNoDataMessage();
    }
}

// Preenche os 3 cartões de rating (Risco / Complexidade / Boas práticas)
// e a badge de risco do cabeçalho a partir do objeto `ratings`.
// ratings = { risk_score, complexidade, boas_praticas } (1-10). Sem inventar.
function displayRatings(ratings) {
    const r = ratings || {};

    // Mapa rating -> valor disponível nos dados
    const values = {
        risco: r.risk_score,
        complexidade: r.complexidade,
        boas_praticas: r.boas_praticas
    };

    if (ratingsContainer) {
        ratingsContainer.querySelectorAll('.rating-card').forEach((card) => {
            const key = card.getAttribute('data-rating');
            const value = values[key];
            const numEl = card.querySelector('.ds-rating-num');
            const meter = card.querySelector('.ds-meter');
            const fill = meter ? meter.querySelector('i') : null;

            const has = Number.isFinite(Number(value));
            const cls = has ? riskClassFor(value) : '';

            // Estado do cartão e da barra
            card.classList.remove('is-low', 'is-mid', 'is-high');
            if (meter) meter.classList.remove('is-low', 'is-mid', 'is-high');
            if (cls) {
                card.classList.add(cls);
                if (meter) meter.classList.add(cls);
            }

            if (numEl) {
                numEl.innerHTML = `${has ? Number(value) : '—'}<small>/10</small>`;
            }
            if (fill) {
                fill.style.width = has ? `${Number(value) * 10}%` : '0%';
            }
        });
    }

    // Badge de risco no cabeçalho do documento
    if (pageRisk) {
        const risk = values.risco;
        if (Number.isFinite(Number(risk))) {
            const n = Number(risk);
            const cls = riskClassFor(n);
            const label = n <= 3 ? 'Risco baixo' : n <= 7 ? 'Risco moderado' : 'Risco elevado';
            pageRisk.className = `ds-risk page-risk ${cls}`;
            pageRisk.textContent = `${label} · ${n}/10`;
            pageRisk.classList.remove('hidden');
        } else {
            pageRisk.classList.add('hidden');
        }
    }
}

// Formatar resumo estruturado
function formatStructuredSummary(data) {
    console.log('Formatando resumo estruturado:', data);
    
    let html = '';

    // Resumo conciso (Summary)
    if (data.resumo_conciso) {
        html += `
            <div class="summary-section">
                <h3>Resumo</h3>
                <p>${data.resumo_conciso}</p>
            </div>
        `;
    } else if (data.summary) {
        html += `
            <div class="summary-section">
                <h3>Resumo</h3>
                <p>${data.summary}</p>
            </div>
        `;
    }

    // Pontos chave (Key points) — lista com ícone de check
    if (data.pontos_chave && data.pontos_chave.length > 0) {
        html += `
            <div class="summary-section">
                <h3>Pontos chave</h3>
                <ul class="key-points">
                    ${data.pontos_chave.map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Alertas de privacidade — caixa de aviso (mockup: "N alertas de privacidade")
    const alerts = (data.alertas_privacidade || []).filter(
        a => a && a.tipo !== 'sem_alertas'
    );
    if (alerts.length > 0) {
        const count = alerts.length;
        const title = `${count} ${count === 1 ? 'alerta de privacidade' : 'alertas de privacidade'}`;
        // Tom da caixa: usa o tipo do primeiro alerta como variante (high por defeito)
        const variant = alerts[0].tipo ? `alert-${alerts[0].tipo}` : '';
        const body = alerts.map(a => a.texto).filter(Boolean).join(' ');
        html += `
            <div class="summary-section">
                <div class="privacy-alerts">
                    <div class="alert-item ${variant}">
                        <span class="material-symbols-outlined alert-icon">warning</span>
                        <div class="alert-body">
                            <div class="alert-title">${title}</div>
                            <div class="alert-text">${body}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    console.log('HTML estruturado gerado:', html);
    return html || '<p>Resumo não disponível</p>';
}

// Exportar o resumo como ficheiro JSON
function exportSummary() {
    try {
        const payload = { page: pageData || null, summary: summaryData || null };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const base = (pageData && pageData.title ? pageData.title : 'resumo')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'resumo';
        a.href = url;
        a.download = `${base}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao exportar resumo:', error);
    }
}

// Partilhar o resumo (Web Share API com fallback para copiar o link)
async function shareSummary() {
    const url = (pageData && pageData.url) || window.location.href;
    const title = (pageData && pageData.title) || 'Resumo - ToS Summarizer';
    const text = (summaryData && (summaryData.resumo_conciso || summaryData.summary)) || '';
    try {
        if (navigator.share) {
            await navigator.share({ title, text, url });
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(`${title}\n${url}`);
        }
    } catch (error) {
        console.error('Erro ao partilhar resumo:', error);
    }
}

// Mostrar mensagem de sem dados
function showNoDataMessage() {
    loadingContainer.classList.add('hidden');
    revealAnalysisCard();
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
    revealAnalysisCard();
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
