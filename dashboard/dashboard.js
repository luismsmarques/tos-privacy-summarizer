// Dashboard JavaScript - ToS Privacy Summarizer
class Dashboard {
    constructor() {
        this.currentSection = 'overview';
        this.charts = {};
        this.data = {};
        this.isLoading = false;
        
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

// Exportar para uso global
window.Dashboard = Dashboard;