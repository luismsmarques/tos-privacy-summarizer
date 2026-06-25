import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { logSystemEvent, logApiRequest } from './utils/audit-logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '1.3.1';

// Necessário para o rate limiting/IP correto atrás do proxy da Vercel
app.set('trust proxy', 1);

// Segurança e logging básicos
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(morgan('combined'));

// Rate limiting simples. Em serverless cada instância tem o seu próprio
// contador em memória; é uma proteção best-effort, não um limite global.
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados pedidos. Tente novamente mais tarde.' }
}));

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

// Middleware para parsing JSON.
// IMPORTANTE: o webhook do Stripe precisa do corpo RAW para validar a
// assinatura (stripe.webhooks.constructEvent), por isso não fazemos JSON
// parsing nesse caminho — senão a verificação da assinatura falha sempre.
const STRIPE_WEBHOOK_PATH = '/api/stripe/webhook';
app.use((req, res, next) => {
    if (req.originalUrl === STRIPE_WEBHOOK_PATH) return next();
    express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
    if (req.originalUrl === STRIPE_WEBHOOK_PATH) return next();
    express.urlencoded({ extended: true })(req, res, next);
});

// Páginas públicas hospedadas (success.html / cancel.html do checkout Stripe).
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para cookies (simples)
app.use((req, res, next) => {
    req.cookies = {};
    if (req.headers.cookie) {
        req.headers.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                req.cookies[name] = value;
            }
        });
    }
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

// Auditoria de pedidos à API (best-effort). Honra a setting `accessLogs` do
// dashboard (default ligado). Para não inundar audit_logs: regista SEMPRE os
// erros (>=400) e apenas ~5% dos pedidos bem-sucedidos (amostragem).
app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const isError = res.statusCode >= 400;
        if (!isError && Math.random() > 0.05) return;
        (async () => {
            try {
                const enabled = await db.getSetting('accessLogs', true);
                if (enabled === false) return;
                await logApiRequest(req, res, Date.now() - start, null);
            } catch (e) { /* best-effort, nunca afeta a resposta */ }
        })();
    });
    next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/stripe', stripeRoutes);

// As rotas de analytics são de ADMINISTRAÇÃO e exigem JWT.
// Exceção: endpoints per-utilizador consumidos pela extensão (o próprio
// histórico/estatísticas do utilizador), que não têm sessão de admin.
// Isto fecha a exposição pública de dados pessoais (/users) e de operações
// perigosas (/seed, /migrate, /migrate-sql, /debug, /test-db-connection).
const PUBLIC_ANALYTICS_PATHS = [/^\/user-history\//, /^\/user-stats\//];
app.use('/api/analytics', (req, res, next) => {
    // Preflight CORS não transporta o header Authorization.
    if (req.method === 'OPTIONS') return next();
    if (PUBLIC_ANALYTICS_PATHS.some((re) => re.test(req.path))) return next();
    return auth.authenticateToken(req, res, next);
}, analyticsRoutes);

// Middleware para proteger todas as rotas do dashboard
app.use('/dashboard', auth.protectDashboard);

// Servir arquivos estáticos do dashboard (após proteção)
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// Rota de health check
app.get('/health', async (req, res) => {
    let database = 'unknown';
    try {
        await db.query('SELECT 1');
        database = 'connected';
    } catch (error) {
        database = 'disconnected';
    }

    res.json({
        status: database === 'connected' ? 'ok' : 'degraded',
        database,
        version: VERSION,
        timestamp: new Date().toISOString()
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'ToS & Privacy Summarizer Backend',
        version: VERSION,
        status: 'operational',
        endpoints: {
            health: '/health',
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

// Inicializar servidor apenas se não estiver no Vercel (serverless).
// No Vercel apenas exportamos o app; a ligação à BD é estabelecida sob procura.
if (!process.env.VERCEL) {
    app.listen(PORT, async () => {
        console.log(`🚀 Backend a correr na porta ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);

        await db.connect();

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            console.warn('⚠️  ATENÇÃO: Chave da API Gemini não configurada!');
            console.warn('   Configure GEMINI_API_KEY no arquivo .env');
        } else {
            console.log('✅ Chave da API Gemini configurada');
        }

        logSystemEvent('server_startup', {
            version: VERSION,
            timestamp: new Date().toISOString()
        });
    });
} else {
    // Em serverless não escrevemos o arranque na auditoria: corria a cada cold
    // start (BD ainda fria → timeout) e poluía audit_logs com ruído de baixo valor.
    console.log(`🔒 Servidor inicializado para Vercel Serverless (v${VERSION})`);
}

export default app;
