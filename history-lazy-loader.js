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
            search: '',
            risk: ''
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

    // Create HTML for a summary item (Calm greens redesign — compact row)
    createSummaryHTML(summary) {
        const riskScore = summary.risk_score || 5;

        // Rating -> cor: 1–3 low, 4–7 mid, 8–10 high
        const riskClass = riskScore <= 3 ? 'is-low' : riskScore <= 7 ? 'is-mid' : 'is-high';

        const domain = this.getDomain(summary.url);
        const avatar = this.getAvatar(domain);
        const typeLabel = this.getTypePillLabel(summary.document_type);

        return `
            <div class="ds-row summary-item" data-id="${summary.id}" onclick="viewSummary('${summary.id}')">
                <div class="ds-avatar" style="background:${avatar.color};">${avatar.letter}</div>
                <div class="ds-row-main">
                    <div class="ds-row-domain">${domain}</div>
                    <div class="ds-row-meta">${typeLabel} · ${this.formatDate(summary.created_at)}</div>
                </div>
                <span class="ds-pill">${typeLabel}</span>
                <span class="ds-risk ${riskClass}">${riskScore}/10</span>
                <button class="ds-row-menu" title="Opções" onclick="event.stopPropagation(); openRowMenu(event, '${summary.id}')">
                    <span class="material-icons">more_vert</span>
                </button>
            </div>
            <div class="ds-hairline"></div>
        `;
    }

    // Extrair domínio limpo do URL
    getDomain(url) {
        if (!url) return 'Documento';
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch (e) {
            return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || url;
        }
    }

    // Avatar: primeira letra + cor estável derivada do domínio
    getAvatar(domain) {
        const letter = (domain && domain[0] ? domain[0] : '?').toUpperCase();
        const colors = ['#1DB954', '#FF5700', '#0A66C2', '#1A1A1A', '#4267B2', '#0E7C5A', '#C2882A', '#9E3A33', '#7E8C83'];
        let hash = 0;
        for (let i = 0; i < domain.length; i++) {
            hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
        }
        return { letter, color: colors[hash % colors.length] };
    }

    // Rótulo curto do tipo para o chip
    getTypePillLabel(type) {
        const map = {
            'privacy_policy': 'Privacidade',
            'terms_of_service': 'Termos',
            'unknown': 'Outro'
        };
        return map[type] || 'Documento';
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

            // Risk filter (chip "Risco alto": 8–10)
            if (this.filters.risk === 'high') {
                const score = summary.risk_score || 5;
                if (score < 8) {
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
            totalElement.textContent = this.summaries.length;
        }
        this.updateChipCounts();
    }

    // Atualiza os contadores nos chips (All · N / Privacy · N / Terms · N / High risk · N)
    updateChipCounts() {
        const all = this.summaries;
        const counts = {
            '': all.length,
            'privacy_policy': all.filter(s => s.document_type === 'privacy_policy').length,
            'terms_of_service': all.filter(s => s.document_type === 'terms_of_service').length,
            'high': all.filter(s => (s.risk_score || 5) >= 8).length
        };

        const chips = document.querySelectorAll('#filterChips .chip');
        chips.forEach(chip => {
            const key = chip.dataset.risk === 'high' ? 'high' : (chip.dataset.type || '');
            const countEl = chip.querySelector('.chip-count');
            if (countEl) countEl.textContent = String(counts[key] ?? 0);
        });
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

export { LazyLoadingManager, HistoryLazyLoader };
export default LazyLoadingManager;
