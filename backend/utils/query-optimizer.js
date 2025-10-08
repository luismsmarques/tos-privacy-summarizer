// Query Optimizer for ToS & Privacy Summarizer
// Implements optimized database queries with caching and performance monitoring

import db from './database.js';
import { advancedCache, CacheKeys, CacheStrategies } from './cache-advanced.js';
import { performanceMonitor } from './performance.js';

class QueryOptimizer {
    constructor() {
        this.queryStats = new Map();
        this.slowQueryThreshold = 1000; // 1 second
        this.cacheEnabled = true;
        
        console.log('🔍 Query Optimizer initialized');
    }

    // Optimized query for user summaries with pagination
    async getUserSummariesOptimized(userId, limit = 20, offset = 0) {
        const startTime = Date.now();
        const cacheKey = CacheKeys.userSummaries(userId, limit, offset);
        
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = advancedCache.get(cacheKey);
                if (cached) {
                    this.trackQuery('getUserSummariesOptimized', Date.now() - startTime, true);
                    return cached;
                }
            }

            // Use optimized function if available, otherwise fallback to regular query
            let query, params;
            
            try {
                query = 'SELECT * FROM get_user_summaries_optimized($1, $2, $3)';
                params = [userId, limit, offset];
            } catch (error) {
                // Fallback to regular query
                query = `
                    SELECT 
                        s.id, s.summary_id, s.user_id, s.url, s.title, s.document_type,
                        s.success, s.duration, s.text_length, s.word_count, s.summary,
                        s.processing_time, s.rating_complexidade, s.rating_boas_praticas,
                        s.risk_score, s.created_at, s.updated_at
                    FROM summaries s
                    WHERE s.user_id = $1 
                    ORDER BY s.created_at DESC 
                    LIMIT $2 OFFSET $3
                `;
                params = [userId, limit, offset];
            }

            const result = await db.query(query, params);
            const summaries = result.rows;
            
            // Cache the result
            if (this.cacheEnabled) {
                advancedCache.set(cacheKey, summaries, CacheStrategies.QUERY_RESULT);
            }
            
            this.trackQuery('getUserSummariesOptimized', Date.now() - startTime, false);
            return summaries;
            
        } catch (error) {
            console.error('❌ Error in getUserSummariesOptimized:', error);
            this.trackQuery('getUserSummariesOptimized', Date.now() - startTime, false, error);
            throw error;
        }
    }

    // Optimized analytics overview query
    async getAnalyticsOverviewOptimized() {
        const startTime = Date.now();
        const cacheKey = CacheKeys.analyticsOverview();
        
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = advancedCache.get(cacheKey);
                if (cached) {
                    this.trackQuery('getAnalyticsOverviewOptimized', Date.now() - startTime, true);
                    return cached;
                }
            }

            let query, params;
            
            try {
                // Use optimized function if available
                query = 'SELECT * FROM get_analytics_overview_optimized()';
                params = [];
            } catch (error) {
                // Fallback to regular query
                query = `
                    SELECT 
                        (SELECT COUNT(*) FROM users) as total_users,
                        (SELECT COUNT(*) FROM summaries WHERE success = true) as successful_summaries,
                        (SELECT COUNT(*) FROM summaries WHERE success = false) as failed_summaries,
                        (SELECT AVG(duration) FROM summaries WHERE success = true) as avg_duration,
                        (SELECT COUNT(*) FROM requests WHERE timestamp >= CURRENT_DATE) as today_requests,
                        (SELECT COUNT(*) FROM summaries WHERE created_at >= CURRENT_DATE) as today_summaries,
                        (SELECT COUNT(*) FROM summaries WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_summaries,
                        (SELECT COUNT(*) FROM summaries WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_summaries
                `;
                params = [];
            }

            const result = await db.query(query, params);
            const overview = result.rows[0];
            
            // Cache the result
            if (this.cacheEnabled) {
                advancedCache.set(cacheKey, overview, CacheStrategies.ANALYTICS);
            }
            
            this.trackQuery('getAnalyticsOverviewOptimized', Date.now() - startTime, false);
            return overview;
            
        } catch (error) {
            console.error('❌ Error in getAnalyticsOverviewOptimized:', error);
            this.trackQuery('getAnalyticsOverviewOptimized', Date.now() - startTime, false, error);
            throw error;
        }
    }

    // Get popular summaries with caching
    async getPopularSummariesOptimized(days = 7, limit = 50) {
        const startTime = Date.now();
        const cacheKey = CacheKeys.popularContent('summaries', `${days}_${limit}`);
        
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = advancedCache.get(cacheKey);
                if (cached) {
                    this.trackQuery('getPopularSummariesOptimized', Date.now() - startTime, true);
                    return cached;
                }
            }

            let query, params;
            
            try {
                // Use optimized function if available
                query = 'SELECT * FROM get_popular_summaries($1, $2)';
                params = [days, limit];
            } catch (error) {
                // Fallback to regular query
                query = `
                    SELECT 
                        url, title, document_type,
                        COUNT(*) as frequency,
                        AVG(duration) as avg_duration,
                        MAX(created_at) as last_created,
                        AVG(rating_complexidade) as avg_complexity,
                        AVG(rating_boas_praticas) as avg_good_practices,
                        AVG(risk_score) as avg_risk_score
                    FROM summaries
                    WHERE created_at > NOW() - INTERVAL '${days} days'
                    AND success = true
                    GROUP BY url, title, document_type
                    HAVING COUNT(*) >= 2
                    ORDER BY frequency DESC, last_created DESC
                    LIMIT $1
                `;
                params = [limit];
            }

            const result = await db.query(query, params);
            const popularSummaries = result.rows;
            
            // Cache the result
            if (this.cacheEnabled) {
                advancedCache.set(cacheKey, popularSummaries, CacheStrategies.SUMMARY);
            }
            
            this.trackQuery('getPopularSummariesOptimized', Date.now() - startTime, false);
            return popularSummaries;
            
        } catch (error) {
            console.error('❌ Error in getPopularSummariesOptimized:', error);
            this.trackQuery('getPopularSummariesOptimized', Date.now() - startTime, false, error);
            throw error;
        }
    }

    // Get user activity patterns
    async getUserActivityPatternsOptimized(userId, days = 30) {
        const startTime = Date.now();
        const cacheKey = CacheKeys.userStats(userId);
        
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = advancedCache.get(cacheKey);
                if (cached) {
                    this.trackQuery('getUserActivityPatternsOptimized', Date.now() - startTime, true);
                    return cached;
                }
            }

            let query, params;
            
            try {
                // Use optimized function if available
                query = 'SELECT * FROM get_user_activity_patterns($1, $2)';
                params = [userId, days];
            } catch (error) {
                // Fallback to regular query
                query = `
                    SELECT 
                        document_type,
                        COUNT(*) as count,
                        MAX(created_at) as last_activity,
                        AVG(duration) as avg_duration,
                        AVG(rating_complexidade) as avg_complexity,
                        AVG(rating_boas_praticas) as avg_good_practices,
                        AVG(risk_score) as avg_risk_score
                    FROM summaries
                    WHERE user_id = $1
                    AND created_at > NOW() - INTERVAL '${days} days'
                    GROUP BY document_type
                    ORDER BY count DESC
                `;
                params = [userId];
            }

            const result = await db.query(query, params);
            const patterns = result.rows;
            
            // Cache the result
            if (this.cacheEnabled) {
                advancedCache.set(cacheKey, patterns, CacheStrategies.USER_DATA);
            }
            
            this.trackQuery('getUserActivityPatternsOptimized', Date.now() - startTime, false);
            return patterns;
            
        } catch (error) {
            console.error('❌ Error in getUserActivityPatternsOptimized:', error);
            this.trackQuery('getUserActivityPatternsOptimized', Date.now() - startTime, false, error);
            throw error;
        }
    }

    // Get hourly performance data
    async getHourlyPerformanceOptimized(days = 7) {
        const startTime = Date.now();
        const cacheKey = CacheKeys.analyticsHourly(`last_${days}_days`);
        
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = advancedCache.get(cacheKey);
                if (cached) {
                    this.trackQuery('getHourlyPerformanceOptimized', Date.now() - startTime, true);
                    return cached;
                }
            }

            // Try materialized view first
            let query, params;
            
            try {
                query = `
                    SELECT 
                        hour,
                        total_requests,
                        successful_requests,
                        failed_requests,
                        avg_response_time,
                        median_response_time,
                        p95_response_time,
                        unique_users,
                        unique_ips
                    FROM mv_hourly_performance
                    WHERE hour >= NOW() - INTERVAL '${days} days'
                    ORDER BY hour DESC
                    LIMIT 168
                `;
                params = [];
            } catch (error) {
                // Fallback to regular query
                query = `
                    SELECT 
                        DATE_TRUNC('hour', timestamp) as hour,
                        COUNT(*) as total_requests,
                        COUNT(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 END) as successful_requests,
                        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
                        AVG(duration) as avg_response_time,
                        COUNT(DISTINCT user_id) as unique_users,
                        COUNT(DISTINCT ip_address) as unique_ips
                    FROM requests
                    WHERE timestamp >= NOW() - INTERVAL '${days} days'
                    GROUP BY DATE_TRUNC('hour', timestamp)
                    ORDER BY hour DESC
                    LIMIT 168
                `;
                params = [];
            }

            const result = await db.query(query, params);
            const hourlyData = result.rows;
            
            // Cache the result
            if (this.cacheEnabled) {
                advancedCache.set(cacheKey, hourlyData, CacheStrategies.ANALYTICS);
            }
            
            this.trackQuery('getHourlyPerformanceOptimized', Date.now() - startTime, false);
            return hourlyData;
            
        } catch (error) {
            console.error('❌ Error in getHourlyPerformanceOptimized:', error);
            this.trackQuery('getHourlyPerformanceOptimized', Date.now() - startTime, false, error);
            throw error;
        }
    }

    // Get daily statistics
    async getDailyStatsOptimized(days = 30) {
        const startTime = Date.now();
        const cacheKey = CacheKeys.analyticsDaily(`last_${days}_days`);
        
        try {
            // Try cache first
            if (this.cacheEnabled) {
                const cached = advancedCache.get(cacheKey);
                if (cached) {
                    this.trackQuery('getDailyStatsOptimized', Date.now() - startTime, true);
                    return cached;
                }
            }

            // Try materialized view first
            let query, params;
            
            try {
                query = `
                    SELECT 
                        date,
                        total_summaries,
                        successful_summaries,
                        failed_summaries,
                        avg_duration,
                        unique_users,
                        privacy_policies,
                        terms_of_service,
                        unknown_docs,
                        avg_word_count,
                        avg_complexity,
                        avg_good_practices,
                        avg_risk_score
                    FROM mv_daily_stats
                    WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
                    ORDER BY date DESC
                `;
                params = [];
            } catch (error) {
                // Fallback to regular query
                query = `
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as total_summaries,
                        COUNT(CASE WHEN success = true THEN 1 END) as successful_summaries,
                        COUNT(CASE WHEN success = false THEN 1 END) as failed_summaries,
                        AVG(CASE WHEN success = true THEN duration END) as avg_duration,
                        COUNT(DISTINCT user_id) as unique_users
                    FROM summaries
                    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `;
                params = [];
            }

            const result = await db.query(query, params);
            const dailyData = result.rows;
            
            // Cache the result
            if (this.cacheEnabled) {
                advancedCache.set(cacheKey, dailyData, CacheStrategies.ANALYTICS);
            }
            
            this.trackQuery('getDailyStatsOptimized', Date.now() - startTime, false);
            return dailyData;
            
        } catch (error) {
            console.error('❌ Error in getDailyStatsOptimized:', error);
            this.trackQuery('getDailyStatsOptimized', Date.now() - startTime, false, error);
            throw error;
        }
    }

    // Track query performance
    trackQuery(queryName, duration, fromCache = false, error = null) {
        if (!this.queryStats.has(queryName)) {
            this.queryStats.set(queryName, {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                cacheHits: 0,
                cacheMisses: 0,
                errors: 0,
                slowQueries: 0
            });
        }

        const stats = this.queryStats.get(queryName);
        stats.count++;
        stats.totalTime += duration;
        stats.avgTime = stats.totalTime / stats.count;

        if (fromCache) {
            stats.cacheHits++;
        } else {
            stats.cacheMisses++;
        }

        if (error) {
            stats.errors++;
        }

        if (duration > this.slowQueryThreshold) {
            stats.slowQueries++;
            console.warn(`🐌 Slow query detected: ${queryName} - ${duration}ms`);
        }

        // Track in performance monitor
        performanceMonitor.trackDatabaseQuery(duration, queryName);
    }

    // Get query statistics
    getQueryStats() {
        const stats = {};
        for (const [queryName, queryStats] of this.queryStats.entries()) {
            stats[queryName] = {
                ...queryStats,
                cacheHitRate: queryStats.cacheHits + queryStats.cacheMisses > 0 
                    ? ((queryStats.cacheHits / (queryStats.cacheHits + queryStats.cacheMisses)) * 100).toFixed(2) + '%'
                    : '0%',
                errorRate: queryStats.count > 0 
                    ? ((queryStats.errors / queryStats.count) * 100).toFixed(2) + '%'
                    : '0%',
                slowQueryRate: queryStats.count > 0 
                    ? ((queryStats.slowQueries / queryStats.count) * 100).toFixed(2) + '%'
                    : '0%'
            };
        }
        return stats;
    }

    // Clear query statistics
    clearStats() {
        this.queryStats.clear();
        console.log('📊 Query statistics cleared');
    }

    // Enable/disable caching
    setCacheEnabled(enabled) {
        this.cacheEnabled = enabled;
        console.log(`💾 Query caching ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Refresh materialized views
    async refreshMaterializedViews() {
        const startTime = Date.now();
        
        try {
            await db.query('SELECT refresh_analytics_views()');
            const duration = Date.now() - startTime;
            
            console.log(`✅ Materialized views refreshed in ${duration}ms`);
            this.trackQuery('refreshMaterializedViews', duration, false);
            
        } catch (error) {
            console.error('❌ Error refreshing materialized views:', error);
            this.trackQuery('refreshMaterializedViews', Date.now() - startTime, false, error);
            throw error;
        }
    }

    // Cleanup old data
    async cleanupOldData() {
        const startTime = Date.now();
        
        try {
            await db.query('SELECT cleanup_old_data()');
            const duration = Date.now() - startTime;
            
            console.log(`✅ Old data cleanup completed in ${duration}ms`);
            this.trackQuery('cleanupOldData', duration, false);
            
        } catch (error) {
            console.error('❌ Error cleaning up old data:', error);
            this.trackQuery('cleanupOldData', Date.now() - startTime, false, error);
            throw error;
        }
    }
}

// Singleton instance
const queryOptimizer = new QueryOptimizer();

export { queryOptimizer };
export default queryOptimizer;
