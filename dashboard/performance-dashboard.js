// Real-time Performance Dashboard for ToS & Privacy Summarizer
// Interactive dashboard with live metrics and charts

class PerformanceDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.charts = {};
        this.metrics = {};
        this.updateInterval = null;
        this.updateIntervalMs = 5000; // 5 seconds
        
        this.setupDashboard();
        this.startRealTimeUpdates();
        
        console.log('📊 Performance Dashboard initialized');
    }

    // Setup dashboard structure
    setupDashboard() {
        this.container.innerHTML = `
            <div class="dashboard-header">
                <h2>
                    <span class="material-icons">dashboard</span>
                    Performance Dashboard
                </h2>
                <div class="dashboard-controls">
                    <button id="refreshDashboard" class="btn-primary">
                        <span class="material-icons">refresh</span>
                        Refresh
                    </button>
                    <button id="exportMetrics" class="btn-secondary">
                        <span class="material-icons">download</span>
                        Export
                    </button>
                </div>
            </div>
            
            <div class="dashboard-grid">
                <!-- Health Status -->
                <div class="dashboard-card health-card">
                    <div class="card-header">
                        <h3>
                            <span class="material-icons">health_and_safety</span>
                            System Health
                        </h3>
                        <div id="healthStatus" class="status-indicator">
                            <span class="status-dot"></span>
                            <span class="status-text">Checking...</span>
                        </div>
                    </div>
                    <div class="card-content">
                        <div id="healthScore" class="health-score">
                            <div class="score-circle">
                                <span class="score-value">--</span>
                                <span class="score-label">Health Score</span>
                            </div>
                        </div>
                        <div id="healthIssues" class="health-issues"></div>
                    </div>
                </div>

                <!-- API Performance -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>
                            <span class="material-icons">api</span>
                            API Performance
                        </h3>
                    </div>
                    <div class="card-content">
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <span class="metric-label">Requests/sec</span>
                                <span id="requestsPerSecond" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Avg Response Time</span>
                                <span id="avgResponseTime" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Error Rate</span>
                                <span id="errorRate" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">P95 Response Time</span>
                                <span id="p95ResponseTime" class="metric-value">--</span>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="responseTimeChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Cache Performance -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>
                            <span class="material-icons">storage</span>
                            Cache Performance
                        </h3>
                    </div>
                    <div class="card-content">
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <span class="metric-label">Hit Rate</span>
                                <span id="cacheHitRate" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">L1 Size</span>
                                <span id="l1CacheSize" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">L2 Size</span>
                                <span id="l2CacheSize" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Warming Success</span>
                                <span id="warmingSuccess" class="metric-value">--</span>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="cacheHitRateChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Database Performance -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>
                            <span class="material-icons">database</span>
                            Database Performance
                        </h3>
                    </div>
                    <div class="card-content">
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <span class="metric-label">Avg Query Time</span>
                                <span id="avgQueryTime" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Active Connections</span>
                                <span id="activeConnections" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Slow Queries</span>
                                <span id="slowQueries" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Health Score</span>
                                <span id="dbHealthScore" class="metric-value">--</span>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="queryTimeChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- System Resources -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>
                            <span class="material-icons">memory</span>
                            System Resources
                        </h3>
                    </div>
                    <div class="card-content">
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <span class="metric-label">Memory Usage</span>
                                <span id="memoryUsage" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Uptime</span>
                                <span id="uptime" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Node Version</span>
                                <span id="nodeVersion" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Platform</span>
                                <span id="platform" class="metric-value">--</span>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="memoryUsageChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Business Metrics -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>
                            <span class="material-icons">business</span>
                            Business Metrics
                        </h3>
                    </div>
                    <div class="card-content">
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <span class="metric-label">Total Users</span>
                                <span id="totalUsers" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Total Summaries</span>
                                <span id="totalSummaries" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Success Rate</span>
                                <span id="summarySuccessRate" class="metric-value">--</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Avg Processing Time</span>
                                <span id="avgProcessingTime" class="metric-value">--</span>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="businessMetricsChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.addDashboardStyles();
        this.setupCharts();
        this.setupEventListeners();
    }

    // Add dashboard styles
    addDashboardStyles() {
        if (document.getElementById('dashboard-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dashboard-styles';
        style.textContent = `
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding: 16px;
                background: var(--md-sys-color-surface-container);
                border-radius: 12px;
            }
            
            .dashboard-header h2 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
                color: var(--md-sys-color-on-surface);
            }
            
            .dashboard-controls {
                display: flex;
                gap: 8px;
            }
            
            .btn-primary, .btn-secondary {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            .btn-primary {
                background: var(--md-sys-color-primary);
                color: var(--md-sys-color-on-primary);
            }
            
            .btn-primary:hover {
                background: var(--md-sys-color-primary-container);
                color: var(--md-sys-color-on-primary-container);
            }
            
            .btn-secondary {
                background: var(--md-sys-color-surface);
                color: var(--md-sys-color-on-surface);
                border: 1px solid var(--md-sys-color-outline);
            }
            
            .btn-secondary:hover {
                background: var(--md-sys-color-surface-container-low);
            }
            
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
            }
            
            .dashboard-card {
                background: var(--md-sys-color-surface-container);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .health-card {
                grid-column: 1 / -1;
            }
            
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .card-header h3 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
                color: var(--md-sys-color-on-surface);
                font-size: 16px;
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .status-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: var(--md-sys-color-outline);
            }
            
            .status-dot.healthy {
                background: var(--md-sys-color-primary);
            }
            
            .status-dot.warning {
                background: var(--md-sys-color-tertiary);
            }
            
            .status-dot.critical {
                background: var(--md-sys-color-error);
            }
            
            .status-text {
                font-size: 14px;
                color: var(--md-sys-color-on-surface-variant);
            }
            
            .health-score {
                display: flex;
                justify-content: center;
                margin-bottom: 16px;
            }
            
            .score-circle {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: conic-gradient(var(--md-sys-color-primary) 0deg, var(--md-sys-color-outline-variant) 0deg);
                position: relative;
            }
            
            .score-circle::before {
                content: '';
                position: absolute;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: var(--md-sys-color-surface-container);
            }
            
            .score-value {
                font-size: 24px;
                font-weight: bold;
                color: var(--md-sys-color-on-surface);
                z-index: 1;
            }
            
            .score-label {
                font-size: 12px;
                color: var(--md-sys-color-on-surface-variant);
                z-index: 1;
            }
            
            .health-issues {
                margin-top: 16px;
            }
            
            .health-issue {
                padding: 8px 12px;
                margin: 4px 0;
                background: var(--md-sys-color-error-container);
                color: var(--md-sys-color-on-error-container);
                border-radius: 6px;
                font-size: 14px;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 16px;
            }
            
            .metric-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px;
                background: var(--md-sys-color-surface-container-low);
                border-radius: 8px;
            }
            
            .metric-label {
                font-size: 12px;
                color: var(--md-sys-color-on-surface-variant);
                margin-bottom: 4px;
            }
            
            .metric-value {
                font-size: 18px;
                font-weight: bold;
                color: var(--md-sys-color-on-surface);
            }
            
            .chart-container {
                height: 200px;
                position: relative;
            }
            
            .chart-container canvas {
                max-width: 100%;
                max-height: 100%;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Setup charts
    setupCharts() {
        // Response Time Chart
        const responseTimeCtx = document.getElementById('responseTimeChart');
        if (responseTimeCtx) {
            this.charts.responseTime = new Chart(responseTimeCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.1,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5000
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // Cache Hit Rate Chart
        const cacheHitRateCtx = document.getElementById('cacheHitRateChart');
        if (cacheHitRateCtx) {
            this.charts.cacheHitRate = new Chart(cacheHitRateCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Cache Hits', 'Cache Misses'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#4CAF50', '#F44336']
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

        // Query Time Chart
        const queryTimeCtx = document.getElementById('queryTimeChart');
        if (queryTimeCtx) {
            this.charts.queryTime = new Chart(queryTimeCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Query Time (ms)',
                        data: [],
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // Memory Usage Chart
        const memoryUsageCtx = document.getElementById('memoryUsageChart');
        if (memoryUsageCtx) {
            this.charts.memoryUsage = new Chart(memoryUsageCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Memory Usage (%)',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.1,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // Business Metrics Chart
        const businessMetricsCtx = document.getElementById('businessMetricsChart');
        if (businessMetricsCtx) {
            this.charts.businessMetrics = new Chart(businessMetricsCtx, {
                type: 'bar',
                data: {
                    labels: ['Users', 'Summaries', 'Success Rate', 'Processing Time'],
                    datasets: [{
                        label: 'Business Metrics',
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(255, 99, 132, 0.6)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateMetrics();
            });
        }

        const exportBtn = document.getElementById('exportMetrics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportMetrics();
            });
        }
    }

    // Start real-time updates
    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
        }, this.updateIntervalMs);
        
        // Initial update
        this.updateMetrics();
        
        console.log('📊 Real-time updates started');
    }

    // Stop real-time updates
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('📊 Real-time updates stopped');
    }

    // Update metrics
    async updateMetrics() {
        try {
            const response = await fetch('/api/metrics');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const metrics = await response.json();
            this.metrics = metrics;
            
            this.updateHealthStatus(metrics);
            this.updateApiMetrics(metrics);
            this.updateCacheMetrics(metrics);
            this.updateDatabaseMetrics(metrics);
            this.updateSystemMetrics(metrics);
            this.updateBusinessMetrics(metrics);
            this.updateCharts(metrics);
            
        } catch (error) {
            console.error('❌ Error updating metrics:', error);
            this.showError('Failed to update metrics: ' + error.message);
        }
    }

    // Update health status
    updateHealthStatus(metrics) {
        const healthStatus = document.getElementById('healthStatus');
        const healthScore = document.getElementById('healthScore');
        const healthIssues = document.getElementById('healthIssues');
        
        if (healthStatus && healthScore && healthIssues) {
            const health = metrics.health || { status: 'unknown', score: 0, issues: [] };
            
            // Update status indicator
            const statusDot = healthStatus.querySelector('.status-dot');
            const statusText = healthStatus.querySelector('.status-text');
            
            statusDot.className = `status-dot ${health.status}`;
            statusText.textContent = health.status.charAt(0).toUpperCase() + health.status.slice(1);
            
            // Update health score
            const scoreValue = healthScore.querySelector('.score-value');
            scoreValue.textContent = health.score;
            
            // Update health score circle
            const scoreCircle = healthScore.querySelector('.score-circle');
            const percentage = health.score;
            scoreCircle.style.background = `conic-gradient(var(--md-sys-color-primary) ${percentage * 3.6}deg, var(--md-sys-color-outline-variant) 0deg)`;
            
            // Update health issues
            healthIssues.innerHTML = '';
            if (health.issues && health.issues.length > 0) {
                health.issues.forEach(issue => {
                    const issueElement = document.createElement('div');
                    issueElement.className = 'health-issue';
                    issueElement.textContent = issue;
                    healthIssues.appendChild(issueElement);
                });
            }
        }
    }

    // Update API metrics
    updateApiMetrics(metrics) {
        const api = metrics.api || {};
        const requests = api.requests || {};
        
        this.updateMetricValue('requestsPerSecond', 'N/A');
        this.updateMetricValue('avgResponseTime', `${Math.round(requests.avgResponseTime || 0)}ms`);
        this.updateMetricValue('errorRate', requests.total > 0 ? `${((requests.failed / requests.total) * 100).toFixed(2)}%` : '0%');
        this.updateMetricValue('p95ResponseTime', `${Math.round(requests.responseTimePercentiles?.p95 || 0)}ms`);
    }

    // Update cache metrics
    updateCacheMetrics(metrics) {
        const cache = metrics.cache || {};
        
        this.updateMetricValue('cacheHitRate', `${(cache.overallHitRate || 0).toFixed(2)}%`);
        this.updateMetricValue('l1CacheSize', cache.l1?.size || 0);
        this.updateMetricValue('l2CacheSize', cache.l2?.size || 0);
        
        const warming = cache.warming || {};
        const warmingSuccessRate = warming.totalWarmed > 0 
            ? ((warming.successfulWarms / warming.totalWarmed) * 100).toFixed(2) 
            : '100';
        this.updateMetricValue('warmingSuccess', `${warmingSuccessRate}%`);
    }

    // Update database metrics
    updateDatabaseMetrics(metrics) {
        const database = metrics.database || {};
        const queries = database.queries || {};
        const connections = database.connections || {};
        const health = database.health || {};
        
        this.updateMetricValue('avgQueryTime', `${Math.round(queries.avgTime || 0)}ms`);
        this.updateMetricValue('activeConnections', connections.active || 0);
        this.updateMetricValue('slowQueries', queries.slowQueries || 0);
        this.updateMetricValue('dbHealthScore', health.score || 0);
    }

    // Update system metrics
    updateSystemMetrics(metrics) {
        const system = metrics.system || {};
        const memoryUsage = system.memoryUsage || {};
        
        const memUsagePercent = memoryUsage.heapTotal > 0 
            ? ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) 
            : '0';
        
        this.updateMetricValue('memoryUsage', `${memUsagePercent}%`);
        this.updateMetricValue('uptime', this.formatUptime(system.uptime || 0));
        this.updateMetricValue('nodeVersion', system.nodeVersion || 'N/A');
        this.updateMetricValue('platform', system.platform || 'N/A');
    }

    // Update business metrics
    updateBusinessMetrics(metrics) {
        const business = metrics.business || {};
        const users = business.users || {};
        const summaries = business.summaries || {};
        
        this.updateMetricValue('totalUsers', users.total || 0);
        this.updateMetricValue('totalSummaries', summaries.total || 0);
        
        const successRate = summaries.total > 0 
            ? ((summaries.successful / summaries.total) * 100).toFixed(2) 
            : '0';
        this.updateMetricValue('summarySuccessRate', `${successRate}%`);
        
        this.updateMetricValue('avgProcessingTime', `${Math.round(summaries.avgProcessingTime || 0)}ms`);
    }

    // Update metric value
    updateMetricValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    // Update charts
    updateCharts(metrics) {
        const now = new Date().toLocaleTimeString();
        
        // Update response time chart
        if (this.charts.responseTime) {
            const api = metrics.api || {};
            const requests = api.requests || {};
            
            this.charts.responseTime.data.labels.push(now);
            this.charts.responseTime.data.datasets[0].data.push(requests.avgResponseTime || 0);
            
            // Keep only last 20 data points
            if (this.charts.responseTime.data.labels.length > 20) {
                this.charts.responseTime.data.labels.shift();
                this.charts.responseTime.data.datasets[0].data.shift();
            }
            
            this.charts.responseTime.update('none');
        }

        // Update cache hit rate chart
        if (this.charts.cacheHitRate) {
            const cache = metrics.cache || {};
            const l1 = cache.l1 || {};
            const l2 = cache.l2 || {};
            
            const totalHits = l1.hits + l2.hits;
            const totalMisses = l1.misses + l2.misses;
            
            this.charts.cacheHitRate.data.datasets[0].data = [totalHits, totalMisses];
            this.charts.cacheHitRate.update('none');
        }

        // Update memory usage chart
        if (this.charts.memoryUsage) {
            const system = metrics.system || {};
            const memoryUsage = system.memoryUsage || {};
            
            const memUsagePercent = memoryUsage.heapTotal > 0 
                ? (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 
                : 0;
            
            this.charts.memoryUsage.data.labels.push(now);
            this.charts.memoryUsage.data.datasets[0].data.push(memUsagePercent);
            
            // Keep only last 20 data points
            if (this.charts.memoryUsage.data.labels.length > 20) {
                this.charts.memoryUsage.data.labels.shift();
                this.charts.memoryUsage.data.datasets[0].data.shift();
            }
            
            this.charts.memoryUsage.update('none');
        }
    }

    // Format uptime
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    // Show error message
    showError(message) {
        console.error('Dashboard error:', message);
        // Could implement a toast notification here
    }

    // Export metrics
    exportMetrics() {
        const metrics = this.metrics;
        const dataStr = JSON.stringify(metrics, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `metrics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Destroy dashboard
    destroy() {
        this.stopRealTimeUpdates();
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts = {};
        this.metrics = {};
        
        console.log('📊 Performance Dashboard destroyed');
    }
}

export { PerformanceDashboard };
export default PerformanceDashboard;
