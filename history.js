// History script para gestão do histórico de resumos com lazy loading
// Include the lazy loader class directly instead of importing

// Lazy Loading System for History Management
// Implements intelligent pagination and virtual scrolling

class LazyLoadingManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            pageSize: 20,
            threshold: 100, // pixels from bottom to trigger load
            loadingIndicator: true,
            errorRetry: 3,
            cachePages: true,
            ...options
        };
        
        this.state = {
            currentPage: 0,
            isLoading: false,
            hasMoreData: true,
            totalItems: 0,
            loadedItems: 0,
            errorCount: 0,
            lastError: null
        };
        
        this.cache = new Map(); // Page cache
        this.observers = new Map(); // Intersection observers
        this.setupInfiniteScroll();
        
        console.log('🔄 Lazy Loading Manager initialized');
    }

    // Setup infinite scroll with Intersection Observer
    setupInfiniteScroll() {
        // Create loading trigger element
        this.loadingTrigger = document.createElement('div');
        this.loadingTrigger.id = 'lazy-loading-trigger';
        this.loadingTrigger.style.cssText = `
            height: 1px;
            width: 100%;
            margin: 20px 0;
            opacity: 0;
        `;
        
        // Create loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.id = 'lazy-loading-indicator';
        this.loadingIndicator.style.cssText = `
            display: none;
            text-align: center;
            padding: 20px;
            color: var(--md-sys-color-on-surface-variant);
        `;
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>Carregando mais resumos...</span>
            </div>
        `;
        
        // Add styles for loading spinner
        this.addLoadingStyles();
        
        // Setup intersection observer
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.shouldLoadMore()) {
                    this.loadMore();
                }
            });
        }, {
            root: null,
            rootMargin: `${this.options.threshold}px`,
            threshold: 0
        });
        
        this.observer.observe(this.loadingTrigger);
    }

    // Add CSS styles for loading spinner
    addLoadingStyles() {
        if (document.getElementById('lazy-loading-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'lazy-loading-styles';
        style.textContent = `
            .loading-spinner {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            
            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid var(--md-sys-color-outline-variant);
                border-top: 2px solid var(--md-sys-color-primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .lazy-loading-error {
                text-align: center;
                padding: 20px;
                color: var(--md-sys-color-error);
                background: var(--md-sys-color-error-container);
                border-radius: 8px;
                margin: 20px 0;
            }
            
            .lazy-loading-retry-btn {
                background: var(--md-sys-color-primary);
                color: var(--md-sys-color-on-primary);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 8px;
            }
            
            .lazy-loading-retry-btn:hover {
                background: var(--md-sys-color-primary-container);
                color: var(--md-sys-color-on-primary-container);
            }
        `;
        
        document.head.appendChild(style);
    }

    // Check if should load more data
    shouldLoadMore() {
        return !this.state.isLoading && 
               this.state.hasMoreData && 
               this.state.errorCount < this.options.errorRetry;
    }

    // Load more data
    async loadMore() {
        if (!this.shouldLoadMore()) return;
        
        this.state.isLoading = true;
        this.showLoadingIndicator();
        
        try {
            const pageData = await this.fetchPage(this.state.currentPage);
            
            if (pageData && pageData.length > 0) {
                this.renderPage(pageData);
                this.cachePage(this.state.currentPage, pageData);
                this.state.currentPage++;
                this.state.loadedItems += pageData.length;
                this.state.errorCount = 0; // Reset error count on success
                
                // Check if we have more data
                if (pageData.length < this.options.pageSize) {
                    this.state.hasMoreData = false;
                    this.hideLoadingTrigger();
                }
                
                console.log(`✅ Loaded page ${this.state.currentPage - 1}: ${pageData.length} items`);
            } else {
                this.state.hasMoreData = false;
                this.hideLoadingTrigger();
            }
            
        } catch (error) {
            console.error('❌ Error loading page:', error);
            this.state.errorCount++;
            this.state.lastError = error;
            this.showError(error);
        } finally {
            this.state.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    // Fetch page data (to be implemented by specific managers)
    async fetchPage(pageNumber) {
        throw new Error('fetchPage method must be implemented by subclass');
    }

    // Render page data (to be implemented by specific managers)
    renderPage(pageData) {
        throw new Error('renderPage method must be implemented by subclass');
    }

    // Cache page data
    cachePage(pageNumber, data) {
        if (this.options.cachePages) {
            this.cache.set(pageNumber, {
                data: data,
                timestamp: Date.now(),
                ttl: 5 * 60 * 1000 // 5 minutes
            });
        }
    }

    // Get cached page data
    getCachedPage(pageNumber) {
        if (!this.options.cachePages) return null;
        
        const cached = this.cache.get(pageNumber);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        
        // Remove expired cache
        this.cache.delete(pageNumber);
        return null;
    }

    // Show loading indicator
    showLoadingIndicator() {
        if (this.options.loadingIndicator && this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
            this.container.appendChild(this.loadingIndicator);
        }
    }

    // Hide loading indicator
    hideLoadingIndicator() {
        if (this.loadingIndicator && this.loadingIndicator.parentNode) {
            this.loadingIndicator.style.display = 'none';
            this.loadingIndicator.remove();
        }
    }

    // Show error message
    showError(error) {
        this.hideLoadingIndicator();
        
        const errorElement = document.createElement('div');
        errorElement.className = 'lazy-loading-error';
        errorElement.innerHTML = `
            <div>
                <strong>Erro ao carregar dados</strong>
                <p>${error.message}</p>
                <button class="lazy-loading-retry-btn" onclick="this.parentElement.parentElement.remove(); window.lazyLoader.loadMore();">
                    Tentar Novamente
                </button>
            </div>
        `;
        
        this.container.appendChild(errorElement);
        
        // Auto-remove error after 10 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 10000);
    }

    // Hide loading trigger
    hideLoadingTrigger() {
        if (this.loadingTrigger && this.loadingTrigger.parentNode) {
            this.loadingTrigger.remove();
        }
    }

    // Reset lazy loader
    reset() {
        this.state = {
            currentPage: 0,
            isLoading: false,
            hasMoreData: true,
            totalItems: 0,
            loadedItems: 0,
            errorCount: 0,
            lastError: null
        };
        
        this.cache.clear();
        this.hideLoadingIndicator();
        this.hideLoadingTrigger();
        
        // Recreate loading trigger
        this.setupInfiniteScroll();
        
        console.log('🔄 Lazy loader reset');
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cachedPages: this.cache.size,
            cacheHitRate: this.calculateCacheHitRate(),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    // Calculate cache hit rate
    calculateCacheHitRate() {
        // This would need to track hits/misses in a real implementation
        return 'N/A';
    }

    // Estimate memory usage
    estimateMemoryUsage() {
        let totalSize = 0;
        for (const [key, value] of this.cache.entries()) {
            totalSize += JSON.stringify(value).length;
        }
        return `${(totalSize / 1024).toFixed(2)} KB`;
    }

    // Cleanup
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.cache.clear();
        this.hideLoadingIndicator();
        this.hideLoadingTrigger();
        
        console.log('🔄 Lazy loader destroyed');
    }
}

// History-specific lazy loader
class HistoryLazyLoader extends LazyLoadingManager {
    constructor(containerId, userId, options = {}) {
        super(containerId, options);
        this.userId = userId;
        this.summaries = [];
        this.filteredSummaries = [];
        this.filters = {
            type: '',
            date: '',
            search: ''
        };
        
        console.log(`🔄 History Lazy Loader initialized for user: ${userId}`);
    }

    // Fetch page data from API
    async fetchPage(pageNumber) {
        // Check cache first
        const cached = this.getCachedPage(pageNumber);
        if (cached) {
            console.log(`💾 Cache hit for page ${pageNumber}`);
            return cached;
        }

        const offset = pageNumber * this.options.pageSize;
        
        const response = await fetch(
            `https://tos-privacy-summarizer.vercel.app/api/analytics/user-history/${this.userId}?limit=${this.options.pageSize}&offset=${offset}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
            return data.data;
        } else {
            return [];
        }
    }

    // Render page data
    renderPage(pageData) {
        // Add to summaries array
        this.summaries.push(...pageData);
        
        // Apply current filters
        this.applyFilters();
        
        // Render the new items
        this.renderNewItems(pageData);
    }

    // Render new items
    renderNewItems(items) {
        const summaryList = document.getElementById('summaryList');
        if (!summaryList) return;

        const newItemsHTML = items.map(summary => this.createSummaryHTML(summary)).join('');
        
        // Append to existing content
        summaryList.insertAdjacentHTML('beforeend', newItemsHTML);
        
        // Update counters
        this.updateCounters();
    }

    // Create HTML for a summary item
    createSummaryHTML(summary) {
        const riskScore = summary.risk_score || 5;
        const complexity = summary.rating_complexidade || 5;
        const practices = summary.rating_boas_praticas || 5;
        
        const riskClass = riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high';
        const riskLabel = riskScore <= 3 ? 'Baixo' : riskScore <= 6 ? 'Médio' : 'Alto';
        
        return `
            <div class="summary-item" data-id="${summary.id}">
                <div class="risk-score ${riskClass}">
                    <span class="risk-score-number">${riskScore}/10</span>
                    <span class="risk-score-label">${riskLabel}</span>
                </div>
                
                <div class="summary-header">
                    <div>
                        <div class="summary-title">${summary.title || this.getDocumentTypeName(summary.document_type)}</div>
                        <a href="${summary.url}" target="_blank" class="summary-url">${summary.url || 'URL não disponível'}</a>
                    </div>
                </div>
                
                <div class="rating-indicators">
                    <div class="rating-item">
                        <span>Complexidade:</span>
                        <div class="rating-bar">
                            <div class="rating-fill complexity" style="width: ${(complexity / 10) * 100}%"></div>
                        </div>
                        <span>${complexity}/10</span>
                    </div>
                    <div class="rating-item">
                        <span>Boas Práticas:</span>
                        <div class="rating-bar">
                            <div class="rating-fill practices" style="width: ${(practices / 10) * 100}%"></div>
                        </div>
                        <span>${practices}/10</span>
                    </div>
                </div>
                
                <div class="summary-meta">
                    <div class="meta-item">
                        <span class="material-icons">schedule</span>
                        <span>${this.formatDate(summary.created_at)}</span>
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
                        <span>Geral</span>
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
        `;
    }

    // Apply filters to summaries
    applyFilters() {
        this.filteredSummaries = this.summaries.filter(summary => {
            // Type filter
            if (this.filters.type && summary.document_type !== this.filters.type) {
                return false;
            }

            // Date filter
            if (this.filters.date) {
                const summaryDate = new Date(summary.created_at);
                const now = new Date();
                
                switch (this.filters.date) {
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

            // Search filter
            if (this.filters.search) {
                const searchValue = this.filters.search.toLowerCase();
                const urlMatch = summary.url && summary.url.toLowerCase().includes(searchValue);
                const contentMatch = summary.summary && summary.summary.toLowerCase().includes(searchValue);
                if (!urlMatch && !contentMatch) {
                    return false;
                }
            }

            return true;
        });
    }

    // Set filter
    setFilter(type, value) {
        this.filters[type] = value;
        this.applyFilters();
        this.rerenderAll();
    }

    // Rerender all items
    rerenderAll() {
        const summaryList = document.getElementById('summaryList');
        if (!summaryList) return;

        summaryList.innerHTML = this.filteredSummaries.map(summary => this.createSummaryHTML(summary)).join('');
        this.updateCounters();
    }

    // Update counters
    updateCounters() {
        const totalElement = document.getElementById('totalSummaries');
        if (totalElement) {
            totalElement.textContent = this.filteredSummaries.length;
        }
    }

    // Helper methods
    getDocumentTypeName(type) {
        const typeMap = {
            'privacy_policy': 'Política de Privacidade',
            'terms_of_service': 'Termos de Serviço',
            'unknown': 'Documento Legal'
        };
        return typeMap[type] || 'Documento';
    }

    formatDate(dateString) {
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
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('History script carregado com lazy loading');

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
    let userId = null;
    let lazyLoader = null;

    // Inicializar aplicação
    initializeHistory();

    // Função de inicialização
    async function initializeHistory() {
        console.log('Inicializando histórico com lazy loading...');
        
        // Carregar userId
        await loadUserId();
        
        // Inicializar lazy loader
        initializeLazyLoader();
        
        // Configurar event listeners
        setupEventListeners();
        
        console.log('Histórico inicializado com lazy loading');
    }

    // Carregar userId
    async function loadUserId() {
        try {
            // Verificar se estamos executando como extensão
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['userId']);
                userId = result.userId;
                
                if (!userId) {
                    showError('ID do utilizador não encontrado. Recarregue a extensão.');
                    return;
                }
                
                console.log('UserId carregado:', userId);
            } else {
                // Fallback para quando executado como página web
                console.log('Executando como página web - criando userId temporário');
                userId = generateTemporaryUserId();
                console.log('UserId temporário criado:', userId);
            }
        } catch (error) {
            console.error('Erro ao carregar userId:', error);
            // Fallback em caso de erro
            userId = generateTemporaryUserId();
            console.log('UserId de fallback criado:', userId);
        }
    }

    // Gerar ID temporário para uso como página web
    function generateTemporaryUserId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `web_user_${timestamp}_${random}`;
    }

    // Inicializar lazy loader
    function initializeLazyLoader() {
        if (!userId) {
            console.error('UserId não disponível para lazy loader');
            return;
        }

        // Criar container para lazy loading se não existir
        if (!summaryList) {
            console.error('Container summaryList não encontrado');
            return;
        }

        // Inicializar lazy loader
        lazyLoader = new HistoryLazyLoader('summaryList', userId, {
            pageSize: 20,
            threshold: 100,
            loadingIndicator: true,
            errorRetry: 3,
            cachePages: true
        });

        // Carregar estatísticas do utilizador
        loadUserStats();
        
        console.log('Lazy loader inicializado');
    }

    // Carregar estatísticas do utilizador
    async function loadUserStats() {
        try {
            const response = await fetch(`https://tos-privacy-summarizer.vercel.app/api/analytics/user-stats/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    renderUserStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // Obter token de autenticação
    async function getAuthToken() {
        try {
            // Verificar se estamos executando como extensão
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['adminToken']);
                return result.adminToken || 'demo-token';
            } else {
                // Fallback para página web
                return 'demo-token';
            }
        } catch (error) {
            console.error('Erro ao obter token:', error);
            return 'demo-token';
        }
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Filtros
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                lazyLoader?.setFilter('type', e.target.value);
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                lazyLoader?.setFilter('date', e.target.value);
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                lazyLoader?.setFilter('search', e.target.value);
            }, 300));
        }
        
        // Botão de refresh
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshHistory();
            });
        }
    }

    // Refresh histórico
    function refreshHistory() {
        if (lazyLoader) {
            lazyLoader.reset();
            // O lazy loader irá automaticamente carregar a primeira página
        }
    }

    // Funções auxiliares para compatibilidade

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
        return 'Geral';
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
        const summary = lazyLoader?.summaries.find(s => s.id === summaryId);
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
            
            // Verificar se estamos executando como extensão
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.create({ url: summaryUrl });
            } else {
                // Fallback para página web
                window.open(summaryUrl, '_blank');
            }
        }
    };

    window.copySummary = function(summaryId) {
        const summary = lazyLoader?.summaries.find(s => s.id === summaryId);
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
        const summary = lazyLoader?.summaries.find(s => s.id === summaryId);
        if (summary) {
            showExportModal(summary);
        }
    };

    // Modal de exportação
    function showExportModal(summary) {
        const modal = document.createElement('div');
        modal.className = 'export-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>
                            <span class="material-icons">download</span>
                            Exportar Resumo
                        </h3>
                        <button class="close-btn" onclick="closeExportModal()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="summary-preview">
                            <h4>${getDocumentTypeName(summary.document_type)}</h4>
                            <p><strong>URL:</strong> ${summary.url}</p>
                            <p><strong>Data:</strong> ${formatDate(summary.created_at)}</p>
                            <p><strong>Palavras:</strong> ${summary.word_count || 0}</p>
                        </div>
                        <div class="export-options">
                            <h4>Escolha o formato:</h4>
                            <div class="format-buttons">
                                <button class="format-btn" onclick="exportAsFormat('txt', '${summary.id}')">
                                    <span class="material-icons">description</span>
                                    <div>
                                        <strong>Texto (.txt)</strong>
                                        <small>Formato simples de texto</small>
                                    </div>
                                </button>
                                <button class="format-btn" onclick="exportAsFormat('json', '${summary.id}')">
                                    <span class="material-icons">code</span>
                                    <div>
                                        <strong>JSON (.json)</strong>
                                        <small>Dados estruturados</small>
                                    </div>
                                </button>
                                <button class="format-btn" onclick="exportAsFormat('pdf', '${summary.id}')">
                                    <span class="material-icons">picture_as_pdf</span>
                                    <div>
                                        <strong>PDF (.pdf)</strong>
                                        <small>Documento formatado</small>
                                    </div>
                                </button>
                                <button class="format-btn" onclick="exportAsFormat('html', '${summary.id}')">
                                    <span class="material-icons">web</span>
                                    <div>
                                        <strong>HTML (.html)</strong>
                                        <small>Página web</small>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <div class="bulk-export">
                            <h4>Exportação em lote:</h4>
                            <div class="bulk-buttons">
                                <button class="bulk-btn" onclick="exportAllSummaries('txt')">
                                    <span class="material-icons">download</span>
                                    Exportar todos como TXT
                                </button>
                                <button class="bulk-btn" onclick="exportAllSummaries('json')">
                                    <span class="material-icons">download</span>
                                    Exportar todos como JSON
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar estilos do modal
        const style = document.createElement('style');
        style.textContent = `
            .export-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
            }
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .modal-content {
                background: var(--md-sys-color-surface-container);
                border-radius: 16px;
                max-width: 600px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--md-sys-color-outline-variant);
            }
            .modal-header h3 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
                color: var(--md-sys-color-on-surface);
            }
            .close-btn {
                background: none;
                border: none;
                color: var(--md-sys-color-on-surface);
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: background 0.2s;
            }
            .close-btn:hover {
                background: var(--md-sys-color-surface-container-low);
            }
            .modal-body {
                padding: 20px;
            }
            .summary-preview {
                background: var(--md-sys-color-surface-container-low);
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .summary-preview h4 {
                margin: 0 0 8px 0;
                color: var(--md-sys-color-primary);
            }
            .summary-preview p {
                margin: 4px 0;
                font-size: 14px;
                color: var(--md-sys-color-on-surface-variant);
            }
            .export-options h4,
            .bulk-export h4 {
                margin: 0 0 12px 0;
                color: var(--md-sys-color-on-surface);
            }
            .format-buttons {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
                margin-bottom: 20px;
            }
            .format-btn {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                border: 1px solid var(--md-sys-color-outline);
                border-radius: 8px;
                background: var(--md-sys-color-surface);
                color: var(--md-sys-color-on-surface);
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
            }
            .format-btn:hover {
                border-color: var(--md-sys-color-primary);
                background: var(--md-sys-color-primary-container);
                color: var(--md-sys-color-on-primary-container);
            }
            .format-btn .material-icons {
                font-size: 24px;
                color: var(--md-sys-color-primary);
            }
            .format-btn strong {
                display: block;
                font-size: 14px;
            }
            .format-btn small {
                display: block;
                font-size: 12px;
                opacity: 0.7;
            }
            .bulk-buttons {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }
            .bulk-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                border: 1px solid var(--md-sys-color-outline);
                border-radius: 8px;
                background: var(--md-sys-color-surface);
                color: var(--md-sys-color-on-surface);
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
            }
            .bulk-btn:hover {
                border-color: var(--md-sys-color-primary);
                background: var(--md-sys-color-primary-container);
                color: var(--md-sys-color-on-primary-container);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
    }

    window.closeExportModal = function() {
        const modal = document.querySelector('.export-modal');
        if (modal) {
            modal.remove();
        }
    };

    // Funções de exportação
    window.exportAsFormat = function(format, summaryId) {
        const summary = lazyLoader?.summaries.find(s => s.id === summaryId);
        if (!summary) return;

        switch (format) {
            case 'txt':
                exportAsTxt(summary);
                break;
            case 'json':
                exportAsJson(summary);
                break;
            case 'pdf':
                exportAsPdf(summary);
                break;
            case 'html':
                exportAsHtml(summary);
                break;
        }
        
        closeExportModal();
    };

    function exportAsTxt(summary) {
        const content = `${getDocumentTypeName(summary.document_type)}
${'='.repeat(50)}

URL: ${summary.url}
Data: ${formatDate(summary.created_at)}
Palavras: ${summary.word_count || 0}
Tempo de processamento: ${summary.processing_time || 0}s
Foco: Geral

${'='.repeat(50)}

${summary.summary || 'Resumo não disponível'}

${'='.repeat(50)}
Gerado pelo ToS & Privacy Summarizer
https://tos-privacy-summarizer.vercel.app`;

        downloadFile(content, `resumo-${summary.id}.txt`, 'text/plain');
    }

    function exportAsJson(summary) {
        const data = {
            id: summary.id,
            document_type: summary.document_type,
            document_type_name: getDocumentTypeName(summary.document_type),
            url: summary.url,
            title: summary.title,
            created_at: summary.created_at,
            word_count: summary.word_count || 0,
            processing_time: summary.processing_time || 0,
            focus: 'general',
            focus_name: 'Geral',
            summary: summary.summary,
            exported_at: new Date().toISOString(),
            exported_by: 'ToS & Privacy Summarizer'
        };

        downloadFile(JSON.stringify(data, null, 2), `resumo-${summary.id}.json`, 'application/json');
    }

    function exportAsPdf(summary) {
        // Para PDF, vamos criar um HTML bem formatado e usar a funcionalidade de impressão do browser
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resumo - ${getDocumentTypeName(summary.document_type)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 24px;
            color: #007bff;
            margin: 0 0 10px 0;
        }
        .meta {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .meta-item {
            margin: 5px 0;
            font-size: 14px;
        }
        .meta-label {
            font-weight: bold;
            color: #495057;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${getDocumentTypeName(summary.document_type)}</h1>
    </div>
    
    <div class="meta">
        <div class="meta-item">
            <span class="meta-label">URL:</span> ${summary.url}
        </div>
        <div class="meta-item">
            <span class="meta-label">Data:</span> ${formatDate(summary.created_at)}
        </div>
        <div class="meta-item">
            <span class="meta-label">Palavras:</span> ${summary.word_count || 0}
        </div>
        <div class="meta-item">
            <span class="meta-label">Tempo de processamento:</span> ${summary.processing_time || 0}s
        </div>
        <div class="meta-item">
            <span class="meta-label">Foco:</span> ${getFocusName(summary.focus)}
        </div>
    </div>
    
    <div class="content">
        ${summary.summary || 'Resumo não disponível'}
    </div>
    
    <div class="footer">
        <p>Gerado pelo ToS & Privacy Summarizer</p>
        <p>https://tos-privacy-summarizer.vercel.app</p>
        <p>Exportado em: ${new Date().toLocaleString('pt-PT')}</p>
    </div>
</body>
</html>`;

        // Abrir em nova aba para impressão/PDF
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Verificar se estamos executando como extensão
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            const newWindow = window.open(url, '_blank');
            // Adicionar script para impressão automática
            newWindow.onload = function() {
                setTimeout(() => {
                    newWindow.print();
                }, 1000);
            };
        } else {
            // Fallback para página web
            const newWindow = window.open(url, '_blank');
            // Adicionar script para impressão automática
            newWindow.onload = function() {
                setTimeout(() => {
                    newWindow.print();
                }, 1000);
            };
        }
    }

    function exportAsHtml(summary) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resumo - ${getDocumentTypeName(summary.document_type)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 28px;
            color: #007bff;
            margin: 0 0 10px 0;
        }
        .meta {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .meta-item {
            margin: 8px 0;
            font-size: 14px;
        }
        .meta-label {
            font-weight: bold;
            color: #495057;
        }
        .meta-value {
            color: #007bff;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
        }
        .footer {
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="javascript:history.back()" class="back-link">← Voltar</a>
        
        <div class="header">
            <h1 class="title">${getDocumentTypeName(summary.document_type)}</h1>
        </div>
        
        <div class="meta">
            <div class="meta-item">
                <span class="meta-label">URL:</span> 
                <span class="meta-value"><a href="${summary.url}" target="_blank">${summary.url}</a></span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Data:</span> 
                <span class="meta-value">${formatDate(summary.created_at)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Palavras:</span> 
                <span class="meta-value">${summary.word_count || 0}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Tempo de processamento:</span> 
                <span class="meta-value">${summary.processing_time || 0}s</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Foco:</span> 
                <span class="meta-value">Geral</span>
            </div>
        </div>
        
        <div class="content">
            ${summary.summary || 'Resumo não disponível'}
        </div>
        
        <div class="footer">
            <p>Gerado pelo ToS & Privacy Summarizer</p>
            <p><a href="https://tos-privacy-summarizer.vercel.app" target="_blank">https://tos-privacy-summarizer.vercel.app</a></p>
            <p>Exportado em: ${new Date().toLocaleString('pt-PT')}</p>
        </div>
    </div>
</body>
</html>`;

        downloadFile(htmlContent, `resumo-${summary.id}.html`, 'text/html');
    }

    // Exportação em lote
    window.exportAllSummaries = function(format) {
        if (!lazyLoader || lazyLoader.filteredSummaries.length === 0) {
            alert('Nenhum resumo para exportar');
            return;
        }

        if (format === 'json') {
            const allData = {
                exported_at: new Date().toISOString(),
                exported_by: 'ToS & Privacy Summarizer',
                total_summaries: lazyLoader.filteredSummaries.length,
                summaries: lazyLoader.filteredSummaries.map(summary => ({
                    id: summary.id,
                    document_type: summary.document_type,
                    document_type_name: getDocumentTypeName(summary.document_type),
                    url: summary.url,
                    title: summary.title,
                    created_at: summary.created_at,
                    word_count: summary.word_count || 0,
                    processing_time: summary.processing_time || 0,
                    focus: 'general',
                    focus_name: 'Geral',
                    summary: summary.summary
                }))
            };

            downloadFile(JSON.stringify(allData, null, 2), `todos-resumos-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        } else if (format === 'txt') {
            let content = `HISTÓRICO DE RESUMOS - ToS & Privacy Summarizer
${'='.repeat(60)}
Exportado em: ${new Date().toLocaleString('pt-PT')}
Total de resumos: ${lazyLoader.filteredSummaries.length}

${'='.repeat(60)}

`;

            lazyLoader.filteredSummaries.forEach((summary, index) => {
                content += `${index + 1}. ${getDocumentTypeName(summary.document_type)}
${'='.repeat(40)}
URL: ${summary.url}
Data: ${formatDate(summary.created_at)}
Palavras: ${summary.word_count || 0}
Tempo: ${summary.processing_time || 0}s
Foco: Geral

${summary.summary || 'Resumo não disponível'}

${'='.repeat(40)}

`;
            });

            downloadFile(content, `todos-resumos-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
        }
        
        closeExportModal();
    };

    // Função auxiliar para download
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
