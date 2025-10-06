import express from 'express';
import db from '../utils/database.js';

const router = express.Router();

// POST /api/feedback - Enviar feedback sobre resumo
router.post('/', async (req, res) => {
    try {
        const {
            type,
            section,
            description,
            suggestion,
            pageUrl,
            pageTitle,
            summaryId,
            userAgent
        } = req.body;

        // Validação básica
        if (!type || !section || !description) {
            return res.status(400).json({
                error: 'Campos obrigatórios: type, section, description'
            });
        }

        // Validar tipos de feedback
        const validTypes = ['inaccurate', 'missing', 'unclear', 'irrelevant', 'format', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Tipo de feedback inválido'
            });
        }

        // Validar seções
        const validSections = ['resumo_conciso', 'pontos_chave', 'alertas_privacidade', 'geral'];
        if (!validSections.includes(section)) {
            return res.status(400).json({
                error: 'Secção inválida'
            });
        }

        // Preparar dados para inserção
        const feedbackData = {
            type,
            section,
            description: description.trim(),
            suggestion: suggestion ? suggestion.trim() : null,
            page_url: pageUrl || null,
            page_title: pageTitle || null,
            summary_id: summaryId || null,
            user_agent: userAgent || null,
            ip_address: req.ip || req.connection.remoteAddress,
            created_at: new Date().toISOString()
        };

        console.log('📝 Novo feedback recebido:', {
            type: feedbackData.type,
            section: feedbackData.section,
            description: feedbackData.description.substring(0, 100) + '...',
            pageUrl: feedbackData.page_url
        });

        // Inserir na base de dados
        const result = await db.query(`
            INSERT INTO feedback (
                type, section, description, suggestion, 
                page_url, page_title, summary_id, 
                user_agent, ip_address, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            feedbackData.type,
            feedbackData.section,
            feedbackData.description,
            feedbackData.suggestion,
            feedbackData.page_url,
            feedbackData.page_title,
            feedbackData.summary_id,
            feedbackData.user_agent,
            feedbackData.ip_address,
            feedbackData.created_at
        ]);

        console.log('✅ Feedback salvo com ID:', result.insertId);

        res.status(201).json({
            success: true,
            message: 'Feedback enviado com sucesso',
            feedbackId: result.insertId
        });

    } catch (error) {
        console.error('❌ Erro ao salvar feedback:', error);
        res.status(500).json({
            error: 'Erro interno do servidor ao salvar feedback'
        });
    }
});

// GET /api/feedback - Obter feedback (apenas para admin)
router.get('/', async (req, res) => {
    try {
        // Verificar se é admin (simplificado para demo)
        const adminToken = req.headers['x-admin-token'];
        if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
            return res.status(403).json({
                error: 'Acesso negado. Token de admin necessário.'
            });
        }

        const { page = 1, limit = 50, type, section } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM feedback';
        let params = [];
        let conditions = [];

        if (type) {
            conditions.push('type = ?');
            params.push(type);
        }

        if (section) {
            conditions.push('section = ?');
            params.push(section);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const feedback = await db.query(query, params);

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM feedback';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await db.query(countQuery, params.slice(0, -2));
        const total = countResult[0].total;

        res.json({
            feedback,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Erro ao obter feedback:', error);
        res.status(500).json({
            error: 'Erro interno do servidor ao obter feedback'
        });
    }
});

// GET /api/feedback/stats - Estatísticas de feedback
router.get('/stats', async (req, res) => {
    try {
        // Verificar se é admin
        const adminToken = req.headers['x-admin-token'];
        if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
            return res.status(403).json({
                error: 'Acesso negado. Token de admin necessário.'
            });
        }

        // Estatísticas por tipo
        const typeStats = await db.query(`
            SELECT type, COUNT(*) as count 
            FROM feedback 
            GROUP BY type 
            ORDER BY count DESC
        `);

        // Estatísticas por secção
        const sectionStats = await db.query(`
            SELECT section, COUNT(*) as count 
            FROM feedback 
            GROUP BY section 
            ORDER BY count DESC
        `);

        // Total de feedback
        const totalResult = await db.query('SELECT COUNT(*) as total FROM feedback');
        const total = totalResult[0].total;

        // Feedback dos últimos 30 dias
        const recentResult = await db.query(`
            SELECT COUNT(*) as recent 
            FROM feedback 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const recent = recentResult[0].recent;

        res.json({
            total,
            recent,
            byType: typeStats,
            bySection: sectionStats
        });

    } catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor ao obter estatísticas'
        });
    }
});

export default router;
