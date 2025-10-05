// Dashboard JavaScript - ToS Privacy Summarizer
// Version: 2.0.1 - Fixed syntax errors
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
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

        if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ Dados carregados de ${endpoint}:`, data);
            return data;

        } catch (error) {
            console.error(`❌ Erro ao carregar dados de ${endpoint}:`, error);
            throw error;
        }
    }

    getAuthToken() {
        return localStorage.getItem('admin-token');
    }

    isAuthenticated() {
        const token = this.getAuthToken();
        if (!token) return false;
        
        try {
            // Verificar se o token não expirou (simplificado)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }

    updateMetrics() {
        if (!this.data.overview) return;

        const metrics = {
            totalUsers: this.data.overview.totalUsers || 0,
            totalSummaries: this.data.overview.totalSummaries || 0,
            successRate: this.data.overview.successRate || 0
        };

        // Atualizar elementos do DOM
        Object.entries(metrics).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });
    }

    updateCharts() {
        if (!this.data.realtime || !this.data.summaries) return;

        this.createActivityChart(this.data.realtime);
        this.createDocumentTypesChart(this.data.summaries);
    }

    createActivityChart(data) {
        const ctx = document.getElementById('activityChart');
        if (!ctx || !data) return;

        // Destruir gráfico existente
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }

        this.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || ['Sem dados'],
                datasets: [{
                    label: 'Atividade',
                    data: data.values || [0],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
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

    createDocumentTypesChart(data) {
        const ctx = document.getElementById('documentTypesChart');
        if (!ctx || !data) return;
        
        // Destruir gráfico existente
        if (this.charts.documentTypes) {
            this.charts.documentTypes.destroy();
        }

        this.charts.documentTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || ['Sem dados'],
                datasets: [{
                    data: data.values || [0],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initializeCharts() {
        // Inicializar Chart.js se disponível
        if (typeof Chart !== 'undefined') {
            console.log('📊 Chart.js carregado, inicializando gráficos...');
            this.updateCharts();
        } else {
            console.warn('⚠️ Chart.js não carregado');
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
        if (themeIcon) {
            themeIcon.textContent = newTheme === 'light' ? 'dark_mode' : 'light_mode';
        }
        
        // Guardar preferência
        localStorage.setItem('dashboard-theme', newTheme);
    }

    logout() {
        localStorage.removeItem('admin-token');
        window.location.href = '/dashboard';
    }

    showLoading() {
        this.isLoading = true;
        // Implementar loading state se necessário
    }

    hideLoading() {
        this.isLoading = false;
        // Implementar hide loading state se necessário
    }

    showError(message) {
        console.error('❌ Erro:', message);
        // Implementar exibição de erro se necessário
    }

    showSuccessMessage(message) {
        console.log('✅ Sucesso:', message);
        // Implementar exibição de sucesso se necessário
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

    // ===== USERS MANAGEMENT METHODS =====

    async loadUsersData() {
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

    updateUsersStats(stats) {
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

    updateUsersTable(users) {
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

    updateUsersPagination(pagination) {
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

    getStatusText(status) {
        const statusMap = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'premium': 'Premium'
        };
        return statusMap[status] || 'Desconhecido';
    }

    formatDate(dateString) {
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

    async viewUserDetails(userId) {
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

    showUserDetailsModal(userData) {
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

    async editUserCredits(userId, currentCredits) {
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

    async deactivateUser(userId) {
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

    async exportUsers() {
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

    downloadCSV(data, filename) {
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

    // Mock data methods
    getMockOverviewData() {
        return {
            totalUsers: 156,
            totalSummaries: 1247,
            successRate: 94.2
        };
    }

    getMockRealtimeData() {
        return {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            values: [12, 19, 8, 15, 22, 18, 25]
        };
    }

    getMockSummariesData() {
        return {
            labels: ['Termos de Serviço', 'Política de Privacidade', 'Cookies', 'Outros'],
            values: [45, 35, 15, 5]
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
});

// Atualizar dados a cada 30 segundos
setInterval(() => {
    if (window.dashboard && !window.dashboard.isLoading) {
        window.dashboard.refreshData();
    }
}, 30000);

// Exportar para uso global
window.Dashboard = Dashboard;

// Cache busting - Force reload
console.log('Dashboard v2.0.1 loaded at:', new Date().toISOString());
console.log('Deploy timestamp:', Date.now());