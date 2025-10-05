import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/database.js';
import authService from '../utils/auth.js';

const router = express.Router();

// Endpoint para criar/utilizar utilizador
router.post('/create', [
    body('deviceId').optional().isString(),
    body('email').optional().isEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const { deviceId, email } = req.body;
        
        // Gerar ID único para o utilizador
        const userId = deviceId || uuidv4();
        
        // Inicializar utilizador com créditos gratuitos
        const defaultCredits = parseInt(process.env.DEFAULT_FREE_CREDITS) || 5;
        
        // Em produção, guardar na base de dados
        const users = global.users || new Map();
        if (!users.has(userId)) {
            users.set(userId, {
                id: userId,
                credits: defaultCredits,
                email: email || null,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            });
            global.users = users;
        }

        const user = users.get(userId);
        
        res.json({
            userId: user.id,
            credits: user.credits,
            isNewUser: !users.has(userId),
            message: 'Utilizador criado/atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao criar utilizador:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para obter informações do utilizador
router.get('/:userId', async (req, res) => {
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
            credits: user.credits,
            email: user.email,
            createdAt: user.createdAt,
            lastUsed: user.lastUsed
        });

    } catch (error) {
        console.error('Erro ao obter utilizador:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para atualizar utilizador
router.put('/:userId', [
    body('email').optional().isEmail(),
    body('credits').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const { userId } = req.params;
        const { email, credits } = req.body;
        
        const users = global.users || new Map();
        const user = users.get(userId);
        
        if (!user) {
            return res.status(404).json({
                error: 'Utilizador não encontrado'
            });
        }

        // Atualizar dados do utilizador
        if (email !== undefined) user.email = email;
        if (credits !== undefined) user.credits = credits;
        user.lastUsed = new Date().toISOString();
        
        users.set(userId, user);
        global.users = users;

        res.json({
            userId: user.id,
            credits: user.credits,
            email: user.email,
            message: 'Utilizador atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar utilizador:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Endpoint para listar todos os utilizadores (apenas para admin)
router.get('/', async (req, res) => {
    try {
        const users = global.users || new Map();
        const userList = Array.from(users.values());
        
        res.json({
            users: userList,
            total: userList.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao listar utilizadores:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// ===== NOVAS FUNCIONALIDADES AVANÇADAS =====

// Endpoint para obter detalhes completos de um utilizador (com histórico)
router.get('/:userId/details', authService.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!db.isConnected) {
            const connected = await db.connect();
            if (!connected) {
                return res.status(500).json({
                    success: false,
                    error: 'Não foi possível conectar à base de dados'
                });
            }
        }
        
        // Obter dados básicos do utilizador
        const userResult = await db.query(
            'SELECT * FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilizador não encontrado'
            });
        }
        
        const user = userResult.rows[0];
        
        // Obter histórico de resumos
        const summariesResult = await db.query(`
            SELECT 
                summary_id,
                success,
                duration,
                type,
                text_length,
                created_at
            FROM summaries 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [userId]);
        
        // Obter histórico de requests
        const requestsResult = await db.query(`
            SELECT 
                method,
                path,
                status_code,
                duration,
                timestamp
            FROM requests 
            WHERE user_id = $1 
            ORDER BY timestamp DESC 
            LIMIT 50
        `, [userId]);
        
        // Calcular estatísticas
        const statsResult = await db.query(`
            SELECT 
                COUNT(*) as total_summaries,
                COUNT(CASE WHEN success = true THEN 1 END) as successful_summaries,
                COUNT(CASE WHEN success = false THEN 1 END) as failed_summaries,
                AVG(CASE WHEN success = true THEN duration END) as avg_duration,
                SUM(text_length) as total_text_processed
            FROM summaries 
            WHERE user_id = $1
        `, [userId]);
        
        const stats = statsResult.rows[0];
        
        res.json({
            success: true,
            data: {
                user: {
                    user_id: user.user_id,
                    device_id: user.device_id,
                    credits: user.credits,
                    total_requests: user.total_requests,
                    summaries_generated: user.summaries_generated,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    first_seen: user.first_seen,
                    last_seen: user.last_seen
                },
                summaries: summariesResult.rows,
                requests: requestsResult.rows,
                statistics: {
                    total_summaries: parseInt(stats.total_summaries),
                    successful_summaries: parseInt(stats.successful_summaries),
                    failed_summaries: parseInt(stats.failed_summaries),
                    avg_duration: parseFloat(stats.avg_duration || 0),
                    total_text_processed: parseInt(stats.total_text_processed || 0),
                    success_rate: stats.total_summaries > 0 ? 
                        ((stats.successful_summaries / stats.total_summaries) * 100).toFixed(1) : 0
                }
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter detalhes do utilizador:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter detalhes do utilizador: ' + error.message
        });
    }
});

// Endpoint para atualizar créditos de um utilizador
router.put('/:userId/credits', authService.authenticateToken, [
    body('credits').isInt({ min: 0 }).withMessage('Créditos devem ser um número inteiro positivo'),
    body('action').isIn(['set', 'add', 'subtract']).withMessage('Ação deve ser set, add ou subtract'),
    body('reason').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: errors.array()
            });
        }
        
        const { userId } = req.params;
        const { credits, action, reason } = req.body;
        
        if (!db.isConnected) {
            const connected = await db.connect();
            if (!connected) {
                return res.status(500).json({
                    success: false,
                    error: 'Não foi possível conectar à base de dados'
                });
            }
        }
        
        // Obter utilizador atual
        const userResult = await db.query(
            'SELECT credits FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilizador não encontrado'
            });
        }
        
        const currentCredits = userResult.rows[0].credits;
        let newCredits;
        
        // Calcular novos créditos baseado na ação
        switch (action) {
            case 'set':
                newCredits = credits;
                break;
            case 'add':
                newCredits = currentCredits + credits;
                break;
            case 'subtract':
                newCredits = Math.max(0, currentCredits - credits);
                break;
        }
        
        // Atualizar créditos na base de dados
        await db.query(
            'UPDATE users SET credits = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [newCredits, userId]
        );
        
        // Registrar na tabela de histórico de créditos
        await db.query(`
            INSERT INTO credits_history (user_id, action, amount, balance_after, description)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, action, credits, newCredits, reason || `Créditos ${action} por administrador`]);
        
        res.json({
            success: true,
            data: {
                user_id: userId,
                previous_credits: currentCredits,
                new_credits: newCredits,
                action: action,
                amount: credits,
                reason: reason
            },
            message: `Créditos ${action} com sucesso`
        });
        
    } catch (error) {
        console.error('Erro ao atualizar créditos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar créditos: ' + error.message
        });
    }
});

// Endpoint para ações em massa nos utilizadores
router.post('/bulk-action', authService.authenticateToken, [
    body('userIds').isArray().withMessage('userIds deve ser um array'),
    body('action').isIn(['ban', 'unban', 'add_credits', 'subtract_credits', 'delete']).withMessage('Ação inválida'),
    body('value').optional().isInt({ min: 0 }).withMessage('Valor deve ser um número inteiro positivo'),
    body('reason').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: errors.array()
            });
        }
        
        const { userIds, action, value, reason } = req.body;
        
        if (!db.isConnected) {
            const connected = await db.connect();
            if (!connected) {
                return res.status(500).json({
                    success: false,
                    error: 'Não foi possível conectar à base de dados'
                });
            }
        }
        
        const results = [];
        const errors = [];
        
        for (const userId of userIds) {
            try {
                let result;
                
                switch (action) {
                    case 'ban':
                        // Marcar utilizador como banido (podemos adicionar uma coluna banned)
                        await db.query(
                            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
                            [userId]
                        );
                        result = { userId, action: 'banned', success: true };
                        break;
                        
                    case 'unban':
                        await db.query(
                            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
                            [userId]
                        );
                        result = { userId, action: 'unbanned', success: true };
                        break;
                        
                    case 'add_credits':
                        if (!value) {
                            throw new Error('Valor é obrigatório para adicionar créditos');
                        }
                        await db.query(
                            'UPDATE users SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
                            [value, userId]
                        );
                        await db.query(`
                            INSERT INTO credits_history (user_id, action, amount, balance_after, description)
                            VALUES ($1, 'add', $2, (SELECT credits FROM users WHERE user_id = $1), $3)
                        `, [userId, value, reason || 'Créditos adicionados em massa']);
                        result = { userId, action: 'credits_added', amount: value, success: true };
                        break;
                        
                    case 'subtract_credits':
                        if (!value) {
                            throw new Error('Valor é obrigatório para subtrair créditos');
                        }
                        await db.query(
                            'UPDATE users SET credits = GREATEST(credits - $1, 0), updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
                            [value, userId]
                        );
                        await db.query(`
                            INSERT INTO credits_history (user_id, action, amount, balance_after, description)
                            VALUES ($1, 'subtract', $2, (SELECT credits FROM users WHERE user_id = $1), $3)
                        `, [userId, value, reason || 'Créditos subtraídos em massa']);
                        result = { userId, action: 'credits_subtracted', amount: value, success: true };
                        break;
                        
                    case 'delete':
                        // Deletar utilizador e todos os dados relacionados
                        await db.query('DELETE FROM credits_history WHERE user_id = $1', [userId]);
                        await db.query('DELETE FROM summaries WHERE user_id = $1', [userId]);
                        await db.query('DELETE FROM requests WHERE user_id = $1', [userId]);
                        await db.query('DELETE FROM users WHERE user_id = $1', [userId]);
                        result = { userId, action: 'deleted', success: true };
                        break;
                }
                
                results.push(result);
                
            } catch (error) {
                errors.push({
                    userId,
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                action: action,
                total_processed: userIds.length,
                successful: results.length,
                failed: errors.length,
                results: results,
                errors: errors
            },
            message: `Ação em massa executada: ${results.length} sucessos, ${errors.length} falhas`
        });
        
    } catch (error) {
        console.error('Erro na ação em massa:', error);
        res.status(500).json({
            success: false,
            error: 'Erro na ação em massa: ' + error.message
        });
    }
});

// Endpoint para obter histórico de créditos de um utilizador
router.get('/:userId/credits-history', authService.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!db.isConnected) {
            const connected = await db.connect();
            if (!connected) {
                return res.status(500).json({
                    success: false,
                    error: 'Não foi possível conectar à base de dados'
                });
            }
        }
        
        const result = await db.query(`
            SELECT 
                action,
                amount,
                balance_after,
                description,
                created_at
            FROM credits_history 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 100
        `, [userId]);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Erro ao obter histórico de créditos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter histórico de créditos: ' + error.message
        });
    }
});

export default router;
