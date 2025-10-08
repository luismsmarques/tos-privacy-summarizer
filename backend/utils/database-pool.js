// Advanced Connection Pool Manager for ToS & Privacy Summarizer
// Implements resilient connection pooling with retry logic and monitoring

import pkg from 'pg';
const { Pool } = pkg;
import { performanceMonitor } from './performance.js';

class ResilientDatabasePool {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.connectionStats = {
            totalConnections: 0,
            activeConnections: 0,
            idleConnections: 0,
            waitingClients: 0,
            connectionErrors: 0,
            retryAttempts: 0,
            lastConnectionTime: null,
            avgConnectionTime: 0
        };
        
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.maxRetryDelay = 30000; // 30 seconds
        this.retryMultiplier = 2;
        
        this.healthCheckInterval = null;
        this.healthCheckIntervalMs = 60000; // 1 minute
        
        console.log('🔗 Resilient Database Pool initialized');
    }

    // Initialize connection pool
    async initialize() {
        try {
            const databaseUrl = process.env.ANALYTICS_URL || process.env.DATABASE_URL;
            if (!databaseUrl) {
                throw new Error('Database URL not configured');
            }

            // Create optimized pool configuration
            this.pool = new Pool({
                connectionString: databaseUrl,
                ssl: { rejectUnauthorized: false },
                
                // Connection pool settings
                max: 20,                    // Maximum connections
                min: 5,                     // Minimum connections
                idleTimeoutMillis: 30000,   // 30s timeout for idle connections
                connectionTimeoutMillis: 10000, // 10s timeout for new connections
                allowExitOnIdle: true,
                
                // Performance settings
                statement_timeout: 30000,   // 30s timeout for statements
                query_timeout: 30000,       // 30s timeout for queries
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
                
                // Application settings
                application_name: 'tos-privacy-summarizer',
                timezone: 'UTC'
            });

            // Setup pool event listeners
            this.setupPoolEventListeners();
            
            // Test initial connection
            await this.testConnection();
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            this.isConnected = true;
            console.log('✅ Database pool initialized successfully');
            
        } catch (error) {
            console.error('❌ Database pool initialization failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // Setup pool event listeners
    setupPoolEventListeners() {
        this.pool.on('connect', (client) => {
            this.connectionStats.totalConnections++;
            this.connectionStats.lastConnectionTime = new Date().toISOString();
            console.log('🔗 New database connection established');
        });

        this.pool.on('error', (err) => {
            this.connectionStats.connectionErrors++;
            console.error('❌ Database pool error:', err);
            
            // Track error in performance monitor
            performanceMonitor.trackError('database_pool', err);
        });

        this.pool.on('remove', (client) => {
            console.log('🔌 Database connection removed from pool');
        });

        // Monitor pool statistics
        setInterval(() => {
            this.updateConnectionStats();
        }, 5000); // Every 5 seconds
    }

    // Update connection statistics
    updateConnectionStats() {
        if (this.pool) {
            this.connectionStats.activeConnections = this.pool.totalCount - this.pool.idleCount;
            this.connectionStats.idleConnections = this.pool.idleCount;
            this.connectionStats.waitingClients = this.pool.waitingCount;
        }
    }

    // Test database connection
    async testConnection() {
        const startTime = Date.now();
        
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT 1 as test, NOW() as timestamp');
            client.release();
            
            const duration = Date.now() - startTime;
            this.updateAvgConnectionTime(duration);
            
            console.log(`✅ Database connection test successful (${duration}ms)`);
            return true;
            
        } catch (error) {
            console.error('❌ Database connection test failed:', error);
            throw error;
        }
    }

    // Update average connection time
    updateAvgConnectionTime(duration) {
        if (this.connectionStats.avgConnectionTime === 0) {
            this.connectionStats.avgConnectionTime = duration;
        } else {
            this.connectionStats.avgConnectionTime = 
                (this.connectionStats.avgConnectionTime + duration) / 2;
        }
    }

    // Execute query with retry logic
    async queryWithRetry(text, params = [], retryCount = 0) {
        const startTime = Date.now();
        
        try {
            // Ensure pool is initialized
            if (!this.pool) {
                await this.initialize();
            }

            const result = await this.pool.query(text, params);
            const duration = Date.now() - startTime;
            
            // Track successful query
            performanceMonitor.trackDatabaseQuery(duration, text.substring(0, 100));
            
            // Log slow queries
            if (duration > 1000) {
                console.warn(`🐌 Slow query detected: ${duration}ms - ${text.substring(0, 100)}...`);
            }
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Check if error is retryable
            if (this.isRetryableError(error) && retryCount < this.maxRetries) {
                this.connectionStats.retryAttempts++;
                
                const delay = Math.min(
                    this.retryDelay * Math.pow(this.retryMultiplier, retryCount),
                    this.maxRetryDelay
                );
                
                console.log(`🔄 Retrying query (attempt ${retryCount + 1}/${this.maxRetries}) after ${delay}ms`);
                
                await this.delay(delay);
                return this.queryWithRetry(text, params, retryCount + 1);
            }
            
            // Track failed query
            performanceMonitor.trackDatabaseQuery(duration, text.substring(0, 100), error);
            console.error(`❌ Query failed after ${retryCount} retries:`, error);
            
            throw error;
        }
    }

    // Check if error is retryable
    isRetryableError(error) {
        const retryableErrors = [
            'Connection terminated',
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'connection',
            'timeout',
            'network',
            'socket hang up'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return retryableErrors.some(errType => errorMessage.includes(errType.toLowerCase()));
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get connection from pool
    async getConnection() {
        try {
            const startTime = Date.now();
            const client = await this.pool.connect();
            const duration = Date.now() - startTime;
            
            this.updateAvgConnectionTime(duration);
            
            return client;
        } catch (error) {
            console.error('❌ Error getting database connection:', error);
            throw error;
        }
    }

    // Release connection back to pool
    releaseConnection(client) {
        if (client) {
            client.release();
        }
    }

    // Execute transaction
    async executeTransaction(queries) {
        const client = await this.getConnection();
        
        try {
            await client.query('BEGIN');
            
            const results = [];
            for (const { text, params } of queries) {
                const result = await client.query(text, params);
                results.push(result);
            }
            
            await client.query('COMMIT');
            return results;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            this.releaseConnection(client);
        }
    }

    // Start health monitoring
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('❌ Health check failed:', error);
            }
        }, this.healthCheckIntervalMs);
        
        console.log('🏥 Database health monitoring started');
    }

    // Perform health check
    async performHealthCheck() {
        try {
            const startTime = Date.now();
            await this.testConnection();
            const duration = Date.now() - startTime;
            
            // Check if health is degrading
            if (duration > 5000) { // 5 seconds
                console.warn(`⚠️ Database health check slow: ${duration}ms`);
            }
            
            // Check connection pool health
            const poolHealth = this.getPoolHealth();
            if (poolHealth.score < 80) {
                console.warn(`⚠️ Database pool health degraded: ${poolHealth.score}%`);
            }
            
        } catch (error) {
            console.error('❌ Database health check failed:', error);
            this.connectionStats.connectionErrors++;
        }
    }

    // Get pool health status
    getPoolHealth() {
        if (!this.pool) {
            return { status: 'disconnected', score: 0, issues: ['Pool not initialized'] };
        }

        const stats = this.connectionStats;
        let score = 100;
        const issues = [];

        // Check connection utilization
        const utilization = stats.activeConnections / 20; // max connections
        if (utilization > 0.8) {
            score -= 20;
            issues.push('High connection utilization');
        }

        // Check error rate
        const errorRate = stats.connectionErrors / Math.max(stats.totalConnections, 1);
        if (errorRate > 0.1) {
            score -= 30;
            issues.push('High error rate');
        }

        // Check waiting clients
        if (stats.waitingClients > 5) {
            score -= 15;
            issues.push('Many waiting clients');
        }

        // Check average connection time
        if (stats.avgConnectionTime > 2000) {
            score -= 10;
            issues.push('Slow connection times');
        }

        let status = 'healthy';
        if (score < 50) {
            status = 'critical';
        } else if (score < 80) {
            status = 'warning';
        }

        return {
            status,
            score: Math.max(0, score),
            issues,
            stats: {
                activeConnections: stats.activeConnections,
                idleConnections: stats.idleConnections,
                waitingClients: stats.waitingClients,
                totalConnections: stats.totalConnections,
                connectionErrors: stats.connectionErrors,
                avgConnectionTime: stats.avgConnectionTime
            }
        };
    }

    // Get connection statistics
    getConnectionStats() {
        return {
            ...this.connectionStats,
            poolStats: this.pool ? {
                totalCount: this.pool.totalCount,
                idleCount: this.pool.idleCount,
                waitingCount: this.pool.waitingCount
            } : null,
            health: this.getPoolHealth()
        };
    }

    // Close all connections
    async close() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }

        this.isConnected = false;
        console.log('🔌 Database pool closed');
    }

    // Reset connection pool
    async reset() {
        console.log('🔄 Resetting database pool...');
        
        await this.close();
        await this.initialize();
        
        console.log('✅ Database pool reset completed');
    }

    // Update pool configuration
    async updateConfig(newConfig) {
        if (this.pool) {
            console.log('⚙️ Updating pool configuration:', newConfig);
            
            // Close current pool
            await this.close();
            
            // Update configuration and reinitialize
            Object.assign(this, newConfig);
            await this.initialize();
        }
    }
}

// Singleton instance
const resilientPool = new ResilientDatabasePool();

// Initialize pool on import
resilientPool.initialize().catch(error => {
    console.error('❌ Failed to initialize database pool:', error);
});

export { resilientPool };
export default resilientPool;
