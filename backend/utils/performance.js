// Performance monitoring system for ToS & Privacy Summarizer
// Tracks response times, error rates, and system health

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                avgResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: Infinity
            },
            errors: {
                total: 0,
                byType: new Map(),
                byEndpoint: new Map()
            },
            cache: {
                hits: 0,
                misses: 0,
                hitRate: 0
            },
            database: {
                queries: 0,
                avgQueryTime: 0,
                slowQueries: 0
            }
        };
        
        this.startTime = Date.now();
        this.isMonitoring = true;
        
        // Start periodic cleanup
        this.startPeriodicCleanup();
    }

    // Track request metrics
    trackRequest(endpoint, method, statusCode, responseTime, error = null) {
        if (!this.isMonitoring) return;

        const request = {
            endpoint,
            method,
            statusCode,
            responseTime,
            timestamp: Date.now(),
            error
        };

        // Update request metrics
        this.metrics.requests.total++;
        
        if (statusCode >= 200 && statusCode < 400) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }

        // Update response time metrics
        this.updateResponseTimeMetrics(responseTime);

        // Track errors
        if (error || statusCode >= 400) {
            this.trackError(endpoint, error || `HTTP ${statusCode}`);
        }

        // Log slow requests
        if (responseTime > 2000) { // 2 seconds
            console.warn(`🐌 Slow request: ${method} ${endpoint} - ${responseTime}ms`);
        }

        return request;
    }

    // Update response time metrics
    updateResponseTimeMetrics(responseTime) {
        const requests = this.metrics.requests;
        
        // Update average response time
        requests.avgResponseTime = 
            (requests.avgResponseTime * (requests.total - 1) + responseTime) / requests.total;
        
        // Update min/max
        requests.maxResponseTime = Math.max(requests.maxResponseTime, responseTime);
        requests.minResponseTime = Math.min(requests.minResponseTime, responseTime);
    }

    // Track errors
    trackError(endpoint, error) {
        this.metrics.errors.total++;
        
        // Track by error type
        const errorType = error.constructor?.name || 'Unknown';
        const currentCount = this.metrics.errors.byType.get(errorType) || 0;
        this.metrics.errors.byType.set(errorType, currentCount + 1);
        
        // Track by endpoint
        const endpointCount = this.metrics.errors.byEndpoint.get(endpoint) || 0;
        this.metrics.errors.byEndpoint.set(endpoint, endpointCount + 1);
        
        console.error(`❌ Error tracked: ${errorType} at ${endpoint}`);
    }

    // Track cache performance
    updateCacheMetrics(hit) {
        if (hit) {
            this.metrics.cache.hits++;
        } else {
            this.metrics.cache.misses++;
        }
        
        const total = this.metrics.cache.hits + this.metrics.cache.misses;
        this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
    }

    // Track cache operations with detailed metrics
    trackCacheOperation(operation, duration, strategy) {
        if (!this.metrics.cache.operations) {
            this.metrics.cache.operations = {
                hits: { l1: 0, l2: 0, total: 0 },
                misses: 0,
                sets: 0,
                deletes: 0,
                evictions: 0,
                avgOperationTime: 0,
                operationCount: 0
            };
        }

        const ops = this.metrics.cache.operations;
        ops.operationCount++;
        
        // Update average operation time
        ops.avgOperationTime = (ops.avgOperationTime * (ops.operationCount - 1) + duration) / ops.operationCount;

        switch (operation) {
            case 'hit_l1':
                ops.hits.l1++;
                ops.hits.total++;
                break;
            case 'hit_l2':
                ops.hits.l2++;
                ops.hits.total++;
                break;
            case 'miss':
                ops.misses++;
                break;
            case 'set':
                ops.sets++;
                break;
            case 'delete':
                ops.deletes++;
                break;
            case 'eviction':
                ops.evictions++;
                break;
        }

        // Log slow cache operations
        if (duration > 100) { // 100ms threshold
            console.warn(`🐌 Slow cache operation: ${operation} - ${duration}ms (strategy: ${strategy})`);
        }
    }

    // Track database performance
    trackDatabaseQuery(queryTime, query = null) {
        this.metrics.database.queries++;
        
        // Update average query time
        const queries = this.metrics.database.queries;
        this.metrics.database.avgQueryTime = 
            (this.metrics.database.avgQueryTime * (queries - 1) + queryTime) / queries;
        
        // Track slow queries
        if (queryTime > 1000) { // 1 second
            this.metrics.database.slowQueries++;
            console.warn(`🐌 Slow database query: ${queryTime}ms${query ? ` - ${query.substring(0, 100)}...` : ''}`);
        }
    }

    // Get current metrics
    getMetrics() {
        const uptime = Date.now() - this.startTime;
        
        return {
            ...this.metrics,
            uptime: {
                milliseconds: uptime,
                seconds: Math.floor(uptime / 1000),
                minutes: Math.floor(uptime / 60000),
                hours: Math.floor(uptime / 3600000)
            },
            rates: {
                successRate: this.metrics.requests.total > 0 
                    ? (this.metrics.requests.successful / this.metrics.requests.total * 100).toFixed(2) + '%'
                    : '0%',
                errorRate: this.metrics.requests.total > 0 
                    ? (this.metrics.requests.failed / this.metrics.requests.total * 100).toFixed(2) + '%'
                    : '0%',
                cacheHitRate: this.metrics.cache.hitRate.toFixed(2) + '%'
            }
        };
    }

    // Get health status
    getHealthStatus() {
        const metrics = this.getMetrics();
        
        const health = {
            status: 'healthy',
            score: 100,
            issues: []
        };

        // Check response time
        if (metrics.requests.avgResponseTime > 2000) {
            health.score -= 20;
            health.issues.push('High average response time');
        }

        // Check error rate
        const errorRate = parseFloat(metrics.rates.errorRate);
        if (errorRate > 5) {
            health.score -= 30;
            health.issues.push('High error rate');
        }

        // Check cache hit rate
        const cacheHitRate = parseFloat(metrics.rates.cacheHitRate);
        if (cacheHitRate < 50) {
            health.score -= 10;
            health.issues.push('Low cache hit rate');
        }

        // Check database performance
        if (metrics.database.avgQueryTime > 500) {
            health.score -= 15;
            health.issues.push('Slow database queries');
        }

        // Determine status
        if (health.score < 50) {
            health.status = 'critical';
        } else if (health.score < 80) {
            health.status = 'warning';
        }

        return health;
    }

    // Reset metrics
    reset() {
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                avgResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: Infinity
            },
            errors: {
                total: 0,
                byType: new Map(),
                byEndpoint: new Map()
            },
            cache: {
                hits: 0,
                misses: 0,
                hitRate: 0
            },
            database: {
                queries: 0,
                avgQueryTime: 0,
                slowQueries: 0
            }
        };
        
        this.startTime = Date.now();
        console.log('📊 Performance metrics reset');
    }

    // Start periodic cleanup
    startPeriodicCleanup() {
        setInterval(() => {
            // Clean up old error tracking data
            if (this.metrics.errors.byType.size > 100) {
                const entries = Array.from(this.metrics.errors.byType.entries());
                const sorted = entries.sort((a, b) => b[1] - a[1]);
                const toKeep = sorted.slice(0, 50);
                
                this.metrics.errors.byType.clear();
                toKeep.forEach(([key, value]) => {
                    this.metrics.errors.byType.set(key, value);
                });
            }
            
            if (this.metrics.errors.byEndpoint.size > 100) {
                const entries = Array.from(this.metrics.errors.byEndpoint.entries());
                const sorted = entries.sort((a, b) => b[1] - a[1]);
                const toKeep = sorted.slice(0, 50);
                
                this.metrics.errors.byEndpoint.clear();
                toKeep.forEach(([key, value]) => {
                    this.metrics.errors.byEndpoint.set(key, value);
                });
            }
        }, 300000); // Every 5 minutes
    }

    // Stop monitoring
    stop() {
        this.isMonitoring = false;
        console.log('📊 Performance monitoring stopped');
    }

    // Start monitoring
    start() {
        this.isMonitoring = true;
        console.log('📊 Performance monitoring started');
    }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Middleware for Express
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to track response time
    const originalEnd = res.end;
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        
        performanceMonitor.trackRequest(
            req.path,
            req.method,
            res.statusCode,
            responseTime
        );
        
        originalEnd.apply(this, args);
    };
    
    next();
};

export { performanceMonitor, performanceMiddleware };
export default performanceMonitor;
