import express from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import EmailService from '../utils/emailService.js';
import { logPaymentEvent } from '../utils/audit-logger.js';

const router = express.Router();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Inicializar serviço de email
const emailService = new EmailService();

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
                success_url: `${process.env.CHECKOUT_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}&success=true`,
                cancel_url: `${process.env.CHECKOUT_CANCEL_URL}?session_id={CHECKOUT_SESSION_ID}&success=false`,
                metadata: {
                    app: 'tos-privacy-summarizer',
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

            // Creditar de forma idempotente (verify-payment e webhook podem
            // ambos disparar para o mesmo pagamento — só credita uma vez).
            const db = await import('../utils/database.js');
            const { credited, newBalance } = await db.default.creditUserForPayment(userId, sessionId, credits, {
                amountCents: Number.isFinite(session.amount_total) ? session.amount_total : Math.round(price * 100),
                currency: session.currency || 'eur',
                packageName: packageName
            });

            // Log da transação
            console.log(`Créditos: ${credited ? 'adicionados' : 'já processados'} (${credits}) para ${userId}. Saldo: ${newBalance}`);

            // Auditoria (apenas no primeiro processamento; não bloqueia a resposta)
            if (credited) {
                logPaymentEvent('payment_success', userId, price, {
                    credits, package: packageName, sessionId, currency: session.currency || 'eur', source: 'verify-payment'
                }).catch((e) => console.error('audit payment_success falhou:', e.message));
            }

            // Enviar email de confirmação (se email disponível)
            try {
                const userEmail = session.customer_details?.email || session.customer_email;
                if (userEmail) {
                    const paymentData = {
                        userId: userId,
                        credits: credits,
                        packageName: packageName,
                        price: price,
                        transactionId: sessionId,
                        date: new Date().toLocaleDateString('pt-PT')
                    };
                    
                    await emailService.sendPaymentConfirmation(userEmail, paymentData);
                    console.log('✅ Email de confirmação enviado para:', userEmail);
                } else {
                    console.log('⚠️ Email não disponível para envio de confirmação');
                }
            } catch (emailError) {
                console.error('❌ Erro ao enviar email de confirmação:', emailError);
                // Não falhar a transação por causa do email
            }

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
            console.log('✅ Webhook: Checkout session completed:', session.id);

            // IMPORTANTE: esta conta Stripe é partilhada por vários produtos.
            // Só processamos sessões DESTE produto, para nunca creditar/enviar
            // email a partir de eventos de outro produto (ex.: vibesell).
            const isOurs = session.metadata?.app === 'tos-privacy-summarizer'
                || (session.metadata?.userId && session.metadata?.credits);
            if (!isOurs) {
                console.log('↪️ Webhook: sessão de outro produto — ignorada:', session.id);
                break;
            }

            // Processar pagamento bem-sucedido
            try {
                const userId = session.metadata.userId;
                const credits = parseInt(session.metadata.credits);
                const packageName = session.metadata.package;
                const price = parseFloat(session.metadata.price);
                
                if (session.payment_status === 'paid' && userId && credits) {
                    // Creditar de forma idempotente (ver verify-payment).
                    const db = await import('../utils/database.js');
                    const { credited, newBalance } = await db.default.creditUserForPayment(userId, session.id, credits, {
                        amountCents: Number.isFinite(session.amount_total) ? session.amount_total : Math.round(price * 100),
                        currency: session.currency || 'eur',
                        packageName: packageName
                    });
                    console.log(`✅ Webhook: Créditos ${credited ? 'adicionados' : 'já processados'} para ${userId}. Saldo: ${newBalance}`);

                    if (credited) {
                        logPaymentEvent('payment_success', userId, price, {
                            credits, package: packageName, sessionId: session.id, currency: session.currency || 'eur', source: 'webhook'
                        }).catch((e) => console.error('audit payment_success falhou:', e.message));
                    }
                    
                    // Enviar email de confirmação
                    try {
                        const userEmail = session.customer_details?.email || session.customer_email;
                        if (userEmail) {
                            const paymentData = {
                                userId: userId,
                                credits: credits,
                                packageName: packageName,
                                price: price,
                                transactionId: session.id,
                                date: new Date().toLocaleDateString('pt-PT')
                            };
                            
                            await emailService.sendPaymentConfirmation(userEmail, paymentData);
                            console.log('✅ Webhook: Email de confirmação enviado para:', userEmail);
                        } else {
                            console.log('⚠️ Webhook: Email não disponível para confirmação');
                        }
                    } catch (emailError) {
                        console.error('❌ Webhook: Erro ao enviar email:', emailError);
                    }
                }
            } catch (error) {
                console.error('❌ Webhook: Erro ao processar pagamento:', error);
            }
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

// GET /confirm?session_id=... — usado pela página de sucesso hospedada.
// Credita de forma idempotente o comprador da própria sessão (não há como
// redirecionar créditos para outra conta) e devolve o saldo para mostrar.
// Funciona mesmo que o webhook já tenha creditado (creditUserForPayment é
// idempotente) e serve de recuperação caso o webhook não esteja configurado.
router.get('/confirm', async (req, res) => {
    try {
        const sessionId = req.query.session_id;
        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'session_id em falta' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Sessão não encontrada' });
        }
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ success: false, error: 'Pagamento ainda não foi concluído' });
        }
        // Só sessões deste produto (conta Stripe partilhada).
        if (session.metadata?.app && session.metadata.app !== 'tos-privacy-summarizer') {
            return res.status(400).json({ success: false, error: 'Sessão pertence a outro produto' });
        }

        const userId = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits);
        const packageName = session.metadata?.package;
        const price = parseFloat(session.metadata?.price);
        if (!userId || !Number.isFinite(credits)) {
            return res.status(400).json({ success: false, error: 'Sessão sem dados de créditos' });
        }

        const db = await import('../utils/database.js');
        const { credited, newBalance } = await db.default.creditUserForPayment(userId, sessionId, credits, {
            amountCents: Number.isFinite(session.amount_total) ? session.amount_total : Math.round(price * 100),
            currency: session.currency || 'eur',
            packageName: packageName
        });

        if (credited) {
            logPaymentEvent('payment_success', userId, price, {
                credits, package: packageName, sessionId, currency: session.currency || 'eur', source: 'confirm'
            }).catch((e) => console.error('audit payment_success falhou:', e.message));
        }

        res.json({
            success: true,
            credits,
            newBalance,
            package: packageName,
            alreadyProcessed: !credited
        });
    } catch (error) {
        console.error('Erro no confirm:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;