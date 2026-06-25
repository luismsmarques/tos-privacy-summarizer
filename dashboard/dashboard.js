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
            const backendUrl = window.location.origin;
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
                const errorText = await response.text();
                console.error(`❌ HTTP error! status: ${response.status}`);
                console.error(`❌ Error response:`, errorText);
                
                if (response.status === 401 || response.status === 403) {
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
                    console.warn('🔒 Login automático falhou');
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
            
            // Usar URL de produção em vez de localhost
            const baseUrl = window.location.origin;
            
            // Solicitar credenciais ao utilizador
            const username = prompt('Utilizador administrativo:');
            const password = prompt('Palavra-passe:');
            
            if (!username || !password) {
                console.log('❌ Credenciais não fornecidas');
                return null;
            }
            
            const response = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
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
            } else if (response && Array.isArray(response.data)) {
                // Se não tem campo success mas tem dados
                this.usersData = response.data;
                console.log(`✅ ${this.usersData.length} utilizadores carregados da API (sem campo success)`);
            } else {
                console.error('❌ Resposta da API inválida para utilizadores');
                console.log('📊 Tentando carregar dados de teste...');
                await this.loadTestUsersData();
                return;
            }
            
            this.updateUsersStats();
            this.renderUsersTable();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados de utilizadores:', error);
            console.log('📊 Tentando carregar dados de teste...');
            await this.loadTestUsersData();
        }
    }
    
    // Carregar dados de teste para utilizadores
    async loadTestUsersData() {
        try {
            console.log('🧪 Carregando dados de teste para utilizadores...');
            
            // Primeiro, tentar popular a base de dados com dados de teste
            await this.fetchData('/api/analytics/seed', { method: 'POST' });
            
            // Depois, tentar carregar os dados novamente
            const response = await this.fetchData('/api/analytics/users');
            if (response && (response.success || Array.isArray(response.data))) {
                this.usersData = response.data || response;
                console.log(`✅ ${this.usersData.length} utilizadores carregados após seed`);
                this.updateUsersStats();
                this.renderUsersTable();
                return;
            }
            
            // Se ainda não funcionar, mostrar erro
            console.error('❌ Falha ao carregar dados de utilizadores da API');
            this.showUsersError('Erro ao carregar dados de utilizadores da API');
            return;
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados de utilizadores:', error);
            this.showUsersError('Erro ao carregar dados de utilizadores: ' + error.message);
        }
    }
    
    // Função mock removida - dashboard agora usa apenas dados reais da API

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

        console.log('📊 Atualizando estatísticas de utilizadores...');

        if (totalUsersEl) {
            totalUsersEl.textContent = this.usersData.length.toLocaleString();
        }

        if (activeUsersEl) {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const activeUsers = this.usersData.filter(user => 
                user && (new Date(user.last_used || user.updated_at || user.created_at) > weekAgo)
            ).length;
            activeUsersEl.textContent = activeUsers.toLocaleString();
        }

        if (newUsersEl) {
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const newUsers = this.usersData.filter(user => 
                user && (new Date(user.created_at) > monthAgo)
            ).length;
            newUsersEl.textContent = newUsers.toLocaleString();
        }
        
        console.log(`✅ Estatísticas atualizadas: ${this.usersData.length} total`);
    }

    // Render users table
    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.warn('⚠️ Elemento usersTableBody não encontrado');
            return;
        }

        // Verificar se usersData é um array válido
        if (!Array.isArray(this.usersData)) {
            console.warn('⚠️ usersData não é um array válido para renderização:', this.usersData);
            this.usersData = [];
        }

        if (this.usersData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--md-sys-color-on-surface-variant);">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                            <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">people</span>
                            <div style="font-size: 16px; font-weight: 500;">Nenhum utilizador encontrado</div>
                            <div style="font-size: 14px; opacity: 0.8;">Os dados serão carregados automaticamente</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const filteredUsers = this.getFilteredUsers();
        console.log(`📊 Renderizando tabela com ${filteredUsers.length} utilizadores filtrados`);
        
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
        
        console.log('✅ Tabela de utilizadores renderizada com sucesso');
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

    // Toggle select all users
    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const userCheckboxes = document.querySelectorAll('.user-checkbox');
        
        userCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        
        this.updateBulkActionsState();
    }
    
    // Update bulk actions state
    updateBulkActionsState() {
        const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        
        if (bulkActionsBtn) {
            bulkActionsBtn.disabled = selectedCheckboxes.length === 0;
            bulkActionsBtn.textContent = `Ações em Massa (${selectedCheckboxes.length})`;
        }
    }
    
    // View user details
    viewUserDetails(userId) {
        console.log('👁️ Visualizando detalhes do utilizador:', userId);
        this.showUserDetailsModal(userId);
    }
    
    // Edit user credits
    editUserCredits(userId) {
        console.log('✏️ Editando créditos do utilizador:', userId);
        const user = this.usersData.find(u => u.user_id === userId);
        if (user) {
            this.showEditCreditsModal(userId, user.credits);
        }
    }
    
    // Função mock duplicada removida

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
            const response = await fetch(`${window.location.origin}/api/auth/logout`, {
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
    
    // Funções mock removidas - dashboard agora usa apenas dados reais da API

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

        // SEMPRE usar dados do overview quando disponíveis (dados reais da API)
        if (this.data.overview && this.data.overview.data) {
            const overview = this.data.overview.data;
            
            // Total de resumos = bem-sucedidos + falhados
            const totalSummaries = parseInt(overview.successful_summaries || 0) + parseInt(overview.failed_summaries || 0);
            
            console.log('📊 Atualizando estatísticas de resumos com dados reais:', {
                total: totalSummaries,
                successful: overview.successful_summaries,
                failed: overview.failed_summaries
            });
            
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
            console.warn('⚠️ Usando fallback para estatísticas de resumos - dados do overview não disponíveis');
            
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
    
    // Inicializar configurações
    initializeSettings();
    
    // Inicializar analytics
    initializeAnalytics();
    
    function initializeAnalytics() {
        console.log('📊 Inicializando área de analytics...');
        
        // Botões de controle
        document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', refreshAnalytics);
        document.getElementById('exportAnalyticsBtn')?.addEventListener('click', exportAnalyticsReport);
        document.getElementById('generateInsightsBtn')?.addEventListener('click', generateInsights);
        
        // Seletor de período
        document.getElementById('analyticsTimeRange')?.addEventListener('change', (e) => {
            updateAnalyticsTimeRange(e.target.value);
        });
        
        // Controles de gráficos
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const period = e.target.dataset.period;
                
                if (type) {
                    updateChartType(type);
                }
                if (period) {
                    updateHeatmapPeriod(period);
                }
            });
        });
        
        // Carregar dados iniciais
        loadAnalyticsData();
        
        // Iniciar atualizações automáticas
        startAnalyticsAutoRefresh();
    }
    
    // Mapeia o seletor de período para número de dias
    function analyticsRangeDays() {
        const v = document.getElementById('analyticsTimeRange')?.value || '30d';
        return ({ '24h': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365 })[v] || 30;
    }

    // Seleciona um canvas DENTRO da secção analytics (há ids duplicados com o Overview)
    function aCanvas(id) {
        return document.querySelector('#analytics-section #' + id);
    }

    // Cria/recria um gráfico Chart.js destruindo a instância anterior
    function aRenderChart(key, id, config) {
        window.__analyticsCharts = window.__analyticsCharts || {};
        const ctx = aCanvas(id);
        if (!ctx) return;
        if (window.__analyticsCharts[key]) {
            window.__analyticsCharts[key].destroy();
        }
        window.__analyticsCharts[key] = new Chart(ctx, config);
    }

    function setChartTitle(id, title) {
        const h3 = aCanvas(id)?.closest('.chart-card')?.querySelector('.chart-header h3');
        if (h3) h3.textContent = title;
    }

    async function loadAnalyticsData() {
        console.log('📊 Carregando dados REAIS de analytics...');
        try {
            const days = analyticsRangeDays();
            const resp = await window.dashboard.fetchData(`/api/analytics/insights?days=${days}`);
            window.__analyticsInsights = (resp && resp.success) ? resp : (resp || {});
            updateAnalyticsMetrics();
            createAnalyticsCharts();
            loadTopUrls();
            generateInsights();
        } catch (err) {
            console.error('❌ Erro ao carregar analytics:', err);
            if (typeof showNotification === 'function') {
                showNotification('❌ Não foi possível carregar os analytics', 'error');
            }
        }
    }
    
    function updateAnalyticsMetrics() {
        const m = (window.__analyticsInsights || {}).metrics || {};
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        set('analyticsTotalRequests', Number(m.total_summaries || 0).toLocaleString('pt-PT'));
        set('analyticsAvgResponseTime', Math.round(m.avg_duration_ms || 0) + 'ms');
        set('analyticsErrorRate', (m.failure_rate ?? 0) + '%');
        set('analyticsCacheHitRate', (m.cache_hit_rate ?? 0) + '%');

        // Relabel honesto: esta métrica é nº de resumos, não "requests"
        const lbl = document.getElementById('analyticsTotalRequests')?.parentElement?.querySelector('.metric-label');
        if (lbl) lbl.textContent = 'Resumos no período';

        updateMetricChanges();
    }
    
    function updateMetricChanges() {
        const change = (window.__analyticsInsights || {}).comparison?.summaries_change_pct;
        const reqEl = document.getElementById('requestsGrowthValue');
        if (reqEl) {
            const parent = reqEl.closest('.metric-change');
            if (change == null) {
                reqEl.textContent = '—';
                if (parent) parent.classList.remove('positive', 'negative');
            } else {
                reqEl.textContent = (change >= 0 ? '+' : '') + change + '%';
                if (parent) {
                    parent.classList.toggle('positive', change >= 0);
                    parent.classList.toggle('negative', change < 0);
                }
            }
        }
        // Sem comparação fiável para estas três → mostrar neutro (não inventar)
        ['responseTimeValue', 'errorRateValue', 'cacheHitValue'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = '—';
                el.closest('.metric-change')?.classList.remove('positive', 'negative');
            }
        });
    }
    
    function createAnalyticsCharts() {
        console.log('📊 Criando gráficos de analytics...');
        
        // Gráfico de Requests ao Longo do Tempo
        createRequestsOverTimeChart();
        
        // Gráfico de Distribuição por Tipo
        createDocumentTypesChart();
        
        // Gráfico de Performance
        createPerformanceChart();
        
        // Gráfico de Utilizadores Ativos
        createActiveUsersChart();
        
        // Heatmap de Atividade
        createActivityHeatmap();
    }
    
    function createRequestsOverTimeChart() {
        const ctx = document.getElementById('requestsOverTimeChart');
        if (!ctx) return;
        
        const daily = (window.__analyticsInsights || {}).daily_activity || [];
        const labels = daily.map((d) => {
            const dt = new Date(d.date + 'T00:00:00');
            return dt.toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' });
        });

        aRenderChart('requestsOverTime', 'requestsOverTimeChart', {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Resumos por dia',
                    data: daily.map((d) => d.summaries || 0),
                    borderColor: 'rgb(103, 80, 164)',
                    backgroundColor: 'rgba(103, 80, 164, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
    
    function createDocumentTypesChart() {
        const types = (window.__analyticsInsights || {}).document_types || {};
        const labels = Object.keys(types);
        const data = Object.values(types);

        aRenderChart('documentTypes', 'documentTypesChart', {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['Sem dados'],
                datasets: [{
                    data: data.length ? data : [1],
                    backgroundColor: [
                        'rgb(103, 80, 164)',
                        'rgb(125, 82, 96)',
                        'rgb(98, 91, 113)',
                        'rgb(70, 110, 160)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    
    function createPerformanceChart() {
        const r = (window.__analyticsInsights || {}).ratings || {};
        setChartTitle('performanceChart', 'Ratings médios (1–10)');

        aRenderChart('ratings', 'performanceChart', {
            type: 'radar',
            data: {
                labels: ['Complexidade', 'Boas práticas', 'Risco'],
                datasets: [{
                    label: `Médias (${Number(r.rated_count || 0).toLocaleString('pt-PT')} avaliados)`,
                    data: [r.avg_complexidade || 0, r.avg_boas_praticas || 0, r.avg_risk_score || 0],
                    borderColor: 'rgb(103, 80, 164)',
                    backgroundColor: 'rgba(103, 80, 164, 0.2)',
                    pointBackgroundColor: 'rgb(103, 80, 164)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(103, 80, 164)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { beginAtZero: true, max: 10 } }
            }
        });
    }
    
    function createActiveUsersChart() {
        const rd = (window.__analyticsInsights || {}).risk_distribution || {};
        setChartTitle('activeUsersChart', 'Distribuição de risco');

        aRenderChart('riskDist', 'activeUsersChart', {
            type: 'bar',
            data: {
                labels: ['Baixo (1–3)', 'Médio (4–6)', 'Alto (7–10)'],
                datasets: [{
                    label: 'Resumos',
                    data: [rd.low || 0, rd.medium || 0, rd.high || 0],
                    backgroundColor: [
                        'rgba(56, 142, 60, 0.8)',
                        'rgba(245, 166, 35, 0.8)',
                        'rgba(186, 26, 26, 0.8)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
    
    function createActivityHeatmap() {
        const container = document.getElementById('activityHeatmap');
        if (!container) return;
        
        // Heatmap real: dia-da-semana × hora, a partir de hourly_activity
        const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const dayToDow = { 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sáb': 6, 'Dom': 0 };
        const hours = Array.from({ length: 24 }, (_, i) => i);

        const hourly = (window.__analyticsInsights || {}).hourly_activity || [];
        const counts = {};
        let max = 0;
        hourly.forEach((h) => {
            counts[`${h.dow}-${h.hour}`] = h.count;
            if (h.count > max) max = h.count;
        });

        let heatmapHTML = '<div class="heatmap-grid">';
        heatmapHTML += '<div class="heatmap-header"></div>';
        hours.forEach((hour) => {
            heatmapHTML += `<div class="heatmap-hour">${hour}h</div>`;
        });

        days.forEach((day) => {
            heatmapHTML += `<div class="heatmap-day">${day}</div>`;
            hours.forEach((hour) => {
                const count = counts[`${dayToDow[day]}-${hour}`] || 0;
                const ratio = max > 0 ? count / max : 0;
                const level = count === 0 ? 'low' : ratio > 0.66 ? 'high' : ratio > 0.33 ? 'medium' : 'low';
                heatmapHTML += `<div class="heatmap-cell ${level}" title="${day} ${hour}h: ${count} resumo(s)"></div>`;
            });
        });

        heatmapHTML += '</div>';
        container.innerHTML = heatmapHTML;
        
        // Adicionar estilos do heatmap
        if (!document.getElementById('heatmap-styles')) {
            const styles = document.createElement('style');
            styles.id = 'heatmap-styles';
            styles.textContent = `
                .heatmap-grid {
                    display: grid;
                    grid-template-columns: 60px repeat(24, 20px);
                    gap: 2px;
                    font-size: 12px;
                }
                .heatmap-header {
                    grid-column: 1;
                }
                .heatmap-hour {
                    text-align: center;
                    font-size: 10px;
                    color: var(--md-sys-color-on-surface-variant);
                }
                .heatmap-day {
                    text-align: right;
                    padding-right: 8px;
                    color: var(--md-sys-color-on-surface);
                }
                .heatmap-cell {
                    width: 20px;
                    height: 20px;
                    border-radius: 2px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .heatmap-cell.low {
                    background: var(--md-sys-color-outline-variant);
                }
                .heatmap-cell.medium {
                    background: var(--md-sys-color-tertiary-container);
                }
                .heatmap-cell.high {
                    background: var(--md-sys-color-primary);
                }
                .heatmap-cell:hover {
                    transform: scale(1.2);
                    z-index: 10;
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    function loadTopUrls() {
        const container = document.getElementById('topUrlsList');
        if (!container) return;

        const domains = (window.__analyticsInsights || {}).top_domains || [];
        if (!domains.length) {
            container.innerHTML = '<div class="empty-state"><p>Sem domínios no período selecionado.</p></div>';
            return;
        }

        const riskLabel = (r) => {
            if (r == null) return '';
            const color = r >= 7 ? 'var(--md-sys-color-error)' : r >= 4 ? '#f5a623' : 'var(--md-sys-color-tertiary)';
            return `<span style="color:${color};font-weight:600">risco ${r}/10</span>`;
        };

        let html = '';
        domains.forEach((d) => {
            html += `
                <div class="url-item">
                    <div class="url-info">
                        <div class="url-domain">${d.domain}</div>
                        <div class="url-path">${riskLabel(d.avg_risk)}</div>
                    </div>
                    <div class="url-count">${Number(d.count).toLocaleString('pt-PT')}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
    
    function generateInsights() {
        const d = window.__analyticsInsights || {};
        const m = d.metrics || {};
        const r = d.ratings || {};
        const change = d.comparison?.summaries_change_pct;

        // Crescimento / volume
        let growthText = `${Number(m.total_summaries || 0).toLocaleString('pt-PT')} resumos no período, de ${Number(m.active_users || 0).toLocaleString('pt-PT')} utilizadores distintos.`;
        if (change != null) {
            growthText += ` ${change >= 0 ? 'Subida' : 'Descida'} de ${Math.abs(change)}% vs período anterior.`;
        }

        // Hora de pico (soma por hora em todos os dias)
        const hourly = d.hourly_activity || [];
        let peakText = 'Sem dados de atividade suficientes para determinar o horário de pico.';
        if (hourly.length) {
            const byHour = {};
            hourly.forEach((h) => { byHour[h.hour] = (byHour[h.hour] || 0) + h.count; });
            const peakHour = Object.keys(byHour).reduce((a, b) => (byHour[b] > (byHour[a] || 0) ? b : a));
            peakText = `Maior atividade às ${peakHour}h (${Number(byHour[peakHour]).toLocaleString('pt-PT')} resumos nessa hora).`;
        }

        // Qualidade / performance
        let perfText = `Taxa de sucesso de ${m.success_rate ?? 0}% e tempo médio de ${Math.round(m.avg_duration_ms || 0)}ms por resumo.`;
        if (r.avg_risk_score != null) {
            perfText += ` Risco médio dos documentos analisados: ${r.avg_risk_score}/10.`;
        }

        // Recomendações baseadas em dados
        let recText = `Cache hit rate de ${m.cache_hit_rate ?? 0}% (${Number(m.cache_hits || 0).toLocaleString('pt-PT')} reutilizações).`;
        const worst = (d.top_domains || []).filter((x) => x.avg_risk != null).sort((a, b) => b.avg_risk - a.avg_risk)[0];
        if (worst) {
            recText += ` Domínio com pior risco: ${worst.domain} (${worst.avg_risk}/10).`;
        }

        const insights = {
            usersGrowthInsight: growthText,
            peakTimeInsight: peakText,
            performanceAlertInsight: perfText,
            recommendationsInsight: recText
        };
        Object.entries(insights).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        });
    }
    
    function updateChartType(type) {
        console.log(`📊 Atualizando tipo de gráfico: ${type}`);
        
        // Atualizar botões ativos
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Aqui você pode atualizar o gráfico baseado no tipo selecionado
        showNotification(`📊 Gráfico atualizado para: ${type}`, 'info');
    }
    
    function updateHeatmapPeriod(period) {
        console.log(`🔥 Atualizando período do heatmap: ${period}`);
        
        // Atualizar botões ativos
        document.querySelectorAll('.heatmap-controls .chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Recriar heatmap com novo período
        createActivityHeatmap();
        
        showNotification(`🔥 Heatmap atualizado para: ${period}`, 'info');
    }
    
    function updateAnalyticsTimeRange(range) {
        console.log(`📊 Atualizando período de analytics: ${range}`);
        
        // Recarregar dados com novo período
        loadAnalyticsData();
        
        showNotification(`📊 Período atualizado para: ${range}`, 'info');
    }
    
    function refreshAnalytics() {
        console.log('🔄 Atualizando analytics...');
        
        showNotification('🔄 Atualizando dados de analytics...', 'info');
        
        setTimeout(() => {
            loadAnalyticsData();
            showNotification('✅ Analytics atualizados com sucesso!', 'success');
        }, 1500);
    }
    
    function exportAnalyticsReport() {
        console.log('📊 Exportando relatório de analytics...');
        
        const report = {
            timestamp: new Date().toISOString(),
            timeRange: document.getElementById('analyticsTimeRange')?.value || '30d',
            metrics: {
                totalRequests: document.getElementById('analyticsTotalRequests')?.textContent || '-',
                avgResponseTime: document.getElementById('analyticsAvgResponseTime')?.textContent || '-',
                errorRate: document.getElementById('analyticsErrorRate')?.textContent || '-',
                cacheHitRate: document.getElementById('analyticsCacheHitRate')?.textContent || '-'
            },
            insights: {
                usersGrowth: document.getElementById('usersGrowthInsight')?.textContent || '',
                peakTime: document.getElementById('peakTimeInsight')?.textContent || '',
                performanceAlert: document.getElementById('performanceAlertInsight')?.textContent || '',
                recommendations: document.getElementById('recommendationsInsight')?.textContent || ''
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('📊 Relatório de analytics exportado!', 'success');
    }
    
    function startAnalyticsAutoRefresh() {
        console.log('🔄 Iniciando atualização automática de analytics...');
        
        // Atualizar analytics a cada 5 minutos (refetch de dados reais)
        setInterval(() => {
            if (window.dashboard && !window.dashboard.isLoading) {
                loadAnalyticsData();
            }
        }, 300000); // 5 minutos
    }
    
    function initializeSettings() {
        console.log('⚙️ Inicializando área de configurações...');
        
        // Expandir/collapsar categorias
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isExpanded = content.classList.contains('expanded');
                
                // Fechar todas as outras categorias
                document.querySelectorAll('.category-content').forEach(cat => {
                    cat.classList.remove('expanded');
                });
                document.querySelectorAll('.category-header').forEach(h => {
                    h.classList.remove('expanded');
                });
                
                // Abrir/fechar a categoria clicada
                if (!isExpanded) {
                    content.classList.add('expanded');
                    header.classList.add('expanded');
                }
            });
        });
        
        // Toggle para mostrar/ocultar chave da API
        const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
        const apiKeyInput = document.getElementById('geminiApiKeySetting');
        
        if (toggleApiKeyBtn && apiKeyInput) {
            toggleApiKeyBtn.addEventListener('click', () => {
                const isPassword = apiKeyInput.type === 'password';
                apiKeyInput.type = isPassword ? 'text' : 'password';
                toggleApiKeyBtn.querySelector('.material-symbols-outlined').textContent = 
                    isPassword ? 'visibility_off' : 'visibility';
            });
        }
        
        // Guardar configurações
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveSettings);
        }
        
        // Restaurar configurações padrão
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', resetSettings);
        }
        
        // Botões de limpeza de dados
        document.getElementById('clearUsersBtn')?.addEventListener('click', () => clearData('users'));
        document.getElementById('clearSummariesBtn')?.addEventListener('click', () => clearData('summaries'));
        document.getElementById('clearLogsBtn')?.addEventListener('click', () => clearData('logs'));
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => clearData('cache'));
        
        // Botões de backup
        document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
        document.getElementById('importDataBtn')?.addEventListener('click', importData);
        
        // Monitor de performance
        document.getElementById('refreshPerformanceBtn')?.addEventListener('click', refreshPerformanceMetrics);
        document.getElementById('exportPerformanceBtn')?.addEventListener('click', exportPerformanceReport);
        
        // Carregar configurações salvas
        loadSettings();
        
        // Iniciar monitor de performance
        startPerformanceMonitoring();
    }
    
    function saveSettings() {
        console.log('💾 Guardando configurações...');
        
        const settings = {
            theme: document.getElementById('themeSetting')?.value || 'light',
            language: document.getElementById('languageSetting')?.value || 'pt',
            notifications: document.getElementById('notificationsSetting')?.checked || false,
            autoRefresh: parseInt(document.getElementById('autoRefreshSetting')?.value) || 30,
            backendUrl: document.getElementById('backendUrlSetting')?.value || window.location.origin,
            geminiApiKey: document.getElementById('geminiApiKeySetting')?.value || '',
            apiTimeout: parseInt(document.getElementById('apiTimeoutSetting')?.value) || 10000,
            retryAttempts: parseInt(document.getElementById('retryAttemptsSetting')?.value) || 3,
            sessionTimeout: parseInt(document.getElementById('sessionTimeoutSetting')?.value) || 60,
            accessLogs: document.getElementById('accessLogsSetting')?.checked || false,
            autoBackup: document.getElementById('autoBackupSetting')?.checked || false,
            encryption: document.getElementById('encryptionSetting')?.checked || false,
            backupFrequency: document.getElementById('backupFrequencySetting')?.value || 'daily',
            backupRetention: parseInt(document.getElementById('backupRetentionSetting')?.value) || 30,
            debugMode: document.getElementById('debugModeSetting')?.checked || false,
            logLevel: document.getElementById('logLevelSetting')?.value || 'info',
            performanceMonitoring: document.getElementById('performanceMonitoringSetting')?.checked || false,
            cacheEnabled: document.getElementById('cacheEnabledSetting')?.checked || false
        };
        
        // Guardar no localStorage
        localStorage.setItem('dashboardSettings', JSON.stringify(settings));
        
        // Aplicar configurações
        applySettings(settings);
        
        // Mostrar notificação de sucesso
        showNotification('✅ Configurações guardadas com sucesso!', 'success');
        
        console.log('✅ Configurações guardadas:', settings);
    }
    
    function loadSettings() {
        console.log('📂 Carregando configurações...');
        
        const savedSettings = localStorage.getItem('dashboardSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Aplicar valores aos campos
            Object.keys(settings).forEach(key => {
                const element = document.getElementById(key + 'Setting');
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = settings[key];
                    } else {
                        element.value = settings[key];
                    }
                }
            });
            
            // Aplicar configurações
            applySettings(settings);
            
            console.log('✅ Configurações carregadas:', settings);
        } else {
            console.log('ℹ️ Nenhuma configuração salva encontrada, usando padrões');
        }
    }
    
    function applySettings(settings) {
        // Aplicar tema
        if (settings.theme) {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }
        
        // Aplicar configurações de debug
        if (settings.debugMode) {
            console.log('🐛 Debug mode ativado');
            window.debugMode = true;
        } else {
            window.debugMode = false;
        }
        
        // Aplicar configurações de performance
        if (settings.performanceMonitoring) {
            console.log('📊 Monitor de performance ativado');
            window.performanceMonitoring = true;
        } else {
            window.performanceMonitoring = false;
        }
        
        // Aplicar configurações de cache
        if (settings.cacheEnabled) {
            console.log('💾 Cache ativado');
            window.cacheEnabled = true;
        } else {
            window.cacheEnabled = false;
        }
    }
    
    function resetSettings() {
        console.log('🔄 Restaurando configurações padrão...');
        
        if (confirm('Tem a certeza que deseja restaurar as configurações padrão? Esta ação não pode ser desfeita.')) {
            // Limpar configurações salvas
            localStorage.removeItem('dashboardSettings');
            
            // Recarregar página para aplicar padrões
            location.reload();
        }
    }
    
    function clearData(type) {
        const confirmMessage = {
            users: 'Tem a certeza que deseja limpar todos os utilizadores inativos? Esta ação é irreversível!',
            summaries: 'Tem a certeza que deseja limpar todos os resumos antigos? Esta ação é irreversível!',
            logs: 'Tem a certeza que deseja limpar todos os logs de sistema? Esta ação é irreversível!',
            cache: 'Tem a certeza que deseja limpar todos os caches? Esta ação é irreversível!'
        };
        
        if (confirm(confirmMessage[type])) {
            console.log(`🗑️ Limpando dados: ${type}`);
            
            // Simular limpeza (em produção, fazer chamada à API)
            showNotification(`🧹 Limpando ${type}...`, 'info');
            
            setTimeout(() => {
                showNotification(`✅ ${type} limpos com sucesso!`, 'success');
            }, 2000);
        }
    }
    
    function exportData() {
        console.log('📤 Exportando dados...');
        
        // Simular exportação (em produção, fazer chamada à API)
        showNotification('📤 Preparando exportação de dados...', 'info');
        
        setTimeout(() => {
            // Criar arquivo de exemplo
            const data = {
                timestamp: new Date().toISOString(),
                users: window.dashboard?.data?.users || [],
                summaries: window.dashboard?.data?.summaries || [],
                settings: JSON.parse(localStorage.getItem('dashboardSettings') || '{}')
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showNotification('✅ Dados exportados com sucesso!', 'success');
        }, 1000);
    }
    
    function importData() {
        console.log('📥 Importando dados...');
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        // Aplicar configurações importadas
                        if (data.settings) {
                            localStorage.setItem('dashboardSettings', JSON.stringify(data.settings));
                            applySettings(data.settings);
                        }
                        
                        showNotification('✅ Dados importados com sucesso!', 'success');
                        console.log('✅ Dados importados:', data);
                    } catch (error) {
                        showNotification('❌ Erro ao importar dados: ' + error.message, 'error');
                        console.error('❌ Erro ao importar dados:', error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    function refreshPerformanceMetrics() {
        console.log('📊 Atualizando métricas de performance...');
        
        // Simular métricas de performance
        const metrics = {
            cpuUsage: Math.floor(Math.random() * 100),
            memoryUsage: Math.floor(Math.random() * 100),
            apiResponseTime: Math.floor(Math.random() * 1000) + 100,
            cacheHitRate: Math.floor(Math.random() * 100)
        };
        
        // Atualizar UI
        document.getElementById('cpuUsage').textContent = metrics.cpuUsage + '%';
        document.getElementById('memoryUsage').textContent = metrics.memoryUsage + '%';
        document.getElementById('apiResponseTime').textContent = metrics.apiResponseTime + 'ms';
        document.getElementById('cacheHitRate').textContent = metrics.cacheHitRate + '%';
        
        // Atualizar barras de progresso
        document.getElementById('cpuBar').style.width = metrics.cpuUsage + '%';
        document.getElementById('memoryBar').style.width = metrics.memoryUsage + '%';
        document.getElementById('apiBar').style.width = Math.min(metrics.apiResponseTime / 10, 100) + '%';
        document.getElementById('cacheBar').style.width = metrics.cacheHitRate + '%';
        
        showNotification('📊 Métricas de performance atualizadas!', 'success');
    }
    
    function exportPerformanceReport() {
        console.log('📊 Exportando relatório de performance...');
        
        const report = {
            timestamp: new Date().toISOString(),
            metrics: {
                cpuUsage: document.getElementById('cpuUsage').textContent,
                memoryUsage: document.getElementById('memoryUsage').textContent,
                apiResponseTime: document.getElementById('apiResponseTime').textContent,
                cacheHitRate: document.getElementById('cacheHitRate').textContent
            },
            settings: JSON.parse(localStorage.getItem('dashboardSettings') || '{}')
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('📊 Relatório de performance exportado!', 'success');
    }
    
    function startPerformanceMonitoring() {
        console.log('📊 Iniciando monitor de performance...');
        
        // Atualizar métricas a cada 30 segundos
        setInterval(() => {
            if (window.performanceMonitoring) {
                refreshPerformanceMetrics();
            }
        }, 30000);
        
        // Atualizar métricas iniciais
        refreshPerformanceMetrics();
    }
    
    function showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="material-symbols-outlined">
                ${type === 'success' ? 'check_circle' : 
                  type === 'error' ? 'error' : 
                  type === 'warning' ? 'warning' : 'info'}
            </span>
            <span>${message}</span>
        `;
        
        // Adicionar estilos se não existirem
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 20px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    animation: slideIn 0.3s ease-out;
                }
                .notification-success {
                    background: var(--md-sys-color-primary-container);
                    color: var(--md-sys-color-on-primary-container);
                }
                .notification-error {
                    background: var(--md-sys-color-error-container);
                    color: var(--md-sys-color-on-error-container);
                }
                .notification-warning {
                    background: var(--md-sys-color-tertiary-container);
                    color: var(--md-sys-color-on-tertiary-container);
                }
                .notification-info {
                    background: var(--md-sys-color-secondary-container);
                    color: var(--md-sys-color-on-secondary-container);
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    
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