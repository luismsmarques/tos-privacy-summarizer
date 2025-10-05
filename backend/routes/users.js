import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../utils/database.js';

const router = express.Router();

// GET /users - Listar utilizadores com paginação e filtros
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const filter = req.query.filter || 'all';
        const offset = (page - 1) * limit;

        console.log('📊 Buscando utilizadores:', { page, limit, search, filter });

        // Construir query base
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;

        // Adicionar filtro de pesquisa
        if (search) {
            whereClause += ` WHERE (user_id ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        // Adicionar filtro de status
        if (filter !== 'all') {
            const filterCondition = whereClause ? ' AND' : ' WHERE';
            
            switch (filter) {
                case 'active':
                    whereClause += `${filterCondition} last_activity >= NOW() - INTERVAL '30 days'`;
                    break;
                case 'inactive':
                    whereClause += `${filterCondition} last_activity < NOW() - INTERVAL '30 days'`;
                    break;
                case 'premium':
                    whereClause += `${filterCondition} credits > 100`;
                    break;
            }
        }

        // Query para contar total
        const countQuery = `SELECT COUNT(*) as total FROM users${whereClause}`;
        const countResult = await db.query(countQuery, queryParams);
        const totalUsers = parseInt(countResult.rows[0].total);

        // Query para buscar utilizadores
        const usersQuery = `
            SELECT 
                user_id,
                email,
                credits,
                created_at,
                updated_at,
                last_activity,
                total_summaries,
                total_requests
            FROM users
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const usersResult = await db.query(usersQuery, queryParams);

        // Processar dados dos utilizadores
        const users = usersResult.rows.map(user => ({
            id: user.user_id,
            email: user.email || 'N/A',
            credits: user.credits || 0,
            status: getUserStatus(user),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            lastActivity: user.last_activity,
            totalSummaries: user.total_summaries || 0,
            totalRequests: user.total_requests || 0
        }));

        const totalPages = Math.ceil(totalUsers / limit);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    totalUsers,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar utilizadores:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// GET /users/stats - Estatísticas de utilizadores
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Buscando estatísticas de utilizadores...');

        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN last_activity >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today,
                SUM(credits) as total_credits,
                AVG(credits) as avg_credits,
                COUNT(CASE WHEN credits > 100 THEN 1 END) as premium_users
            FROM users
        `;

        const result = await db.query(statsQuery);
        const stats = result.rows[0];

        res.json({
            success: true,
            data: {
                totalUsers: parseInt(stats.total_users) || 0,
                activeUsers: parseInt(stats.active_users) || 0,
                newToday: parseInt(stats.new_today) || 0,
                totalCredits: parseInt(stats.total_credits) || 0,
                avgCredits: parseFloat(stats.avg_credits) || 0,
                premiumUsers: parseInt(stats.premium_users) || 0
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// GET /users/:id - Obter detalhes de um utilizador
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        console.log('👤 Buscando detalhes do utilizador:', userId);

        // Buscar dados do utilizador
        const userQuery = `
            SELECT 
                user_id,
                email,
                credits,
                created_at,
                updated_at,
                last_activity,
                total_summaries,
                total_requests
            FROM users
            WHERE user_id = $1
        `;

        const userResult = await db.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilizador não encontrado'
            });
        }

        const user = userResult.rows[0];

        // Buscar histórico de atividades
        const activityQuery = `
            SELECT 
                created_at,
                status_code,
                duration,
                text_length,
                document_type
            FROM requests
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `;

        const activityResult = await db.query(activityQuery, [userId]);

        // Buscar histórico de resumos
        const summariesQuery = `
            SELECT 
                created_at,
                document_type,
                text_length,
                processing_time
            FROM summaries
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 20
        `;

        const summariesResult = await db.query(summariesQuery, [userId]);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.user_id,
                    email: user.email || 'N/A',
                    credits: user.credits || 0,
                    status: getUserStatus(user),
                    createdAt: user.created_at,
                    updatedAt: user.updated_at,
                    lastActivity: user.last_activity,
                    totalSummaries: user.total_summaries || 0,
                    totalRequests: user.total_requests || 0
                },
                activities: activityResult.rows,
                summaries: summariesResult.rows
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar utilizador:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// PUT /users/:id/credits - Atualizar créditos de um utilizador
router.put('/:id/credits',
    body('credits').isInt({ min: 0 }).withMessage('Número de créditos inválido'),
    body('reason').optional().isString().withMessage('Motivo deve ser texto'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    details: errors.array()
                });
            }

            const userId = req.params.id;
            const { credits, reason } = req.body;

            console.log('💰 Atualizando créditos do utilizador:', { userId, credits, reason });

            // Atualizar créditos
            const updateQuery = `
                UPDATE users 
                SET credits = $1, updated_at = NOW()
                WHERE user_id = $2
                RETURNING credits
            `;

            const result = await db.query(updateQuery, [credits, userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Utilizador não encontrado'
                });
            }

            // Log da alteração (em produção, criar tabela de logs)
            console.log(`✅ Créditos atualizados: Utilizador ${userId} agora tem ${credits} créditos. Motivo: ${reason || 'N/A'}`);

            res.json({
                success: true,
                data: {
                    userId,
                    newCredits: credits,
                    reason: reason || 'Alteração manual pelo administrador'
                }
            });

        } catch (error) {
            console.error('❌ Erro ao atualizar créditos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error.message
            });
        }
    }
);

// DELETE /users/:id - Desativar utilizador
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        console.log('🗑️ Desativando utilizador:', userId);

        // Em vez de deletar, marcar como inativo
        const updateQuery = `
            UPDATE users 
            SET credits = 0, updated_at = NOW()
            WHERE user_id = $1
            RETURNING user_id
        `;

        const result = await db.query(updateQuery, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilizador não encontrado'
            });
        }

        console.log(`✅ Utilizador ${userId} desativado (créditos zerados)`);

        res.json({
            success: true,
            message: 'Utilizador desativado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao desativar utilizador:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Função auxiliar para determinar status do utilizador
function getUserStatus(user) {
    const now = new Date();
    const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    if (user.credits > 100) {
        return 'premium';
    } else if (lastActivity && lastActivity >= thirtyDaysAgo) {
        return 'active';
    } else {
        return 'inactive';
    }
}

export default router;