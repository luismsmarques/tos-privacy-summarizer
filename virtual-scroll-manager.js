// Virtual Scrolling System for Large Lists
// Implements efficient rendering of large datasets with smooth scrolling

class VirtualScrollManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: 200,
            bufferSize: 5, // Extra items to render outside viewport
            threshold: 100, // Scroll threshold for updates
            smoothScrolling: true,
            ...options
        };
        
        this.state = {
            scrollTop: 0,
            containerHeight: 0,
            totalHeight: 0,
            visibleStart: 0,
            visibleEnd: 0,
            renderedStart: 0,
            renderedEnd: 0,
            isScrolling: false,
            lastScrollTime: 0
        };
        
        this.data = [];
        this.renderCache = new Map();
        this.scrollTimeout = null;
        
        this.setupVirtualScrolling();
        
        console.log('📜 Virtual Scroll Manager initialized');
    }

    // Setup virtual scrolling
    setupVirtualScrolling() {
        // Create virtual container
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.style.cssText = `
            position: relative;
            overflow: hidden;
        `;
        
        // Create scrollable area
        this.scrollArea = document.createElement('div');
        this.scrollArea.style.cssText = `
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
        `;
        
        // Create content area
        this.contentArea = document.createElement('div');
        this.contentArea.style.cssText = `
            position: relative;
        `;
        
        // Create items container
        this.itemsContainer = document.createElement('div');
        this.itemsContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
        `;
        
        // Assemble structure
        this.contentArea.appendChild(this.itemsContainer);
        this.scrollArea.appendChild(this.contentArea);
        this.virtualContainer.appendChild(this.scrollArea);
        
        // Replace original container content
        this.container.innerHTML = '';
        this.container.appendChild(this.virtualContainer);
        
        // Setup scroll listener
        this.scrollArea.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Setup resize observer
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.container);
        
        // Initial setup
        this.updateDimensions();
    }

    // Handle scroll events
    handleScroll(event) {
        const scrollTop = event.target.scrollTop;
        this.state.scrollTop = scrollTop;
        this.state.lastScrollTime = Date.now();
        
        // Throttle scroll updates
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        this.scrollTimeout = setTimeout(() => {
            this.updateVisibleRange();
        }, 16); // ~60fps
    }

    // Handle resize events
    handleResize() {
        this.updateDimensions();
        this.updateVisibleRange();
    }

    // Update container dimensions
    updateDimensions() {
        const rect = this.container.getBoundingClientRect();
        this.state.containerHeight = rect.height;
        this.state.totalHeight = this.data.length * this.options.itemHeight;
        
        // Update content area height
        this.contentArea.style.height = `${this.state.totalHeight}px`;
        
        console.log(`📏 Dimensions updated: container=${this.state.containerHeight}px, total=${this.state.totalHeight}px`);
    }

    // Update visible range
    updateVisibleRange() {
        const { scrollTop, containerHeight, totalHeight } = this.state;
        
        // Calculate visible range
        this.state.visibleStart = Math.floor(scrollTop / this.options.itemHeight);
        this.state.visibleEnd = Math.min(
            this.state.visibleStart + Math.ceil(containerHeight / this.options.itemHeight),
            this.data.length
        );
        
        // Calculate rendered range (with buffer)
        this.state.renderedStart = Math.max(0, this.state.visibleStart - this.options.bufferSize);
        this.state.renderedEnd = Math.min(
            this.data.length,
            this.state.visibleEnd + this.options.bufferSize
        );
        
        // Update rendering
        this.renderVisibleItems();
    }

    // Render visible items
    renderVisibleItems() {
        const { renderedStart, renderedEnd } = this.state;
        
        // Clear existing items
        this.itemsContainer.innerHTML = '';
        
        // Render items in range
        for (let i = renderedStart; i < renderedEnd; i++) {
            const item = this.data[i];
            if (item) {
                const itemElement = this.renderItem(item, i);
                if (itemElement) {
                    this.itemsContainer.appendChild(itemElement);
                }
            }
        }
        
        // Update container position
        this.itemsContainer.style.transform = `translateY(${renderedStart * this.options.itemHeight}px)`;
        
        console.log(`📜 Rendered items ${renderedStart}-${renderedEnd} (${renderedEnd - renderedStart} items)`);
    }

    // Render individual item (to be implemented by subclass)
    renderItem(item, index) {
        throw new Error('renderItem method must be implemented by subclass');
    }

    // Set data and refresh
    setData(data) {
        this.data = data;
        this.renderCache.clear();
        this.updateDimensions();
        this.updateVisibleRange();
        
        console.log(`📊 Data set: ${data.length} items`);
    }

    // Add items to data
    addItems(items) {
        this.data.push(...items);
        this.updateDimensions();
        this.updateVisibleRange();
        
        console.log(`➕ Added ${items.length} items, total: ${this.data.length}`);
    }

    // Insert item at specific index
    insertItem(index, item) {
        this.data.splice(index, 0, item);
        this.renderCache.clear();
        this.updateDimensions();
        this.updateVisibleRange();
        
        console.log(`📝 Inserted item at index ${index}`);
    }

    // Remove item at specific index
    removeItem(index) {
        if (index >= 0 && index < this.data.length) {
            this.data.splice(index, 1);
            this.renderCache.clear();
            this.updateDimensions();
            this.updateVisibleRange();
            
            console.log(`🗑️ Removed item at index ${index}`);
        }
    }

    // Update item at specific index
    updateItem(index, item) {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = item;
            this.renderCache.delete(index);
            this.updateVisibleRange();
            
            console.log(`🔄 Updated item at index ${index}`);
        }
    }

    // Scroll to specific item
    scrollToItem(index, smooth = true) {
        if (index >= 0 && index < this.data.length) {
            const scrollTop = index * this.options.itemHeight;
            
            if (smooth && this.options.smoothScrolling) {
                this.scrollArea.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            } else {
                this.scrollArea.scrollTop = scrollTop;
            }
            
            console.log(`🎯 Scrolled to item ${index}`);
        }
    }

    // Scroll to top
    scrollToTop(smooth = true) {
        this.scrollToItem(0, smooth);
    }

    // Scroll to bottom
    scrollToBottom(smooth = true) {
        this.scrollToItem(this.data.length - 1, smooth);
    }

    // Get visible items
    getVisibleItems() {
        const { visibleStart, visibleEnd } = this.state;
        return this.data.slice(visibleStart, visibleEnd);
    }

    // Get rendered items
    getRenderedItems() {
        const { renderedStart, renderedEnd } = this.state;
        return this.data.slice(renderedStart, renderedEnd);
    }

    // Get scroll position
    getScrollPosition() {
        return {
            scrollTop: this.state.scrollTop,
            scrollPercent: this.state.totalHeight > 0 ? (this.state.scrollTop / this.state.totalHeight) * 100 : 0,
            visibleStart: this.state.visibleStart,
            visibleEnd: this.state.visibleEnd
        };
    }

    // Get performance metrics
    getPerformanceMetrics() {
        const visibleCount = this.state.visibleEnd - this.state.visibleStart;
        const renderedCount = this.state.renderedEnd - this.state.renderedStart;
        const totalCount = this.data.length;
        
        return {
            totalItems: totalCount,
            visibleItems: visibleCount,
            renderedItems: renderedCount,
            renderEfficiency: totalCount > 0 ? ((renderedCount / totalCount) * 100).toFixed(2) + '%' : '0%',
            memoryUsage: this.estimateMemoryUsage(),
            cacheSize: this.renderCache.size
        };
    }

    // Estimate memory usage
    estimateMemoryUsage() {
        let totalSize = 0;
        for (const [key, value] of this.renderCache.entries()) {
            if (value && value.outerHTML) {
                totalSize += value.outerHTML.length;
            }
        }
        return `${(totalSize / 1024).toFixed(2)} KB`;
    }

    // Clear cache
    clearCache() {
        this.renderCache.clear();
        console.log('🧹 Render cache cleared');
    }

    // Update options
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.updateDimensions();
        this.updateVisibleRange();
        
        console.log('⚙️ Options updated:', newOptions);
    }

    // Destroy virtual scroll manager
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        this.renderCache.clear();
        this.data = [];
        
        console.log('📜 Virtual Scroll Manager destroyed');
    }
}

// History-specific virtual scroll manager
class HistoryVirtualScrollManager extends VirtualScrollManager {
    constructor(container, options = {}) {
        super(container, {
            itemHeight: 250, // Estimated height for summary items
            bufferSize: 3,
            threshold: 50,
            smoothScrolling: true,
            ...options
        });
        
        console.log('📜 History Virtual Scroll Manager initialized');
    }

    // Render summary item
    renderItem(summary, index) {
        // Check cache first
        if (this.renderCache.has(index)) {
            return this.renderCache.get(index);
        }

        const riskScore = summary.risk_score || 5;
        const complexity = summary.rating_complexidade || 5;
        const practices = summary.rating_boas_praticas || 5;
        
        const riskClass = riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high';
        const riskLabel = riskScore <= 3 ? 'Baixo' : riskScore <= 6 ? 'Médio' : 'Alto';
        
        const itemElement = document.createElement('div');
        itemElement.className = 'summary-item virtual-item';
        itemElement.style.cssText = `
            height: ${this.options.itemHeight}px;
            padding: 16px;
            border-bottom: 1px solid var(--md-sys-color-outline-variant);
            display: flex;
            align-items: flex-start;
            gap: 16px;
        `;
        
        itemElement.innerHTML = `
            <div class="risk-score ${riskClass}" style="flex-shrink: 0; width: 60px;">
                <span class="risk-score-number">${riskScore}/10</span>
                <span class="risk-score-label">${riskLabel}</span>
            </div>
            
            <div class="summary-content" style="flex: 1; min-width: 0;">
                <div class="summary-header">
                    <div class="summary-title" style="font-weight: 500; margin-bottom: 4px;">
                        ${summary.title || this.getDocumentTypeName(summary.document_type)}
                    </div>
                    <a href="${summary.url}" target="_blank" class="summary-url" style="color: var(--md-sys-color-primary); text-decoration: none; font-size: 14px;">
                        ${summary.url || 'URL não disponível'}
                    </a>
                </div>
                
                <div class="rating-indicators" style="display: flex; gap: 16px; margin: 8px 0;">
                    <div class="rating-item" style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px;">Complexidade:</span>
                        <div class="rating-bar" style="width: 60px; height: 4px; background: var(--md-sys-color-outline-variant); border-radius: 2px;">
                            <div class="rating-fill complexity" style="width: ${(complexity / 10) * 100}%; height: 100%; background: var(--md-sys-color-error); border-radius: 2px;"></div>
                        </div>
                        <span style="font-size: 12px;">${complexity}/10</span>
                    </div>
                    <div class="rating-item" style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px;">Boas Práticas:</span>
                        <div class="rating-bar" style="width: 60px; height: 4px; background: var(--md-sys-color-outline-variant); border-radius: 2px;">
                            <div class="rating-fill practices" style="width: ${(practices / 10) * 100}%; height: 100%; background: var(--md-sys-color-primary); border-radius: 2px;"></div>
                        </div>
                        <span style="font-size: 12px;">${practices}/10</span>
                    </div>
                </div>
                
                <div class="summary-meta" style="display: flex; gap: 16px; margin: 8px 0; font-size: 12px; color: var(--md-sys-color-on-surface-variant);">
                    <div class="meta-item" style="display: flex; align-items: center; gap: 4px;">
                        <span class="material-icons" style="font-size: 16px;">schedule</span>
                        <span>${this.formatDate(summary.created_at)}</span>
                    </div>
                    <div class="meta-item" style="display: flex; align-items: center; gap: 4px;">
                        <span class="material-icons" style="font-size: 16px;">description</span>
                        <span>${summary.word_count || 0} palavras</span>
                    </div>
                    <div class="meta-item" style="display: flex; align-items: center; gap: 4px;">
                        <span class="material-icons" style="font-size: 16px;">timer</span>
                        <span>${summary.processing_time || 0}s</span>
                    </div>
                </div>
                
                <div class="summary-preview" style="font-size: 14px; line-height: 1.4; color: var(--md-sys-color-on-surface); margin: 8px 0;">
                    ${summary.summary ? summary.summary.substring(0, 150) + '...' : 'Resumo não disponível'}
                </div>
                
                <div class="summary-actions" style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="action-btn" onclick="viewSummary('${summary.id}')" style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--md-sys-color-outline); background: transparent; border-radius: 4px; cursor: pointer;">
                        <span class="material-icons" style="font-size: 16px;">visibility</span>
                        Ver
                    </button>
                    <button class="action-btn" onclick="copySummary('${summary.id}')" style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--md-sys-color-outline); background: transparent; border-radius: 4px; cursor: pointer;">
                        <span class="material-icons" style="font-size: 16px;">content_copy</span>
                        Copiar
                    </button>
                    <button class="action-btn" onclick="exportSummary('${summary.id}')" style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--md-sys-color-outline); background: transparent; border-radius: 4px; cursor: pointer;">
                        <span class="material-icons" style="font-size: 16px;">download</span>
                        Exportar
                    </button>
                </div>
            </div>
        `;
        
        // Cache the rendered element
        this.renderCache.set(index, itemElement);
        
        return itemElement;
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

export { VirtualScrollManager, HistoryVirtualScrollManager };
export default VirtualScrollManager;
