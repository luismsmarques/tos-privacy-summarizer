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
        
        // Total de resumos (usar successful_summaries)
        const totalSummariesEl = document.getElementById('totalSummaries');
        if (totalSummariesEl && overviewData.successful_summaries !== undefined) {
            totalSummariesEl.textContent = parseInt(overviewData.successful_summaries).toLocaleString();
            console.log('✅ Total summaries atualizado:', overviewData.successful_summaries);
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
        // Implementar modal de detalhes
    }

    // Edit user credits
    editUserCredits(userId) {
        console.log('Editar créditos do utilizador:', userId);
        // Implementar modal de edição
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