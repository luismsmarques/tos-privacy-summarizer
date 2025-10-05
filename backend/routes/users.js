import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
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

export default router;
