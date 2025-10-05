import express from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
const router = express.Router();

// Configurar Stripe (apenas se as chaves estiverem configuradas)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key') {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Endpoint para criar sessão de pagamento
router.post('/create-payment-session', [
    body('userId').isString().notEmpty().withMessage('ID do utilizador é obrigatório'),
    body('credits').isInt({ min: 1 }).withMessage('Número de créditos deve ser positivo'),
    body('package').optional().isString()
], async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                error: 'Sistema de pagamentos não configurado',
                message: 'Configure as chaves do Stripe no arquivo .env'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const { userId, credits, package: packageName } = req.body;
        
        // Calcular preço
        const creditPriceCents = parseInt(process.env.CREDIT_PRICE_CENTS) || 100;
        const totalPriceCents = credits * creditPriceCents;
        
        // Aplicar desconto se for pacote premium
        let finalPriceCents = totalPriceCents;
        if (packageName === 'premium' && credits >= 50) {
            finalPriceCents = Math.round(totalPriceCents * 0.9); // 10% desconto
        }

        // Criar sessão de pagamento no Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `${credits} Créditos - ToS Summarizer`,
                        description: `Pacote de ${credits} créditos para análise de Termos de Serviço`,
                    },
                    unit_amount: finalPriceCents,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}&userId=${userId}&credits=${credits}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cancel`,
            metadata: {
                userId: userId,
                credits: credits.toString(),
                package: packageName || 'custom'
            }
        });

        res.json({
            sessionId: session.id,
            sessionUrl: session.url,
            userId,
            credits,
            priceCents: finalPriceCents,
            priceEuros: finalPriceCents / 100,
            message: 'Sessão de pagamento criada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao criar sessão de pagamento:', error);
        res.status(500).json({
            error: 'Erro ao processar pagamento',
            message: error.message
        });
    }
});

// Webhook para processar pagamentos concluídos
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                error: 'Sistema de pagamentos não configurado'
            });
        }

        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret || webhookSecret === 'whsec_your_webhook_secret') {
            console.warn('Webhook secret não configurado');
            return res.status(400).json({
                error: 'Webhook secret não configurado'
            });
        }

        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('Erro na verificação do webhook:', err.message);
            return res.status(400).json({
                error: 'Webhook signature verification failed'
            });
        }

        // Processar evento de pagamento bem-sucedido
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const { userId, credits } = session.metadata;

            if (userId && credits) {
                // Adicionar créditos ao utilizador
                const users = global.users || new Map();
                const user = users.get(userId) || { 
                    id: userId, 
                    credits: parseInt(process.env.DEFAULT_FREE_CREDITS) || 5,
                    createdAt: new Date().toISOString()
                };
                
                user.credits += parseInt(credits);
                user.lastUsed = new Date().toISOString();
                
                // Guardar histórico de pagamento
                user.payments = user.payments || [];
                user.payments.push({
                    paymentId: session.id,
                    credits: parseInt(credits),
                    amountCents: session.amount_total,
                    timestamp: new Date().toISOString()
                });
                
                users.set(userId, user);
                global.users = users;

                console.log(`Pagamento processado: ${credits} créditos adicionados ao utilizador ${userId}`);
            }
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para verificar status de pagamento
router.get('/payment-status/:sessionId', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                error: 'Sistema de pagamentos não configurado'
            });
        }

        const { sessionId } = req.params;
        
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        res.json({
            sessionId: session.id,
            status: session.payment_status,
            amountTotal: session.amount_total,
            currency: session.currency,
            metadata: session.metadata,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao verificar status de pagamento:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para obter configuração pública do Stripe
router.get('/config', (req, res) => {
    try {
        const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
        
        if (!publishableKey || publishableKey === 'pk_test_your_stripe_publishable_key') {
            return res.status(503).json({
                error: 'Chave pública do Stripe não configurada',
                message: 'Configure STRIPE_PUBLISHABLE_KEY no arquivo .env'
            });
        }

        res.json({
            publishableKey,
            currency: 'EUR',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao obter configuração do Stripe:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

export default router;
