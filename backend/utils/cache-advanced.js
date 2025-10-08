// Advanced Cache System for ToS & Privacy Summarizer
// Implements multi-layer caching with content hashing and intelligent strategies

import crypto from 'crypto';
import { performanceMonitor } from './performance.js';

class AdvancedCacheManager {
    constructor() {
        // L1 Cache - In-memory (fastest)
        this.l1Cache = new Map();
        this.l1Stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
        
        // L2 Cache - Persistent (medium speed)
        this.l2Cache = new Map();
        this.l2Stats = { hits: 0, misses: 0, sets: 0 };
        
        // Configuration
        this.maxL1Size = 1000; // Maximum items in L1 cache
        this.maxL2Size = 5000; // Maximum items in L2 cache
        this.compressionEnabled = true;
        
        // Cache strategies for different data types
        this.cacheStrategies = {
            SUMMARY: {
                TTL: 24 * 60 * 60 * 1000, // 24 hours
                COMPRESSION: true,
                PRIORITY: 'high',
                L1_TTL: 60 * 60 * 1000, // 1 hour in L1
                L2_TTL: 24 * 60 * 60 * 1000 // 24 hours in L2
            },
            USER_DATA: {
                TTL: 5 * 60 * 1000, // 5 minutes
                COMPRESSION: false,
                PRIORITY: 'medium',
                L1_TTL: 2 * 60 * 1000, // 2 minutes in L1
                L2_TTL: 5 * 60 * 1000 // 5 minutes in L2
            },
            ANALYTICS: {
                TTL: 2 * 60 * 1000, // 2 minutes
                COMPRESSION: true,
                PRIORITY: 'low',
                L1_TTL: 30 * 1000, // 30 seconds in L1
                L2_TTL: 2 * 60 * 1000 // 2 minutes in L2
            },
            QUERY_RESULT: {
                TTL: 10 * 60 * 1000, // 10 minutes
                COMPRESSION: true,
                PRIORITY: 'medium',
                L1_TTL: 2 * 60 * 1000, // 2 minutes in L1
                L2_TTL: 10 * 60 * 1000 // 10 minutes in L2
            }
        };
        
        // Start periodic cleanup
        this.startPeriodicCleanup();
        
        console.log('🚀 Advanced Cache Manager initialized');
    }

    // Generate content hash for intelligent caching
    generateContentHash(text, url, additionalParams = {}) {
        const content = JSON.stringify({
            text: text.substring(0, 1000), // Use first 1000 chars for hash
            url: url,
            ...additionalParams
        });
        
        return crypto.createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, 16); // Use first 16 chars for shorter keys
    }

    // Generate cache key with strategy
    generateKey(prefix, ...params) {
        return `${prefix}:${params.join(':')}`;
    }

    // Compress data if enabled
    compress(data) {
        if (!this.compressionEnabled) return data;
        
        try {
            // Simple compression using JSON stringify with reduced precision
            if (typeof data === 'object') {
                return JSON.stringify(data);
            }
            return data;
        } catch (error) {
            console.warn('⚠️ Compression failed, using original data:', error);
            return data;
        }
    }

    // Decompress data if needed
    decompress(data) {
        if (!this.compressionEnabled) return data;
        
        try {
            if (typeof data === 'string' && data.startsWith('{')) {
                return JSON.parse(data);
            }
            return data;
        } catch (error) {
            console.warn('⚠️ Decompression failed, using original data:', error);
            return data;
        }
    }

    // Set cache entry with strategy
    set(key, value, strategy = 'SUMMARY') {
        const startTime = Date.now();
        
        try {
            const config = this.cacheStrategies[strategy] || this.cacheStrategies.SUMMARY;
            const compressedValue = this.compress(value);
            
            const entry = {
                value: compressedValue,
                strategy: strategy,
                createdAt: Date.now(),
                accessCount: 0,
                lastAccessed: Date.now()
            };

            // Set in L1 cache
            if (config.PRIORITY === 'high' || config.PRIORITY === 'medium') {
                entry.l1Expiry = Date.now() + config.L1_TTL;
                this.l1Cache.set(key, entry);
                this.l1Stats.sets++;
                
                // Evict if L1 cache is full
                if (this.l1Cache.size > this.maxL1Size) {
                    this.evictL1LRU();
                }
            }

            // Set in L2 cache
            entry.l2Expiry = Date.now() + config.L2_TTL;
            this.l2Cache.set(key, entry);
            this.l2Stats.sets++;

            // Evict if L2 cache is full
            if (this.l2Cache.size > this.maxL2Size) {
                this.evictL2LRU();
            }

            const duration = Date.now() - startTime;
            performanceMonitor.trackCacheOperation('set', duration, strategy);
            
            console.log(`💾 Cache SET: ${key} (strategy: ${strategy}, L1: ${this.l1Cache.has(key)}, L2: ${this.l2Cache.has(key)})`);
            return true;
        } catch (error) {
            console.error('❌ Cache SET error:', error);
            return false;
        }
    }

    // Get cache entry with multi-layer lookup
    get(key) {
        const startTime = Date.now();
        
        try {
            // Try L1 cache first
            let entry = this.l1Cache.get(key);
            if (entry && entry.l1Expiry && Date.now() < entry.l1Expiry) {
                entry.accessCount++;
                entry.lastAccessed = Date.now();
                this.l1Stats.hits++;
                
                const duration = Date.now() - startTime;
                performanceMonitor.trackCacheOperation('hit_l1', duration, entry.strategy);
                
                console.log(`💾 Cache HIT L1: ${key}`);
                return this.decompress(entry.value);
            }

            // Try L2 cache
            entry = this.l2Cache.get(key);
            if (entry && entry.l2Expiry && Date.now() < entry.l2Expiry) {
                entry.accessCount++;
                entry.lastAccessed = Date.now();
                this.l2Stats.hits++;
                
                // Promote to L1 if it's a high-priority item
                const config = this.cacheStrategies[entry.strategy];
                if (config && config.PRIORITY === 'high') {
                    entry.l1Expiry = Date.now() + config.L1_TTL;
                    this.l1Cache.set(key, entry);
                }
                
                const duration = Date.now() - startTime;
                performanceMonitor.trackCacheOperation('hit_l2', duration, entry.strategy);
                
                console.log(`💾 Cache HIT L2: ${key}`);
                return this.decompress(entry.value);
            }

            // Cache miss
            this.l1Stats.misses++;
            this.l2Stats.misses++;
            
            const duration = Date.now() - startTime;
            performanceMonitor.trackCacheOperation('miss', duration, 'unknown');
            
            console.log(`💾 Cache MISS: ${key}`);
            return null;
        } catch (error) {
            console.error('❌ Cache GET error:', error);
            this.l1Stats.misses++;
            this.l2Stats.misses++;
            return null;
        }
    }

    // Delete cache entry from both layers
    delete(key) {
        try {
            const l1Deleted = this.l1Cache.delete(key);
            const l2Deleted = this.l2Cache.delete(key);
            
            if (l1Deleted || l2Deleted) {
                console.log(`💾 Cache DELETE: ${key}`);
            }
            
            return l1Deleted || l2Deleted;
        } catch (error) {
            console.error('❌ Cache DELETE error:', error);
            return false;
        }
    }

    // Evict least recently used items from L1
    evictL1LRU() {
        const entries = Array.from(this.l1Cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        const toEvict = Math.floor(this.maxL1Size * 0.1); // Evict 10%
        for (let i = 0; i < toEvict && i < entries.length; i++) {
            this.l1Cache.delete(entries[i][0]);
            this.l1Stats.evictions++;
        }
        
        console.log(`🧹 L1 Cache evicted ${toEvict} items`);
    }

    // Evict least recently used items from L2
    evictL2LRU() {
        const entries = Array.from(this.l2Cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        const toEvict = Math.floor(this.maxL2Size * 0.1); // Evict 10%
        for (let i = 0; i < toEvict && i < entries.length; i++) {
            this.l2Cache.delete(entries[i][0]);
        }
        
        console.log(`🧹 L2 Cache evicted ${toEvict} items`);
    }

    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        let l1Cleaned = 0;
        let l2Cleaned = 0;
        
        // Clean L1 cache
        for (const [key, entry] of this.l1Cache.entries()) {
            if (entry.l1Expiry && now > entry.l1Expiry) {
                this.l1Cache.delete(key);
                l1Cleaned++;
            }
        }
        
        // Clean L2 cache
        for (const [key, entry] of this.l2Cache.entries()) {
            if (entry.l2Expiry && now > entry.l2Expiry) {
                this.l2Cache.delete(key);
                l2Cleaned++;
            }
        }
        
        if (l1Cleaned > 0 || l2Cleaned > 0) {
            console.log(`🧹 Cache cleanup: L1=${l1Cleaned}, L2=${l2Cleaned}`);
        }
        
        return { l1Cleaned, l2Cleaned };
    }

    // Get comprehensive cache statistics
    getStats() {
        const l1Total = this.l1Stats.hits + this.l1Stats.misses;
        const l2Total = this.l2Stats.hits + this.l2Stats.misses;
        
        const l1HitRate = l1Total > 0 ? (this.l1Stats.hits / l1Total * 100).toFixed(2) : 0;
        const l2HitRate = l2Total > 0 ? (this.l2Stats.hits / l2Total * 100).toFixed(2) : 0;
        
        return {
            l1: {
                ...this.l1Stats,
                hitRate: `${l1HitRate}%`,
                size: this.l1Cache.size,
                maxSize: this.maxL1Size,
                utilization: `${((this.l1Cache.size / this.maxL1Size) * 100).toFixed(1)}%`
            },
            l2: {
                ...this.l2Stats,
                hitRate: `${l2HitRate}%`,
                size: this.l2Cache.size,
                maxSize: this.maxL2Size,
                utilization: `${((this.l2Cache.size / this.maxL2Size) * 100).toFixed(1)}%`
            },
            overall: {
                totalHits: this.l1Stats.hits + this.l2Stats.hits,
                totalMisses: this.l1Stats.misses + this.l2Stats.misses,
                totalSets: this.l1Stats.sets + this.l2Stats.sets,
                evictions: this.l1Stats.evictions
            }
        };
    }

    // Clear all cache
    clear() {
        this.l1Cache.clear();
        this.l2Cache.clear();
        
        this.l1Stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
        this.l2Stats = { hits: 0, misses: 0, sets: 0 };
        
        console.log('🧹 Advanced cache cleared');
    }

    // Cache wrapper for async functions with intelligent key generation
    async cached(keyGenerator, asyncFn, strategy = 'SUMMARY', params = {}) {
        const key = typeof keyGenerator === 'function' ? keyGenerator(params) : keyGenerator;
        
        // Try to get from cache first
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        
        // Execute function and cache result
        try {
            const result = await asyncFn();
            this.set(key, result, strategy);
            return result;
        } catch (error) {
            console.error('❌ Cached function error:', error);
            throw error;
        }
    }

    // Start periodic cleanup
    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    // Preload popular content
    async preloadPopularContent(popularItems) {
        console.log(`🔄 Preloading ${popularItems.length} popular items...`);
        
        for (const item of popularItems) {
            try {
                const key = this.generateKey('popular', item.type, item.id);
                if (!this.get(key)) {
                    // Simulate loading popular content
                    const content = { ...item, preloaded: true, timestamp: Date.now() };
                    this.set(key, content, 'SUMMARY');
                }
            } catch (error) {
                console.error(`❌ Error preloading item ${item.id}:`, error);
            }
        }
        
        console.log('✅ Popular content preloaded');
    }
}

// Singleton instance
const advancedCache = new AdvancedCacheManager();

// Export cache strategies and key generators
export const CacheStrategies = {
    SUMMARY: 'SUMMARY',
    USER_DATA: 'USER_DATA',
    ANALYTICS: 'ANALYTICS',
    QUERY_RESULT: 'QUERY_RESULT'
};

export const CacheKeys = {
    summary: (contentHash) => advancedCache.generateKey('summary', contentHash),
    userCredits: (userId) => advancedCache.generateKey('user', 'credits', userId),
    userProfile: (userId) => advancedCache.generateKey('user', 'profile', userId),
    userStats: (userId) => advancedCache.generateKey('user', 'stats', userId),
    analyticsOverview: () => advancedCache.generateKey('analytics', 'overview'),
    analyticsHourly: (date) => advancedCache.generateKey('analytics', 'hourly', date),
    analyticsDaily: (date) => advancedCache.generateKey('analytics', 'daily', date),
    userSummaries: (userId, limit, offset) => 
        advancedCache.generateKey('user', 'summaries', userId, limit, offset),
    popularContent: (type, id) => advancedCache.generateKey('popular', type, id),
    contentHash: (text, url, params = {}) => advancedCache.generateContentHash(text, url, params)
};

export { advancedCache };
export default advancedCache;
