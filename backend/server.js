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
app.use(helmet());
app.use(morgan('combined'));

// CORS configurado para a extensão
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'chrome-extension://*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por IP
    message: {
        error: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Importar rotas
import geminiRoutes from './routes/gemini.js';
import userRoutes from './routes/users.js';
import creditsRoutes from './routes/credits.js';
import stripeRoutes from './routes/stripe.js';
import { router as analyticsRoutes } from './routes/analytics.js';
import { db } from './utils/database.js';

// Rotas da API
app.use('/api/gemini', geminiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Rota para servir o dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

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
db.connect().then(async (connected) => {
    if (connected) {
        await db.initialize();
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
