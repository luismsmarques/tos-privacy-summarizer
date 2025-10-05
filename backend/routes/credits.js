import express from 'express';
import { body, validationResult } from 'express-validator';
const router = express.Router();

// Endpoint para verificar créditos
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const users = global.users || new Map();
        const user = users.get(userId);
        
        const credits = user ? user.credits : parseInt(process.env.DEFAULT_FREE_CREDITS) || 5;
        
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

// Endpoint para adicionar créditos (após pagamento)
router.post('/add', [
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
        
        const users = global.users || new Map();
        const user = users.get(userId) || { 
            id: userId, 
            credits: parseInt(process.env.DEFAULT_FREE_CREDITS) || 5,
            createdAt: new Date().toISOString()
        };
        
        // Adicionar créditos
        user.credits += credits;
        user.lastUsed = new Date().toISOString();
        
        // Guardar histórico de pagamento (em produção, usar base de dados)
        if (paymentId) {
            user.payments = user.payments || [];
            user.payments.push({
                paymentId,
                credits,
                timestamp: new Date().toISOString()
            });
        }
        
        users.set(userId, user);
        global.users = users;

        res.json({
            userId: user.id,
            creditsAdded: credits,
            totalCredits: user.credits,
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
        
        const users = global.users || new Map();
        const user = users.get(userId);
        
        if (!user) {
            return res.status(404).json({
                error: 'Utilizador não encontrado'
            });
        }

        res.json({
            userId: user.id,
            currentCredits: user.credits,
            payments: user.payments || [],
            createdAt: user.createdAt,
            lastUsed: user.lastUsed
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
