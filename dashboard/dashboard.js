// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.apiBase = '/api/analytics';
        this.refreshInterval = 30000; // 30 seconds
        this.realtimeInterval = 5000; // 5 seconds
        this.charts = {};
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        document.getElementById('retryBtn').addEventListener('click', () => {
            this.loadData();
        });
    }

    async loadData() {
        try {
            this.showLoading();
            
            const [overview, summaries, realtime] = await Promise.all([
                this.fetchData('overview'),
                this.fetchData('summaries'),
                this.fetchData('realtime')
            ]);

            this.updateOverviewMetrics(overview.data);
            this.updateRealtimeData(realtime.data);
            this.createCharts(summaries.data);
            
            this.showContent();
            this.updateTimestamp();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError();
        }
    }

    async fetchData(endpoint) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${this.apiBase}/${endpoint}`, { headers });
        if (!response.ok) {
            if (response.status === 401) {
                // Token expirado ou inválido
                this.handleAuthError();
                throw new Error('Sessão expirada');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    getAuthToken() {
        // Tentar obter token do cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'adminToken') {
                return value;
            }
        }
        return null;
    }

    handleAuthError() {
        // Redirecionar para login
        window.location.href = '/dashboard';
    }

    updateOverviewMetrics(data) {
        console.log('Overview data received:', data);
        
        // Mapear dados da API para os campos esperados
        const totalUsers = data.total_users || 0;
        const totalSummaries = data.successful_summaries || 0;
        const avgResponseTime = data.avg_duration ? (data.avg_duration / 1000).toFixed(2) : '--';
        const uptime = 100; // Mock data for now
        
        document.getElementById('totalUsers').textContent = totalUsers.toLocaleString();
        document.getElementById('totalSummaries').textContent = totalSummaries.toLocaleString();
        document.getElementById('avgResponseTime').textContent = `${avgResponseTime}s`;
        document.getElementById('uptime').textContent = `${uptime}%`;
    }

    updateRealtimeData(data) {
        console.log('Realtime data received:', data);
        
        // Mapear dados da API para os campos esperados
        const activeUsers = data.active_users || 0;
        const requestsPerMinute = data.requests_per_minute || 0;
        const avgResponseTime = data.current_response_time || 0;
        const errorRate = data.error_rate || 0;
        
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('requestsPerMinute').textContent = requestsPerMinute;
        document.getElementById('realtimeResponseTime').textContent = `${avgResponseTime}s`;
        document.getElementById('errorRate').textContent = `${errorRate}%`;
    }

    createCharts(data) {
        this.createRequestsChart();
        this.createDocumentTypesChart(data.types);
    }

    createRequestsChart() {
        const ctx = document.getElementById('requestsChart').getContext('2d');
        
        if (this.charts.requests) {
            this.charts.requests.destroy();
        }

        this.charts.requests = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                datasets: [{
                    label: 'Requests/min',
                    data: [12, 8, 25, 35, 28, 18],
                    borderColor: 'rgb(103, 80, 164)',
                    backgroundColor: 'rgba(103, 80, 164, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    createDocumentTypesChart(types) {
        const ctx = document.getElementById('documentTypesChart').getContext('2d');
        
        if (this.charts.documentTypes) {
            this.charts.documentTypes.destroy();
        }

        // Verificar se types existe e não é null/undefined
        if (!types || typeof types !== 'object') {
            console.log('No document types data available, using mock data');
            types = {
                'Termos de Serviço': 0,
                'Política de Privacidade': 0,
                'Outros': 0
            };
        }

        this.charts.documentTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(types),
                datasets: [{
                    data: Object.values(types),
                    backgroundColor: [
                        'rgb(103, 80, 164)',
                        'rgb(156, 39, 176)',
                        'rgb(233, 30, 99)'
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
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadRealtimeData();
        }, this.realtimeInterval);
    }

    async loadRealtimeData() {
        try {
            const response = await this.fetchData('realtime');
            this.updateRealtimeData(response.data);
        } catch (error) {
            console.error('Error loading realtime data:', error);
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('error').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'none';
    }

    showContent() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'flex';
        document.getElementById('dashboardContent').style.display = 'none';
    }

    updateTimestamp() {
        const now = new Date();
        document.getElementById('updateTime').textContent = now.toLocaleTimeString();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});