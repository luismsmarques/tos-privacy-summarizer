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
    STRIPE: `${BACKEND_BASE_URL}/api/stripe`,
    LOG_ANALYTICS: `${BACKEND_BASE_URL}/api/log-analytics`
};

// Listener para mensagens do content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizeText') {
    console.log('Recebido texto para resumir:', request.text.substring(0, 100) + '...');

    // Processar de forma assíncrona mas sem usar sendResponse
    processSummaryAsync(request.text);
    
    // Responder imediatamente para evitar erro de canal fechado
    sendResponse({ status: 'processing' });
  }
});

// Função assíncrona para processar o resumo
async function processSummaryAsync(text) {
  const startTime = Date.now();
  let success = false;
  let error = null;
  let summary = null;
  let userId = null;
  
  try {
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
    userId = result.userId;
    
    console.log('🔧 Configuração forçada para API compartilhada');

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

    if (apiType === 'shared') {
      // Usar backend seguro
      summary = await summarizeWithBackend(text, userId);
    } else {
      // Usar chave própria (método antigo)
      const apiKey = result.geminiApiKey;
      
      if (!apiKey || apiKey === 'SHARED_API') {
        chrome.runtime.sendMessage({
          action: 'displaySummary',
          summary: 'Erro: Chave da API não configurada. Por favor, configure a sua chave da API Gemini nas configurações da extensão.'
        });
        return;
      }
      
      summary = await summarizeWithGemini(text, apiKey);
    }
    
    console.log('Resumo gerado com sucesso');
    success = true;
    
    // Enviar atualização de progresso final
    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      step: 4,
      text: 'Processamento concluído',
      progress: 100
    });
    
    // Aguardar um pouco antes de mostrar o resultado
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'displaySummary',
        summary: summary
      });
    }, 1000);

  } catch (err) {
    console.error('Erro ao gerar resumo:', err);
    error = err;
    success = false;
    
    // Determinar tipo de erro e enviar mensagem apropriada
    let errorMessage = 'Erro ao gerar resumo: ';
    
    if (err.message.includes('API Gemini')) {
      if (err.message.includes('401') || err.message.includes('403')) {
        errorMessage += 'Chave da API inválida ou sem permissões';
      } else if (err.message.includes('429')) {
        errorMessage += 'Limite de uso da API atingido';
      } else {
        errorMessage += 'Erro na API Gemini';
      }
    } else if (err.message.includes('fetch') || err.message.includes('network')) {
      errorMessage += 'Erro de ligação à internet';
    } else if (err.message.includes('JSON')) {
      errorMessage += 'Erro ao processar resposta da API';
    } else if (err.message.includes('Créditos insuficientes')) {
      errorMessage += 'Créditos insuficientes. Compre mais créditos ou configure a sua própria chave da API.';
    } else {
      errorMessage += err.message;
    }
    
    chrome.runtime.sendMessage({
      action: 'displaySummary',
      summary: errorMessage
    });
  } finally {
    // Log analytics sempre, independentemente do sucesso ou erro
    const responseTime = (Date.now() - startTime) / 1000;
    await logAnalytics(userId, text, responseTime, success, error);
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
async function summarizeWithBackend(text, userId) {
  try {
    console.log('Usando backend seguro para resumir texto...');
    
    const response = await fetch(API_ENDPOINTS.PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        text: text,
        apiType: 'shared'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Atualizar créditos no storage se disponível
    if (result.credits !== undefined) {
      chrome.storage.local.set({ sharedCredits: result.credits });
    }
    
    return result.summary;
    
  } catch (error) {
    console.error('Erro no backend:', error);
    throw error;
  }
}

// Cache para modelos disponíveis
let cachedModels = null;
let modelsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para chamar a API Gemini diretamente (método antigo)
async function summarizeWithGemini(text, apiKey) {
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
        const result = await tryModel(model, text, apiKey);
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
async function tryModel(model, text, apiKey) {
  // Limitar o tamanho do texto para evitar limites da API
  const maxLength = 100000; // Ajustar conforme necessário
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

// Função para fazer log de analytics
async function logAnalytics(userId, text, responseTime, success, error) {
  try {
    if (!userId) {
      console.warn('Não é possível fazer log de analytics sem userId');
      return;
    }

    // Detectar tipo de documento baseado no texto
    let documentType = 'other';
    const textLower = text.toLowerCase();
    if (textLower.includes('terms of service') || textLower.includes('termos de serviço')) {
      documentType = 'terms_of_service';
    } else if (textLower.includes('privacy policy') || textLower.includes('política de privacidade')) {
      documentType = 'privacy_policy';
    }

    // Obter URL atual se disponível
    let url = null;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      url = tab?.url || null;
    } catch (e) {
      // Ignorar erro se não conseguir obter URL
    }

    const logData = {
      userId: userId,
      url: url,
      documentType: documentType,
      textLength: text.length,
      responseTime: responseTime,
      success: success,
      errorMessage: error ? error.message : null
    };

    console.log('📊 Fazendo log de analytics:', logData);

    const response = await fetch(API_ENDPOINTS.LOG_ANALYTICS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Analytics logged successfully:', result);

  } catch (error) {
    console.error('❌ Erro ao fazer log de analytics:', error);
    // Não bloquear o fluxo principal se o logging falhar
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