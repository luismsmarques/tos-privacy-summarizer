// History script para gestão do histórico de resumos
document.addEventListener('DOMContentLoaded', function() {
    console.log('History script carregado');

    // Elementos do DOM
    const loading = document.getElementById('loading');
    const summaryList = document.getElementById('summaryList');
    const emptyState = document.getElementById('emptyState');
    const errorMessage = document.getElementById('errorMessage');
    const typeFilter = document.getElementById('typeFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const userStats = document.getElementById('userStats');

    // Estado da aplicação
    let summaries = [];
    let filteredSummaries = [];
    let userId = null;

    // Inicializar aplicação
    initializeHistory();

    // Função de inicialização
    async function initializeHistory() {
        console.log('Inicializando histórico...');
        
        // Carregar userId
        await loadUserId();
        
        // Carregar histórico
        await loadHistory();
        
        // Configurar event listeners
        setupEventListeners();
        
        console.log('Histórico inicializado');
    }

    // Carregar userId
    async function loadUserId() {
        try {
            const result = await chrome.storage.local.get(['userId']);
            userId = result.userId;
            
            if (!userId) {
                showError('ID do utilizador não encontrado. Recarregue a extensão.');
                return;
            }
            
            console.log('UserId carregado:', userId);
        } catch (error) {
            console.error('Erro ao carregar userId:', error);
            showError('Erro ao carregar dados do utilizador.');
        }
    }

    // Carregar histórico
    async function loadHistory() {
        try {
            showLoading(true);
            hideMessages();

            const response = await fetch(`https://tos-privacy-summarizer.vercel.app/api/analytics/user-history/${userId}?limit=100`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Histórico carregado:', data);

            if (data.success && data.data) {
                summaries = data.data;
                filteredSummaries = [...summaries];
                renderSummaries();
                renderUserStats(data.stats);
            } else {
                summaries = [];
                filteredSummaries = [];
                showEmptyState();
            }

        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            showError('Erro ao carregar histórico: ' + error.message);
            showEmptyState();
        } finally {
            showLoading(false);
        }
    }

    // Obter token de autenticação (não necessário para endpoint público)
    async function getAuthToken() {
        // Endpoint público não requer autenticação
        return null;
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Filtros
        typeFilter.addEventListener('change', applyFilters);
        dateFilter.addEventListener('change', applyFilters);
        searchInput.addEventListener('input', debounce(applyFilters, 300));
        
        // Botão de refresh
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadHistory();
            });
        }
    }

    // Aplicar filtros
    function applyFilters() {
        const typeValue = typeFilter.value;
        const dateValue = dateFilter.value;
        const searchValue = searchInput.value.toLowerCase();

        filteredSummaries = summaries.filter(summary => {
            // Filtro por tipo
            if (typeValue && summary.document_type !== typeValue) {
                return false;
            }

            // Filtro por data
            if (dateValue) {
                const summaryDate = new Date(summary.created_at);
                const now = new Date();
                
                switch (dateValue) {
                    case 'today':
                        if (summaryDate.toDateString() !== now.toDateString()) {
                            return false;
                        }
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        if (summaryDate < weekAgo) {
                            return false;
                        }
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        if (summaryDate < monthAgo) {
                            return false;
                        }
                        break;
                }
            }

            // Filtro por pesquisa
            if (searchValue) {
                const urlMatch = summary.url && summary.url.toLowerCase().includes(searchValue);
                const contentMatch = summary.summary && summary.summary.toLowerCase().includes(searchValue);
                if (!urlMatch && !contentMatch) {
                    return false;
                }
            }

            return true;
        });

        renderSummaries();
    }

    // Renderizar resumos
    function renderSummaries() {
        if (filteredSummaries.length === 0) {
            showEmptyState();
            return;
        }

        summaryList.innerHTML = filteredSummaries.map(summary => `
            <div class="summary-item" data-id="${summary.id}">
                <div class="summary-header">
                    <div>
                        <div class="summary-title">${summary.title || getDocumentTypeName(summary.document_type)}</div>
                        <a href="${summary.url}" target="_blank" class="summary-url">${summary.url || 'URL não disponível'}</a>
                    </div>
                </div>
                
                <div class="summary-meta">
                    <div class="meta-item">
                        <span class="material-icons">schedule</span>
                        <span>${formatDate(summary.created_at)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="material-icons">description</span>
                        <span>${summary.word_count || 0} palavras</span>
                    </div>
                    <div class="meta-item">
                        <span class="material-icons">timer</span>
                        <span>${summary.processing_time || 0}s</span>
                    </div>
                    <div class="meta-item">
                        <span class="material-icons">tune</span>
                        <span>${getFocusName(summary.focus)}</span>
                    </div>
                </div>
                
                <div class="summary-preview">
                    ${summary.summary ? summary.summary.substring(0, 200) + '...' : 'Resumo não disponível'}
                </div>
                
                <div class="summary-actions">
                    <button class="action-btn" onclick="viewSummary('${summary.id}')">
                        <span class="material-icons">visibility</span>
                        Ver
                    </button>
                    <button class="action-btn" onclick="copySummary('${summary.id}')">
                        <span class="material-icons">content_copy</span>
                        Copiar
                    </button>
                    <button class="action-btn" onclick="exportSummary('${summary.id}')">
                        <span class="material-icons">download</span>
                        Exportar
                    </button>
                </div>
            </div>
        `).join('');

        summaryList.style.display = 'block';
        emptyState.style.display = 'none';
    }

    // Obter nome do tipo de documento
    function getDocumentTypeName(type) {
        const typeMap = {
            'privacy_policy': 'Política de Privacidade',
            'terms_of_service': 'Termos de Serviço',
            'unknown': 'Documento Legal'
        };
        return typeMap[type] || 'Documento';
    }

    // Obter nome do foco
    function getFocusName(focus) {
        const focusMap = {
            'privacy': 'Privacidade',
            'terms': 'Direitos (ToS)',
            'general': 'Geral'
        };
        return focusMap[focus] || 'Geral';
    }

    // Renderizar estatísticas do utilizador
    function renderUserStats(stats) {
        if (!stats || !userStats) return;
        
        document.getElementById('totalSummaries').textContent = stats.total_summaries || 0;
        document.getElementById('privacyPolicies').textContent = stats.privacy_policies || 0;
        document.getElementById('termsOfService').textContent = stats.terms_of_service || 0;
        document.getElementById('avgProcessingTime').textContent = `${stats.avg_processing_time || 0}s`;
        
        userStats.style.display = 'block';
    }

    // Formatar data
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Hoje';
        } else if (diffDays <= 7) {
            return `${diffDays} dias atrás`;
        } else {
            return date.toLocaleDateString('pt-PT');
        }
    }

    // Mostrar loading
    function showLoading(show) {
        if (show) {
            loading.style.display = 'block';
            summaryList.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            loading.style.display = 'none';
        }
    }

    // Mostrar estado vazio
    function showEmptyState() {
        emptyState.style.display = 'block';
        summaryList.style.display = 'none';
        loading.style.display = 'none';
    }

    // Mostrar erro
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    // Esconder mensagens
    function hideMessages() {
        errorMessage.style.display = 'none';
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Funções globais para botões
    window.viewSummary = function(summaryId) {
        const summary = summaries.find(s => s.id === summaryId);
        if (summary) {
            // Abrir resumo em nova aba
            const summaryUrl = `data:text/html;charset=utf-8,${encodeURIComponent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Resumo - ${summary.url}</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                        h1 { color: #333; }
                        .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                        .content { line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <h1>${getDocumentTypeName(summary.document_type)}</h1>
                    <div class="meta">
                        <strong>URL:</strong> <a href="${summary.url}" target="_blank">${summary.url}</a><br>
                        <strong>Data:</strong> ${formatDate(summary.created_at)}<br>
                        <strong>Palavras:</strong> ${summary.word_count || 0}
                    </div>
                    <div class="content">
                        ${summary.summary || 'Resumo não disponível'}
                    </div>
                </body>
                </html>
            `)}`;
            
            chrome.tabs.create({ url: summaryUrl });
        }
    };

    window.copySummary = function(summaryId) {
        const summary = summaries.find(s => s.id === summaryId);
        if (summary) {
            const text = `${getDocumentTypeName(summary.document_type)}\n\nURL: ${summary.url}\nData: ${formatDate(summary.created_at)}\n\n${summary.summary || 'Resumo não disponível'}`;
            
            navigator.clipboard.writeText(text).then(() => {
                // Mostrar feedback visual
                const button = event.target.closest('.action-btn');
                const originalText = button.innerHTML;
                button.innerHTML = '<span class="material-icons">check</span>Copiado!';
                button.style.background = 'var(--md-sys-color-primary-container)';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.style.background = '';
                }, 2000);
            }).catch(err => {
                console.error('Erro ao copiar:', err);
            });
        }
    };

    window.exportSummary = function(summaryId) {
        const summary = summaries.find(s => s.id === summaryId);
        if (summary) {
            const content = `${getDocumentTypeName(summary.document_type)}\n\nURL: ${summary.url}\nData: ${formatDate(summary.created_at)}\nPalavras: ${summary.word_count || 0}\n\n${summary.summary || 'Resumo não disponível'}`;
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resumo-${summaryId}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
});
