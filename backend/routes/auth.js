// Rotas de autenticação para administradores
import express from 'express';
import auth from '../utils/auth.js';
import { logAuthEvent, logSecurityEvent } from '../utils/audit-logger.js';

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
            // Log tentativa de login falhada
            await logSecurityEvent('failed_login', 3, {
                username,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                reason: 'invalid_credentials'
            });
            
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
        }

        const token = auth.generateToken('admin');
        
        // Log login bem-sucedido
        await logAuthEvent('admin_login', 'admin', {
            username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        // Definir cookie com o token
        res.cookie('adminToken', token, {
            httpOnly: false, // Permitir acesso via JavaScript para o dashboard
            secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
            sameSite: 'lax', // Compatível com Vercel
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            path: '/' // Disponível em todo o site
        });
        
        res.json({
            success: true,
            token: token,
            message: 'Login realizado com sucesso'
        });

    } catch (error) {
        console.error('Login error:', error);
        
        // Log erro de sistema
        await logSecurityEvent('login_system_error', 4, {
            username: req.body.username,
            ip: req.ip,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Logout de administrador
router.post('/logout', async (req, res) => {
    try {
        // Log logout
        await logAuthEvent('admin_logout', 'admin', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
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
