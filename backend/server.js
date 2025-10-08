import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para Vercel
app.set('trust proxy', 1);

// Middleware de segurança
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(morgan('combined'));

// Inicializar sistema de alertas
const alertSystem = new AlertSystem();
alertSystem.addChannel(new ConsoleAlertChannel());

// Middleware para monitorização e alertas
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end para capturar métricas
    const originalEnd = res.end;
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        
        // Track performance
        performanceMonitor.trackRequest(
            req.path,
            req.method,
            res.statusCode,
            responseTime
        );
        
        // Check for alerts (async, não bloqueia resposta)
        setImmediate(async () => {
            try {
                const metrics = performanceMonitor.getMetrics();
                const cacheStats = advancedCache.getStats();
                
                await alertSystem.checkMetrics({
                    avgResponseTime: metrics.requests.avgResponseTime,
                    errorRate: metrics.rates.errorRate,
                    healthScore: 100 - parseFloat(metrics.rates.errorRate),
                    cacheHitRate: cacheStats.overall?.hitRate || '0%'
                });
            } catch (error) {
                console.error('❌ Alert system error:', error);
            }
        });
        
        originalEnd.apply(this, args);
    };
    
    next();
});

// CORS configurado para a extensão e dashboard
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sem origin (extensões Chrome, Postman, arquivos locais, etc.)
        if (!origin) return callback(null, true);
        
        // Permitir extensões Chrome
        if (origin.startsWith('chrome-extension://')) {
            return callback(null, true);
        }
        
        // Permitir arquivos locais (file://)
        if (origin.startsWith('file://')) {
            return callback(null, true);
        }
        
        // Permitir URLs específicas
        const allowedOrigins = [
            'https://tos-privacy-summarizer.vercel.app',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:8080'
        ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token']
}));

// Rate limiting - diferentes limites para diferentes endpoints
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por IP
    message: {
        error: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting mais restritivo para endpoints de pagamento
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 tentativas de pagamento por IP
    message: {
        error: 'Muitas tentativas de pagamento. Tente novamente em 15 minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para endpoints de IA (mais restritivo)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // máximo 5 requests de IA por minuto por IP
    message: {
        error: 'Muitas solicitações de IA. Aguarde 1 minuto antes de tentar novamente.',
        retryAfter: '1 minuto'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para dashboard/admin
const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 50, // máximo 50 requests por IP
    message: {
        error: 'Muitas tentativas de acesso ao dashboard. Tente novamente em 5 minutos.',
        retryAfter: '5 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplicar rate limiting específico
app.use('/api/gemini/', aiLimiter);
app.use('/api/stripe/', paymentLimiter);
app.use('/api/analytics/', adminLimiter);
app.use('/api/auth/', adminLimiter);
app.use('/api/', generalLimiter);

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para cookies (simples)
app.use((req, res, next) => {
    req.cookies = {};
    if (req.headers.cookie) {
        console.log('🍪 Raw cookie header:', req.headers.cookie);
        req.headers.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                req.cookies[name] = value;
                console.log(`🍪 Parsed cookie: ${name} = ${value.substring(0, 20)}...`);
            }
        });
    }
    console.log('🍪 Final cookies object:', Object.keys(req.cookies));
    next();
});

// Importar rotas
import geminiRoutes from './routes/gemini.js';
import userRoutes from './routes/users.js';
import creditsRoutes from './routes/credits.js';
import stripeRoutes from './routes/stripe.js';
import { router as analyticsRoutes } from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import db from './utils/database.js';
import auth from './utils/auth.js';
import { performanceMonitor, performanceMiddleware } from './utils/performance.js';
import { advancedCache } from './utils/cache-advanced.js';
import { cacheWarmer } from './utils/cache-warmer.js';
import { queryOptimizer } from './utils/query-optimizer.js';
import { resilientPool } from './utils/database-pool.js';
import { advancedMetrics } from './utils/metrics-advanced.js';
import { AlertSystem, ConsoleAlertChannel } from './utils/alerts.js';

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Middleware para proteger todas as rotas do dashboard
app.use('/dashboard', auth.protectDashboard);

// Servir arquivos estáticos do dashboard (após proteção)
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// Rota de health check
app.get('/health', (req, res) => {
    const health = performanceMonitor.getHealthStatus();
    res.json({ 
        status: health.status,
        score: health.score,
        issues: health.issues,
        timestamp: new Date().toISOString(),
        version: '1.4.0'
    });
});

// Rota de métricas de performance avançadas
app.get('/metrics', (req, res) => {
    const metrics = advancedMetrics.getMetrics();
    const health = advancedMetrics.getHealthStatus();
    const performance = advancedMetrics.getPerformanceSummary();
    
    res.json({
        metrics: metrics,
        health: health,
        performance: performance,
        timestamp: new Date().toISOString()
    });
});

// Rota de status do sistema avançado
app.get('/status', async (req, res) => {
    try {
        const health = advancedMetrics.getHealthStatus();
        const performance = advancedMetrics.getPerformanceSummary();
        const connectionStats = await resilientPool.getConnectionStats();
        const queryStats = queryOptimizer.getQueryStats();
        const alertStats = alertSystem.getStats();
        
        res.json({
            health: health,
            performance: performance,
            database: {
                connected: db.isConnected,
                connectionStats: connectionStats,
                queryStats: queryStats
            },
            cache: {
                stats: advancedCache.getStats(),
                warming: cacheWarmer.getStats()
            },
            alerts: {
                total: alertStats.total,
                successRate: alertStats.successRate,
                channels: alertSystem.alertChannels.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({
            error: 'Failed to get system status',
            timestamp: new Date().toISOString()
        });
    }
});

// Rota de alertas
app.get('/alerts', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = alertSystem.getHistory(limit);
    const stats = alertSystem.getStats();
    
    res.json({
        alerts,
        stats,
        channels: alertSystem.alertChannels.map(c => ({
            name: c.name,
            type: c.constructor.name
        })),
        timestamp: new Date().toISOString()
    });
});

// Rota para adicionar canal de alerta
app.post('/alerts/channels', (req, res) => {
    try {
        const { type, config } = req.body;
        
        let channel;
        switch (type) {
            case 'console':
                channel = new ConsoleAlertChannel();
                break;
            case 'email':
                channel = new EmailAlertChannel(config);
                break;
            case 'webhook':
                channel = new WebhookAlertChannel(config);
                break;
            case 'slack':
                channel = new SlackAlertChannel(config);
                break;
            default:
                return res.status(400).json({ error: 'Invalid channel type' });
        }
        
        alertSystem.addChannel(channel);
        
        res.json({
            success: true,
            message: `Channel ${type} added successfully`,
            channels: alertSystem.alertChannels.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'ToS & Privacy Summarizer Backend',
        version: '1.4.0',
        status: 'operational',
        features: [
            'AI-powered summarization',
            'Intelligent caching',
            'Performance monitoring',
            'Real-time analytics',
            'Secure authentication'
        ],
        endpoints: {
            health: '/health',
            metrics: '/metrics',
            status: '/status',
            alerts: '/alerts',
            gemini: '/api/gemini',
            users: '/api/users',
            credits: '/api/credits',
            stripe: '/api/stripe',
            analytics: '/api/analytics'
        }
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Erro interno do servidor' 
            : err.message,
        timestamp: new Date().toISOString()
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        path: req.originalUrl,
        method: req.method
    });
});

// Inicializar sistemas avançados
async function initializeAdvancedSystems() {
    try {
        // Inicializar base de dados com pool resiliente
        const dbConnected = await db.connect();
        if (dbConnected) {
            console.log('✅ Database initialized successfully with resilient pool');
        } else {
            console.log('⚠️ Database connection failed, using fallback');
        }

        // Inicializar cache warming
        cacheWarmer.startWarming(30); // 30 minutos
        console.log('🔥 Cache warming started');

        // Inicializar métricas avançadas
        console.log('📊 Advanced metrics collection started');

        // Aplicar índices otimizados (se disponível)
        try {
            await queryOptimizer.refreshMaterializedViews();
            console.log('✅ Materialized views refreshed');
        } catch (error) {
            console.log('⚠️ Materialized views not available:', error.message);
        }

    } catch (error) {
        console.error('❌ Error initializing advanced systems:', error);
    }
}

// Inicializar sistemas
initializeAdvancedSystems();

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Backend seguro rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Advanced Metrics: http://localhost:${PORT}/metrics`);
    console.log(`🔍 System Status: http://localhost:${PORT}/status`);
    console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Advanced Cache: Multi-layer com warming automático`);
    console.log(`📊 Performance: Monitorização avançada ativa`);
    console.log(`🚨 Alertas: Sistema ativo com ${alertSystem.alertChannels.length} canais`);
    console.log(`🔗 Database: Pool resiliente com retry logic`);
    console.log(`🔍 Queries: Otimizadas com índices compostos`);
    
    // Verificar se a chave da API Gemini está configurada
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.warn('⚠️  ATENÇÃO: Chave da API Gemini não configurada!');
        console.warn('   Configure GEMINI_API_KEY no arquivo .env');
    } else {
        console.log('✅ Chave da API Gemini configurada');
    }
    
    console.log('🎯 Sistema de monitorização avançada ativo');
    console.log('💡 Versão 1.5.0 - Performance otimizada com cache inteligente');
});

export default app;
