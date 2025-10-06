// Dashboard JavaScript - ToS Privacy Summarizer

// Debounce function for global use
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

class Dashboard {
    constructor() {
        this.currentSection = 'overview';
        this.charts = {};
        this.data = {};
        this.isLoading = false;
        this.lastRefresh = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Dashboard...');
        
        // Verificar se está autenticado
        if (!this.isAuthenticated()) {
            console.warn('⚠️ Utilizador não autenticado, redirecionando...');
            window.location.href = '/dashboard';
            return;
        }
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Carregar dados iniciais
        await this.loadInitialData();
        
        // Inicializar gráficos
        this.initializeCharts();
        
        console.log('✅ Dashboard inicializado com sucesso');
    }

    setupEventListeners() {
        // Toggle sidebar
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
        
        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigateToSection(section);
            });
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        // Users section specific
        const refreshUsersBtn = document.getElementById('refreshUsersBtn');
        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener('click', () => {
                this.loadUsersData();
            });
        }

        // Users filters
        const userSearch = document.getElementById('userSearch');
        const userSort = document.getElementById('userSort');
        const userFilter = document.getElementById('userFilter');

        if (userSearch) {
            userSearch.addEventListener('input', debounce(() => this.applyUsersFilters(), 300));
        }
        if (userSort) {
            userSort.addEventListener('change', () => this.applyUsersFilters());
        }
        if (userFilter) {
            userFilter.addEventListener('change', () => this.applyUsersFilters());
        }

        // Summaries section specific
        const refreshSummariesBtn = document.getElementById('refreshSummariesBtn');
        const exportAllBtn = document.getElementById('exportAllBtn');
        
        if (refreshSummariesBtn) {
            refreshSummariesBtn.addEventListener('click', () => {
                this.loadSummariesData();
            });
        }

        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => {
                this.exportAllSummaries();
            });
        }

        // Summaries filters
        const summaryTypeFilter = document.getElementById('summaryTypeFilter');
        const summaryDateFilter = document.getElementById('summaryDateFilter');
        const summaryStatusFilter = document.getElementById('summaryStatusFilter');
        const summarySearch = document.getElementById('summarySearch');

        if (summaryTypeFilter) {
            summaryTypeFilter.addEventListener('change', () => this.applySummariesFilters());
        }
        if (summaryDateFilter) {
            summaryDateFilter.addEventListener('change', () => this.applySummariesFilters());
        }
        if (summaryStatusFilter) {
            summaryStatusFilter.addEventListener('change', () => this.applySummariesFilters());
        }
        if (summarySearch) {
            summarySearch.addEventListener('input', debounce(() => this.applySummariesFilters(), 300));
        }
        
        // Refresh FAB
        const refreshFab = document.getElementById('refreshFab');
        refreshFab.addEventListener('click', () => {
            this.refreshData();
        });
        
        // Responsive sidebar
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('collapsed');
            }
        });
    }
    
    async loadInitialData() {
        if (this.isLoading) {
            console.log('⏳ Já está carregando, ignorando...');
            return;
        }
        
        this.isLoading = true;
        console.log('📊 Carregando dados iniciais...');
        this.showLoading();
        
        try {
            // Carregar dados de todas as APIs em paralelo
            const [overviewData, realtimeData, summariesData] = await Promise.all([
                this.fetchData('/api/analytics/overview').catch((error) => {
                    console.error('❌ Erro ao carregar overview:', error);
                    return { error: error.message };
                }),
                this.fetchData('/api/analytics/realtime').catch((error) => {
                    console.error('❌ Erro ao carregar realtime:', error);
                    return { error: error.message };
                }),
                this.fetchData('/api/analytics/summaries').catch((error) => {
                    console.error('❌ Erro ao carregar summaries:', error);
                    return { error: error.message };
                })
            ]);
            
            // Verificar se há erros nas respostas
            this.data = {
                overview: overviewData,
                realtime: realtimeData,
                summaries: summariesData
            };
            
            this.updateMetrics();
            this.updateCharts();
            
        } catch (error) {
            console.error('❌ Erro geral ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
            
            // Não usar dados mock - mostrar erro
            this.data = {
                overview: { error: 'Erro ao carregar dados' },
                realtime: { error: 'Erro ao carregar dados' },
                summaries: { error: 'Erro ao carregar dados' }
            };
            
            this.updateMetrics();
            this.updateCharts();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async fetchData(endpoint, options = {}) {
        try {
            // Configurar URL base do backend
            const backendUrl = 'http://localhost:3000';
            const fullUrl = endpoint.startsWith('http') ? endpoint : `${backendUrl}${endpoint}`;
            
            console.log(`📡 Fazendo request para: ${fullUrl}`);
            
            let token = this.getAuthToken();
            
            // Se não há token, tentar login automático
            if (!token) {
                console.log('🔐 Nenhum token encontrado, tentando login automático...');
                token = await this.autoLogin();
            }
            
            console.log('🔑 Token encontrado:', token ? 'Sim' : 'Não');
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Adicionar token se disponível
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Configurações padrão
            const defaultOptions = {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            };
            
            // Mesclar opções fornecidas com padrões
            const fetchOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            };
            
            const response = await fetch(fullUrl, fetchOptions);
            
        if (!response.ok) {
                if (response.status === 401) {
                    console.warn('🔒 Token inválido ou expirado, tentando login automático...');
                    // Tentar login automático uma vez mais
                    const newToken = await this.autoLogin();
                    if (newToken) {
                        // Refazer a requisição com novo token
                        fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
                        const retryResponse = await fetch(fullUrl, fetchOptions);
                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json();
                            console.log(`✅ Dados recebidos de ${endpoint} (retry):`, retryData);
                            return retryData;
                        }
                    }
                    console.warn('🔒 Login automático falhou, usando dados mock...');
                    return null;
                }
            throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Dados recebidos de ${endpoint}:`, data);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Erro ao buscar dados de ${endpoint}:`, error);
            throw error;
        }
    }
    
    getAuthToken() {
        // Tentar obter token do cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'adminToken' && value && value !== 'undefined') {
                console.log('🍪 Token encontrado no cookie:', value.substring(0, 20) + '...');
                return value;
            }
        }
        
        console.warn('⚠️ Token não encontrado nos cookies');
        return null;
    }

    // Login automático para desenvolvimento/teste
    async autoLogin() {
        try {
            console.log('🔐 Tentando login automático...');
            
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin123'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.token) {
                    // Guardar token no cookie
                    document.cookie = `adminToken=${data.token}; path=/; max-age=86400`;
                    console.log('✅ Login automático realizado com sucesso');
                    return data.token;
                }
            }
            
            console.warn('⚠️ Login automático falhou');
            return null;
        } catch (error) {
            console.error('❌ Erro no login automático:', error);
            return null;
        }
    }
    
    isAuthenticated() {
        const token = this.getAuthToken();
        if (!token) return false;
        
        try {
            // Verificar se o token é válido (básico)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            
            if (payload.exp && payload.exp < now) {
                console.warn('⚠️ Token expirado');
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn('⚠️ Token inválido:', error);
            return false;
        }
    }
    
    updateMetrics() {
        console.log('📈 Atualizando métricas...');
        console.log('Dados overview:', this.data.overview);
        
        const overview = this.data.overview;
        if (!overview) {
            this.showMetricsError('Dados de overview não disponíveis');
            return;
        }
        
        // Verificar se há erro na resposta
        if (overview.error) {
            this.showMetricsError(`Erro ao carregar overview: ${overview.error}`);
            return;
        }
        
        // Extrair os dados reais do objeto de resposta da API
        const overviewData = overview.data || overview;
        console.log('Dados extraídos:', overviewData);
        
        // Total de utilizadores
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl && overviewData.total_users !== undefined) {
            totalUsersEl.textContent = parseInt(overviewData.total_users).toLocaleString();
            console.log('✅ Total users atualizado:', overviewData.total_users);
        } else if (totalUsersEl) {
            totalUsersEl.textContent = '-';
        }
        
        // Total de resumos (somar successful + failed)
        const totalSummariesEl = document.getElementById('totalSummaries');
        if (totalSummariesEl && overviewData.successful_summaries !== undefined && overviewData.failed_summaries !== undefined) {
            const totalSummaries = parseInt(overviewData.successful_summaries) + parseInt(overviewData.failed_summaries);
            totalSummariesEl.textContent = totalSummaries.toLocaleString();
            console.log('✅ Total summaries atualizado:', totalSummaries);
        } else if (totalSummariesEl) {
            totalSummariesEl.textContent = '-';
        }
        
        // Total de requests (usar today_requests)
        const totalRequestsEl = document.getElementById('totalRequests');
        if (totalRequestsEl && overviewData.today_requests !== undefined) {
            totalRequestsEl.textContent = parseInt(overviewData.today_requests).toLocaleString();
            console.log('✅ Total requests atualizado:', overviewData.today_requests);
        } else if (totalRequestsEl) {
            totalRequestsEl.textContent = '-';
        }
        
        // Taxa de sucesso (calcular baseado em successful e failed)
        const successRateEl = document.getElementById('successRate');
        if (successRateEl && overviewData.successful_summaries !== undefined && overviewData.failed_summaries !== undefined) {
            const successful = parseInt(overviewData.successful_summaries);
            const failed = parseInt(overviewData.failed_summaries);
            const total = successful + failed;
            
            if (total > 0) {
                const successRate = (successful / total) * 100;
                successRateEl.textContent = `${successRate.toFixed(1)}%`;
                console.log('✅ Success rate atualizado:', successRate.toFixed(1) + '%');
            } else {
                successRateEl.textContent = '0%';
                console.log('✅ Success rate atualizado: 0%');
            }
        } else if (successRateEl) {
            successRateEl.textContent = '-';
        }
        
        // Atualizar mudanças percentuais se disponíveis
        this.updateMetricChanges(overviewData);
    }
    
    // Show error message for metrics
    showMetricsError(message) {
        console.error('❌ Erro nas métricas:', message);
        
        // Mostrar '-' em todas as métricas
        const totalUsersEl = document.getElementById('totalUsers');
        const totalSummariesEl = document.getElementById('totalSummaries');
        const totalRequestsEl = document.getElementById('totalRequests');
        const successRateEl = document.getElementById('successRate');
        
        if (totalUsersEl) totalUsersEl.textContent = '-';
        if (totalSummariesEl) totalSummariesEl.textContent = '-';
        if (totalRequestsEl) totalRequestsEl.textContent = '-';
        if (successRateEl) successRateEl.textContent = '-';
        
        // Mostrar mensagem de erro temporária
        this.showError(`Erro nas métricas: ${message}`);
    }
    
    updateMetricChanges(overview) {
        // Atualizar mudanças percentuais baseadas nos dados
        if (overview.usersChange !== undefined) {
            const usersChangeEl = document.getElementById('usersChange');
            if (usersChangeEl) {
                const change = overview.usersChange;
                const isPositive = change >= 0;
                usersChangeEl.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
                usersChangeEl.innerHTML = `
                    <span class="material-symbols-outlined">${isPositive ? 'trending_up' : 'trending_down'}</span>
                    <span>${isPositive ? '+' : ''}${change.toFixed(1)}% este mês</span>
                `;
            }
        }
        
        if (overview.summariesChange !== undefined) {
            const summariesChangeEl = document.getElementById('summariesChange');
            if (summariesChangeEl) {
                const change = overview.summariesChange;
                const isPositive = change >= 0;
                summariesChangeEl.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
                summariesChangeEl.innerHTML = `
                    <span class="material-symbols-outlined">${isPositive ? 'trending_up' : 'trending_down'}</span>
                    <span>${isPositive ? '+' : ''}${change.toFixed(1)}% esta semana</span>
                `;
            }
        }
        
        if (overview.requestsChange !== undefined) {
            const requestsChangeEl = document.getElementById('requestsChange');
            if (requestsChangeEl) {
                const change = overview.requestsChange;
                const isPositive = change >= 0;
                requestsChangeEl.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
                requestsChangeEl.innerHTML = `
                    <span class="material-symbols-outlined">${isPositive ? 'trending_up' : 'trending_down'}</span>
                    <span>${isPositive ? '+' : ''}${change.toFixed(1)}% hoje</span>
                `;
            }
        }
        
        if (overview.successChange !== undefined) {
            const successChangeEl = document.getElementById('successChange');
            if (successChangeEl) {
                const change = overview.successChange;
                const isPositive = change >= 0;
                successChangeEl.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
                successChangeEl.innerHTML = `
                    <span class="material-symbols-outlined">${isPositive ? 'trending_up' : 'trending_down'}</span>
                    <span>${isPositive ? '+' : ''}${change.toFixed(1)}% esta semana</span>
                `;
            }
        }
        
        // Atualizar badge de performance baseado nos dados reais
        this.updatePerformanceBadge(overview);
    }
    
    // Atualizar badge de performance baseado nos dados reais
    updatePerformanceBadge(overview) {
        const requestsBadgeEl = document.getElementById('requestsBadge');
        if (!requestsBadgeEl) return;
        
        // Determinar performance baseado nos dados reais
        let performanceLevel = 'Média';
        let badgeClass = 'secondary';
        let icon = 'speed';
        
        // Critérios baseados em dados reais:
        const todayRequests = parseInt(overview.today_requests || 0);
        const requestsChange = parseFloat(overview.requestsChange || 0);
        const avgDuration = parseFloat(overview.avg_duration || 0);
        
        // Performance alta: muitos requests hoje + crescimento positivo + tempo de resposta razoável
        if (todayRequests > 200 && requestsChange > 50 && avgDuration < 5000) {
            performanceLevel = 'Alta Performance';
            badgeClass = 'success';
            icon = 'speed';
        }
        // Performance média: requests moderados ou crescimento moderado
        else if (todayRequests > 100 || requestsChange > 0) {
            performanceLevel = 'Performance Média';
            badgeClass = 'primary';
            icon = 'trending_up';
        }
        // Performance baixa: poucos requests ou crescimento negativo
        else {
            performanceLevel = 'Performance Baixa';
            badgeClass = 'error';
            icon = 'trending_down';
        }
        
        // Atualizar o badge
        requestsBadgeEl.className = `badge ${badgeClass}`;
        requestsBadgeEl.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            <span>${performanceLevel}</span>
        `;
        
        console.log(`✅ Badge de performance atualizado: ${performanceLevel} (${todayRequests} requests, ${requestsChange}% mudança)`);
    }
    
    initializeCharts() {
        console.log('📊 Inicializando gráficos...');
        
        // Gráfico de atividade recente
        this.initActivityChart();
        
        // Gráfico de tipos de documentos
        this.initDocumentTypesChart();
    }
    
    initActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;
        
        // Destruir gráfico existente se houver
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }
        
        this.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Resumos Processados',
                    data: [12, 19, 3, 5, 2, 3, 8],
                    borderColor: 'rgb(103, 80, 164)',
                    backgroundColor: 'rgba(103, 80, 164, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Utilizadores Ativos',
                    data: [8, 15, 7, 12, 6, 4, 10],
                    borderColor: 'rgb(125, 82, 96)',
                    backgroundColor: 'rgba(125, 82, 96, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initDocumentTypesChart() {
        const ctx = document.getElementById('documentTypesChart');
        if (!ctx) return;
        
        // Destruir gráfico existente se houver
        if (this.charts.documentTypes) {
            this.charts.documentTypes.destroy();
        }

        this.charts.documentTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Termos de Serviço', 'Políticas de Privacidade', 'Outros'],
                datasets: [{
                    data: [65, 30, 5],
                    backgroundColor: [
                        'rgb(103, 80, 164)',
                        'rgb(125, 82, 96)',
                        'rgb(98, 91, 113)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    updateCharts() {
        console.log('📊 Atualizando gráficos com dados reais...');
        
        // Verificar se há erro nos dados de realtime
        if (this.data.realtime && this.data.realtime.error) {
            console.error('❌ Erro nos dados de realtime:', this.data.realtime.error);
            this.showChartError('activity', `Erro ao carregar dados de atividade: ${this.data.realtime.error}`);
            return;
        }
        
        // Atualizar gráfico de atividade se tivermos dados
        if (this.data.realtime && this.charts.activity) {
            const activityData = this.data.realtime.activity || [];
            console.log('📈 Dados de atividade recebidos:', activityData);
            
            if (activityData.length > 0) {
                this.charts.activity.data.datasets[0].data = activityData.map(d => d.summaries || 0);
                this.charts.activity.data.datasets[1].data = activityData.map(d => d.users || 0);
                this.charts.activity.data.labels = activityData.map(d => d.date || '');
                this.charts.activity.update();
                console.log('✅ Gráfico de atividade atualizado com dados reais');
                
                // Esconder mensagem de "sem dados"
                this.hideNoDataMessage('activity');
            } else {
                console.log('⚠️ Nenhum dado de atividade disponível');
                // Mostrar gráfico vazio com mensagem
                this.charts.activity.data.datasets[0].data = [];
                this.charts.activity.data.datasets[1].data = [];
                this.charts.activity.data.labels = [];
                this.charts.activity.update();
                
                // Mostrar mensagem de "sem dados"
                this.showNoDataMessage('activity', 'Nenhuma atividade registrada nos últimos 7 dias');
            }
        }
        
        // Atualizar gráfico de tipos de documentos se tivermos dados
        if (this.data.summaries && this.charts.documentTypes) {
            const documentTypes = this.data.summaries.documentTypes || {};
            console.log('📊 Dados de tipos de documentos recebidos:', documentTypes);
            
            if (Object.keys(documentTypes).length > 0) {
                const labels = Object.keys(documentTypes);
                const values = Object.values(documentTypes);
                
                this.charts.documentTypes.data.labels = labels;
                this.charts.documentTypes.data.datasets[0].data = values;
                this.charts.documentTypes.update();
                console.log('✅ Gráfico de tipos de documentos atualizado com dados reais');
                
                // Esconder mensagem de "sem dados"
                this.hideNoDataMessage('documentTypes');
            } else {
                console.log('⚠️ Nenhum dado de tipos de documentos disponível');
                // Mostrar gráfico vazio com mensagem
                this.charts.documentTypes.data.labels = [];
                this.charts.documentTypes.data.datasets[0].data = [];
                this.charts.documentTypes.update();
                
                // Mostrar mensagem de "sem dados"
                this.showNoDataMessage('documentTypes', 'Nenhum documento processado ainda');
            }
        }
    }
    
    // Função para mostrar mensagem de "sem dados"
    showNoDataMessage(chartType, message) {
        const chartContainer = document.querySelector(`#${chartType}Chart`);
        if (chartContainer) {
            // Remover mensagem existente se houver
            const existingMessage = chartContainer.querySelector('.no-data-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Criar nova mensagem
            const noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div class="no-data-content">
                    <span class="material-symbols-outlined">info</span>
                    <p>${message}</p>
                    <small>Os dados aparecerão aqui quando houver atividade</small>
                </div>
            `;
            
            // Adicionar estilos inline
            noDataMessage.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: var(--md-sys-color-on-surface-variant);
                background: var(--md-sys-color-surface-container);
                padding: 2rem;
                border-radius: 1rem;
                border: 1px solid var(--md-sys-color-outline-variant);
                z-index: 10;
            `;
            
            noDataMessage.querySelector('.no-data-content').style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            `;
            
            noDataMessage.querySelector('.material-symbols-outlined').style.cssText = `
                font-size: 2rem;
                opacity: 0.6;
            `;
            
            noDataMessage.querySelector('p').style.cssText = `
                margin: 0;
                font-weight: 500;
            `;
            
            noDataMessage.querySelector('small').style.cssText = `
                margin: 0;
                opacity: 0.7;
            `;
            
            chartContainer.style.position = 'relative';
            chartContainer.appendChild(noDataMessage);
        }
    }
    
    // Função para esconder mensagem de "sem dados"
    hideNoDataMessage(chartType) {
        const chartContainer = document.querySelector(`#${chartType}Chart`);
        if (chartContainer) {
            const existingMessage = chartContainer.querySelector('.no-data-message');
            if (existingMessage) {
                existingMessage.remove();
            }
        }
    }
    
    navigateToSection(section) {
        console.log(`🧭 Navegando para: ${section}`);
        
        // Atualizar navegação ativa
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Mostrar secção correta
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.add('hidden');
        });
        document.getElementById(`${section}-section`).classList.remove('hidden');
        
        // Atualizar título da página
        const pageTitle = document.getElementById('pageTitle');
        const titles = {
            'overview': 'Visão Geral',
            'users': 'Utilizadores',
            'summaries': 'Resumos',
            'analytics': 'Analytics',
            'settings': 'Configurações'
        };
        pageTitle.textContent = titles[section] || 'Dashboard';
        
        this.currentSection = section;

        // Load section-specific data
        if (section === 'users') {
            this.loadUsersData();
        } else if (section === 'summaries') {
            this.loadSummariesData();
        }
    }

    // Load users data
    async loadUsersData() {
        try {
            console.log('📊 Carregando dados de utilizadores...');
            
            const response = await this.fetchData('/api/analytics/users');
            if (response && response.success && Array.isArray(response.data)) {
                this.usersData = response.data;
                console.log(`✅ ${this.usersData.length} utilizadores carregados da API`);
            } else {
                console.error('❌ Resposta da API inválida para utilizadores');
                this.showUsersError('Erro ao carregar dados de utilizadores da API');
                return;
            }
            
            this.updateUsersStats();
            this.renderUsersTable();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados de utilizadores:', error);
            this.showUsersError(`Erro ao conectar com a API: ${error.message}`);
        }
    }

    // Show error message for users section
    showUsersError(message) {
        // Limpar dados existentes
        this.usersData = [];
        
        // Mostrar erro nas estatísticas
        const totalUsersEl = document.getElementById('totalUsersCount');
        const activeUsersEl = document.getElementById('activeUsersCount');
        const newUsersEl = document.getElementById('newUsersCount');
        
        if (totalUsersEl) totalUsersEl.textContent = '-';
        if (activeUsersEl) activeUsersEl.textContent = '-';
        if (newUsersEl) newUsersEl.textContent = '-';
        
        // Mostrar erro na tabela
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--md-sys-color-error);">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                            <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.7;">error</span>
                            <div style="font-size: 18px; font-weight: 500;">Erro ao Carregar Dados</div>
                            <div style="font-size: 14px; opacity: 0.8;">${message}</div>
                            <button onclick="dashboard.loadUsersData()" style="
                                background: var(--md-sys-color-primary);
                                color: var(--md-sys-color-on-primary);
                                border: none;
                                padding: 8px 16px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                                margin-top: 8px;
                            ">
                                Tentar Novamente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        console.error('❌ Erro mostrado na interface:', message);
    }

    // Show error message for charts
    showChartError(chartType, message) {
        console.error(`❌ Erro no gráfico ${chartType}:`, message);
        
        const chartContainer = document.getElementById(`${chartType}Chart`);
        if (chartContainer) {
            // Criar elemento de erro
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chart-error';
            errorDiv.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: var(--md-sys-color-error);
                text-align: center;
                padding: 20px;
            `;
            
            errorDiv.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.7; margin-bottom: 16px;">error</span>
                <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">Erro no Gráfico</div>
                <div style="font-size: 14px; opacity: 0.8;">${message}</div>
            `;
            
            // Substituir o canvas pelo erro
            const canvas = chartContainer.querySelector('canvas');
            if (canvas) {
                canvas.style.display = 'none';
            }
            
            // Adicionar erro ao container
            chartContainer.appendChild(errorDiv);
        }
    }

    // Update users statistics
    updateUsersStats() {
        const totalUsersEl = document.getElementById('totalUsersCount');
        const activeUsersEl = document.getElementById('activeUsersCount');
        const newUsersEl = document.getElementById('newUsersCount');

        // Verificar se usersData é um array válido
        if (!Array.isArray(this.usersData)) {
            console.warn('⚠️ usersData não é um array válido:', this.usersData);
            this.usersData = [];
        }

        if (totalUsersEl) {
            totalUsersEl.textContent = this.usersData.length;
        }

        if (activeUsersEl) {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const activeUsers = this.usersData.filter(user => 
                user && (new Date(user.last_used || user.created_at) > weekAgo)
            ).length;
            activeUsersEl.textContent = activeUsers;
        }

        if (newUsersEl) {
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const newUsers = this.usersData.filter(user => 
                user && (new Date(user.created_at) > monthAgo)
            ).length;
            newUsersEl.textContent = newUsers;
        }
    }

    // Render users table
    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        // Verificar se usersData é um array válido
        if (!Array.isArray(this.usersData)) {
            console.warn('⚠️ usersData não é um array válido para renderização:', this.usersData);
            this.usersData = [];
        }

        const filteredUsers = this.getFilteredUsers();
        
        tbody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td><input type="checkbox" class="user-checkbox" data-user-id="${user.user_id}" onchange="window.dashboard.updateBulkActionsState()"></td>
                <td><span class="user-id">${user.user_id}</span></td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>${user.last_used ? this.formatDate(user.last_used) : 'Nunca'}</td>
                <td>${user.credits || 0}</td>
                <td>${user.summaries_count || 0}</td>
                <td><span class="status-badge ${this.getUserStatus(user)}">${this.getUserStatusText(user)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="dashboard.viewUserDetails('${user.user_id}')">Ver</button>
                        <button class="action-btn" onclick="dashboard.editUserCredits('${user.user_id}')">Editar</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Get filtered users
    getFilteredUsers() {
        // Verificar se usersData é um array válido
        if (!Array.isArray(this.usersData)) {
            console.warn('⚠️ usersData não é um array válido para filtros:', this.usersData);
            return [];
        }

        let filtered = [...this.usersData];

        // Search filter
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(user => 
                user && user.user_id && user.user_id.toLowerCase().includes(searchTerm)
            );
        }

        // Status filter
        const statusFilter = document.getElementById('userFilter')?.value;
        if (statusFilter) {
            filtered = filtered.filter(user => user && this.getUserStatus(user) === statusFilter);
        }

        // Sort
        const sortBy = document.getElementById('userSort')?.value;
        if (sortBy) {
            filtered.sort((a, b) => {
                if (!a || !b) return 0;
                if (sortBy === 'created_at' || sortBy === 'last_used') {
                    return new Date(b[sortBy] || 0) - new Date(a[sortBy] || 0);
                }
                return (b[sortBy] || 0) - (a[sortBy] || 0);
            });
        }

        return filtered;
    }

    // Apply users filters
    applyUsersFilters() {
        this.renderUsersTable();
    }

    // Get user status
    getUserStatus(user) {
        if (user.credits > 100) return 'premium';
        
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const lastUsed = new Date(user.last_used || user.created_at);
        
        if (lastUsed > weekAgo) return 'active';
        return 'inactive';
    }

    // Get user status text
    getUserStatusText(user) {
        const status = this.getUserStatus(user);
        const statusMap = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'premium': 'Premium'
        };
        return statusMap[status] || 'Desconhecido';
    }

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Get mock users data
    getMockUsersData() {
        return [
            {
                user_id: 'user_12345',
                created_at: '2024-01-15T10:30:00Z',
                last_used: '2024-01-20T14:22:00Z',
                credits: 15,
                summaries_count: 8
            },
            {
                user_id: 'user_67890',
                created_at: '2024-01-10T09:15:00Z',
                last_used: '2024-01-18T16:45:00Z',
                credits: 250,
                summaries_count: 45
            },
            {
                user_id: 'user_11111',
                created_at: '2024-01-05T11:20:00Z',
                last_used: '2024-01-12T13:30:00Z',
                credits: 3,
                summaries_count: 2
            }
        ];
    }

    // View user details
    viewUserDetails(userId) {
        console.log('Ver detalhes do utilizador:', userId);
        this.showUserDetailsModal(userId);
    }

    // Edit user credits
    editUserCredits(userId) {
        console.log('Editar créditos do utilizador:', userId);
        this.showEditCreditsModal(userId);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Atualizar ícone do botão
        const themeIcon = document.querySelector('#themeToggle .material-symbols-outlined');
        themeIcon.textContent = newTheme === 'light' ? 'dark_mode' : 'light_mode';
        
        // Guardar preferência
        localStorage.setItem('dashboard-theme', newTheme);
        
        console.log(`🎨 Tema alterado para: ${newTheme}`);
    }
    
    async logout() {
        console.log('🚪 Fazendo logout...');
        
        try {
            // Fazer request de logout
            const response = await fetch('http://localhost:3000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                // Limpar cookie localmente
                document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                
                // Redirecionar para login
                window.location.href = '/dashboard';
            } else {
                throw new Error('Erro ao fazer logout');
            }
            
        } catch (error) {
            console.error('❌ Erro no logout:', error);
            
            // Mesmo com erro, limpar cookie e redirecionar
            document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            window.location.href = '/dashboard';
        }
    }

    showLoading() {
        this.isLoading = true;
        const contentArea = document.getElementById('contentArea');
        
        // Adicionar overlay de loading se não existir
        if (!document.getElementById('loadingOverlay')) {
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            loadingOverlay.innerHTML = `
                <div style="
                    background-color: var(--md-sys-color-surface-container);
                    padding: 24px;
                    border-radius: var(--md-sys-shape-corner-large);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                ">
                    <div class="loading-spinner"></div>
                    <span>Carregando dados...</span>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        }
    }
    
    hideLoading() {
        this.isLoading = false;
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    showError(message) {
        const contentArea = document.getElementById('contentArea');
        
        // Remover erros existentes
        const existingError = contentArea.querySelector('.error');
        if (existingError) {
            existingError.remove();
        }
        
        // Criar novo erro
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `
            <span class="material-symbols-outlined">error</span>
            <span>${message}</span>
        `;
        
        // Inserir no topo do conteúdo
        contentArea.insertBefore(errorDiv, contentArea.firstChild);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    showSuccess(message) {
        const contentArea = document.getElementById('contentArea');
        
        // Remover mensagens existentes
        const existingSuccess = contentArea.querySelector('.success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        // Criar nova mensagem de sucesso
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            background-color: var(--md-sys-color-tertiary-container);
            color: var(--md-sys-color-on-tertiary-container);
            padding: 16px;
            border-radius: var(--md-sys-shape-corner-medium);
            margin: 16px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: var(--md-sys-elevation-level1);
        `;
        successDiv.innerHTML = `
            <span class="material-symbols-outlined">check_circle</span>
            <span>${message}</span>
        `;
        
        // Inserir no topo do conteúdo
        contentArea.insertBefore(successDiv, contentArea.firstChild);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }
    
    // ===== FUNCIONALIDADES AVANÇADAS DE GESTÃO DE UTILIZADORES =====
    
    // Mostrar modal de detalhes do utilizador
    async showUserDetailsModal(userId) {
        try {
            console.log('📊 Carregando detalhes do utilizador:', userId);
            
            const response = await this.fetchData(`/api/users/${userId}/details`);
            if (!response || !response.success) {
                throw new Error(response?.error || 'Erro ao carregar detalhes');
            }
            
            const userData = response.data;
            this.createUserDetailsModal(userData);
            
        } catch (error) {
            console.error('❌ Erro ao carregar detalhes do utilizador:', error);
            this.showError(`Erro ao carregar detalhes: ${error.message}`);
        }
    }
    
    // Criar modal de detalhes do utilizador
    createUserDetailsModal(userData) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Detalhes do Utilizador</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-details-grid">
                        <div class="user-info-card">
                            <h3>Informações Básicas</h3>
                            <div class="info-item">
                                <label>ID do Utilizador:</label>
                                <span>${userData.user.user_id}</span>
                            </div>
                            <div class="info-item">
                                <label>Device ID:</label>
                                <span>${userData.user.device_id || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <label>Créditos Atuais:</label>
                                <span class="credits-value">${userData.user.credits}</span>
                            </div>
                            <div class="info-item">
                                <label>Data de Registo:</label>
                                <span>${new Date(userData.user.created_at).toLocaleString('pt-PT')}</span>
                            </div>
                            <div class="info-item">
                                <label>Última Atividade:</label>
                                <span>${new Date(userData.user.last_seen).toLocaleString('pt-PT')}</span>
                            </div>
                        </div>
                        
                        <div class="user-stats-card">
                            <h3>Estatísticas</h3>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <label>Total de Resumos:</label>
                                    <span>${userData.statistics.total_summaries}</span>
                                </div>
                                <div class="stat-item">
                                    <label>Resumos Bem-sucedidos:</label>
                                    <span class="success">${userData.statistics.successful_summaries}</span>
                                </div>
                                <div class="stat-item">
                                    <label>Resumos Falhados:</label>
                                    <span class="error">${userData.statistics.failed_summaries}</span>
                                </div>
                                <div class="stat-item">
                                    <label>Taxa de Sucesso:</label>
                                    <span>${userData.statistics.success_rate}%</span>
                                </div>
                                <div class="stat-item">
                                    <label>Tempo Médio:</label>
                                    <span>${(userData.statistics.avg_duration / 1000).toFixed(1)}s</span>
                                </div>
                                <div class="stat-item">
                                    <label>Texto Processado:</label>
                                    <span>${userData.statistics.total_text_processed.toLocaleString()} chars</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-history-tabs">
                        <div class="tab-buttons">
                            <button class="tab-button active" data-tab="summaries">Resumos Recentes</button>
                            <button class="tab-button" data-tab="requests">Requests Recentes</button>
                            <button class="tab-button" data-tab="credits">Histórico de Créditos</button>
                        </div>
                        
                        <div class="tab-content">
                            <div class="tab-panel active" id="summaries-tab">
                                <div class="history-table-container">
                                    <table class="history-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Tipo</th>
                                                <th>Status</th>
                                                <th>Duração</th>
                                                <th>Tamanho</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${userData.summaries.map(summary => `
                                                <tr>
                                                    <td>${new Date(summary.created_at).toLocaleString('pt-PT')}</td>
                                                    <td>${this.getDocumentTypeName(summary.type)}</td>
                                                    <td>
                                                        <span class="status-badge ${summary.success ? 'success' : 'error'}">
                                                            ${summary.success ? 'Sucesso' : 'Falha'}
                                                        </span>
                                                    </td>
                                                    <td>${(summary.duration / 1000).toFixed(1)}s</td>
                                                    <td>${summary.text_length?.toLocaleString() || 'N/A'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div class="tab-panel" id="requests-tab">
                                <div class="history-table-container">
                                    <table class="history-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Método</th>
                                                <th>Path</th>
                                                <th>Status</th>
                                                <th>Duração</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${userData.requests.map(request => `
                                                <tr>
                                                    <td>${new Date(request.timestamp).toLocaleString('pt-PT')}</td>
                                                    <td>${request.method}</td>
                                                    <td>${request.path}</td>
                                                    <td>
                                                        <span class="status-badge ${request.status_code < 400 ? 'success' : 'error'}">
                                                            ${request.status_code}
                                                        </span>
                                                    </td>
                                                    <td>${request.duration}ms</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div class="tab-panel" id="credits-tab">
                                <div class="history-table-container">
                                    <table class="history-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Ação</th>
                                                <th>Valor</th>
                                                <th>Saldo Após</th>
                                                <th>Descrição</th>
                                            </tr>
                                        </thead>
                                        <tbody id="credits-history-body">
                                            <tr><td colspan="5" class="text-center">Carregando histórico de créditos...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.dashboard.editUserCredits('${userData.user.user_id}'); this.closest('.modal-overlay').remove();">
                        <span class="material-symbols-outlined">edit</span>
                        Editar Créditos
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar tabs
        this.setupModalTabs(modal);
        
        // Carregar histórico de créditos
        this.loadCreditsHistory(userData.user.user_id);
    }
    
    // Mostrar modal de edição de créditos
    async showEditCreditsModal(userId) {
        try {
            // Obter dados atuais do utilizador
            const user = this.usersData.find(u => u.user_id === userId);
            if (!user) {
                throw new Error('Utilizador não encontrado');
            }
            
            this.createEditCreditsModal(user);
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados do utilizador:', error);
            this.showError(`Erro ao carregar dados: ${error.message}`);
        }
    }
    
    // Criar modal de edição de créditos
    createEditCreditsModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Editar Créditos</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-info">
                        <h3>Utilizador: ${user.user_id}</h3>
                        <p>Créditos atuais: <strong>${user.credits}</strong></p>
                    </div>
                    
                    <form id="editCreditsForm">
                        <div class="form-group">
                            <label for="creditAction">Ação:</label>
                            <select id="creditAction" required>
                                <option value="set">Definir valor específico</option>
                                <option value="add">Adicionar créditos</option>
                                <option value="subtract">Subtrair créditos</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="creditAmount">Valor:</label>
                            <input type="number" id="creditAmount" min="0" required placeholder="Digite o valor">
                        </div>
                        
                        <div class="form-group">
                            <label for="creditReason">Motivo (opcional):</label>
                            <textarea id="creditReason" placeholder="Ex: Bónus por atividade, penalização por spam, etc."></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.dashboard.saveCreditsEdit('${user.user_id}')">
                        <span class="material-symbols-outlined">save</span>
                        Salvar Alterações
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Salvar edição de créditos
    async saveCreditsEdit(userId) {
        try {
            const action = document.getElementById('creditAction').value;
            const amount = parseInt(document.getElementById('creditAmount').value);
            const reason = document.getElementById('creditReason').value;
            
            if (!amount || amount < 0) {
                throw new Error('Valor inválido');
            }
            
            console.log('💳 Atualizando créditos:', { userId, action, amount, reason });
            
            const response = await this.fetchData(`/api/users/${userId}/credits`, {
                method: 'PUT',
                body: JSON.stringify({ credits: amount, action, reason })
            });
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Erro ao atualizar créditos');
            }
            
            console.log('✅ Créditos atualizados:', response.data);
            
            // Fechar modal
            document.querySelector('.modal-overlay').remove();
            
            // Atualizar dados e mostrar sucesso
            await this.loadUsersData();
            this.showSuccess(`Créditos ${action} com sucesso! Novo saldo: ${response.data.new_credits}`);
            
        } catch (error) {
            console.error('❌ Erro ao salvar créditos:', error);
            this.showError(`Erro ao salvar: ${error.message}`);
        }
    }
    
    // Carregar histórico de créditos
    async loadCreditsHistory(userId) {
        try {
            const response = await this.fetchData(`/api/users/${userId}/credits-history`);
            if (!response || !response.success) {
                throw new Error(response?.error || 'Erro ao carregar histórico');
            }
            
            const tbody = document.getElementById('credits-history-body');
            if (tbody) {
                tbody.innerHTML = response.data.map(entry => `
                    <tr>
                        <td>${new Date(entry.created_at).toLocaleString('pt-PT')}</td>
                        <td>
                            <span class="action-badge ${entry.action}">
                                ${this.getActionName(entry.action)}
                            </span>
                        </td>
                        <td class="${entry.action === 'subtract' ? 'negative' : 'positive'}">
                            ${entry.action === 'subtract' ? '-' : '+'}${entry.amount}
                        </td>
                        <td>${entry.balance_after}</td>
                        <td>${entry.description || 'N/A'}</td>
                    </tr>
                `).join('') || '<tr><td colspan="5" class="text-center">Nenhum histórico encontrado</td></tr>';
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar histórico de créditos:', error);
            const tbody = document.getElementById('credits-history-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center error">Erro ao carregar histórico</td></tr>';
            }
        }
    }
    
    // Configurar tabs do modal
    setupModalTabs(modal) {
        const tabButtons = modal.querySelectorAll('.tab-button');
        const tabPanels = modal.querySelectorAll('.tab-panel');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Remover classe active de todos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Adicionar classe active ao selecionado
                button.classList.add('active');
                modal.querySelector(`#${tabId}-tab`).classList.add('active');
            });
        });
    }
    
    // Obter nome da ação
    getActionName(action) {
        const actionNames = {
            'set': 'Definir',
            'add': 'Adicionar',
            'subtract': 'Subtrair',
            'consumed': 'Consumido',
            'purchased': 'Comprado',
            'refunded': 'Reembolsado'
        };
        return actionNames[action] || action;
    }
    
    // Obter nome do tipo de documento
    getDocumentTypeName(type) {
        const typeNames = {
            'terms_of_service': 'Termos de Serviço',
            'privacy_policy': 'Política de Privacidade',
            'unknown': 'Outros'
        };
        return typeNames[type] || type;
    }
    
    // Mostrar ações em massa
    showBulkActions() {
        const selectedUsers = this.getSelectedUsers();
        if (selectedUsers.length === 0) {
            this.showError('Selecione pelo menos um utilizador');
            return;
        }
        
        this.createBulkActionsModal(selectedUsers);
    }
    
    // Obter utilizadores selecionados
    getSelectedUsers() {
        const checkboxes = document.querySelectorAll('#usersTableBody input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.userId);
    }
    
    // Criar modal de ações em massa
    createBulkActionsModal(selectedUsers) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Ações em Massa</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="bulk-info">
                        <p><strong>${selectedUsers.length}</strong> utilizador(es) selecionado(s)</p>
                    </div>
                    
                    <form id="bulkActionForm">
                        <div class="form-group">
                            <label for="bulkAction">Ação:</label>
                            <select id="bulkAction" required>
                                <option value="">Selecione uma ação</option>
                                <option value="add_credits">Adicionar Créditos</option>
                                <option value="subtract_credits">Subtrair Créditos</option>
                                <option value="ban">Banir Utilizadores</option>
                                <option value="unban">Desbanir Utilizadores</option>
                                <option value="delete">Eliminar Utilizadores</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="valueGroup" style="display: none;">
                            <label for="bulkValue">Valor:</label>
                            <input type="number" id="bulkValue" min="0" placeholder="Digite o valor">
                        </div>
                        
                        <div class="form-group">
                            <label for="bulkReason">Motivo (opcional):</label>
                            <textarea id="bulkReason" placeholder="Ex: Ação administrativa, bónus em massa, etc."></textarea>
                        </div>
                        
                        <div class="warning-box" id="warningBox" style="display: none;">
                            <span class="material-symbols-outlined">warning</span>
                            <p>Esta ação é irreversível e afetará todos os utilizadores selecionados.</p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="window.dashboard.executeBulkAction()">
                        <span class="material-symbols-outlined">execute</span>
                        Executar Ação
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar eventos
        const actionSelect = modal.querySelector('#bulkAction');
        const valueGroup = modal.querySelector('#valueGroup');
        const warningBox = modal.querySelector('#warningBox');
        
        actionSelect.addEventListener('change', () => {
            const action = actionSelect.value;
            const needsValue = ['add_credits', 'subtract_credits'].includes(action);
            const isDangerous = ['ban', 'delete'].includes(action);
            
            valueGroup.style.display = needsValue ? 'block' : 'none';
            warningBox.style.display = isDangerous ? 'block' : 'none';
        });
    }
    
    // Executar ação em massa
    async executeBulkAction() {
        try {
            const selectedUsers = this.getSelectedUsers();
            const action = document.getElementById('bulkAction').value;
            const value = document.getElementById('bulkValue').value;
            const reason = document.getElementById('bulkReason').value;
            
            if (!action) {
                throw new Error('Selecione uma ação');
            }
            
            if (['add_credits', 'subtract_credits'].includes(action) && !value) {
                throw new Error('Valor é obrigatório para esta ação');
            }
            
            console.log('🔄 Executando ação em massa:', { action, value, reason, users: selectedUsers.length });
            
            const response = await this.fetchData('/api/users/bulk-action', {
                method: 'POST',
                body: JSON.stringify({
                    userIds: selectedUsers,
                    action,
                    value: value ? parseInt(value) : undefined,
                    reason
                })
            });
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Erro na ação em massa');
            }
            
            console.log('✅ Ação em massa executada:', response.data);
            
            // Fechar modal
            document.querySelector('.modal-overlay').remove();
            
            // Atualizar dados e mostrar resultado
            await this.loadUsersData();
            
            const { successful, failed } = response.data;
            this.showSuccess(`Ação executada: ${successful} sucessos, ${failed} falhas`);
            
        } catch (error) {
            console.error('❌ Erro na ação em massa:', error);
            this.showError(`Erro na ação: ${error.message}`);
        }
    }
    
    // Funções auxiliares para gestão de seleção
    updateBulkActionsState() {
        const selectedUsers = this.getSelectedUsers();
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        
        if (bulkActionsBtn) {
            bulkActionsBtn.disabled = selectedUsers.length === 0;
        }
        
        if (selectAllCheckbox) {
            const allCheckboxes = document.querySelectorAll('.user-checkbox');
            const checkedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
            
            if (checkedCheckboxes.length === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (checkedCheckboxes.length === allCheckboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
    }
    
    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const userCheckboxes = document.querySelectorAll('.user-checkbox');
        
        userCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        
        this.updateBulkActionsState();
    }
    
    selectAllUsers() {
        const userCheckboxes = document.querySelectorAll('.user-checkbox');
        userCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateBulkActionsState();
    }
    
    // Método para atualizar dados em tempo real
    async refreshData() {
        // Proteção contra refresh muito frequente
        const now = Date.now();
        if (this.lastRefresh && (now - this.lastRefresh) < 5000) {
            console.log('⏳ Refresh muito frequente, ignorando...');
            return;
        }
        
        this.lastRefresh = now;
        console.log('🔄 Atualizando dados...');
        
        try {
            await this.loadInitialData();
            console.log('✅ Dados atualizados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao atualizar dados:', error);
            this.showError('Erro ao atualizar dados');
        }
    }
    
    // Dados mock para demonstração
    getMockOverviewData() {
        console.log('📊 Usando dados mock para overview');
        return {
            totalUsers: 1247,
            totalSummaries: 3892,
            totalRequests: 15678,
            successRate: 94.2,
            usersChange: 12.5,
            summariesChange: 8.3,
            requestsChange: 15.7,
            successChange: 2.1
        };
    }
    
    getMockRealtimeData() {
        console.log('📊 Usando dados mock para realtime');
        return {
            activity: [
                { date: 'Seg', summaries: 12, users: 8 },
                { date: 'Ter', summaries: 19, users: 15 },
                { date: 'Qua', summaries: 3, users: 7 },
                { date: 'Qui', summaries: 5, users: 12 },
                { date: 'Sex', summaries: 2, users: 6 },
                { date: 'Sáb', summaries: 3, users: 4 },
                { date: 'Dom', summaries: 8, users: 10 }
            ]
        };
    }
    
    getMockSummariesData() {
        console.log('📊 Usando dados mock para summaries');
        return {
            documentTypes: {
                'Termos de Serviço': 65,
                'Políticas de Privacidade': 30,
                'Outros': 5
            }
        };
    }

    // ===== FUNCIONALIDADES DE HISTÓRICO DE RESUMOS =====

    // Carregar dados de resumos
    async loadSummariesData() {
        try {
            console.log('📊 Carregando dados de resumos...');
            
            const response = await this.fetchData('/api/analytics/summaries-history');
            if (response && response.success && Array.isArray(response.data)) {
                this.summariesData = response.data;
                console.log(`✅ ${this.summariesData.length} resumos carregados da API`);
            } else {
                console.error('❌ Resposta da API inválida para resumos');
                this.showSummariesError('Erro ao carregar dados de resumos da API');
                return;
            }
            
            this.updateSummariesStats();
            this.renderSummariesTable();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados de resumos:', error);
            this.showSummariesError(`Erro ao conectar com a API: ${error.message}`);
        }
    }

    // Mostrar erro na secção de resumos
    showSummariesError(message) {
        // Limpar dados existentes
        this.summariesData = [];
        
        // Mostrar erro nas estatísticas
        const totalSummariesEl = document.getElementById('totalSummariesCount');
        const successfulSummariesEl = document.getElementById('successfulSummariesCount');
        const failedSummariesEl = document.getElementById('failedSummariesCount');
        const avgProcessingTimeEl = document.getElementById('avgProcessingTime');
        
        if (totalSummariesEl) totalSummariesEl.textContent = '-';
        if (successfulSummariesEl) successfulSummariesEl.textContent = '-';
        if (failedSummariesEl) failedSummariesEl.textContent = '-';
        if (avgProcessingTimeEl) avgProcessingTimeEl.textContent = '-';
        
        // Mostrar erro na tabela
        const tbody = document.getElementById('summariesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--md-sys-color-error);">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                            <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.7;">error</span>
                            <div style="font-size: 18px; font-weight: 500;">Erro ao Carregar Dados</div>
                            <div style="font-size: 14px; opacity: 0.8;">${message}</div>
                            <button onclick="dashboard.loadSummariesData()" style="
                                background: var(--md-sys-color-primary);
                                color: var(--md-sys-color-on-primary);
                                border: none;
                                padding: 8px 16px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                                margin-top: 8px;
                            ">
                                Tentar Novamente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        console.error('❌ Erro mostrado na interface de resumos:', message);
    }

    // Atualizar estatísticas de resumos
    updateSummariesStats() {
        const totalSummariesEl = document.getElementById('totalSummariesCount');
        const successfulSummariesEl = document.getElementById('successfulSummariesCount');
        const failedSummariesEl = document.getElementById('failedSummariesCount');
        const avgProcessingTimeEl = document.getElementById('avgProcessingTime');

        // Usar dados da API em vez de calcular localmente
        if (this.data.overview && this.data.overview.successful_summaries !== undefined) {
            const overview = this.data.overview;
            
            // Total de resumos = bem-sucedidos + falhados
            const totalSummaries = parseInt(overview.successful_summaries || 0) + parseInt(overview.failed_summaries || 0);
            
            if (totalSummariesEl) {
                totalSummariesEl.textContent = totalSummaries.toLocaleString();
            }

            if (successfulSummariesEl) {
                successfulSummariesEl.textContent = parseInt(overview.successful_summaries || 0).toLocaleString();
            }

            if (failedSummariesEl) {
                failedSummariesEl.textContent = parseInt(overview.failed_summaries || 0).toLocaleString();
            }

            if (avgProcessingTimeEl && overview.avg_duration) {
                const avgDurationSeconds = (overview.avg_duration / 1000).toFixed(1);
                avgProcessingTimeEl.textContent = avgDurationSeconds;
            }
        } else {
            // Fallback para cálculo local se não houver dados da API
            console.warn('⚠️ Usando fallback para estatísticas de resumos');
            
            // Verificar se summariesData é um array válido
            if (!Array.isArray(this.summariesData)) {
                console.warn('⚠️ summariesData não é um array válido:', this.summariesData);
                this.summariesData = [];
            }

            if (totalSummariesEl) {
                totalSummariesEl.textContent = this.summariesData.length;
            }

            if (successfulSummariesEl) {
                const successful = this.summariesData.filter(summary => 
                    summary && summary.success === true
                ).length;
                successfulSummariesEl.textContent = successful;
            }

            if (failedSummariesEl) {
                const failed = this.summariesData.filter(summary => 
                    summary && summary.success === false
                ).length;
                failedSummariesEl.textContent = failed;
            }

            if (avgProcessingTimeEl) {
                const successfulSummaries = this.summariesData.filter(summary => 
                    summary && summary.success === true && summary.duration
                );
                
                if (successfulSummaries.length > 0) {
                    const avgDuration = successfulSummaries.reduce((sum, summary) => 
                        sum + (summary.duration / 1000), 0
                    ) / successfulSummaries.length;
                    avgProcessingTimeEl.textContent = avgDuration.toFixed(1);
                } else {
                    avgProcessingTimeEl.textContent = '0.0';
                }
            }
        }
    }

    // Renderizar tabela de resumos
    renderSummariesTable() {
        const tbody = document.getElementById('summariesTableBody');
        if (!tbody) return;

        // Verificar se summariesData é um array válido
        if (!Array.isArray(this.summariesData)) {
            console.warn('⚠️ summariesData não é um array válido para renderização:', this.summariesData);
            this.summariesData = [];
        }

        const filteredSummaries = this.getFilteredSummaries();
        
        if (filteredSummaries.length === 0) {
            this.showSummariesEmptyState();
            return;
        }

        tbody.innerHTML = filteredSummaries.map(summary => `
            <tr>
                <td>${this.formatDate(summary.created_at)}</td>
                <td>${this.getDocumentTypeName(summary.document_type || summary.type)}</td>
                <td>
                    <a href="${summary.url}" target="_blank" class="summary-url" title="${summary.url}">
                        ${this.truncateUrl(summary.url)}
                    </a>
                </td>
                <td>
                    <span class="status-badge ${summary.success ? 'status-success' : 'status-failed'}">
                        ${summary.success ? 'Sucesso' : 'Falha'}
                    </span>
                </td>
                <td>${summary.duration ? (summary.duration / 1000).toFixed(1) + 's' : '-'}</td>
                <td>${summary.text_length ? summary.text_length.toLocaleString() + ' chars' : '-'}</td>
                <td>
                    <div class="summary-actions">
                        <button class="summary-action-btn" onclick="window.dashboard.viewSummaryDetails('${summary.id}')" title="Ver detalhes">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                        <button class="summary-action-btn" onclick="window.dashboard.copySummary('${summary.id}')" title="Copiar resumo">
                            <span class="material-symbols-outlined">content_copy</span>
                        </button>
                        <button class="summary-action-btn" onclick="window.dashboard.exportSummary('${summary.id}')" title="Exportar resumo">
                            <span class="material-symbols-outlined">download</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Esconder estado vazio
        const emptyState = document.getElementById('summariesEmptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    // Obter resumos filtrados
    getFilteredSummaries() {
        // Verificar se summariesData é um array válido
        if (!Array.isArray(this.summariesData)) {
            console.warn('⚠️ summariesData não é um array válido para filtros:', this.summariesData);
            return [];
        }

        let filtered = [...this.summariesData];

        // Filtro por tipo
        const typeFilter = document.getElementById('summaryTypeFilter')?.value;
        if (typeFilter) {
            filtered = filtered.filter(summary => 
                summary && (summary.document_type || summary.type) === typeFilter
            );
        }

        // Filtro por status
        const statusFilter = document.getElementById('summaryStatusFilter')?.value;
        if (statusFilter) {
            filtered = filtered.filter(summary => {
                if (statusFilter === 'success') return summary && summary.success === true;
                if (statusFilter === 'failed') return summary && summary.success === false;
                return true;
            });
        }

        // Filtro por data
        const dateFilter = document.getElementById('summaryDateFilter')?.value;
        if (dateFilter) {
            const now = new Date();
            filtered = filtered.filter(summary => {
                if (!summary || !summary.created_at) return false;
                const summaryDate = new Date(summary.created_at);
                
                switch (dateFilter) {
                    case 'today':
                        return summaryDate.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return summaryDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return summaryDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        // Filtro por pesquisa
        const searchTerm = document.getElementById('summarySearch')?.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(summary => {
                if (!summary) return false;
                const urlMatch = summary.url && summary.url.toLowerCase().includes(searchTerm);
                const contentMatch = summary.summary && summary.summary.toLowerCase().includes(searchTerm);
                return urlMatch || contentMatch;
            });
        }

        // Ordenar por data (mais recente primeiro)
        filtered.sort((a, b) => {
            if (!a || !b) return 0;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        return filtered;
    }

    // Aplicar filtros de resumos
    applySummariesFilters() {
        this.renderSummariesTable();
    }

    // Mostrar estado vazio de resumos
    showSummariesEmptyState() {
        const emptyState = document.getElementById('summariesEmptyState');
        const tbody = document.getElementById('summariesTableBody');
        
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (tbody) {
            tbody.innerHTML = '';
        }
    }

    // Limpar filtros de resumos
    clearSummariesFilters() {
        const typeFilter = document.getElementById('summaryTypeFilter');
        const dateFilter = document.getElementById('summaryDateFilter');
        const statusFilter = document.getElementById('summaryStatusFilter');
        const searchInput = document.getElementById('summarySearch');

        if (typeFilter) typeFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (searchInput) searchInput.value = '';

        this.applySummariesFilters();
    }

    // Ver detalhes do resumo
    async viewSummaryDetails(summaryId) {
        try {
            console.log('🔍 Procurando resumo com ID:', summaryId, 'Tipo:', typeof summaryId);
            console.log('📊 Dados disponíveis:', this.summariesData?.length || 0, 'resumos');
            console.log('🔍 IDs disponíveis:', this.summariesData?.map(s => ({ id: s.id, type: typeof s.id })) || []);
            
            // Tentar busca por ID como número e como string
            let summary = this.summariesData.find(s => s.id === summaryId);
            if (!summary) {
                summary = this.summariesData.find(s => s.id == summaryId); // Comparação flexível
            }
            if (!summary) {
                summary = this.summariesData.find(s => String(s.id) === String(summaryId)); // Comparação de strings
            }
            
            if (!summary) {
                throw new Error(`Resumo não encontrado. ID procurado: ${summaryId} (${typeof summaryId})`);
            }

            console.log('✅ Resumo encontrado:', summary);
            this.createSummaryDetailsModal(summary);
            
        } catch (error) {
            console.error('❌ Erro ao carregar detalhes do resumo:', error);
            this.showError(`Erro ao carregar detalhes: ${error.message}`);
        }
    }

    // Criar modal de detalhes do resumo
    createSummaryDetailsModal(summary) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Detalhes do Resumo</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="summary-details-grid">
                        <div class="summary-info-card">
                            <h3>Informações Básicas</h3>
                            <div class="info-item">
                                <label>Tipo de Documento:</label>
                                <span>${this.getDocumentTypeName(summary.document_type || summary.type)}</span>
                            </div>
                            <div class="info-item">
                                <label>URL:</label>
                                <span>${summary.url ? `<a href="${summary.url}" target="_blank">${summary.url}</a>` : 'URL não disponível'}</span>
                            </div>
                            <div class="info-item">
                                <label>Status:</label>
                                <span class="status-badge ${summary.success ? 'status-success' : 'status-failed'}">
                                    ${summary.success ? 'Sucesso' : 'Falha'}
                                </span>
                            </div>
                            <div class="info-item">
                                <label>Data de Criação:</label>
                                <span>${new Date(summary.created_at).toLocaleString('pt-PT')}</span>
                            </div>
                            <div class="info-item">
                                <label>Tempo de Processamento:</label>
                                <span>${summary.duration ? (summary.duration / 1000).toFixed(1) + 's' : 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <label>Tamanho do Texto:</label>
                                <span>${summary.text_length ? summary.text_length.toLocaleString() + ' caracteres' : 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div class="summary-content-card">
                            <h3>Conteúdo do Resumo</h3>
                            <div class="summary-content">
                                ${summary.summary || 'Resumo não disponível'}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.dashboard.copySummary('${summary.id}'); this.closest('.modal-overlay').remove();">
                        <span class="material-symbols-outlined">content_copy</span>
                        Copiar Resumo
                    </button>
                    <button class="btn btn-secondary" onclick="window.dashboard.exportSummary('${summary.id}'); this.closest('.modal-overlay').remove();">
                        <span class="material-symbols-outlined">download</span>
                        Exportar
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Copiar resumo
    copySummary(summaryId) {
        console.log('📋 Copiando resumo com ID:', summaryId);
        
        // Tentar busca por ID como número e como string
        let summary = this.summariesData.find(s => s.id === summaryId);
        if (!summary) {
            summary = this.summariesData.find(s => s.id == summaryId); // Comparação flexível
        }
        if (!summary) {
            summary = this.summariesData.find(s => String(s.id) === String(summaryId)); // Comparação de strings
        }
        
        if (summary) {
            const url = summary.url || 'URL não disponível';
            const summaryText = summary.summary || 'Resumo não disponível';
            const text = `${this.getDocumentTypeName(summary.document_type || summary.type)}\n\nURL: ${url}\nData: ${this.formatDate(summary.created_at)}\n\n${summaryText}`;
            
            navigator.clipboard.writeText(text).then(() => {
                this.showSuccess('Resumo copiado para a área de transferência!');
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                this.showError('Erro ao copiar resumo');
            });
        } else {
            this.showError(`Resumo não encontrado. ID: ${summaryId}`);
        }
    }

    // Exportar resumo
    exportSummary(summaryId) {
        console.log('💾 Exportando resumo com ID:', summaryId);
        
        // Tentar busca por ID como número e como string
        let summary = this.summariesData.find(s => s.id === summaryId);
        if (!summary) {
            summary = this.summariesData.find(s => s.id == summaryId); // Comparação flexível
        }
        if (!summary) {
            summary = this.summariesData.find(s => String(s.id) === String(summaryId)); // Comparação de strings
        }
        
        if (summary) {
            const url = summary.url || 'URL não disponível';
            const summaryText = summary.summary || 'Resumo não disponível';
            const content = `${this.getDocumentTypeName(summary.document_type || summary.type)}\n\nURL: ${url}\nData: ${this.formatDate(summary.created_at)}\nTempo: ${summary.duration ? (summary.duration / 1000).toFixed(1) + 's' : 'N/A'}\nTamanho: ${summary.text_length ? summary.text_length.toLocaleString() + ' caracteres' : 'N/A'}\n\n${summaryText}`;
            
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url_download = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url_download;
            a.download = `resumo-${summaryId}-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url_download);
            
            this.showSuccess('Resumo exportado com sucesso!');
        } else {
            this.showError(`Resumo não encontrado. ID: ${summaryId}`);
        }
    }

    // Exportar todos os resumos
    exportAllSummaries() {
        if (!Array.isArray(this.summariesData) || this.summariesData.length === 0) {
            this.showError('Nenhum resumo disponível para exportar');
            return;
        }

        const filteredSummaries = this.getFilteredSummaries();
        if (filteredSummaries.length === 0) {
            this.showError('Nenhum resumo corresponde aos filtros selecionados');
            return;
        }

        const content = filteredSummaries.map(summary => 
            `=== ${this.getDocumentTypeName(summary.document_type || summary.type)} ===\n` +
            `URL: ${summary.url}\n` +
            `Data: ${this.formatDate(summary.created_at)}\n` +
            `Status: ${summary.success ? 'Sucesso' : 'Falha'}\n` +
            `Tempo: ${summary.duration ? (summary.duration / 1000).toFixed(1) + 's' : 'N/A'}\n` +
            `Tamanho: ${summary.text_length ? summary.text_length.toLocaleString() + ' caracteres' : 'N/A'}\n\n` +
            `${summary.summary || 'Resumo não disponível'}\n\n` +
            '='.repeat(80) + '\n\n'
        ).join('');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todos-resumos-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess(`${filteredSummaries.length} resumos exportados com sucesso!`);
    }

    // Funções auxiliares para resumos
    truncateUrl(url, maxLength = 30) {
        if (!url) return 'N/A';
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }
}

// Inicializar dashboard quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Página carregada, inicializando dashboard...');
    
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('dashboard-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Atualizar ícone do tema
    const themeIcon = document.querySelector('#themeToggle .material-symbols-outlined');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'light' ? 'dark_mode' : 'light_mode';
    }
    
    // Inicializar dashboard
    window.dashboard = new Dashboard();
    
    
    // Atualizar dados a cada 30 segundos (DESABILITADO para evitar loops)
    // setInterval(() => {
    //     if (window.dashboard && !window.dashboard.isLoading) {
    //         window.dashboard.refreshData();
    //     }
    // }, 30000);
    
    // Refresh manual apenas quando necessário
    console.log('📊 Dashboard inicializado - Refresh automático desabilitado');
});

// Exportar para uso global
window.Dashboard = Dashboard;