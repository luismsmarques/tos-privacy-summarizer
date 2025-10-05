import express from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';

const router = express.Router();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /create-checkout-session - Criar sessão de checkout
router.post('/create-checkout-session',
    body('userId').notEmpty().withMessage('ID do utilizador é obrigatório'),
    body('package').notEmpty().withMessage('Pacote é obrigatório'),
    body('credits').isInt({ min: 1 }).withMessage('Número de créditos inválido'),
    body('price').isFloat({ min: 0.01 }).withMessage('Preço inválido'),
    body('currency').isLength({ min: 3, max: 3 }).withMessage('Moeda inválida'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Dados inválidos',
                    details: errors.array()
                });
            }

            const { userId, package: packageName, credits, price, currency } = req.body;

            console.log('Criando sessão de checkout:', { userId, packageName, credits, price, currency });

            // Criar produto no Stripe (se não existir)
            const product = await stripe.products.create({
                name: `ToS Summarizer - ${packageName}`,
                description: `${credits} créditos para análise de documentos legais`,
                metadata: {
                    package: packageName,
                    credits: credits.toString(),
                    userId: userId
                }
            });

            // Criar preço no Stripe
            const stripePrice = await stripe.prices.create({
                product: product.id,
                unit_amount: Math.round(price * 100), // Converter para centavos
                currency: currency.toLowerCase(),
                metadata: {
                    package: packageName,
                    credits: credits.toString(),
                    userId: userId
                }
            });

            // Criar sessão de checkout
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: stripePrice.id,
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${process.env.CHECKOUT_SUCCESS_URL || 'https://tos-privacy-summarizer.vercel.app/api/checkout'}?session_id={CHECKOUT_SESSION_ID}&success=true`,
                cancel_url: `${process.env.CHECKOUT_CANCEL_URL || 'https://tos-privacy-summarizer.vercel.app/api/checkout'}?session_id={CHECKOUT_SESSION_ID}&success=false`,
                metadata: {
                    userId: userId,
                    package: packageName,
                    credits: credits.toString(),
                    price: price.toString()
                },
                customer_email: req.body.email || undefined,
                billing_address_collection: 'auto',
                shipping_address_collection: {
                    allowed_countries: ['PT', 'BR', 'US', 'GB', 'FR', 'DE', 'ES', 'IT'],
                },
            });

            console.log('Sessão de checkout criada:', session.id);

            res.json({
                success: true,
                sessionId: session.id,
                url: session.url
            });

        } catch (error) {
            console.error('Erro ao criar sessão de checkout:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error.message
            });
        }
    }
);

// POST /verify-payment - Verificar pagamento
router.post('/verify-payment',
    body('sessionId').notEmpty().withMessage('ID da sessão é obrigatório'),
    body('userId').notEmpty().withMessage('ID do utilizador é obrigatório'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Dados inválidos',
                    details: errors.array()
                });
            }

            const { sessionId, userId } = req.body;

            console.log('Verificando pagamento:', { sessionId, userId });

            // Recuperar sessão do Stripe
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Sessão não encontrada'
                });
            }

            // Verificar se o pagamento foi bem-sucedido
            if (session.payment_status !== 'paid') {
                return res.status(400).json({
                    success: false,
                    error: 'Pagamento não foi concluído'
                });
            }

            // Verificar se o userId corresponde
            if (session.metadata.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'ID do utilizador não corresponde'
                });
            }

            // Extrair dados do pagamento
            const credits = parseInt(session.metadata.credits);
            const packageName = session.metadata.package;
            const price = parseFloat(session.metadata.price);

            console.log('Pagamento verificado:', { credits, packageName, price });

            // Atualizar créditos do utilizador no banco de dados
            const db = await import('../utils/database.js');
            const newBalance = await db.default.updateUserCredits(userId, credits);

            // Log da transação
            console.log(`Créditos adicionados: ${credits} para utilizador ${userId}. Novo saldo: ${newBalance}`);

            res.json({
                success: true,
                credits: credits,
                newBalance: newBalance,
                package: packageName,
                price: price,
                sessionId: sessionId
            });

        } catch (error) {
            console.error('Erro ao verificar pagamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error.message
            });
        }
    }
);

// POST /webhook - Webhook do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook recebido:', event.type);

    // Processar evento
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('Checkout session completed:', session.id);
            
            // Aqui pode adicionar lógica adicional se necessário
            // Por exemplo, enviar email de confirmação, etc.
            break;

        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

export default router;