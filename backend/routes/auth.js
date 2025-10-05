// Rotas de autenticação para administradores
import express from 'express';
import auth from '../utils/auth.js';

const router = express.Router();

// Login de administrador
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Utilizador e palavra-passe são obrigatórios'
            });
        }

        const isValid = await auth.validateCredentials(username, password);
        
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
        }

        const token = auth.generateToken('admin');
        
        res.json({
            success: true,
            token: token,
            message: 'Login realizado com sucesso'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Logout de administrador
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
});

// Verificar status de autenticação
router.get('/status', auth.authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: {
            userId: req.user.userId,
            role: req.user.role,
            timestamp: req.user.timestamp
        }
    });
});

export default router;
