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

// Função para detectar tipo de documento baseado no conteúdo
function detectDocumentType(text) {
    const lowerText = text.toLowerCase();
    
    // Palavras-chave multi-idioma para Política de Privacidade
    const privacyKeywords = [
        // Português
        'política de privacidade', 'privacidade', 'dados pessoais', 'proteção de dados',
        'política de cookies', 'recolha de dados', 'processamento de dados',
        'informações que coletamos', 'como usamos seus dados', 'compartilhamento de dados',
        'retenção de dados', 'aviso de privacidade', 'informações pessoais',
        'controlador de dados',
        
        // Inglês
        'privacy policy', 'privacy', 'personal data', 'data protection',
        'cookie policy', 'data collection', 'data processing',
        'information we collect', 'how we use your data', 'data sharing',
        'data retention', 'privacy notice', 'personal information',
        'data controller',
        
        // Espanhol
        'política de privacidad', 'privacidad', 'datos personales', 'protección de datos',
        'política de cookies', 'recopilación de datos', 'procesamiento de datos',
        'información que recopilamos', 'cómo usamos sus datos', 'compartir datos',
        'retención de datos', 'aviso de privacidad', 'información personal',
        'controlador de datos',
        
        // Francês
        'politique de confidentialité', 'confidentialité', 'données personnelles', 'protection des données',
        'politique de cookies', 'collecte de données', 'traitement des données',
        'informations que nous collectons', 'comment nous utilisons vos données', 'partage de données',
        'rétention de données', 'avis de confidentialité', 'informations personnelles',
        'contrôleur de données'
    ];
    
    // Palavras-chave multi-idioma para Termos de Serviço
    const termsKeywords = [
        // Português
        'termos de serviço', 'termos e condições', 'contrato de utilizador',
        'condições de uso', 'termos do serviço', 'condições de utilização',
        'uso aceitável', 'usos proibidos', 'responsabilidade',
        'limitação de responsabilidade', 'obrigações do utilizador',
        'descrição do serviço', 'termos de pagamento', 'política de cancelamento',
        
        // Inglês
        'terms of service', 'terms and conditions', 'user agreement',
        'terms of use', 'service terms', 'conditions of use',
        'acceptable use', 'prohibited uses', 'liability',
        'limitation of liability', 'user obligations',
        'service description', 'payment terms', 'cancellation policy',
        
        // Espanhol
        'términos de servicio', 'términos y condiciones', 'acuerdo de usuario',
        'términos de uso', 'términos del servicio', 'condiciones de uso',
        'uso aceptable', 'usos prohibidos', 'responsabilidad',
        'limitación de responsabilidad', 'obligaciones del usuario',
        'descripción del servicio', 'términos de pago', 'política de cancelación',
        
        // Francês
        'conditions de service', 'conditions générales', 'accord utilisateur',
        'conditions d\'utilisation', 'conditions du service', 'conditions d\'usage',
        'utilisation acceptable', 'utilisations interdites', 'responsabilité',
        'limitation de responsabilité', 'obligations de l\'utilisateur',
        'description du service', 'conditions de paiement', 'politique d\'annulation'
    ];
    
    // Contar ocorrências com word boundaries para evitar falsos positivos
    const privacyCount = privacyKeywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        return count + matches;
    }, 0);
    
    const termsCount = termsKeywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        return count + matches;
    }, 0);
    
    // Determinar tipo baseado na contagem (com threshold mínimo)
    const minThreshold = 2;
    
    if (privacyCount >= minThreshold && privacyCount > termsCount) {
        return 'privacy_policy';
    } else if (termsCount >= minThreshold && termsCount > privacyCount) {
        return 'terms_of_service';
    } else if (privacyCount > 0 || termsCount > 0) {
        // Se há pelo menos uma ocorrência, usar a maior contagem
        if (privacyCount > termsCount) {
            return 'privacy_policy';
        } else if (termsCount > privacyCount) {
            return 'terms_of_service';
        }
    }
    
    // PRIORIDADE 2: Fallback baseado em palavras-chave simples
    if (lowerText.includes('privacidade') || lowerText.includes('privacy')) {
        return 'privacy_policy';
    } else if (lowerText.includes('termos') || lowerText.includes('terms')) {
        return 'terms_of_service';
    }
    
    return 'unknown';
}

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

        const { userId, text, apiType = 'shared', url, title, language = 'pt' } = req.body;

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

        // Chamar API Gemini com idioma
        const geminiResponse = await callGeminiAPI(text, language);
        success = true;
        
        // Detectar tipo de documento baseado no conteúdo
        const documentType = detectDocumentType(text);
        
        // Calcular ratings baseado no resumo e texto
        const ratings = db.calculateRatings(geminiResponse, text.length, documentType);
        
        // Registrar resumo no analytics
        const duration = Date.now() - startTime;
        console.log(`📊 Registrando resumo: userId=${userId}, success=${success}, duration=${duration}ms, type=${documentType}, textLength=${text.length}, url=${url}, title=${title}`);
        console.log(`📊 Ratings calculados: complexidade=${ratings.complexidade}, boas_praticas=${ratings.boas_praticas}, risk_score=${ratings.risk_score}`);
        try {
            await registerSummary(userId, true, duration, documentType, text.length, url, JSON.stringify(geminiResponse), title);
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
                ratings: ratings,
                credits: remainingCredits,
                apiType: 'shared',
                documentType: documentType
            });
        } else {
            res.json({
                summary: geminiResponse,
                ratings: ratings,
                apiType: 'own',
                documentType: documentType
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
async function callGeminiAPI(text, language = 'pt') {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Limitar o tamanho do texto
    const maxLength = 100000;
    const textToSummarize = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    // Prompts por idioma
    const prompts = {
        pt: `Você é um especialista em direito do consumidor e privacidade de dados. Sua tarefa é analisar o texto legal fornecido (Termos de Serviço ou Política de Privacidade) e transformá-lo em informações claras, acionáveis e estritamente formatadas em JSON para um utilizador comum.

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

Mantenha a linguagem dos valores dentro do JSON direta, acessível e objetiva. Evite jargão jurídico sempre que possível.`,

        en: `You are an expert in consumer law and data privacy. Your task is to analyze the provided legal text (Terms of Service or Privacy Policy) and transform it into clear, actionable information strictly formatted in JSON for a common user.

The ONLY allowed output should be a pure JSON object. DO NOT use Markdown code blocks. DO NOT include any introductory, explanatory or concluding text. The response should be ONLY the JSON in English following this EXACT structure:

{
  "resumo_conciso": "A quick and general summary of what the user is accepting. Use at most two paragraphs.",
  "pontos_chave": [
    "Use one point to describe the most important aspects of the service.",
    "Use another point to describe the crucial rights and responsibilities of the user.",
    "Create a total of 5 to 7 essential points about how the service works, what it commits to, or what is fundamental to know."
  ],
  "alertas_privacidade": [
    {
      "tipo": "partilha_dados",
      "texto": "Your data may be shared with third parties (e.g. advertisers) for marketing or monetization purposes."
    },
    {
      "tipo": "propriedade_conteudo",
      "texto": "Clauses that allow the company to use, modify or sublicense your content (photos, posts) without restrictions or compensation."
    },
    {
      "tipo": "alteracoes_termos",
      "texto": "The company reserves the right to unilaterally change terms or policy without prior notice or active notification to the user."
    },
    {
      "tipo": "jurisdicao",
      "texto": "There are clauses that force arbitration or limit court jurisdiction, making direct legal action against the company difficult."
    }
  ]
}

Valid Values for the tipo field (Use one of these for each alert object):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Only use this value if none of the above risks are found. If this is used, it should be the only object in the alertas_privacidade list.)

Keep the language within the JSON values direct, accessible and objective. Avoid legal jargon whenever possible.`,

        es: `Eres un experto en derecho del consumidor y privacidad de datos. Tu tarea es analizar el texto legal proporcionado (Términos de Servicio o Política de Privacidad) y transformarlo en información clara, accionable y estrictamente formateada en JSON para un usuario común.

La ÚNICA salida permitida debe ser un objeto JSON puro. NO uses bloques de código Markdown. NO incluyas ningún texto introductorio, explicativo o concluyente. La respuesta debe ser SOLO el JSON en español siguiendo esta estructura EXACTA:

{
  "resumo_conciso": "Un resumen rápido y general de lo que el usuario está aceptando. Usa como máximo dos párrafos.",
  "pontos_chave": [
    "Usa un punto para describir los aspectos más importantes del servicio.",
    "Usa otro punto para describir los derechos y responsabilidades cruciales del usuario.",
    "Crea un total de 5 a 7 puntos esenciales sobre cómo funciona el servicio, a qué se compromete, o qué es fundamental saber."
  ],
  "alertas_privacidade": [
    {
      "tipo": "partilha_dados",
      "texto": "Tus datos pueden ser compartidos con terceros (ej: anunciantes) para fines de marketing o monetización."
    },
    {
      "tipo": "propriedade_conteudo",
      "texto": "Cláusulas que permiten a la empresa usar, modificar o sublicenciar tu contenido (fotos, posts) sin restricciones o compensación."
    },
    {
      "tipo": "alteracoes_termos",
      "texto": "La empresa se reserva el derecho de cambiar unilateralmente los términos o la política sin aviso previo o notificación activa al usuario."
    },
    {
      "tipo": "jurisdicao",
      "texto": "Existen cláusulas que fuerzan el arbitraje o limitan la jurisdicción del tribunal, dificultando acciones legales directas contra la empresa."
    }
  ]
}

Valores Válidos para el Campo tipo (Usa uno de estos para cada objeto de alerta):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Solo usa este valor si no se encuentra ninguno de los riesgos anteriores. Si este se usa, debe ser el único objeto en la lista alertas_privacidade.)

Mantén el lenguaje de los valores dentro del JSON directo, accesible y objetivo. Evita jerga legal siempre que sea posible.`,

        fr: `Vous êtes un expert en droit de la consommation et en confidentialité des données. Votre tâche est d'analyser le texte juridique fourni (Conditions de Service ou Politique de Confidentialité) et de le transformer en informations claires, exploitables et strictement formatées en JSON pour un utilisateur commun.

La SEULE sortie autorisée doit être un objet JSON pur. N'utilisez PAS de blocs de code Markdown. N'incluez AUCUN texte introductif, explicatif ou conclusif. La réponse doit être SEULEMENT le JSON en français suivant cette structure EXACTE:

{
  "resumo_conciso": "Un résumé rapide et général de ce que l'utilisateur accepte. Utilisez au maximum deux paragraphes.",
  "pontos_chave": [
    "Utilisez un point pour décrire les aspects les plus importants du service.",
    "Utilisez un autre point pour décrire les droits et responsabilités cruciaux de l'utilisateur.",
    "Créez un total de 5 à 7 points essentiels sur le fonctionnement du service, à quoi il s'engage, ou ce qu'il est fondamental de savoir."
  ],
  "alertas_privacidade": [
    {
      "tipo": "partilha_dados",
      "texto": "Vos données peuvent être partagées avec des tiers (ex: annonceurs) à des fins de marketing ou de monétisation."
    },
    {
      "tipo": "propriedade_conteudo",
      "texto": "Clauses qui permettent à l'entreprise d'utiliser, modifier ou sous-licencier votre contenu (photos, posts) sans restrictions ou compensation."
    },
    {
      "tipo": "alteracoes_termos",
      "texto": "L'entreprise se réserve le droit de modifier unilatéralement les termes ou la politique sans préavis ou notification active à l'utilisateur."
    },
    {
      "tipo": "jurisdicao",
      "texto": "Il existe des clauses qui forcent l'arbitrage ou limitent la juridiction du tribunal, rendant difficile les actions légales directes contre l'entreprise."
    }
  ]
}

Valeurs Valides pour le Champ tipo (Utilisez l'une de ces valeurs pour chaque objet d'alerte):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Utilisez cette valeur seulement si aucun des risques ci-dessus n'est trouvé. Si cette valeur est utilisée, elle doit être le seul objet dans la liste alertas_privacidade.)

Gardez le langage des valeurs dans le JSON direct, accessible et objectif. Évitez le jargon juridique autant que possible.`
    };

    const prompt = prompts[language] + `

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
