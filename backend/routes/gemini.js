import express from 'express';
import { body, validationResult } from 'express-validator';
import { registerUser, registerSummary } from './analytics.js';
import db from '../utils/database.js';
const router = express.Router();

// Middleware para verificar se a chave da API está configurada
const checkGeminiKey = (req, res, next) => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return res.status(500).json({
            error: 'Chave da API Gemini não configurada no servidor'
        });
    }
    next();
};

// Endpoint principal para proxy da API Gemini
router.post('/proxy', [
    checkGeminiKey,
    body('userId').isString().notEmpty().withMessage('ID do utilizador é obrigatório'),
    body('text').isString().isLength({ min: 50 }).withMessage('Texto deve ter pelo menos 50 caracteres'),
    body('apiType').optional().isIn(['shared', 'own']).withMessage('Tipo de API inválido')
], async (req, res) => {
    const startTime = Date.now();
    let success = false;
    
    try {
        // Validar dados de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const { userId, text, apiType = 'shared' } = req.body;

        // Registrar utilizador no analytics
        await registerUser(userId, req.ip || 'unknown');

        // Verificar créditos do utilizador (apenas para API compartilhada)
        if (apiType === 'shared') {
            const userCredits = await getUserCredits(userId);
            if (userCredits <= 0) {
                return res.status(402).json({
                    error: 'Créditos insuficientes',
                    credits: userCredits,
                    message: 'Compre mais créditos ou configure a sua própria chave da API'
                });
            }
        }

        // Chamar API Gemini
        const geminiResponse = await callGeminiAPI(text);
        success = true;
        
        // Registrar resumo no analytics
        const duration = Date.now() - startTime;
        console.log(`📊 Registrando resumo: userId=${userId}, success=${success}, duration=${duration}ms, textLength=${text.length}`);
        try {
            await registerSummary(userId, true, duration, 'terms_of_service', text.length);
            console.log('✅ Resumo registrado com sucesso no analytics');
        } catch (error) {
            console.error('❌ Erro ao registrar resumo no analytics:', error);
            // Não falhar o request por causa do analytics
        }
        
        // Decrementar créditos se for API compartilhada
        if (apiType === 'shared') {
            await decrementUserCredits(userId);
            const remainingCredits = await getUserCredits(userId);
            
            res.json({
                summary: geminiResponse,
                credits: remainingCredits,
                apiType: 'shared'
            });
        } else {
            res.json({
                summary: geminiResponse,
                apiType: 'own'
            });
        }

    } catch (error) {
        console.error('Erro no proxy Gemini:', error);
        
        // Registrar falha no analytics
        const duration = Date.now() - startTime;
        await registerSummary(req.body.userId || 'unknown', false, duration, 'error', 0);
        
        // Determinar tipo de erro
        let errorMessage = 'Erro ao processar resumo';
        let statusCode = 500;
        
        if (error.message.includes('API Gemini')) {
            if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage = 'Chave da API inválida ou sem permissões';
                statusCode = 401;
            } else if (error.message.includes('429')) {
                errorMessage = 'Limite de uso da API atingido';
                statusCode = 429;
            } else {
                errorMessage = 'Erro na API Gemini';
                statusCode = 502;
            }
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
            errorMessage = 'Erro de ligação à internet';
            statusCode = 503;
        }
        
        res.status(statusCode).json({
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// Função para chamar a API Gemini
async function callGeminiAPI(text) {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Limitar o tamanho do texto
    const maxLength = 100000;
    const textToSummarize = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    const prompt = `Você é um especialista em direito do consumidor e privacidade de dados. Sua tarefa é analisar o texto legal fornecido (Termos de Serviço ou Política de Privacidade) e transformá-lo em informações claras, acionáveis e estritamente formatadas em JSON para um utilizador comum.

A ÚNICA saída permitida deve ser um objeto JSON puro. NÃO use blocos de código Markdown. NÃO inclua qualquer texto introdutório, explicativo ou conclusivo. A resposta deve ser APENAS o JSON em português (Portugal) seguindo esta estrutura EXATA:

{
  "resumo_conciso": "Um resumo rápido e geral do que o utilizador está a aceitar. Use no máximo dois parágrafos.",
  "pontos_chave": [
    "Use um ponto para descrever os aspetos mais importantes do serviço.",
    "Use outro ponto para descrever os direitos e responsabilidades cruciais do utilizador.",
    "Crie um total de 5 a 7 pontos essenciais sobre como o serviço funciona, a que se compromete, ou o que é fundamental saber."
  ],
  "alertas_privacidade": [
    {
      "tipo": "partilha_dados",
      "texto": "Os seus dados podem ser partilhados com terceiros (ex: anunciantes) para fins de marketing ou monetização."
    },
    {
      "tipo": "propriedade_conteudo",
      "texto": "Cláusulas que permitem à empresa usar, modificar ou sublicenciar o seu conteúdo (fotos, posts) sem restrições ou compensação."
    },
    {
      "tipo": "alteracoes_termos",
      "texto": "A empresa reserva-se o direito de alterar unilateralmente os termos ou a política sem aviso prévio ou notificação ativa ao utilizador."
    },
    {
      "tipo": "jurisdicao",
      "texto": "Existem cláusulas que forçam a arbitragem ou limitam a jurisdição do tribunal, dificultando ações judiciais diretas contra a empresa."
    }
  ]
}

Valores Válidos para o Campo tipo (Use um destes para cada objeto de alerta):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Apenas use este valor se não for encontrado nenhum dos riscos acima. Se este for usado, ele deve ser o único objeto na lista alertas_privacidade.)

Mantenha a linguagem dos valores dentro do JSON direta, acessível e objetiva. Evite jargão jurídico sempre que possível.

---

Texto Legal a ser Analisado:

${textToSummarize}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da API Gemini:', response.status, response.statusText, errorText);
        throw new Error(`Erro da API Gemini: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        let responseText = data.candidates[0].content.parts[0].text;

        // Limpar blocos de código Markdown se presentes
        responseText = cleanMarkdownCodeBlocks(responseText);
        
        return responseText;
    } else {
        throw new Error('Resposta inválida da API Gemini');
    }
}

// Função para limpar blocos de código Markdown
function cleanMarkdownCodeBlocks(text) {
    return text
        .replace(/^```json\s*/gm, '')
        .replace(/^```\s*/gm, '')
        .replace(/\s*```$/gm, '')
        .replace(/^```\s*json\s*/gm, '')
        .replace(/^```\s*/gm, '')
        .replace(/\s*```\s*$/gm, '')
        .trim();
}

// Funções auxiliares para gestão de utilizadores e créditos
async function getUserCredits(userId) {
    try {
        return await db.getUserCredits(userId);
    } catch (error) {
        console.error('Error getting user credits:', error);
        return 5; // Default credits
    }
}

async function decrementUserCredits(userId) {
    try {
        return await db.decrementUserCredits(userId);
    } catch (error) {
        console.error('Error decrementing credits:', error);
        return 0;
    }
}

// Endpoint para verificar créditos
router.get('/credits/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const credits = await getUserCredits(userId);
        
        res.json({
            userId,
            credits,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao verificar créditos:', error);
        res.status(500).json({
            error: 'Erro ao verificar créditos'
        });
    }
});

export default router;
