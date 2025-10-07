// Service Worker para comunicação com API Gemini
// Suporte para API compartilhada (via backend seguro) e chaves próprias
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// URLs do backend seguro (substituir pela URL do seu servidor)
// const BACKEND_BASE_URL = 'http://localhost:3000'; // Para desenvolvimento local
const BACKEND_BASE_URL = 'https://tos-privacy-summarizer.vercel.app';

const API_ENDPOINTS = {
    PROXY: `${BACKEND_BASE_URL}/api/gemini/proxy`,
    CREDITS: `${BACKEND_BASE_URL}/api/credits`,
    USERS: `${BACKEND_BASE_URL}/api/users`,
    STRIPE: `${BACKEND_BASE_URL}/api/stripe`
};

// Sistema de logging melhorado
const Logger = {
    log: (message, data = null) => {
        console.log(`[ToS-Background] ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[ToS-Background ERROR] ${message}`, error || '');
        if (error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
    },
    warn: (message, data = null) => {
        console.warn(`[ToS-Background WARNING] ${message}`, data || '');
    }
};

// Sistema de retry para requisições
const RetryManager = {
    maxRetries: 3,
    baseDelay: 1000,
    
    async executeWithRetry(operation, context = '') {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                Logger.log(`Tentativa ${attempt}/${this.maxRetries} ${context}`);
                return await operation();
            } catch (error) {
                lastError = error;
                Logger.warn(`Tentativa ${attempt} falhou ${context}:`, error.message);
                
                if (attempt < this.maxRetries) {
                    const delay = this.baseDelay * Math.pow(2, attempt - 1);
                    Logger.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        Logger.error(`Todas as tentativas falharam ${context}:`, lastError);
        throw lastError;
    }
};

// Listener para mensagens do content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizeText') {
    Logger.log('Recebido texto para resumir:', {
      textLength: request.text?.length || 0,
      url: request.url,
      title: request.title,
      language: request.language || 'pt'
    });

    // Processar de forma assíncrona mas sem usar sendResponse
    processSummaryAsync(request.text, request.url, request.title, request.language)
      .catch(error => {
        Logger.error('Erro no processamento assíncrono:', error);
        chrome.runtime.sendMessage({
          action: 'displaySummary',
          summary: `Erro interno: ${error.message}`
        });
      });
    
    // Responder imediatamente para evitar erro de canal fechado
    sendResponse({ status: 'processing' });
  }
});

// Função assíncrona para processar o resumo
async function processSummaryAsync(text, url = '', title = '', language = 'pt') {
  try {
    Logger.log('Processando resumo...', { language });
    
    // Validar entrada
    if (!text || typeof text !== 'string') {
      throw new Error('Texto inválido fornecido');
    }
    
    if (text.length < 50) {
      throw new Error('Texto muito curto para análise (mínimo 50 caracteres)');
    }
    
    // Enviar atualização de progresso inicial
    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      step: 1,
      text: 'Texto extraído com sucesso',
      progress: 25
    });

    // Obter configuração da API do storage
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKey', 'apiType', 'userId'], resolve);
    });

    // Forçar uso da API compartilhada (backend seguro)
    let apiType = 'shared';
    let userId = result.userId;
    
    Logger.log('🔧 Configuração forçada para API compartilhada');

    // Se não tem userId, criar um
    if (!userId) {
      userId = await createOrGetUserId();
    }

    // Enviar atualização de progresso
    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      step: 2,
      text: 'Enviando para análise IA',
      progress: 50
    });

    let summary;
    
    if (apiType === 'shared') {
      // Usar backend seguro com retry
      summary = await RetryManager.executeWithRetry(
        () => summarizeWithBackend(text, userId, url, title, language),
        'summarizeWithBackend'
      );
    } else {
      // Usar chave própria (método antigo)
      const apiKey = result.geminiApiKey;
      
      if (!apiKey || apiKey === 'SHARED_API') {
        throw new Error('Chave da API não configurada. Por favor, configure a sua chave da API Gemini nas configurações da extensão.');
      }
      
      summary = await RetryManager.executeWithRetry(
        () => summarizeWithGemini(text, apiKey, language),
        'summarizeWithGemini'
      );
    }
    
    Logger.log('Resumo gerado com sucesso');
    
    // Enviar atualização de progresso final
    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      step: 4,
      text: 'Processamento concluído',
      progress: 100
    });
    
    // Aguardar um pouco antes de mostrar o resultado
    setTimeout(() => {
      Logger.log('Enviando resumo para popup');
      chrome.runtime.sendMessage({
        action: 'displaySummary',
        summary: summary.summary || summary, // Compatibilidade com formato antigo
        ratings: summary.ratings,
        documentType: summary.documentType
      });
    }, 500);

  } catch (error) {
    Logger.error('Erro ao gerar resumo:', error);
    
    // Determinar tipo de erro e enviar mensagem apropriada
    let errorMessage = 'Erro ao gerar resumo: ';
    
    if (error.message.includes('API Gemini')) {
      if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage += 'Chave da API inválida ou sem permissões';
      } else if (error.message.includes('429')) {
        errorMessage += 'Limite de uso da API atingido';
      } else {
        errorMessage += 'Erro na API Gemini';
      }
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      errorMessage += 'Erro de ligação à internet';
    } else if (error.message.includes('JSON')) {
      errorMessage += 'Erro ao processar resposta da API';
    } else if (error.message.includes('Créditos insuficientes')) {
      errorMessage += 'Créditos insuficientes. Compre mais créditos ou configure a sua própria chave da API.';
    } else if (error.message.includes('HTTP')) {
      errorMessage += `Erro do servidor: ${error.message}`;
    } else if (error.message.includes('Texto muito curto')) {
      errorMessage = error.message;
    } else if (error.message.includes('Texto inválido')) {
      errorMessage = error.message;
    } else {
      errorMessage += error.message;
    }
    
    Logger.log('Enviando erro para popup:', errorMessage);
    
    chrome.runtime.sendMessage({
      action: 'displaySummary',
      summary: errorMessage
    });
  }
}

// Função para criar ou obter ID do utilizador
async function createOrGetUserId() {
  try {
    // Tentar obter userId existente
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['userId'], resolve);
    });
    
    if (result.userId) {
      return result.userId;
    }
    
    // Criar novo utilizador no backend
    const response = await fetch(`${API_ENDPOINTS.USERS}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: generateDeviceId()
      })
    });
    
    if (!response.ok) {
      throw new Error('Erro ao criar utilizador');
    }
    
    const userData = await response.json();
    
    // Guardar userId no storage
    chrome.storage.local.set({ userId: userData.userId });
    
    return userData.userId;
    
  } catch (error) {
    console.error('Erro ao criar/utilizar utilizador:', error);
    // Fallback: gerar ID local
    const fallbackId = generateDeviceId();
    chrome.storage.local.set({ userId: fallbackId });
    return fallbackId;
  }
}

// Função para gerar ID único do dispositivo
function generateDeviceId() {
  // Gerar ID único usando características disponíveis no Service Worker
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const userAgent = navigator.userAgent || 'unknown';
  
  // Criar hash simples baseado em características disponíveis
  let hash = '';
  for (let i = 0; i < userAgent.length; i++) {
    hash += userAgent.charCodeAt(i).toString(16);
  }
  
  // Combinar tudo para criar ID único
  const deviceId = `device_${hash.substring(0, 8)}_${timestamp}_${random}`;
  
  console.log('ID do dispositivo gerado:', deviceId);
  return deviceId;
}

// Função para usar backend seguro
async function summarizeWithBackend(text, userId, url = '', title = '', language = 'pt') {
  try {
    Logger.log('Usando backend seguro para resumir texto...', {
      url: API_ENDPOINTS.PROXY,
      userId: userId,
      textLength: text.length,
      pageUrl: url,
      pageTitle: title
    });
    
    const response = await fetch(API_ENDPOINTS.PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        text: text,
        apiType: 'shared',
        url: url,
        title: title,
        language: language
      })
    });
    
    Logger.log('Response status:', response.status);
    Logger.log('Response ok:', response.ok);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Erro HTTP: ${response.status} ${response.statusText}` };
      }
      Logger.error('Backend error:', errorData);
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    Logger.log('Backend result:', result);
    
    // Atualizar créditos no storage se disponível
    if (result.credits !== undefined) {
      chrome.storage.local.set({ sharedCredits: result.credits });
    }
    
    // Processar ratings se disponíveis
    if (result.ratings) {
      Logger.log('Ratings recebidos:', result.ratings);
      chrome.storage.local.set({ 
        lastRatings: result.ratings,
        lastDocumentType: result.documentType || 'unknown'
      });
    }
    
    return {
      summary: result.summary,
      ratings: result.ratings,
      documentType: result.documentType
    };
    
  } catch (error) {
    Logger.error('Erro no backend:', error);
    throw error;
  }
}

// Cache para modelos disponíveis
let cachedModels = null;
let modelsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para chamar a API Gemini diretamente (método antigo)
async function summarizeWithGemini(text, apiKey, language = 'pt') {
  try {
    // Verificar se temos modelos em cache válido
    const now = Date.now();
    if (!cachedModels || (now - modelsCacheTime) > CACHE_DURATION) {
      cachedModels = await listAvailableModels(apiKey);
      modelsCacheTime = now;
    }

    let modelsToTry = [];

    if (cachedModels && cachedModels.models) {
      // Filtrar apenas modelos que suportam generateContent
      modelsToTry = cachedModels.models
        .filter(model => model.supportedGenerationMethods &&
                        model.supportedGenerationMethods.includes('generateContent'))
        .map(model => model.name.replace('models/', ''))
        .slice(0, 3); // Pegar apenas os primeiros 3
    }

    // Fallback para modelos conhecidos se não conseguir listar
    if (modelsToTry.length === 0) {
      modelsToTry = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.0-pro'];
    }

    console.log('Modelos a tentar:', modelsToTry);

    for (const model of modelsToTry) {
      try {
        console.log(`Tentando modelo: ${model}`);
        const result = await tryModel(model, text, apiKey, language);
        console.log(`Modelo ${model} funcionou!`);
        return result;
      } catch (error) {
        console.warn(`Modelo ${model} falhou:`, error.message);
        if (model === modelsToTry[modelsToTry.length - 1]) {
          throw error; // Se todos os modelos falharam
        }
      }
    }
  } catch (error) {
    console.error('Erro geral na função summarizeWithGemini:', error);
    throw error;
  }
}

// Função para tentar um modelo específico
async function tryModel(model, text, apiKey, language = 'pt') {
  // Limitar o tamanho do texto para evitar limites da API
  const maxLength = 100000; // Ajustar conforme necessário
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
      "texto": "Existen cláusulas que fuerzan el arbitraje o limitan la jurisdicción del tribunal, dificultando las acciones legales directas contra la empresa."
    }
  ]
}

Valores Válidos para el Campo tipo (Usa uno de estos para cada objeto de alerta):
- partilha_dados
- propriedade_conteudo
- alteracoes_termos
- jurisdicao
- outros_riscos
- sem_alertas (Solo usa este valor si no se encuentra ninguno de los riesgos anteriores. Si se usa, debe ser el único objeto en la lista alertas_privacidade.)

Mantén el lenguaje de los valores dentro del JSON directo, accesible y objetivo. Evita la jerga legal siempre que sea posible.`,

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

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  console.log('Fazendo chamada para:', `${apiUrl}?key=${apiKey.substring(0, 10)}...`);

  const response = await fetch(`${apiUrl}?key=${apiKey}`, {
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

    console.log('Resposta limpa da API:', responseText.substring(0, 200) + '...');
    return responseText;
  } else {
    throw new Error('Resposta inválida da API Gemini');
  }
}

// Função para limpar blocos de código Markdown da resposta da API
function cleanMarkdownCodeBlocks(text) {
  // Remover blocos de código Markdown (```json ... ```)
  let cleanedText = text
    .replace(/^```json\s*/gm, '')  // Remover início do bloco
    .replace(/^```\s*/gm, '')       // Remover fim do bloco
    .replace(/\s*```$/gm, '')       // Remover fim do bloco no final da linha
    .trim();

  // Também remover possíveis variações
  cleanedText = cleanedText
    .replace(/^```\s*json\s*/gm, '')
    .replace(/^```\s*/gm, '')
    .replace(/\s*```\s*$/gm, '')
    .trim();

  console.log('Texto antes da limpeza:', text.substring(0, 100) + '...');
  console.log('Texto após limpeza:', cleanedText.substring(0, 100) + '...');

  return cleanedText;
}

// Função para listar modelos disponíveis (para debug)
async function listAvailableModels(apiKey) {
  try {
    console.log('Listando modelos disponíveis...');
    const response = await fetch(`${GEMINI_MODELS_URL}?key=${apiKey}`);

    if (!response.ok) {
      console.error('Erro ao listar modelos:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('Modelos disponíveis:', data);

    if (data.models) {
      const generateContentModels = data.models.filter(model =>
        model.supportedGenerationMethods &&
        model.supportedGenerationMethods.includes('generateContent')
      );
      console.log('Modelos que suportam generateContent:', generateContentModels.map(m => m.name));
    }

    return data;
  } catch (error) {
    console.error('Erro ao listar modelos:', error);
    return null;
  }
}

// Listener para quando a extensão é instalada
chrome.runtime.onInstalled.addListener((details) => {
  console.log('ToS & Privacy Summarizer instalado com sucesso');
  
  // Verificar se é uma nova instalação
  if (details.reason === 'install') {
    console.log('Nova instalação detectada - mostrar onboarding');
    
    // Abrir página de onboarding para novas instalações
    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding.html')
    });
  }
  
  // Definir configurações padrão
  chrome.storage.local.get(['geminiApiKey', 'autoDetect', 'notifications', 'apiType'], function(result) {
    const defaults = {
      autoDetect: result.autoDetect !== false, // Default: true
      notifications: result.notifications !== false, // Default: true
      apiType: result.apiType || 'shared' // Default: usar API compartilhada
    };
    
    chrome.storage.local.set(defaults, function() {
      console.log('Configurações padrão definidas:', defaults);
    });
  });
});