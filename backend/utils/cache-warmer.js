// Cache Warming System for ToS & Privacy Summarizer
// Automatically preloads popular content and predicts user needs

import db from './database.js';
import { advancedCache, CacheKeys, CacheStrategies } from './cache-advanced.js';

class CacheWarmer {
    constructor() {
        this.isRunning = false;
        this.warmingInterval = null;
        this.popularContentCache = new Map();
        this.userPatterns = new Map();
        this.warmingStats = {
            totalWarmed: 0,
            successfulWarms: 0,
            failedWarms: 0,
            lastWarmTime: null
        };
        
        console.log('🔥 Cache Warmer initialized');
    }

    // Start automatic cache warming
    startWarming(intervalMinutes = 30) {
        if (this.isRunning) {
            console.log('⚠️ Cache warming already running');
            return;
        }

        this.isRunning = true;
        this.warmingInterval = setInterval(async () => {
            await this.performWarmingCycle();
        }, intervalMinutes * 60 * 1000);

        // Initial warmup
        this.performWarmingCycle();
        
        console.log(`🔥 Cache warming started (interval: ${intervalMinutes}min)`);
    }

    // Stop cache warming
    stopWarming() {
        if (this.warmingInterval) {
            clearInterval(this.warmingInterval);
            this.warmingInterval = null;
        }
        this.isRunning = false;
        console.log('🔥 Cache warming stopped');
    }

    // Perform a complete warming cycle
    async performWarmingCycle() {
        const startTime = Date.now();
        console.log('🔥 Starting cache warming cycle...');

        try {
            // 1. Warm popular summaries
            await this.warmPopularSummaries();
            
            // 2. Warm user analytics
            await this.warmAnalyticsData();
            
            // 3. Warm frequent queries
            await this.warmFrequentQueries();
            
            // 4. Warm user-specific content
            await this.warmUserSpecificContent();
            
            // 5. Clean up old cache entries
            await this.cleanupOldEntries();

            const duration = Date.now() - startTime;
            this.warmingStats.lastWarmTime = new Date().toISOString();
            this.warmingStats.totalWarmed++;
            this.warmingStats.successfulWarms++;

            console.log(`✅ Cache warming cycle completed in ${duration}ms`);
            
        } catch (error) {
            console.error('❌ Cache warming cycle failed:', error);
            this.warmingStats.failedWarms++;
        }
    }

    // Warm popular summaries based on frequency
    async warmPopularSummaries() {
        try {
            console.log('🔥 Warming popular summaries...');
            
            const popularSummaries = await db.query(`
                SELECT 
                    url, 
                    title,
                    document_type,
                    COUNT(*) as frequency,
                    AVG(duration) as avg_duration,
                    MAX(created_at) as last_created
                FROM summaries 
                WHERE created_at > NOW() - INTERVAL '7 days'
                AND success = true
                GROUP BY url, title, document_type
                HAVING COUNT(*) >= 3
                ORDER BY frequency DESC, last_created DESC
                LIMIT 50
            `);

            for (const summary of popularSummaries.rows) {
                const contentHash = advancedCache.generateContentHash(
                    summary.title || '', 
                    summary.url, 
                    { type: summary.document_type }
                );
                
                const cacheKey = CacheKeys.summary(contentHash);
                
                // Check if already cached
                if (!advancedCache.get(cacheKey)) {
                    const summaryData = {
                        url: summary.url,
                        title: summary.title,
                        document_type: summary.document_type,
                        frequency: summary.frequency,
                        avg_duration: summary.avg_duration,
                        last_created: summary.last_created,
                        warmed_at: Date.now()
                    };
                    
                    advancedCache.set(cacheKey, summaryData, CacheStrategies.SUMMARY);
                    this.popularContentCache.set(summary.url, summaryData);
                }
            }
            
            console.log(`✅ Warmed ${popularSummaries.rows.length} popular summaries`);
            
        } catch (error) {
            console.error('❌ Error warming popular summaries:', error);
        }
    }

    // Warm analytics data
    async warmAnalyticsData() {
        try {
            console.log('🔥 Warming analytics data...');
            
            // Warm overview analytics
            const overviewKey = CacheKeys.analyticsOverview();
            if (!advancedCache.get(overviewKey)) {
                const overview = await db.getAnalyticsOverview();
                advancedCache.set(overviewKey, overview, CacheStrategies.ANALYTICS);
            }

            // Warm hourly analytics for last 7 days
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const hourlyKey = CacheKeys.analyticsHourly(dateStr);
                if (!advancedCache.get(hourlyKey)) {
                    const hourly = await db.getAnalyticsHourly();
                    advancedCache.set(hourlyKey, hourly, CacheStrategies.ANALYTICS);
                }
            }

            // Warm daily analytics for last 30 days
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const dailyKey = CacheKeys.analyticsDaily(dateStr);
                if (!advancedCache.get(dailyKey)) {
                    const daily = await db.getAnalyticsDaily();
                    advancedCache.set(dailyKey, daily, CacheStrategies.ANALYTICS);
                }
            }
            
            console.log('✅ Analytics data warmed');
            
        } catch (error) {
            console.error('❌ Error warming analytics data:', error);
        }
    }

    // Warm frequent database queries
    async warmFrequentQueries() {
        try {
            console.log('🔥 Warming frequent queries...');
            
            // Warm user summary queries for active users
            const activeUsers = await db.query(`
                SELECT user_id, COUNT(*) as summary_count
                FROM summaries 
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY user_id
                ORDER BY summary_count DESC
                LIMIT 20
            `);

            for (const user of activeUsers.rows) {
                // Warm first page of user summaries
                const summariesKey = CacheKeys.userSummaries(user.user_id, 20, 0);
                if (!advancedCache.get(summariesKey)) {
                    const summaries = await db.getUserSummaries(user.user_id, 20, 0);
                    advancedCache.set(summariesKey, summaries, CacheStrategies.QUERY_RESULT);
                }

                // Warm user stats
                const statsKey = CacheKeys.userStats(user.user_id);
                if (!advancedCache.get(statsKey)) {
                    const stats = await db.getUserSummaryStats(user.user_id);
                    advancedCache.set(statsKey, stats, CacheStrategies.USER_DATA);
                }
            }
            
            console.log(`✅ Warmed queries for ${activeUsers.rows.length} active users`);
            
        } catch (error) {
            console.error('❌ Error warming frequent queries:', error);
        }
    }

    // Warm user-specific content based on patterns
    async warmUserSpecificContent() {
        try {
            console.log('🔥 Warming user-specific content...');
            
            // Analyze user patterns
            const userPatterns = await db.query(`
                SELECT 
                    user_id,
                    document_type,
                    COUNT(*) as count,
                    MAX(created_at) as last_activity
                FROM summaries 
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY user_id, document_type
                ORDER BY count DESC
            `);

            // Group by user and predict their next likely queries
            const userPredictions = new Map();
            for (const pattern of userPatterns.rows) {
                if (!userPredictions.has(pattern.user_id)) {
                    userPredictions.set(pattern.user_id, []);
                }
                userPredictions.get(pattern.user_id).push({
                    document_type: pattern.document_type,
                    count: pattern.count,
                    last_activity: pattern.last_activity
                });
            }

            // Warm predicted content for top users
            let warmedCount = 0;
            for (const [userId, patterns] of userPredictions.entries()) {
                if (warmedCount >= 10) break; // Limit to top 10 users
                
                // Warm their most common document type
                const topPattern = patterns[0];
                if (topPattern.count >= 3) {
                    const summariesKey = CacheKeys.userSummaries(userId, 10, 0);
                    if (!advancedCache.get(summariesKey)) {
                        const summaries = await db.getUserSummaries(userId, 10, 0);
                        advancedCache.set(summariesKey, summaries, CacheStrategies.QUERY_RESULT);
                        warmedCount++;
                    }
                }
            }
            
            console.log(`✅ Warmed content for ${warmedCount} users`);
            
        } catch (error) {
            console.error('❌ Error warming user-specific content:', error);
        }
    }

    // Clean up old cache entries
    async cleanupOldEntries() {
        try {
            console.log('🔥 Cleaning up old cache entries...');
            
            const cleanupResult = advancedCache.cleanup();
            console.log(`✅ Cleaned up ${cleanupResult.l1Cleaned} L1 and ${cleanupResult.l2Cleaned} L2 entries`);
            
        } catch (error) {
            console.error('❌ Error cleaning up cache:', error);
        }
    }

    // Manually warm specific content
    async warmSpecificContent(type, identifier, data) {
        try {
            let cacheKey;
            
            switch (type) {
                case 'summary':
                    cacheKey = CacheKeys.summary(identifier);
                    break;
                case 'user_summaries':
                    const [userId, limit, offset] = identifier.split(':');
                    cacheKey = CacheKeys.userSummaries(userId, parseInt(limit), parseInt(offset));
                    break;
                case 'analytics':
                    cacheKey = CacheKeys.analyticsOverview();
                    break;
                default:
                    throw new Error(`Unknown content type: ${type}`);
            }

            advancedCache.set(cacheKey, data, CacheStrategies.SUMMARY);
            console.log(`🔥 Manually warmed ${type}: ${identifier}`);
            
        } catch (error) {
            console.error(`❌ Error warming ${type}:`, error);
        }
    }

    // Get warming statistics
    getStats() {
        return {
            ...this.warmingStats,
            isRunning: this.isRunning,
            popularContentCount: this.popularContentCache.size,
            userPatternsCount: this.userPatterns.size
        };
    }

    // Predict user needs based on patterns
    predictUserNeeds(userId) {
        const patterns = this.userPatterns.get(userId) || [];
        const predictions = [];

        // Simple prediction based on frequency
        const documentTypes = {};
        patterns.forEach(pattern => {
            documentTypes[pattern.document_type] = 
                (documentTypes[pattern.document_type] || 0) + pattern.count;
        });

        // Predict most likely next document type
        const sortedTypes = Object.entries(documentTypes)
            .sort(([,a], [,b]) => b - a);

        if (sortedTypes.length > 0) {
            predictions.push({
                type: 'document_type',
                value: sortedTypes[0][0],
                confidence: sortedTypes[0][1] / patterns.length
            });
        }

        return predictions;
    }

    // Update user patterns
    updateUserPattern(userId, documentType, timestamp = Date.now()) {
        if (!this.userPatterns.has(userId)) {
            this.userPatterns.set(userId, []);
        }

        const patterns = this.userPatterns.get(userId);
        patterns.push({
            document_type: documentType,
            timestamp: timestamp
        });

        // Keep only last 50 patterns per user
        if (patterns.length > 50) {
            patterns.splice(0, patterns.length - 50);
        }

        this.userPatterns.set(userId, patterns);
    }
}

// Singleton instance
const cacheWarmer = new CacheWarmer();

export { cacheWarmer };
export default cacheWarmer;
