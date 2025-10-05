// Dashboard JavaScript - ToS Privacy Summarizer
class Dashboard {
    constructor() {
        this.currentSection = 'overview';
        this.charts = {};
        this.data = {};
        this.isLoading = false;
        this.currentUsersPage = 1;
        this.usersPerPage = 20;
        this.usersData = null;
        
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

        // Users section event listeners
        this.setupUsersEventListeners();
    }

    setupUsersEventListeners() {
        // Refresh users button
        const refreshUsersBtn = document.getElementById('refreshUsersBtn');
        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener('click', () => {
                this.loadUsersData();
            });
        }

        // Export users button
        const exportUsersBtn = document.getElementById('exportUsersBtn');
        if (exportUsersBtn) {
            exportUsersBtn.addEventListener('click', () => {
                this.exportUsers();
            });
        }

        // Users search
        const usersSearch = document.getElementById('usersSearch');
        if (usersSearch) {
            usersSearch.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.loadUsersData();
                }, 500);
            });
        }

        // Users filter
        const usersFilter = document.getElementById('usersFilter');
        if (usersFilter) {
            usersFilter.addEventListener('change', () => {
                this.loadUsersData();
            });
        }

        // Pagination buttons
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                this.currentUsersPage = Math.max(1, this.currentUsersPage - 1);
                this.loadUsersData();
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.currentUsersPage += 1;
                this.loadUsersData();
            });
        }
    }
    
    async loadInitialData() {
        console.log('📊 Carregando dados iniciais...');
        this.showLoading();
        
        try {
            // Carregar dados de todas as APIs em paralelo
            const [overviewData, realtimeData, summariesData] = await Promise.all([
                this.fetchData('/api/analytics/overview').catch(() => null),
                this.fetchData('/api/analytics/realtime').catch(() => null),
                this.fetchData('/api/analytics/summaries').catch(() => null)
            ]);
            
            // Usar dados mock se APIs retornarem null ou falharem
            this.data = {
                overview: overviewData || this.getMockOverviewData(),
                realtime: realtimeData || this.getMockRealtimeData(),
                summaries: summariesData || this.getMockSummariesData()
            };
            
            this.updateMetrics();
            this.updateCharts();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
            
            // Usar dados mock em caso de erro
            this.data = {
                overview: this.getMockOverviewData(),
                realtime: this.getMockRealtimeData(),
                summaries: this.getMockSummariesData()
            };
            
            this.updateMetrics();
            this.updateCharts();
        } finally {
            this.hideLoading();
        }
    }

    async fetchData(endpoint) {
        try {
            console.log(`📡 Fazendo request para: ${endpoint}`);
            
            const token = this.getAuthToken();
            console.log('🔑 Token encontrado:', token ? 'Sim' : 'Não');
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Adicionar token se disponível
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            });
            
        if (!response.ok) {
                if (response.status === 401) {
                    console.warn('🔒 Token inválido ou expirado, usando dados mock...');
                    // Não redirecionar, apenas usar dados mock
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
        if (!overview) return;
        
        // Extrair os dados reais do objeto de resposta da API
        const overviewData = overview.data || overview;
        console.log('Dados extraídos:', overviewData);
        
        // Total de utilizadores
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl && overviewData.total_users !== undefined) {
            totalUsersEl.textContent = parseInt(overviewData.total_users).toLocaleString();
            console.log('✅ Total users atualizado:', overviewData.total_users);
        }
        
        // Total de resumos (usar successful_summaries)
        const totalSummariesEl = document.getElementById('totalSummaries');
        if (totalSummariesEl && overviewData.successful_summaries !== undefined) {
            totalSummariesEl.textContent = parseInt(overviewData.successful_summaries).toLocaleString();
            console.log('✅ Total summaries atualizado:', overviewData.successful_summaries);
        }
        
        // Total de requests (usar today_requests)
        const totalRequestsEl = document.getElementById('totalRequests');
        if (totalRequestsEl && overviewData.today_requests !== undefined) {
            totalRequestsEl.textContent = parseInt(overviewData.today_requests).toLocaleString();
            console.log('✅ Total requests atualizado:', overviewData.today_requests);
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
        }
        
        // Atualizar mudanças percentuais se disponíveis
        this.updateMetricChanges(overviewData);
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
        
        // Carregar dados específicos da secção
        if (section === 'users') {
            this.loadUsersData();
        }
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
            const response = await fetch('/api/auth/logout', {
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
    
    // Método para atualizar dados em tempo real
    async refreshData() {
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
    
    // Atualizar dados a cada 30 segundos
    setInterval(() => {
        if (window.dashboard && !window.dashboard.isLoading) {
            window.dashboard.refreshData();
        }
    }, 30000);
});

// ===== USERS MANAGEMENT METHODS =====

// Adicionar métodos à classe Dashboard
Dashboard.prototype.loadUsersData = async function() {
        if (this.currentSection !== 'users') return;

        console.log('👥 Carregando dados de utilizadores...');
        
        try {
            const search = document.getElementById('usersSearch')?.value || '';
            const filter = document.getElementById('usersFilter')?.value || 'all';
            
            const params = new URLSearchParams({
                page: this.currentUsersPage,
                limit: this.usersPerPage,
                search: search,
                filter: filter
            });

            // Carregar utilizadores e estatísticas em paralelo
            const [usersResponse, statsResponse] = await Promise.all([
                this.fetchData(`/api/users?${params}`),
                this.fetchData('/api/users/stats')
            ]);

            if (usersResponse && statsResponse) {
                this.usersData = usersResponse.data;
                this.updateUsersStats(statsResponse.data);
                this.updateUsersTable(this.usersData.users);
                this.updateUsersPagination(this.usersData.pagination);
            }

        } catch (error) {
            console.error('❌ Erro ao carregar utilizadores:', error);
            this.showError('Erro ao carregar dados de utilizadores');
        }
    }

Dashboard.prototype.updateUsersStats = function(stats) {
        const elements = {
            totalUsersCount: stats.totalUsers,
            activeUsersCount: stats.activeUsers,
            totalCreditsCount: stats.totalCredits,
            newUsersToday: stats.newToday
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });
    }

Dashboard.prototype.updateUsersTable = function(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div style="padding: 40px; color: var(--text-secondary);">
                            <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px; display: block;">person_off</span>
                            Nenhum utilizador encontrado
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.email.charAt(0).toUpperCase()}
                        </div>
                        <div class="user-details">
                            <h4>${user.email}</h4>
                            <p>ID: ${user.id}</p>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <div class="credits-info">
                        <span class="material-symbols-outlined credits-icon">account_balance_wallet</span>
                        <span class="credits-value">${user.credits}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${user.status}">
                        ${this.getStatusText(user.status)}
                    </span>
                </td>
                <td>${this.formatDate(user.lastActivity)}</td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action primary" onclick="dashboard.viewUserDetails('${user.id}')">
                            <span class="material-symbols-outlined">visibility</span>
                            Ver
                        </button>
                        <button class="btn-action" onclick="dashboard.editUserCredits('${user.id}', ${user.credits})">
                            <span class="material-symbols-outlined">edit</span>
                            Editar
                        </button>
                        <button class="btn-action danger" onclick="dashboard.deactivateUser('${user.id}')">
                            <span class="material-symbols-outlined">block</span>
                            Desativar
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

Dashboard.prototype.updateUsersPagination = function(pagination) {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const info = document.getElementById('paginationInfo');

        if (prevBtn) {
            prevBtn.disabled = !pagination.hasPrev;
        }
        if (nextBtn) {
            nextBtn.disabled = !pagination.hasNext;
        }
        if (info) {
            info.textContent = `Página ${pagination.page} de ${pagination.totalPages}`;
        }
    }

Dashboard.prototype.getStatusText = function(status) {
        const statusMap = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'premium': 'Premium'
        };
        return statusMap[status] || 'Desconhecido';
    }

Dashboard.prototype.formatDate = function(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

Dashboard.prototype.viewUserDetails = async function(userId) {
        console.log('👤 Visualizando detalhes do utilizador:', userId);
        
        try {
            const response = await this.fetchData(`/api/users/${userId}`);
            if (response) {
                this.showUserDetailsModal(response.data);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar detalhes:', error);
            this.showError('Erro ao carregar detalhes do utilizador');
        }
    }

Dashboard.prototype.showUserDetailsModal = function(userData) {
        // Criar modal dinamicamente
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detalhes do Utilizador</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-detail-section">
                        <h4>Informações Básicas</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>ID:</label>
                                <span>${userData.user.id}</span>
                            </div>
                            <div class="detail-item">
                                <label>Email:</label>
                                <span>${userData.user.email}</span>
                            </div>
                            <div class="detail-item">
                                <label>Créditos:</label>
                                <span>${userData.user.credits}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-badge status-${userData.user.status}">
                                    ${this.getStatusText(userData.user.status)}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>Registado:</label>
                                <span>${this.formatDate(userData.user.createdAt)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Última Atividade:</label>
                                <span>${this.formatDate(userData.user.lastActivity)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-detail-section">
                        <h4>Estatísticas</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Total de Resumos:</label>
                                <span>${userData.user.totalSummaries}</span>
                            </div>
                            <div class="detail-item">
                                <label>Total de Pedidos:</label>
                                <span>${userData.user.totalRequests}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

Dashboard.prototype.editUserCredits = async function(userId, currentCredits) {
        const newCredits = prompt(`Editar créditos para utilizador ${userId}:\n\nCréditos atuais: ${currentCredits}\n\nNovos créditos:`, currentCredits);
        
        if (newCredits === null) return; // Cancelado
        
        const credits = parseInt(newCredits);
        if (isNaN(credits) || credits < 0) {
            alert('Por favor, insira um número válido de créditos (0 ou superior)');
            return;
        }

        const reason = prompt('Motivo da alteração (opcional):') || 'Alteração manual pelo administrador';

        try {
            const response = await fetch(`/api/users/${userId}/credits`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ credits, reason })
            });

            if (response.ok) {
                this.showSuccessMessage(`Créditos atualizados para ${credits}`);
                this.loadUsersData(); // Recarregar dados
            } else {
                throw new Error('Erro ao atualizar créditos');
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar créditos:', error);
            this.showError('Erro ao atualizar créditos do utilizador');
        }
    }

Dashboard.prototype.deactivateUser = async function(userId) {
        if (!confirm(`Tem certeza que deseja desativar o utilizador ${userId}?\n\nEsta ação irá zerar os créditos do utilizador.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (response.ok) {
                this.showSuccessMessage('Utilizador desativado com sucesso');
                this.loadUsersData(); // Recarregar dados
            } else {
                throw new Error('Erro ao desativar utilizador');
            }
        } catch (error) {
            console.error('❌ Erro ao desativar utilizador:', error);
            this.showError('Erro ao desativar utilizador');
        }
    }

Dashboard.prototype.exportUsers = async function() {
        try {
            const response = await this.fetchData('/api/users?limit=1000');
            if (response) {
                this.downloadCSV(response.data.users, 'utilizadores.csv');
                this.showSuccessMessage('Dados exportados com sucesso');
            }
        } catch (error) {
            console.error('❌ Erro ao exportar utilizadores:', error);
            this.showError('Erro ao exportar dados');
        }
    }

Dashboard.prototype.downloadCSV = function(data, filename) {
        const headers = ['ID', 'Email', 'Créditos', 'Status', 'Registado', 'Última Atividade'];
        const csvContent = [
            headers.join(','),
            ...data.map(user => [
                user.id,
                user.email,
                user.credits,
                this.getStatusText(user.status),
                this.formatDate(user.createdAt),
                this.formatDate(user.lastActivity)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
});

// Exportar para uso global
window.Dashboard = Dashboard;