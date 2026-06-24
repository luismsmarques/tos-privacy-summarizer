import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../utils/database.js';
import authService from '../utils/auth.js';
const router = express.Router();

// Endpoint para verificar créditos
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fonte única de verdade: base de dados (Postgres)
        const credits = await db.getUserCredits(userId);

        res.json({
            userId,
            credits,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao verificar créditos:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para adicionar créditos manualmente (apenas admin autenticado).
// O fluxo normal de compra usa a rota Stripe, que credita diretamente via base de dados.
router.post('/add', authService.authenticateToken, [
    body('userId').isString().notEmpty().withMessage('ID do utilizador é obrigatório'),
    body('credits').isInt({ min: 1 }).withMessage('Número de créditos deve ser positivo'),
    body('paymentId').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const { userId, credits, paymentId } = req.body;

        // Adicionar créditos de forma atómica na base de dados
        const totalCredits = await db.updateUserCredits(userId, credits);

        // Registar no histórico de créditos (não bloqueia a resposta se falhar)
        try {
            await db.query(`
                INSERT INTO credits_history (user_id, action, amount, balance_after, description)
                VALUES ($1, 'add', $2, $3, $4)
            `, [userId, credits, totalCredits, paymentId ? `Pagamento ${paymentId}` : 'Créditos adicionados']);
        } catch (historyError) {
            console.error('⚠️ Não foi possível registar histórico de créditos:', historyError.message);
        }

        res.json({
            userId,
            creditsAdded: credits,
            totalCredits,
            message: 'Créditos adicionados com sucesso'
        });

    } catch (error) {
        console.error('Erro ao adicionar créditos:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para obter histórico de créditos
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const currentCredits = await db.getUserCredits(userId);

        let payments = [];
        try {
            const result = await db.query(`
                SELECT action, amount, balance_after, description, created_at
                FROM credits_history
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 100
            `, [userId]);
            payments = result.rows;
        } catch (historyError) {
            console.error('⚠️ Não foi possível obter histórico de créditos:', historyError.message);
        }

        res.json({
            userId,
            currentCredits,
            payments,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para obter preços de créditos
router.get('/pricing/info', (req, res) => {
    try {
        const creditPrice = parseInt(process.env.CREDIT_PRICE_CENTS) || 100; // 1€ por crédito
        
        res.json({
            pricing: {
                creditPriceCents: creditPrice,
                creditPriceEuros: creditPrice / 100,
                packages: [
                    {
                        name: 'Pacote Básico',
                        credits: 10,
                        priceCents: creditPrice * 10,
                        priceEuros: (creditPrice * 10) / 100,
                        discount: 0
                    },
                    {
                        name: 'Pacote Popular',
                        credits: 25,
                        priceCents: creditPrice * 25,
                        priceEuros: (creditPrice * 25) / 100,
                        discount: 0
                    },
                    {
                        name: 'Pacote Premium',
                        credits: 50,
                        priceCents: creditPrice * 50,
                        priceEuros: (creditPrice * 50) / 100,
                        discount: 10 // 10% desconto
                    }
                ]
            },
            currency: 'EUR',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao obter preços:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

export default router;
