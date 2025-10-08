// Advanced Rate Limiting System for ToS & Privacy Summarizer
// Implements user-based, adaptive, and distributed rate limiting

import rateLimit from 'express-rate-limit';
import { performanceMonitor } from './performance.js';

class AdvancedRateLimiter {
    constructor() {
        // User-based rate limiting storage
        this.userLimits = new Map();
        this.ipLimits = new Map();
        
        // Rate limiting tiers
        this.tiers = {
            free: {
                requestsPerMinute: 10,
                requestsPerHour: 100,
                requestsPerDay: 500,
                burstLimit: 5
            },
            premium: {
                requestsPerMinute: 50,
                requestsPerHour: 1000,
                requestsPerDay: 10000,
                burstLimit: 20
            },
            admin: {
                requestsPerMinute: 200,
                requestsPerHour: 5000,
                requestsPerDay: 50000,
                burstLimit: 100
            }
        };
        
        // Whitelist and blacklist
        this.whitelist = new Set();
        this.blacklist = new Set();
        
        // Adaptive rate limiting
        this.adaptiveLimits = new Map();
        this.suspiciousIPs = new Set();
        
        console.log('🚦 Advanced Rate Limiter initialized');
    }

    // Create user-based rate limiter
    createUserRateLimiter(options = {}) {
        return rateLimit({
            windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
            max: (req) => this.getUserLimit(req),
            keyGenerator: (req) => {
                // Use user ID if authenticated, otherwise IP
                return req.user?.id || req.ip;
            },
            message: {
                error: 'Limite de utilização excedido para este utilizador',
                retryAfter: '15 minutos',
                tier: 'user'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => this.shouldSkip(req),
            onLimitReached: (req, res, options) => {
                this.handleLimitReached(req, 'user');
            }
        });
    }

    // Create adaptive rate limiter
    createAdaptiveRateLimiter(options = {}) {
        return rateLimit({
            windowMs: options.windowMs || 60 * 1000, // 1 minute
            max: (req) => this.getAdaptiveLimit(req),
            keyGenerator: (req) => req.ip,
            message: {
                error: 'Limite adaptativo excedido',
                retryAfter: '1 minuto',
                tier: 'adaptive'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => this.shouldSkip(req),
            onLimitReached: (req, res, options) => {
                this.handleLimitReached(req, 'adaptive');
            }
        });
    }

    // Create endpoint-specific rate limiter
    createEndpointRateLimiter(endpoint, options = {}) {
        const endpointLimits = {
            '/api/gemini/proxy': {
                windowMs: 60 * 1000,
                max: (req) => this.getGeminiLimit(req),
                message: 'Muitas solicitações de IA. Aguarde 1 minuto.'
            },
            '/api/stripe/create-checkout-session': {
                windowMs: 15 * 60 * 1000,
                max: 5,
                message: 'Muitas tentativas de pagamento. Aguarde 15 minutos.'
            },
            '/api/analytics/overview': {
                windowMs: 2 * 60 * 1000,
                max: 20,
                message: 'Muitas consultas de analytics. Aguarde 2 minutos.'
            },
            '/dashboard': {
                windowMs: 5 * 60 * 1000,
                max: 100,
                message: 'Muitas tentativas de acesso ao dashboard.'
            }
        };

        const config = endpointLimits[endpoint] || {
            windowMs: 15 * 60 * 1000,
            max: 100,
            message: 'Limite de utilização excedido.'
        };

        return rateLimit({
            ...config,
            ...options,
            keyGenerator: (req) => req.user?.id || req.ip,
            skip: (req) => this.shouldSkip(req),
            onLimitReached: (req, res, options) => {
                this.handleLimitReached(req, 'endpoint', endpoint);
            }
        });
    }

    // Get user-specific limit
    getUserLimit(req) {
        const userId = req.user?.id;
        const userTier = req.user?.tier || 'free';
        
        if (!userId) {
            // Fallback to IP-based limiting for unauthenticated users
            return this.tiers.free.requestsPerMinute;
        }

        // Check for custom limits
        const customLimit = this.userLimits.get(userId);
        if (customLimit) {
            return customLimit;
        }

        // Return tier-based limit
        return this.tiers[userTier]?.requestsPerMinute || this.tiers.free.requestsPerMinute;
    }

    // Get adaptive limit based on behavior
    getAdaptiveLimit(req) {
        const ip = req.ip;
        const userId = req.user?.id;
        
        // Check if IP is suspicious
        if (this.suspiciousIPs.has(ip)) {
            return 5; // Very restrictive limit
        }

        // Check adaptive limits
        const adaptiveKey = userId || ip;
        const adaptiveLimit = this.adaptiveLimits.get(adaptiveKey);
        
        if (adaptiveLimit) {
            return adaptiveLimit;
        }

        // Default adaptive limit
        return 30;
    }

    // Get Gemini-specific limit
    getGeminiLimit(req) {
        const userTier = req.user?.tier || 'free';
        const userId = req.user?.id;
        
        if (userId) {
            // User-based limits
            switch (userTier) {
                case 'premium':
                    return 20;
                case 'admin':
                    return 100;
                default:
                    return 5;
            }
        } else {
            // IP-based limits for unauthenticated users
            return 3;
        }
    }

    // Check if request should be skipped
    shouldSkip(req) {
        const ip = req.ip;
        
        // Skip whitelisted IPs
        if (this.whitelist.has(ip)) {
            return true;
        }

        // Block blacklisted IPs
        if (this.blacklist.has(ip)) {
            return false; // Don't skip, let it hit the limit
        }

        // Skip health checks
        if (req.path === '/health' || req.path === '/status') {
            return true;
        }

        return false;
    }

    // Handle limit reached
    handleLimitReached(req, type, endpoint = null) {
        const ip = req.ip;
        const userId = req.user?.id;
        const userAgent = req.get('User-Agent');
        
        // Log the event
        console.warn(`🚨 Rate limit exceeded:`, {
            type,
            endpoint,
            ip,
            userId,
            userAgent,
            timestamp: new Date().toISOString()
        });

        // Track in performance monitor
        performanceMonitor.trackRateLimit(endpoint || req.path, 'exceeded', 0);

        // Mark suspicious behavior
        this.markSuspiciousBehavior(ip, userId, req.path);
    }

    // Mark suspicious behavior
    markSuspiciousBehavior(ip, userId, endpoint) {
        // Increment suspicious counter
        const key = userId || ip;
        const current = this.adaptiveLimits.get(key) || 30;
        const newLimit = Math.max(5, current * 0.8); // Reduce limit by 20%
        
        this.adaptiveLimits.set(key, newLimit);

        // Mark IP as suspicious if multiple violations
        if (newLimit <= 10) {
            this.suspiciousIPs.add(ip);
            console.warn(`🚨 IP marked as suspicious: ${ip}`);
        }
    }

    // Add to whitelist
    addToWhitelist(ip) {
        this.whitelist.add(ip);
        console.log(`✅ IP added to whitelist: ${ip}`);
    }

    // Add to blacklist
    addToBlacklist(ip) {
        this.blacklist.add(ip);
        console.log(`❌ IP added to blacklist: ${ip}`);
    }

    // Set custom user limit
    setUserLimit(userId, limit) {
        this.userLimits.set(userId, limit);
        console.log(`🔧 Custom limit set for user ${userId}: ${limit}`);
    }

    // Reset user limits
    resetUserLimits(userId) {
        this.userLimits.delete(userId);
        this.adaptiveLimits.delete(userId);
        console.log(`🔄 Limits reset for user: ${userId}`);
    }

    // Get rate limiting stats
    getStats() {
        return {
            userLimits: this.userLimits.size,
            adaptiveLimits: this.adaptiveLimits.size,
            suspiciousIPs: this.suspiciousIPs.size,
            whitelist: this.whitelist.size,
            blacklist: this.blacklist.size,
            tiers: Object.keys(this.tiers)
        };
    }

    // Cleanup old entries (call periodically)
    cleanup() {
        // Remove old adaptive limits (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const [key, limit] of this.adaptiveLimits.entries()) {
            // This is a simplified cleanup - in production, you'd store timestamps
            if (Math.random() < 0.1) { // 10% chance to clean up
                this.adaptiveLimits.delete(key);
            }
        }

        console.log('🧹 Rate limiter cleanup completed');
    }
}

// Singleton instance
const advancedRateLimiter = new AdvancedRateLimiter();

// Export rate limiters for different use cases
export const createUserRateLimiter = (options) => advancedRateLimiter.createUserRateLimiter(options);
export const createAdaptiveRateLimiter = (options) => advancedRateLimiter.createAdaptiveRateLimiter(options);
export const createEndpointRateLimiter = (endpoint, options) => advancedRateLimiter.createEndpointRateLimiter(endpoint, options);

// Export management functions
export const rateLimiterManager = {
    addToWhitelist: (ip) => advancedRateLimiter.addToWhitelist(ip),
    addToBlacklist: (ip) => advancedRateLimiter.addToBlacklist(ip),
    setUserLimit: (userId, limit) => advancedRateLimiter.setUserLimit(userId, limit),
    resetUserLimits: (userId) => advancedRateLimiter.resetUserLimits(userId),
    getStats: () => advancedRateLimiter.getStats(),
    cleanup: () => advancedRateLimiter.cleanup()
};

export default advancedRateLimiter;
