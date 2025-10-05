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

// CORS configurado para a extensão e dashboard
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sem origin (extensões Chrome, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Permitir extensões Chrome
        if (origin.startsWith('chrome-extension://')) {
            return callback(null, true);
        }
        
        // Permitir URLs específicas
        const allowedOrigins = [
            'https://tos-privacy-summarizer.vercel.app',
            'http://localhost:3000',
            'http://localhost:5173'
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

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/analytics', auth.authenticateToken, analyticsRoutes);

// Middleware para proteger todas as rotas do dashboard
app.use('/dashboard', auth.protectDashboard);

// Servir arquivos estáticos do dashboard (após proteção)
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// Rota de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'ToS & Privacy Summarizer Backend',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            gemini: '/api/gemini',
            users: '/api/users',
            credits: '/api/credits',
            stripe: '/api/stripe'
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

// Inicializar base de dados
db.connect().then((connected) => {
    if (connected) {
        console.log('✅ Database initialized successfully');
    } else {
        console.log('⚠️ Database connection failed, using fallback');
    }
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Backend seguro rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    
    // Verificar se a chave da API Gemini está configurada
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.warn('⚠️  ATENÇÃO: Chave da API Gemini não configurada!');
        console.warn('   Configure GEMINI_API_KEY no arquivo .env');
    } else {
        console.log('✅ Chave da API Gemini configurada');
    }
});

export default app;
