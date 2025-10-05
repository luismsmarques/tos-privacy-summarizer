import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Servir página de checkout
router.get('/checkout.html', (req, res) => {
    try {
        console.log('Servindo página de checkout');
        res.sendFile(path.join(__dirname, '../../checkout.html'));
    } catch (error) {
        console.error('Erro ao servir checkout.html:', error);
        res.status(500).send('Erro ao carregar página de checkout');
    }
});

// Servir página de política de privacidade
router.get('/privacy-policy.html', (req, res) => {
    try {
        console.log('Servindo página de política de privacidade');
        res.sendFile(path.join(__dirname, '../../privacy-policy.html'));
    } catch (error) {
        console.error('Erro ao servir privacy-policy.html:', error);
        res.status(500).send('Erro ao carregar página de política de privacidade');
    }
});

// Servir página de termos de serviço
router.get('/terms-of-service.html', (req, res) => {
    try {
        console.log('Servindo página de termos de serviço');
        res.sendFile(path.join(__dirname, '../../terms-of-service.html'));
    } catch (error) {
        console.error('Erro ao servir terms-of-service.html:', error);
        res.status(500).send('Erro ao carregar página de termos de serviço');
    }
});

export default router;
