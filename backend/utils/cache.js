// Cache system for ToS & Privacy Summarizer
// Implements intelligent caching for summaries and database queries

class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        this.maxMemorySize = 100; // Maximum items in memory cache
        this.defaultTTL = 3600000; // 1 hour in milliseconds
    }

    // Generate cache key
    generateKey(prefix, ...params) {
        const key = `${prefix}:${params.join(':')}`;
        return key;
    }

    // Set cache entry
    set(key, value, ttl = this.defaultTTL) {
        try {
            const expiry = Date.now() + ttl;
            this.memoryCache.set(key, {
                value,
                expiry,
                createdAt: Date.now()
            });
            
            this.cacheStats.sets++;
            
            // Clean up expired entries periodically
            if (this.memoryCache.size > this.maxMemorySize) {
                this.cleanup();
            }
            
            console.log(`💾 Cache SET: ${key} (TTL: ${ttl}ms)`);
            return true;
        } catch (error) {
            console.error('❌ Cache SET error:', error);
            return false;
        }
    }

    // Get cache entry
    get(key) {
        try {
            const entry = this.memoryCache.get(key);
            
            if (!entry) {
                this.cacheStats.misses++;
                console.log(`💾 Cache MISS: ${key}`);
                return null;
            }
            
            // Check if expired
            if (Date.now() > entry.expiry) {
                this.memoryCache.delete(key);
                this.cacheStats.misses++;
                console.log(`💾 Cache EXPIRED: ${key}`);
                return null;
            }
            
            this.cacheStats.hits++;
            console.log(`💾 Cache HIT: ${key}`);
            return entry.value;
        } catch (error) {
            console.error('❌ Cache GET error:', error);
            this.cacheStats.misses++;
            return null;
        }
    }

    // Delete cache entry
    delete(key) {
        try {
            const deleted = this.memoryCache.delete(key);
            if (deleted) {
                this.cacheStats.deletes++;
                console.log(`💾 Cache DELETE: ${key}`);
            }
            return deleted;
        } catch (error) {
            console.error('❌ Cache DELETE error:', error);
            return false;
        }
    }

    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now > entry.expiry) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
        }
        
        return cleaned;
    }

    // Get cache statistics
    getStats() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
        
        return {
            ...this.cacheStats,
            hitRate: `${hitRate}%`,
            size: this.memoryCache.size,
            maxSize: this.maxMemorySize
        };
    }

    // Clear all cache
    clear() {
        this.memoryCache.clear();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        console.log('🧹 Cache cleared');
    }

    // Cache wrapper for async functions
    async cached(key, asyncFn, ttl = this.defaultTTL) {
        // Try to get from cache first
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        
        // Execute function and cache result
        try {
            const result = await asyncFn();
            this.set(key, result, ttl);
            return result;
        } catch (error) {
            console.error('❌ Cached function error:', error);
            throw error;
        }
    }
}

// Singleton instance
const cache = new CacheManager();

// Cache strategies for different data types
const CacheStrategies = {
    // Summary cache - longer TTL for successful summaries
    SUMMARY: {
        SUCCESS: 24 * 60 * 60 * 1000, // 24 hours
        FAILED: 5 * 60 * 1000, // 5 minutes
        PENDING: 2 * 60 * 1000 // 2 minutes
    },
    
    // User data cache - medium TTL
    USER: {
        CREDITS: 5 * 60 * 1000, // 5 minutes
        PROFILE: 15 * 60 * 1000, // 15 minutes
        STATS: 10 * 60 * 1000 // 10 minutes
    },
    
    // Analytics cache - shorter TTL for real-time data
    ANALYTICS: {
        OVERVIEW: 2 * 60 * 1000, // 2 minutes
        HOURLY: 5 * 60 * 1000, // 5 minutes
        DAILY: 15 * 60 * 1000 // 15 minutes
    },
    
    // Database query cache
    QUERY: {
        FREQUENT: 10 * 60 * 1000, // 10 minutes
        RARE: 30 * 60 * 1000, // 30 minutes
        STATIC: 60 * 60 * 1000 // 1 hour
    }
};

// Cache key generators
const CacheKeys = {
    summary: (summaryId) => cache.generateKey('summary', summaryId),
    userCredits: (userId) => cache.generateKey('user', 'credits', userId),
    userProfile: (userId) => cache.generateKey('user', 'profile', userId),
    userStats: (userId) => cache.generateKey('user', 'stats', userId),
    analyticsOverview: () => cache.generateKey('analytics', 'overview'),
    analyticsHourly: (date) => cache.generateKey('analytics', 'hourly', date),
    analyticsDaily: (date) => cache.generateKey('analytics', 'daily', date),
    userSummaries: (userId, limit, offset) => 
        cache.generateKey('user', 'summaries', userId, limit, offset)
};

export { cache, CacheStrategies, CacheKeys };
export default cache;
