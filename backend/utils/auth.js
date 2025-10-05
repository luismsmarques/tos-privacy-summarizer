// Sistema de autenticação para administradores
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

class AuthService {
    constructor() {
        this.adminCredentials = {
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123'
        };
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.jwtExpiry = '24h';
    }

    // Verificar credenciais de login
    async validateCredentials(username, password) {
        try {
            const isValidUsername = username === this.adminCredentials.username;
            const isValidPassword = await bcrypt.compare(password, this.adminCredentials.password) || 
                                   password === this.adminCredentials.password;
            
            return isValidUsername && isValidPassword;
        } catch (error) {
            console.error('Error validating credentials:', error);
            return false;
        }
    }

    // Gerar token JWT
    generateToken(userId) {
        return jwt.sign(
            { 
                userId: userId,
                role: 'admin',
                timestamp: Date.now()
            },
            this.jwtSecret,
            { expiresIn: this.jwtExpiry }
        );
    }

    // Verificar token JWT
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            console.error('Token verification failed:', error);
            return null;
        }
    }

    // Middleware de autenticação
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Token de acesso necessário' 
            });
        }

        const decoded = this.verifyToken(token);
        if (!decoded) {
            return res.status(403).json({ 
                success: false, 
                error: 'Token inválido ou expirado' 
            });
        }

        req.user = decoded;
        next();
    }

    // Middleware para proteger dashboard
    protectDashboard(req, res, next) {
        const cookies = req.cookies || {};
        const token = cookies.adminToken || req.headers['x-admin-token'];

        if (!token) {
            return res.status(401).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Acesso Restrito</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .login-form { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
                        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
                        button:hover { background: #0056b3; }
                        .error { color: red; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <h1>🔐 Acesso Administrativo</h1>
                    <div class="login-form">
                        <form id="loginForm">
                            <input type="text" id="username" placeholder="Utilizador" required>
                            <input type="password" id="password" placeholder="Palavra-passe" required>
                            <button type="submit">Entrar</button>
                        </form>
                        <div id="error" class="error" style="display: none;"></div>
                    </div>
                    <script>
                        document.getElementById('loginForm').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const username = document.getElementById('username').value;
                            const password = document.getElementById('password').value;
                            
                            try {
                                const response = await fetch('/api/auth/login', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ username, password })
                                });
                                
                                const data = await response.json();
                                
                                if (data.success) {
                                    document.cookie = 'adminToken=' + data.token + '; path=/; max-age=86400';
                                    window.location.reload();
                                } else {
                                    document.getElementById('error').textContent = data.error;
                                    document.getElementById('error').style.display = 'block';
                                }
                            } catch (error) {
                                document.getElementById('error').textContent = 'Erro de ligação';
                                document.getElementById('error').style.display = 'block';
                            }
                        });
                    </script>
                </body>
                </html>
            `);
        }

        // Usar a instância da classe para verificar o token
        const authService = new AuthService();
        const decoded = authService.verifyToken(token);
        if (!decoded) {
            return res.status(401).send('Token inválido');
        }

        req.user = decoded;
        next();
    }
}

export default new AuthService();
