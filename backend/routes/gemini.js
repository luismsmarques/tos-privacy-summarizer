import express from 'express';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { registerUser, registerSummary } from './analytics.js';
import db from '../utils/database.js';
import { detectDocumentType } from '../utils/document-type.js';
import { dbRateLimit } from '../middleware/db-rate-limit.js';
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


// Extrair a classificação numérica produzida pelo próprio Gemini.
// Substitui a antiga contagem de palavras-chave (enviesada) pela avaliação
// do modelo. Só recorre à heurística se o modelo não devolver scores válidos.
export function extractRatings(responseText, textLength, documentType) {
    try {
        const parsed = JSON.parse(responseText);
        const c = parsed.classificacao;
        if (c && c.complexidade != null && c.boas_praticas != null && c.risco != null) {
            const clamp = (v) => Math.min(Math.max(Math.round(Number(v)), 1), 10);
            const complexidade = clamp(c.complexidade);
            const boas_praticas = clamp(c.boas_praticas);
            const risk_score = clamp(c.risco);
            if ([complexidade, boas_praticas, risk_score].every(Number.isFinite)) {
                console.log(`📊 Classificação do Gemini: complexidade=${complexidade}, boas_praticas=${boas_praticas}, risk_score=${risk_score}`);
                return { complexidade, boas_praticas, risk_score };
            }
        }
        console.warn('⚠️ Classificação do Gemini ausente/inválida — a usar heurística de fallback');
    } catch (error) {
        console.warn('⚠️ Não foi possível parsear o JSON do Gemini para classificação — a usar heurística:', error.message);
    }
    return db.calculateRatings(responseText, textLength, documentType);
}

// Remove o bloco "classificacao" do JSON do resumo — já o expomos
// separadamente em `ratings`, não precisa de poluir o resumo guardado/devolvido.
// Mantém a resiliência: se não for JSON válido, devolve o texto inalterado.
export function stripClassificacao(responseText) {
    try {
        const parsed = JSON.parse(responseText);
        if (parsed && typeof parsed === 'object' && 'classificacao' in parsed) {
            delete parsed.classificacao;
            return JSON.stringify(parsed);
        }
    } catch (error) {
        // não é JSON válido — devolver tal como veio
    }
    return responseText;
}

// Normaliza os alertas de privacidade do resumo:
// - remove entradas sem `texto` válido (evita renderizar "undefined" na extensão);
// - remove o marcador "sem_alertas" (a extensão esconde a secção se a lista ficar vazia).
// Resiliente: se não for JSON válido, devolve a string inalterada.
export function normalizeSummaryAlerts(summaryJson) {
    try {
        const parsed = JSON.parse(summaryJson);
        if (parsed && Array.isArray(parsed.alertas_privacidade)) {
            parsed.alertas_privacidade = parsed.alertas_privacidade.filter(
                (a) => a && typeof a.texto === 'string' && a.texto.trim() && a.tipo !== 'sem_alertas'
            );
            return JSON.stringify(parsed);
        }
    } catch (error) {
        // não é JSON válido — devolver tal como veio
    }
    return summaryJson;
}

// Rate limit partilhado para o endpoint caro (por utilizador, fallback IP).
const proxyRateLimit = dbRateLimit({
    windowMs: 60 * 1000,
    max: 15,
    keyGenerator: (req) => `gemini:${req.body?.userId || req.ip}`
});

// Endpoint principal para proxy da API Gemini
router.post('/proxy', [
    checkGeminiKey,
    proxyRateLimit,
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

        const body = await runSummary({ userId, text, apiType, url, title, language, ip: req.ip || 'unknown' });
        res.json(body);

    } catch (error) {
        console.error('Erro no proxy Gemini:', error);
        const duration = Date.now() - startTime;
        await registerSummary(req.body.userId || 'unknown', false, duration, 'error', 0).catch(() => {});
        sendSummaryError(res, error);
    }
});

// Lógica central de sumarização — partilhada por /proxy (texto) e
// /summarize-url (URL). Devolve o corpo de resposta; lança erro tipado
// INSUFFICIENT_CREDITS quando não há créditos (API partilhada).
async function runSummary({ userId, text, apiType = 'shared', url = null, title = null, language = 'pt', ip = 'unknown' }) {
    const startTime = Date.now();

    await registerUser(userId, ip);

    if (apiType === 'shared') {
        const userCredits = await getUserCredits(userId);
        if (userCredits <= 0) {
            const err = new Error('Créditos insuficientes');
            err.code = 'INSUFFICIENT_CREDITS';
            err.credits = userCredits;
            throw err;
        }
    }

    // Cache por hash do conteúdo (idioma + texto).
    const contentHash = crypto.createHash('sha256').update(`${language}\n${text}`).digest('hex');

    let summaryJson, ratings, documentType, apiUsage = null;
    const cacheEnabled = await db.getSetting('cacheEnabled', true) !== false;
    const cached = cacheEnabled ? await db.getCachedSummary(contentHash) : null;

    if (cached) {
        summaryJson = normalizeSummaryAlerts(cached.summary);
        documentType = cached.document_type || 'unknown';
        const cachedRatings = typeof cached.ratings === 'string' ? JSON.parse(cached.ratings) : cached.ratings;
        ratings = db.normalizeRatings(cachedRatings) || db.calculateRatings(summaryJson, text.length, documentType);
        console.log('⚡ Cache hit — resumo servido sem chamar a API Gemini');
    } else {
        const gem = await callGeminiAPI(text, language);
        apiUsage = gem.usage;
        documentType = detectDocumentType(text);
        ratings = extractRatings(gem.text, text.length, documentType);
        summaryJson = normalizeSummaryAlerts(stripClassificacao(gem.text));
        if (cacheEnabled) {
            await db.saveCachedSummary(contentHash, language, summaryJson, ratings, documentType);
        }
    }

    const duration = Date.now() - startTime;
    try {
        await registerSummary(userId, true, duration, documentType, text.length, url, summaryJson, title, ratings);
    } catch (error) {
        console.error('❌ Erro ao registrar resumo no analytics:', error);
    }

    const isCacheHit = !!cached;
    db.recordApiCost({
        userId,
        model: isCacheHit ? null : (apiUsage?.model || null),
        inputTokens: isCacheHit ? 0 : (apiUsage?.promptTokens || 0),
        outputTokens: isCacheHit ? 0 : (apiUsage?.candidatesTokens || 0),
        costMicros: isCacheHit ? 0 : computeGeminiCostMicros(apiUsage),
        cached: isCacheHit
    }).catch((e) => console.error('recordApiCost falhou:', e.message));

    if (apiType === 'shared') {
        await decrementUserCredits(userId);
        const remainingCredits = await getUserCredits(userId);
        return { summary: summaryJson, ratings, credits: remainingCredits, apiType: 'shared', documentType, cached: isCacheHit };
    }
    return { summary: summaryJson, ratings, apiType: 'own', documentType, cached: isCacheHit };
}

// Mapeia erros de sumarização para resposta HTTP (partilhado pelos endpoints).
function sendSummaryError(res, error) {
    if (error.code === 'INSUFFICIENT_CREDITS') {
        return res.status(402).json({
            error: 'Créditos insuficientes',
            credits: error.credits,
            message: 'Compre mais créditos ou configure a sua própria chave da API'
        });
    }
    let errorMessage = 'Erro ao processar resumo';
    let statusCode = 500;
    const msg = error.message || '';
    if (msg.includes('API Gemini')) {
        if (msg.includes('401') || msg.includes('403')) { errorMessage = 'Chave da API inválida ou sem permissões'; statusCode = 401; }
        else if (msg.includes('429')) { errorMessage = 'Limite de uso da API atingido'; statusCode = 429; }
        else { errorMessage = 'Erro na API Gemini'; statusCode = 502; }
    } else if (msg.includes('fetch') || msg.includes('network')) {
        errorMessage = 'Erro de ligação à internet'; statusCode = 503;
    }
    return res.status(statusCode).json({ error: errorMessage, timestamp: new Date().toISOString() });
}

// Endpoint: resume uma página a partir do URL (o servidor busca e extrai o
// texto). Usado pela deteção de links de Termos/Privacidade na extensão.
// Sempre via backend partilhado (consome um crédito), pois a extração é no servidor.
router.post('/summarize-url', [
    checkGeminiKey,
    proxyRateLimit,
    body('userId').isString().notEmpty().withMessage('ID do utilizador é obrigatório'),
    body('url').isString().notEmpty().withMessage('URL é obrigatório')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
        }
        const { userId, url, language = 'pt' } = req.body;

        let extracted;
        try {
            extracted = await fetchAndExtract(url);
        } catch (e) {
            return res.status(e.code === 'BAD_URL' ? 400 : 422).json({ error: e.message || 'Não foi possível obter a página' });
        }
        if (!extracted.text || extracted.text.length < 50) {
            return res.status(422).json({ error: 'Não foi possível extrair texto suficiente desta página' });
        }

        const body = await runSummary({
            userId, text: extracted.text, apiType: 'shared',
            url, title: extracted.title, language, ip: req.ip || 'unknown'
        });
        res.json(body);
    } catch (error) {
        console.error('Erro no summarize-url:', error);
        await registerSummary(req.body.userId || 'unknown', false, 0, 'error', 0).catch(() => {});
        sendSummaryError(res, error);
    }
});

// --- Busca e extração de texto de um URL (para /summarize-url) ---------------
// Guarda contra SSRF: só http/https e bloqueia hosts privados/loopback.
function isPrivateHost(hostname) {
    const h = (hostname || '').toLowerCase();
    if (!h || h === 'localhost' || h.endsWith('.localhost')) return true;
    const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) {
        const a = +m[1], b = +m[2];
        if (a === 0 || a === 10 || a === 127) return true;
        if (a === 169 && b === 254) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
    }
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
    return false;
}

function htmlToText(html) {
    return (html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
        .replace(/[ \t\f\v]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function fetchAndExtract(rawUrl) {
    let u;
    try { u = new URL(rawUrl); } catch { const e = new Error('URL inválido'); e.code = 'BAD_URL'; throw e; }
    if (!/^https?:$/.test(u.protocol)) { const e = new Error('Apenas http/https são suportados'); e.code = 'BAD_URL'; throw e; }
    if (isPrivateHost(u.hostname)) { const e = new Error('Endereço não permitido'); e.code = 'BAD_URL'; throw e; }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let resp;
    try {
        resp = await fetch(u.toString(), {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'ToS-Privacy-Summarizer/1.0 (+https://tos-privacy-summarizer.vercel.app)',
                'Accept': 'text/html,application/xhtml+xml,text/plain,*/*'
            }
        });
    } catch (e) {
        const err = new Error('Não foi possível obter a página'); err.code = 'FETCH_FAILED'; throw err;
    } finally {
        clearTimeout(timer);
    }
    // Proteção contra redireção para host interno.
    if (resp.url) {
        try { if (isPrivateHost(new URL(resp.url).hostname)) { const e = new Error('Redireção não permitida'); e.code = 'BAD_URL'; throw e; } }
        catch (e) { if (e.code === 'BAD_URL') throw e; }
    }
    if (!resp.ok) { const e = new Error(`A página respondeu ${resp.status}`); e.code = 'FETCH_FAILED'; throw e; }
    const ctype = resp.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml|text\/plain/i.test(ctype)) { const e = new Error('A página não é HTML'); e.code = 'NOT_HTML'; throw e; }

    const raw = (await resp.text()).slice(0, 2000000);
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? htmlToText(titleMatch[1]).slice(0, 300) : '';
    const text = htmlToText(raw).slice(0, 100000);
    return { text, title };
}

// Função para chamar a API Gemini
async function callGeminiAPI(text, language = 'pt') {
    // Modelo configurável via env (GEMINI_MODEL). Default num modelo atual —
    // o gemini-2.0-flash foi descontinuado pelo Google (404). Permite trocar
    // de modelo sem alterar código quando o Google descontinuar outro.
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
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
  ],
  "classificacao": {
    "complexidade": 7,
    "boas_praticas": 4,
    "risco": 6
  }
}

Valores Válidos para o Campo tipo (Use um destes para cada objeto de alerta):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Apenas use este valor se não for encontrado nenhum dos riscos acima. Se este for usado, ele deve ser o único objeto na lista alertas_privacidade.)

O campo "classificacao" é OBRIGATÓRIO e deve conter a sua avaliação numérica (inteiros de 1 a 10) do documento:
- "complexidade": quão difícil é o texto de ler e compreender (1 = muito simples, 10 = muito complexo/jurídico).
- "boas_praticas": quão respeitador é o documento para com o utilizador (1 = abusivo, 10 = exemplar em transparência e direitos).
- "risco": risco global para o utilizador ao aceitar (1 = risco mínimo, 10 = risco muito elevado).

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
  ],
  "classificacao": {
    "complexidade": 7,
    "boas_praticas": 4,
    "risco": 6
  }
}

Valid Values for the tipo field (Use one of these for each alert object):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Only use this value if none of the above risks are found. If this is used, it should be the only object in the alertas_privacidade list.)

The "classificacao" field is MANDATORY and must contain your numeric assessment (integers from 1 to 10) of the document:
- "complexidade": how hard the text is to read and understand (1 = very simple, 10 = very complex/legalistic).
- "boas_praticas": how respectful the document is towards the user (1 = abusive, 10 = exemplary in transparency and rights).
- "risco": overall risk to the user from accepting (1 = minimal risk, 10 = very high risk).

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
  ],
  "classificacao": {
    "complexidade": 7,
    "boas_praticas": 4,
    "risco": 6
  }
}

Valores Válidos para el Campo tipo (Usa uno de estos para cada objeto de alerta):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Solo usa este valor si no se encuentra ninguno de los riesgos anteriores. Si este se usa, debe ser el único objeto en la lista alertas_privacidade.)

El campo "classificacao" es OBLIGATORIO y debe contener tu evaluación numérica (enteros de 1 a 10) del documento:
- "complexidade": cuán difícil es el texto de leer y comprender (1 = muy simple, 10 = muy complejo/jurídico).
- "boas_praticas": cuán respetuoso es el documento con el usuario (1 = abusivo, 10 = ejemplar en transparencia y derechos).
- "risco": riesgo global para el usuario al aceptar (1 = riesgo mínimo, 10 = riesgo muy elevado).

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
  ],
  "classificacao": {
    "complexidade": 7,
    "boas_praticas": 4,
    "risco": 6
  }
}

Valeurs Valides pour le Champ tipo (Utilisez l'une de ces valeurs pour chaque objet d'alerte):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Utilisez cette valeur seulement si aucun des risques ci-dessus n'est trouvé. Si cette valeur est utilisée, elle doit être le seul objet dans la liste alertas_privacidade.)

Le champ "classificacao" est OBLIGATOIRE et doit contenir votre évaluation numérique (entiers de 1 à 10) du document :
- "complexidade" : à quel point le texte est difficile à lire et à comprendre (1 = très simple, 10 = très complexe/juridique).
- "boas_praticas" : à quel point le document respecte l'utilisateur (1 = abusif, 10 = exemplaire en transparence et droits).
- "risco" : risque global pour l'utilisateur en acceptant (1 = risque minimal, 10 = risque très élevé).

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
                maxOutputTokens: 4096,
                // Desativar o "thinking" do gemini-2.5-flash: reduz a latência
                // e evita que os tokens de raciocínio consumam o orçamento de
                // saída (causava JSON truncado / "Unterminated string").
                thinkingConfig: { thinkingBudget: 0 }
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

        // Contagem de tokens para cálculo de custo (pode não vir em alguns erros)
        const u = data.usageMetadata || {};
        const usage = {
            model: GEMINI_MODEL,
            promptTokens: u.promptTokenCount || 0,
            candidatesTokens: u.candidatesTokenCount || 0,
            totalTokens: u.totalTokenCount || 0
        };

        return { text: responseText, usage };
    } else {
        throw new Error('Resposta inválida da API Gemini');
    }
}

// Custo da chamada Gemini em micro-euros (1 EUR = 1.000.000 micros).
// Preços por 1M de tokens configuráveis via env (aproximados por omissão —
// confirmar com o tarifário atual do Google e ajustar GEMINI_PRICE_*).
function computeGeminiCostMicros(usage) {
    const inPerM = parseFloat(process.env.GEMINI_PRICE_INPUT_PER_M ?? '0.30');
    const outPerM = parseFloat(process.env.GEMINI_PRICE_OUTPUT_PER_M ?? '2.50');
    const input = usage?.promptTokens || 0;
    const output = usage?.candidatesTokens || 0;
    // (tokens / 1e6) * preço_por_milhão * 1e6  ==  tokens * preço_por_milhão
    return Math.round(input * inPerM + output * outPerM);
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
