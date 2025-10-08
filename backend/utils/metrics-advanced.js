// Advanced Metrics System for ToS & Privacy Summarizer
// Comprehensive performance monitoring and analytics

import { advancedCache } from './cache-advanced.js';
import { resilientPool } from './database-pool.js';
import { queryOptimizer } from './query-optimizer.js';
import { cacheWarmer } from './cache-warmer.js';

class AdvancedMetricsCollector {
    constructor() {
        this.metrics = {
            system: {
                uptime: Date.now(),
                memoryUsage: 0,
                cpuUsage: 0,
                nodeVersion: process.version,
                platform: process.platform
            },
            api: {
                requests: {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    avgResponseTime: 0,
                    maxResponseTime: 0,
                    minResponseTime: Infinity,
                    responseTimePercentiles: {
                        p50: 0,
                        p95: 0,
                        p99: 0
                    }
                },
                endpoints: new Map(),
                errors: new Map(),
                rateLimits: new Map()
            },
            cache: {
                l1: {
                    hits: 0,
                    misses: 0,
                    sets: 0,
                    deletes: 0,
                    evictions: 0,
                    hitRate: 0,
                    size: 0,
                    utilization: 0
                },
                l2: {
                    hits: 0,
                    misses: 0,
                    sets: 0,
                    deletes: 0,
                    hitRate: 0,
                    size: 0,
                    utilization: 0
                },
                warming: {
                    totalWarmed: 0,
                    successfulWarms: 0,
                    failedWarms: 0,
                    lastWarmTime: null
                }
            },
            database: {
                connections: {
                    total: 0,
                    active: 0,
                    idle: 0,
                    waiting: 0,
                    errors: 0
                },
                queries: {
                    total: 0,
                    avgTime: 0,
                    slowQueries: 0,
                    errors: 0,
                    cacheHits: 0,
                    cacheMisses: 0
                },
                health: {
                    status: 'unknown',
                    score: 0,
                    issues: []
                }
            },
            business: {
                users: {
                    total: 0,
                    active: 0,
                    newToday: 0,
                    retention: 0
                },
                summaries: {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    avgProcessingTime: 0,
                    avgWordCount: 0,
                    avgComplexity: 0,
                    avgGoodPractices: 0,
                    avgRiskScore: 0
                },
                credits: {
                    totalIssued: 0,
                    totalConsumed: 0,
                    avgPerUser: 0
                }
            }
        };
        
        this.responseTimeHistory = [];
        this.maxHistorySize = 1000;
        this.collectionInterval = null;
        this.collectionIntervalMs = 30000; // 30 seconds
        
        this.startCollection();
        
        console.log('📊 Advanced Metrics Collector initialized');
    }

    // Start metrics collection
    startCollection() {
        this.collectionInterval = setInterval(async () => {
            await this.collectMetrics();
        }, this.collectionIntervalMs);
        
        console.log('📊 Metrics collection started');
    }

    // Stop metrics collection
    stopCollection() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        console.log('📊 Metrics collection stopped');
    }

    // Collect all metrics
    async collectMetrics() {
        try {
            await this.collectSystemMetrics();
            await this.collectCacheMetrics();
            await this.collectDatabaseMetrics();
            await this.collectBusinessMetrics();
            
            this.updateDerivedMetrics();
            
        } catch (error) {
            console.error('❌ Error collecting metrics:', error);
        }
    }

    // Collect system metrics
    async collectSystemMetrics() {
        try {
            const memUsage = process.memoryUsage();
            this.metrics.system.memoryUsage = {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external,
                arrayBuffers: memUsage.arrayBuffers
            };
            
            this.metrics.system.uptime = Date.now() - this.metrics.system.uptime;
            
        } catch (error) {
            console.error('❌ Error collecting system metrics:', error);
        }
    }

    // Collect cache metrics
    async collectCacheMetrics() {
        try {
            const cacheStats = advancedCache.getStats();
            const warmingStats = cacheWarmer.getStats();
            
            this.metrics.cache.l1 = {
                ...cacheStats.l1,
                hitRate: parseFloat(cacheStats.l1.hitRate)
            };
            
            this.metrics.cache.l2 = {
                ...cacheStats.l2,
                hitRate: parseFloat(cacheStats.l2.hitRate)
            };
            
            this.metrics.cache.warming = {
                ...warmingStats
            };
            
        } catch (error) {
            console.error('❌ Error collecting cache metrics:', error);
        }
    }

    // Collect database metrics
    async collectDatabaseMetrics() {
        try {
            const connectionStats = resilientPool.getConnectionStats();
            const queryStats = queryOptimizer.getQueryStats();
            
            this.metrics.database.connections = {
                total: connectionStats.totalConnections,
                active: connectionStats.activeConnections,
                idle: connectionStats.idleConnections,
                waiting: connectionStats.waitingClients,
                errors: connectionStats.connectionErrors
            };
            
            this.metrics.database.health = connectionStats.health;
            
            // Aggregate query stats
            let totalQueries = 0;
            let totalTime = 0;
            let slowQueries = 0;
            let errors = 0;
            let cacheHits = 0;
            let cacheMisses = 0;
            
            for (const [queryName, stats] of Object.entries(queryStats)) {
                totalQueries += stats.count;
                totalTime += stats.totalTime;
                slowQueries += stats.slowQueries;
                errors += stats.errors;
                cacheHits += stats.cacheHits;
                cacheMisses += stats.cacheMisses;
            }
            
            this.metrics.database.queries = {
                total: totalQueries,
                avgTime: totalQueries > 0 ? totalTime / totalQueries : 0,
                slowQueries: slowQueries,
                errors: errors,
                cacheHits: cacheHits,
                cacheMisses: cacheMisses
            };
            
        } catch (error) {
            console.error('❌ Error collecting database metrics:', error);
        }
    }

    // Collect business metrics
    async collectBusinessMetrics() {
        try {
            // This would typically query the database for business metrics
            // For now, we'll use placeholder values
            this.metrics.business.users = {
                total: 0, // Would be fetched from database
                active: 0,
                newToday: 0,
                retention: 0
            };
            
            this.metrics.business.summaries = {
                total: 0,
                successful: 0,
                failed: 0,
                avgProcessingTime: 0,
                avgWordCount: 0,
                avgComplexity: 0,
                avgGoodPractices: 0,
                avgRiskScore: 0
            };
            
            this.metrics.business.credits = {
                totalIssued: 0,
                totalConsumed: 0,
                avgPerUser: 0
            };
            
        } catch (error) {
            console.error('❌ Error collecting business metrics:', error);
        }
    }

    // Update derived metrics
    updateDerivedMetrics() {
        // Calculate API response time percentiles
        if (this.responseTimeHistory.length > 0) {
            const sorted = [...this.responseTimeHistory].sort((a, b) => a - b);
            this.metrics.api.requests.responseTimePercentiles = {
                p50: this.percentile(sorted, 0.5),
                p95: this.percentile(sorted, 0.95),
                p99: this.percentile(sorted, 0.99)
            };
        }
        
        // Calculate overall cache hit rate
        const totalCacheHits = this.metrics.cache.l1.hits + this.metrics.cache.l2.hits;
        const totalCacheMisses = this.metrics.cache.l1.misses + this.metrics.cache.l2.misses;
        const totalCacheRequests = totalCacheHits + totalCacheMisses;
        
        this.metrics.cache.overallHitRate = totalCacheRequests > 0 
            ? (totalCacheHits / totalCacheRequests) * 100 
            : 0;
    }

    // Calculate percentile
    percentile(sorted, p) {
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)] || 0;
    }

    // Track API request
    trackApiRequest(endpoint, method, statusCode, responseTime, error = null) {
        const request = this.metrics.api.requests;
        request.total++;
        
        if (statusCode >= 200 && statusCode < 400) {
            request.successful++;
        } else {
            request.failed++;
        }
        
        // Update response time metrics
        request.avgResponseTime = 
            (request.avgResponseTime * (request.total - 1) + responseTime) / request.total;
        
        request.maxResponseTime = Math.max(request.maxResponseTime, responseTime);
        request.minResponseTime = Math.min(request.minResponseTime, responseTime);
        
        // Add to response time history
        this.responseTimeHistory.push(responseTime);
        if (this.responseTimeHistory.length > this.maxHistorySize) {
            this.responseTimeHistory.shift();
        }
        
        // Track endpoint-specific metrics
        const endpointKey = `${method} ${endpoint}`;
        if (!this.metrics.api.endpoints.has(endpointKey)) {
            this.metrics.api.endpoints.set(endpointKey, {
                requests: 0,
                avgResponseTime: 0,
                errors: 0
            });
        }
        
        const endpointStats = this.metrics.api.endpoints.get(endpointKey);
        endpointStats.requests++;
        endpointStats.avgResponseTime = 
            (endpointStats.avgResponseTime * (endpointStats.requests - 1) + responseTime) / endpointStats.requests;
        
        if (error || statusCode >= 400) {
            endpointStats.errors++;
        }
        
        // Track errors
        if (error) {
            const errorType = error.constructor?.name || 'Unknown';
            const currentCount = this.metrics.api.errors.get(errorType) || 0;
            this.metrics.api.errors.set(errorType, currentCount + 1);
        }
    }

    // Track rate limit hit
    trackRateLimit(endpoint, limit, remaining) {
        const rateLimitKey = endpoint;
        if (!this.metrics.api.rateLimits.has(rateLimitKey)) {
            this.metrics.api.rateLimits.set(rateLimitKey, {
                hits: 0,
                limit: limit,
                avgRemaining: 0
            });
        }
        
        const rateLimitStats = this.metrics.api.rateLimits.get(rateLimitKey);
        rateLimitStats.hits++;
        rateLimitStats.avgRemaining = 
            (rateLimitStats.avgRemaining * (rateLimitStats.hits - 1) + remaining) / rateLimitStats.hits;
    }

    // Get comprehensive metrics
    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date().toISOString(),
            collectionInterval: this.collectionIntervalMs
        };
    }

    // Get health status
    getHealthStatus() {
        const health = {
            status: 'healthy',
            score: 100,
            issues: [],
            components: {}
        };

        // Check API health
        const apiHealth = this.getApiHealth();
        health.components.api = apiHealth;
        if (apiHealth.score < 80) {
            health.score -= 20;
            health.issues.push('API performance degraded');
        }

        // Check cache health
        const cacheHealth = this.getCacheHealth();
        health.components.cache = cacheHealth;
        if (cacheHealth.score < 80) {
            health.score -= 15;
            health.issues.push('Cache performance degraded');
        }

        // Check database health
        const dbHealth = this.metrics.database.health;
        health.components.database = dbHealth;
        if (dbHealth.score < 80) {
            health.score -= 25;
            health.issues.push('Database performance degraded');
        }

        // Check system health
        const systemHealth = this.getSystemHealth();
        health.components.system = systemHealth;
        if (systemHealth.score < 80) {
            health.score -= 10;
            health.issues.push('System resources constrained');
        }

        // Determine overall status
        if (health.score < 50) {
            health.status = 'critical';
        } else if (health.score < 80) {
            health.status = 'warning';
        }

        return health;
    }

    // Get API health
    getApiHealth() {
        const api = this.metrics.api.requests;
        let score = 100;
        const issues = [];

        // Check response time
        if (api.avgResponseTime > 2000) {
            score -= 30;
            issues.push('High average response time');
        }

        // Check error rate
        const errorRate = api.total > 0 ? (api.failed / api.total) * 100 : 0;
        if (errorRate > 5) {
            score -= 40;
            issues.push('High error rate');
        }

        // Check P95 response time
        if (api.responseTimePercentiles.p95 > 5000) {
            score -= 20;
            issues.push('High P95 response time');
        }

        return {
            status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
            score: Math.max(0, score),
            issues,
            metrics: {
                avgResponseTime: api.avgResponseTime,
                errorRate: errorRate.toFixed(2) + '%',
                p95ResponseTime: api.responseTimePercentiles.p95
            }
        };
    }

    // Get cache health
    getCacheHealth() {
        const cache = this.metrics.cache;
        let score = 100;
        const issues = [];

        // Check overall hit rate
        if (cache.overallHitRate < 70) {
            score -= 30;
            issues.push('Low cache hit rate');
        }

        // Check L1 utilization
        if (cache.l1.utilization > 90) {
            score -= 20;
            issues.push('High L1 cache utilization');
        }

        // Check warming success rate
        const warmingSuccessRate = cache.warming.totalWarmed > 0 
            ? (cache.warming.successfulWarms / cache.warming.totalWarmed) * 100 
            : 100;
        
        if (warmingSuccessRate < 80) {
            score -= 15;
            issues.push('Low cache warming success rate');
        }

        return {
            status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
            score: Math.max(0, score),
            issues,
            metrics: {
                overallHitRate: cache.overallHitRate.toFixed(2) + '%',
                l1Utilization: cache.l1.utilization,
                warmingSuccessRate: warmingSuccessRate.toFixed(2) + '%'
            }
        };
    }

    // Get system health
    getSystemHealth() {
        const system = this.metrics.system;
        let score = 100;
        const issues = [];

        // Check memory usage
        const memUsagePercent = (system.memoryUsage.heapUsed / system.memoryUsage.heapTotal) * 100;
        if (memUsagePercent > 80) {
            score -= 30;
            issues.push('High memory usage');
        }

        // Check uptime (restart frequency)
        const uptimeHours = system.uptime / (1000 * 60 * 60);
        if (uptimeHours < 1) {
            score -= 20;
            issues.push('Recent restart detected');
        }

        return {
            status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
            score: Math.max(0, score),
            issues,
            metrics: {
                memoryUsagePercent: memUsagePercent.toFixed(2) + '%',
                uptimeHours: uptimeHours.toFixed(2)
            }
        };
    }

    // Get performance summary
    getPerformanceSummary() {
        const metrics = this.metrics;
        
        return {
            api: {
                requestsPerSecond: this.calculateRequestsPerSecond(),
                avgResponseTime: metrics.api.requests.avgResponseTime,
                errorRate: metrics.api.requests.total > 0 
                    ? ((metrics.api.requests.failed / metrics.api.requests.total) * 100).toFixed(2) + '%'
                    : '0%',
                p95ResponseTime: metrics.api.requests.responseTimePercentiles.p95
            },
            cache: {
                hitRate: (metrics.cache.overallHitRate || 0).toFixed(2) + '%',
                l1Size: metrics.cache.l1?.size || 0,
                l2Size: metrics.cache.l2?.size || 0,
                warmingSuccessRate: metrics.cache.warming?.totalWarmed > 0 
                    ? ((metrics.cache.warming.successfulWarms / metrics.cache.warming.totalWarmed) * 100).toFixed(2) + '%'
                    : '100%'
            },
            database: {
                avgQueryTime: (metrics.database.queries?.avgTime || 0).toFixed(2) + 'ms',
                slowQueries: metrics.database.queries?.slowQueries || 0,
                connectionUtilization: metrics.database.connections?.total > 0 
                    ? ((metrics.database.connections.active / metrics.database.connections.total) * 100).toFixed(2) + '%'
                    : '0%',
                healthScore: metrics.database.health?.score || 0
            },
            system: {
                memoryUsage: metrics.system.memoryUsage?.heapTotal > 0 
                    ? ((metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100).toFixed(2) + '%'
                    : '0%',
                uptime: this.formatUptime(metrics.system.uptime || 0)
            }
        };
    }

    // Calculate requests per second
    calculateRequestsPerSecond() {
        // This would need to track requests over time
        // For now, return a placeholder
        return 'N/A';
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

    // Reset metrics
    reset() {
        this.metrics = {
            system: {
                uptime: Date.now(),
                memoryUsage: 0,
                cpuUsage: 0,
                nodeVersion: process.version,
                platform: process.platform
            },
            api: {
                requests: {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    avgResponseTime: 0,
                    maxResponseTime: 0,
                    minResponseTime: Infinity,
                    responseTimePercentiles: {
                        p50: 0,
                        p95: 0,
                        p99: 0
                    }
                },
                endpoints: new Map(),
                errors: new Map(),
                rateLimits: new Map()
            },
            cache: {
                l1: {
                    hits: 0,
                    misses: 0,
                    sets: 0,
                    deletes: 0,
                    evictions: 0,
                    hitRate: 0,
                    size: 0,
                    utilization: 0
                },
                l2: {
                    hits: 0,
                    misses: 0,
                    sets: 0,
                    deletes: 0,
                    hitRate: 0,
                    size: 0,
                    utilization: 0
                },
                warming: {
                    totalWarmed: 0,
                    successfulWarms: 0,
                    failedWarms: 0,
                    lastWarmTime: null
                }
            },
            database: {
                connections: {
                    total: 0,
                    active: 0,
                    idle: 0,
                    waiting: 0,
                    errors: 0
                },
                queries: {
                    total: 0,
                    avgTime: 0,
                    slowQueries: 0,
                    errors: 0,
                    cacheHits: 0,
                    cacheMisses: 0
                },
                health: {
                    status: 'unknown',
                    score: 0,
                    issues: []
                }
            },
            business: {
                users: {
                    total: 0,
                    active: 0,
                    newToday: 0,
                    retention: 0
                },
                summaries: {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    avgProcessingTime: 0,
                    avgWordCount: 0,
                    avgComplexity: 0,
                    avgGoodPractices: 0,
                    avgRiskScore: 0
                },
                credits: {
                    totalIssued: 0,
                    totalConsumed: 0,
                    avgPerUser: 0
                }
            }
        };
        
        this.responseTimeHistory = [];
        
        console.log('📊 Metrics reset');
    }
}

// Singleton instance
const advancedMetrics = new AdvancedMetricsCollector();

export { advancedMetrics };
export default advancedMetrics;
