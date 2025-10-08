// Advanced Rate Limiting Middleware for ToS & Privacy Summarizer
// Integrates user-based, adaptive, and endpoint-specific rate limiting

import { 
    createUserRateLimiter, 
    createAdaptiveRateLimiter, 
    createEndpointRateLimiter,
    rateLimiterManager 
} from '../utils/rate-limiter-advanced.js';
import { logSecurityEvent, logApiRequest } from '../utils/audit-logger.js';

// Middleware para aplicar rate limiting baseado no endpoint
export const applyAdvancedRateLimiting = (app) => {
    console.log('🚦 Applying advanced rate limiting middleware...');

    // Rate limiting geral por utilizador
    const userRateLimiter = createUserRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutos
        message: {
            error: 'Limite de utilização excedido para este utilizador',
            retryAfter: '15 minutos',
            tier: 'user'
        }
    });

    // Rate limiting adaptativo por IP
    const adaptiveRateLimiter = createAdaptiveRateLimiter({
        windowMs: 60 * 1000, // 1 minuto
        message: {
            error: 'Limite adaptativo excedido',
            retryAfter: '1 minuto',
            tier: 'adaptive'
        }
    });

    // Rate limiting específico por endpoint
    const endpointLimiters = {
        '/api/gemini/proxy': createEndpointRateLimiter('/api/gemini/proxy'),
        '/api/stripe/create-checkout-session': createEndpointRateLimiter('/api/stripe/create-checkout-session'),
        '/api/analytics/overview': createEndpointRateLimiter('/api/analytics/overview'),
        '/dashboard': createEndpointRateLimiter('/dashboard')
    };

    // Aplicar rate limiting adaptativo a todas as rotas
    app.use(adaptiveRateLimiter);

    // Aplicar rate limiting por utilizador às rotas da API
    app.use('/api/', userRateLimiter);

    // Aplicar rate limiting específico por endpoint
    Object.entries(endpointLimiters).forEach(([endpoint, limiter]) => {
        app.use(endpoint, limiter);
    });

    // Middleware para logging de rate limiting
    app.use((req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log API request
            const responseTime = Date.now() - req.startTime;
            logApiRequest(req, res, responseTime);
            
            return originalSend.call(this, data);
        };
        
        req.startTime = Date.now();
        next();
    });

    console.log('✅ Advanced rate limiting middleware applied');
};

// Middleware para autenticação e extração de utilizador
export const extractUserForRateLimiting = (req, res, next) => {
    // Tentar extrair utilizador do token JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            // Aqui você decodificaria o JWT para extrair o utilizador
            // Por agora, vamos simular
            req.user = {
                id: `user_${Date.now()}`,
                tier: 'free' // ou 'premium', 'admin'
            };
        } catch (error) {
            // Token inválido, continuar sem utilizador
        }
    }
    
    next();
};

// Middleware para logging de eventos de segurança
export const securityEventLogger = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log eventos de segurança
        if (res.statusCode >= 400) {
            logSecurityEvent('api_error', 2, {
                statusCode: res.statusCode,
                path: req.path,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

// Middleware para detecção de comportamento suspeito
export const suspiciousActivityDetector = (req, res, next) => {
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    const path = req.path;
    
    // Detectar padrões suspeitos
    const suspiciousPatterns = [
        /bot|crawler|spider/i.test(userAgent),
        /\.\.\//.test(path), // Path traversal
        /<script/i.test(req.url), // XSS attempt
        req.url.length > 2000, // Very long URL
        Object.keys(req.query).length > 50 // Too many query parameters
    ];
    
    if (suspiciousPatterns.some(pattern => pattern === true)) {
        logSecurityEvent('suspicious_activity', 3, {
            ip,
            userAgent,
            path,
            patterns: suspiciousPatterns,
            query: req.query
        });
        
        // Adicionar IP à lista de suspeitos
        rateLimiterManager.addToBlacklist(ip);
    }
    
    next();
};

// Middleware para rate limiting de login
export const loginRateLimiter = createUserRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas de login por utilizador
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        retryAfter: '15 minutos',
        tier: 'login'
    },
    skipSuccessfulRequests: true, // Não contar logins bem-sucedidos
    onLimitReached: (req, res, options) => {
        logSecurityEvent('login_rate_limit_exceeded', 3, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            attempts: 5
        });
    }
});

// Middleware para rate limiting de pagamentos
export const paymentRateLimiter = createUserRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 tentativas de pagamento por hora
    message: {
        error: 'Muitas tentativas de pagamento. Tente novamente em 1 hora.',
        retryAfter: '1 hora',
        tier: 'payment'
    },
    onLimitReached: (req, res, options) => {
        logSecurityEvent('payment_rate_limit_exceeded', 3, {
            userId: req.user?.id,
            ip: req.ip,
            attempts: 3
        });
    }
});

// Função para configurar rate limiting personalizado
export const configureCustomRateLimiting = (userId, limits) => {
    rateLimiterManager.setUserLimit(userId, limits.requestsPerMinute);
    console.log(`🔧 Custom rate limiting configured for user ${userId}:`, limits);
};

// Função para resetar rate limiting de utilizador
export const resetUserRateLimiting = (userId) => {
    rateLimiterManager.resetUserLimits(userId);
    console.log(`🔄 Rate limiting reset for user: ${userId}`);
};

// Função para obter estatísticas de rate limiting
export const getRateLimitingStats = () => {
    return rateLimiterManager.getStats();
};

// Função para adicionar IP à whitelist
export const whitelistIP = (ip) => {
    rateLimiterManager.addToWhitelist(ip);
    console.log(`✅ IP whitelisted: ${ip}`);
};

// Função para adicionar IP à blacklist
export const blacklistIP = (ip) => {
    rateLimiterManager.addToBlacklist(ip);
    console.log(`❌ IP blacklisted: ${ip}`);
};

// Middleware para cleanup periódico
export const setupRateLimitingCleanup = () => {
    // Cleanup a cada hora
    setInterval(() => {
        rateLimiterManager.cleanup();
    }, 60 * 60 * 1000);
    
    console.log('🧹 Rate limiting cleanup scheduled');
};

export default {
    applyAdvancedRateLimiting,
    extractUserForRateLimiting,
    securityEventLogger,
    suspiciousActivityDetector,
    loginRateLimiter,
    paymentRateLimiter,
    configureCustomRateLimiting,
    resetUserRateLimiting,
    getRateLimitingStats,
    whitelistIP,
    blacklistIP,
    setupRateLimitingCleanup
};
