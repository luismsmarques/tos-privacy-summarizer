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

// Sistema de logging melhorado para background script
const BackgroundLogger = {
    log: (message, data = null) => {
        console.log(`[Background] ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[Background ERROR] ${message}`, error || '');
    },
    warn: (message, data = null) => {
        console.warn(`[Background WARNING] ${message}`, data || '');
    }
};

// Sistema de tratamento de erros centralizado para background
const BackgroundErrorHandler = {
    handleError: (error, context = '', additionalData = {}) => {
        const errorInfo = {
            message: error.message || 'Erro desconhecido',
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            additionalData: additionalData,
            userAgent: navigator.userAgent
        };
        
        BackgroundLogger.error(`Erro em ${context}:`, errorInfo);
        
        // Salvar erro no storage para análise posterior
        chrome.storage.local.get(['errorLogs'], (result) => {
            const logs = result.errorLogs || [];
            logs.push(errorInfo);
            
            // Manter apenas os últimos 50 erros
            if (logs.length > 50) {
                logs.splice(0, logs.length - 50);
            }
            
            chrome.storage.local.set({ errorLogs: logs });
        });
        
        return errorInfo;
    },
    
    createSafeResponse: (success, data = null, error = null) => {
        return {
            success: success,
            data: data,
            error: error ? error.message || error : null,
            timestamp: new Date().toISOString()
        };
    }
};

// Listener para mensagens com tratamento de erros melhorado
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        BackgroundLogger.log('Mensagem recebida:', request.action);
        
        switch (request.action) {
            case 'summarizeText':
                handleSummarizeText(request, sender, sendResponse);
                break;
                
            case 'logError':
                handleLogError(request, sender, sendResponse);
                break;
                
            case 'test':
                sendResponse(BackgroundErrorHandler.createSafeResponse(true, { message: 'Background script ativo' }));
                break;
                
            default:
                const error = new Error(`Ação não reconhecida: ${request.action}`);
                sendResponse(BackgroundErrorHandler.createSafeResponse(false, null, error));
        }
    } catch (error) {
        const errorInfo = BackgroundErrorHandler.handleError(error, 'messageListener');
        sendResponse(BackgroundErrorHandler.createSafeResponse(false, null, errorInfo));
    }
    
    return true; // Manter canal aberto para respostas assíncronas
});

// Handler para resumir texto
function handleSummarizeText(request, sender, sendResponse) {
    try {
        BackgroundLogger.log('Processando resumo de texto...');
        BackgroundLogger.log('Texto recebido:', request.text.substring(0, 100) + '...');
        BackgroundLogger.log('Foco solicitado:', request.focus);

        // Validar entrada
        if (!request.text || request.text.length < 50) {
            const error = new Error('Texto insuficiente para análise');
            sendResponse(BackgroundErrorHandler.createSafeResponse(false, null, error));
            return;
        }

        // Processar de forma assíncrona
        processSummaryAsync(request.text, request.focus)
            .then(() => {
                BackgroundLogger.log('Processamento de resumo concluído');
            })
            .catch((error) => {
                BackgroundErrorHandler.handleError(error, 'processSummaryAsync', {
                    textLength: request.text.length,
                    focus: request.focus
                });
            });
        
        // Responder imediatamente para evitar erro de canal fechado
        sendResponse(BackgroundErrorHandler.createSafeResponse(true, { status: 'processing' }));
        
    } catch (error) {
        const errorInfo = BackgroundErrorHandler.handleError(error, 'handleSummarizeText');
        sendResponse(BackgroundErrorHandler.createSafeResponse(false, null, errorInfo));
    }
}

// Handler para logging de erros do content script
function handleLogError(request, sender, sendResponse) {
    try {
        BackgroundLogger.log('Erro recebido do content script:', request.error);
        
        // Salvar erro no storage
        chrome.storage.local.get(['errorLogs'], (result) => {
            const logs = result.errorLogs || [];
            logs.push({
                ...request.error,
                source: 'content_script',
                timestamp: new Date().toISOString()
            });
            
            // Manter apenas os últimos 50 erros
            if (logs.length > 50) {
                logs.splice(0, logs.length - 50);
            }
            
            chrome.storage.local.set({ errorLogs: logs });
        });
        
        sendResponse(BackgroundErrorHandler.createSafeResponse(true, { message: 'Erro registrado' }));
        
    } catch (error) {
        const errorInfo = BackgroundErrorHandler.handleError(error, 'handleLogError');
        sendResponse(BackgroundErrorHandler.createSafeResponse(false, null, errorInfo));
    }
}

// Função assíncrona para processar o resumo com tratamento de erros melhorado
async function processSummaryAsync(text, focus = 'privacy') {
    try {
        BackgroundLogger.log('Iniciando processamento de resumo...');
        BackgroundLogger.log('Foco:', focus);
        BackgroundLogger.log('Tamanho do texto:', text.length);
        
        // Enviar atualização de progresso inicial
        sendProgressUpdate(1, 'Texto extraído com sucesso', 25);

        // Obter configuração da API do storage
        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['geminiApiKey', 'apiType', 'userId'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        });

        // Forçar uso da API compartilhada (backend seguro)
        let apiType = 'shared';
        let userId = result.userId;
        
        BackgroundLogger.log('Configuração forçada para API compartilhada');

        // Se não tem userId, criar um
        if (!userId) {
            userId = await createOrGetUserId();
        }

        // Enviar atualização de progresso
        sendProgressUpdate(2, 'Enviando para análise IA', 50);

        let summary;
        
        if (apiType === 'shared') {
            // Usar backend seguro
            summary = await summarizeWithBackend(text, userId, focus);
        } else {
            // Usar chave própria (método antigo)
            const apiKey = result.geminiApiKey;
            
            if (!apiKey || apiKey === 'SHARED_API') {
                const error = new Error('Chave da API não configurada. Por favor, configure a sua chave da API Gemini nas configurações da extensão.');
                sendErrorToPopup(error);
                return;
            }
            
            summary = await summarizeWithGemini(text, apiKey);
        }
        
        BackgroundLogger.log('Resumo gerado com sucesso');
        
        // Enviar atualização de progresso final
        sendProgressUpdate(4, 'Processamento concluído', 100);
        
        // Aguardar um pouco antes de mostrar o resultado
        setTimeout(() => {
            BackgroundLogger.log('Enviando resumo para popup');
            chrome.runtime.sendMessage({
                action: 'displaySummary',
                summary: summary
            }).catch((error) => {
                BackgroundErrorHandler.handleError(error, 'sendSummaryToPopup');
            });
        }, 500);

    } catch (error) {
        const errorInfo = BackgroundErrorHandler.handleError(error, 'processSummaryAsync', {
            textLength: text.length,
            focus: focus
        });
        
        // Determinar tipo de erro e enviar mensagem apropriada
        const errorMessage = formatErrorMessage(error);
        
        BackgroundLogger.log('Enviando erro para popup:', errorMessage);
        
        sendErrorToPopup(new Error(errorMessage));
    }
}

// Função auxiliar para enviar atualizações de progresso
function sendProgressUpdate(step, message, progress) {
    try {
        chrome.runtime.sendMessage({
            action: 'progressUpdate',
            step: step,
            text: message,
            progress: progress
        }).catch((error) => {
            BackgroundLogger.warn('Erro ao enviar progresso:', error);
        });
    } catch (error) {
        BackgroundLogger.warn('Erro ao enviar progresso:', error);
    }
}

// Função auxiliar para enviar erros para o popup
function sendErrorToPopup(error) {
    try {
        chrome.runtime.sendMessage({
            action: 'displaySummary',
            summary: error.message
        }).catch((sendError) => {
            BackgroundLogger.error('Erro ao enviar erro para popup:', sendError);
        });
    } catch (error) {
        BackgroundLogger.error('Erro ao enviar erro para popup:', error);
    }
}

// Função para formatar mensagens de erro de forma mais amigável
function formatErrorMessage(error) {
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
    } else if (error.message.includes('Texto insuficiente')) {
        errorMessage = error.message;
    } else {
        errorMessage += error.message;
    }
    
    return errorMessage;
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
async function summarizeWithBackend(text, userId, focus = 'privacy') {
  try {
    console.log('Usando backend seguro para resumir texto...');
    console.log('URL:', API_ENDPOINTS.PROXY);
    console.log('UserId:', userId);
    console.log('Focus:', focus);
    console.log('Text length:', text.length);
    
    const response = await fetch(API_ENDPOINTS.PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        text: text,
        focus: focus,
        apiType: 'shared'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Erro HTTP: ${response.status} ${response.statusText}` };
      }
      console.error('Backend error:', errorData);
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Backend result:', result);
    
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