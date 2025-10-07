// Content script para extrair texto da página
console.log('Content script carregado');

// Sistema de logging melhorado
const Logger = {
    log: (message, data = null) => {
        console.log(`[ToS-Extension] ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[ToS-Extension ERROR] ${message}`, error || '');
        if (error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
    },
    warn: (message, data = null) => {
        console.warn(`[ToS-Extension WARNING] ${message}`, data || '');
    }
};

// Função para detectar idioma da página
function detectPageLanguage() {
    // Método 1: Verificar atributo lang do HTML
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
        return mapLanguageCode(htmlLang);
    }
    
    // Método 2: Verificar meta tag
    const metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (metaLang) {
        return mapLanguageCode(metaLang.content);
    }
    
    // Método 3: Analisar conteúdo da página
    const pageText = document.body.innerText.toLowerCase();
    return detectLanguageFromText(pageText);
}

function mapLanguageCode(code) {
    const mapping = {
        'pt': 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt',
        'en': 'en', 'en-US': 'en', 'en-GB': 'en',
        'es': 'es', 'es-ES': 'es', 'es-MX': 'es',
        'fr': 'fr', 'fr-FR': 'fr', 'fr-CA': 'fr'
    };
    return mapping[code] || 'pt';
}

function detectLanguageFromText(text) {
    if (!text || typeof text !== 'string') {
        return 'pt';
    }

    const lowerText = text.toLowerCase();
    
    // Padrões mais específicos para evitar falsos positivos
    const patterns = {
        pt: [
            // Palavras específicas do português
            /\b(termos de serviço|política de privacidade|dados pessoais|utilizador|serviço|aceitar|contrato|condições)\b/i,
            /\b(obrigações|responsabilidade|limitação|direitos|utilizador|recolha|processamento)\b/i,
            /\b(compartilhamento|retenção|privacidade|proteção|informações|coletamos)\b/i,
            // Artigos e preposições específicas do português
            /\b(da|do|das|dos|na|no|nas|nos|para|com|sem|sobre|entre)\b/i,
            // Verbos específicos
            /\b(aceitar|concordar|utilizar|fornecer|coletar|processar)\b/i
        ],
        en: [
            // Palavras específicas do inglês
            /\b(terms of service|privacy policy|personal data|user|service|accept|agreement|conditions)\b/i,
            /\b(obligations|liability|limitation|rights|user|collection|processing)\b/i,
            /\b(sharing|retention|privacy|protection|information|we collect)\b/i,
            // Artigos específicos do inglês
            /\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/i,
            // Verbos específicos
            /\b(accept|agree|use|provide|collect|process|share|retain)\b/i
        ],
        es: [
            // Palavras específicas do espanhol
            /\b(términos de servicio|política de privacidad|datos personales|usuario|servicio|aceptar|contrato|condiciones)\b/i,
            /\b(obligaciones|responsabilidad|limitación|derechos|usuario|recopilación|procesamiento)\b/i,
            /\b(compartir|retención|privacidad|protección|información|recopilamos)\b/i,
            // Artigos específicos do espanhol
            /\b(el|la|los|las|un|una|de|del|en|con|sin|sobre|entre)\b/i,
            // Verbos específicos
            /\b(aceptar|acordar|utilizar|proporcionar|recopilar|procesar)\b/i
        ],
        fr: [
            // Palavras específicas do francês
            /\b(termes de service|politique de confidentialité|données personnelles|utilisateur|service|accepter|contrat|conditions)\b/i,
            /\b(obligations|responsabilité|limitation|droits|utilisateur|collecte|traitement)\b/i,
            /\b(partage|rétention|confidentialité|protection|information|nous collectons)\b/i,
            // Artigos específicos do francês
            /\b(le|la|les|un|une|de|du|des|en|avec|sans|sur|entre)\b/i,
            // Verbos específicos
            /\b(accepter|convenir|utiliser|fournir|collecter|traiter)\b/i
        ]
    };

    const scores = {};
    
    for (const [lang, langPatterns] of Object.entries(patterns)) {
        scores[lang] = 0;
        for (const pattern of langPatterns) {
            const matches = (lowerText.match(pattern) || []).length;
            scores[lang] += matches;
        }
    }

    // Encontrar idioma com maior score
    const bestMatch = Object.entries(scores).reduce((a, b) => 
        scores[a[0]] > scores[b[0]] ? a : b
    );

    // Se não há matches suficientes, usar português como padrão
    if (bestMatch[1] < 3) {
        console.log(`[Content] Insufficient language matches, defaulting to PT (best: ${bestMatch[0]} with ${bestMatch[1]} matches)`);
        return 'pt';
    }

    console.log(`[Content] Detected language: ${bestMatch[0]} (score: ${bestMatch[1]})`);
    return bestMatch[0];
}

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    Logger.log('Content script recebeu mensagem:', request.action);
    
    try {
        switch (request.action) {
            case 'ping':
                sendResponse({ success: true, message: 'Content script ativo' });
                break;
                
            case 'analyzePage':
                try {
                    console.log('Content script: Iniciando análise da página...');
                    const analysis = analyzePage();
                    console.log('Content script: Análise da página concluída:', analysis);
                    sendResponse({ success: true, analysis: analysis });
                } catch (error) {
                    console.error('Content script: Erro na análise da página:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message,
                        errorType: 'analysis_error',
                        timestamp: new Date().toISOString()
                    });
                }
                break;
                
            case 'summarizeText':
                try {
                    const text = extractPageText();
                    Logger.log(`Texto extraído: ${text.length} caracteres`);
                    
                    if (text.length < 50) {
                        Logger.warn('Texto insuficiente para análise', { length: text.length });
                        sendResponse({ 
                            success: false, 
                            error: 'Texto insuficiente para análise (mínimo 50 caracteres)',
                            errorType: 'insufficient_text',
                            textLength: text.length
                        });
                        return;
                    }
                    
                    // Enviar para background script
                    chrome.runtime.sendMessage({
                        action: 'summarizeText',
                        text: text,
                        url: window.location.href,
                        title: document.title,
                        language: detectPageLanguage()
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            Logger.error('Erro ao enviar para background:', chrome.runtime.lastError);
                        } else {
                            Logger.log('Texto enviado para background com sucesso');
                        }
                    });
                    
                    sendResponse({ success: true, message: 'Texto enviado para análise' });
                } catch (error) {
                    Logger.error('Erro ao extrair texto:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message,
                        errorType: 'extraction_error',
                        timestamp: new Date().toISOString()
                    });
                }
                break;
                
            default:
                Logger.warn('Ação não reconhecida:', request.action);
                sendResponse({ 
                    success: false, 
                    error: 'Ação não reconhecida',
                    errorType: 'unknown_action',
                    receivedAction: request.action
                });
        }
    } catch (error) {
        Logger.error('Erro geral no content script:', error);
        sendResponse({ 
            success: false, 
            error: 'Erro interno do content script',
            errorType: 'general_error',
            timestamp: new Date().toISOString()
        });
    }
    
    return true; // Manter canal aberto para resposta assíncrona
});

// Função para analisar a página
function analyzePage() {
    try {
        console.log('Content script: Iniciando análise da página...');
        
        const text = extractPageText();
        console.log('Content script: Texto extraído:', text.length, 'caracteres');
        
        const type = detectDocumentType(text);
        console.log('Content script: Tipo detectado:', type);
        
        const isLegal = isLegalPage();
        console.log('Content script: É página legal:', isLegal);
        
        const complexity = calculateTextComplexity(text);
        console.log('Content script: Complexidade calculada:', complexity);
        
        const pageLanguage = detectPageLanguage();
        console.log('Content script: Idioma detectado:', pageLanguage);
        
        const analysis = {
            textLength: text.length,
            type: type,
            url: window.location.href,
            title: document.title,
            isLegalPage: isLegal,
            complexity: complexity,
            timestamp: new Date().toISOString(),
            domain: window.location.hostname,
            language: pageLanguage
        };
        
        console.log('Content script: Análise concluída:', analysis);
        return analysis;
        
    } catch (error) {
        console.error('Content script: Erro ao analisar página:', error);
        return {
            textLength: 0,
            type: 'unknown',
            url: window.location.href,
            title: document.title,
            isLegalPage: false,
            complexity: { level: 0, text: 'Erro' },
            error: error.message,
            timestamp: new Date().toISOString(),
            domain: window.location.hostname
        };
    }
}

// Função para calcular complexidade do texto
function calculateTextComplexity(text) {
    try {
        const wordCount = text.split(/\s+/).length;
        const sentenceCount = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = wordCount / sentenceCount;
        
        let complexity;
        if (avgWordsPerSentence < 10) {
            complexity = { level: 1, text: 'Baixa' };
        } else if (avgWordsPerSentence < 15) {
            complexity = { level: 2, text: 'Média' };
        } else if (avgWordsPerSentence < 20) {
            complexity = { level: 3, text: 'Alta' };
        } else {
            complexity = { level: 4, text: 'Muito Alta' };
        }
        
        return {
            ...complexity,
            wordCount,
            sentenceCount,
            avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100
        };
    } catch (error) {
        Logger.error('Erro ao calcular complexidade:', error);
        return { level: 0, text: 'Erro', wordCount: 0, sentenceCount: 0, avgWordsPerSentence: 0 };
    }
}

// Função para detectar tipo de documento
function detectDocumentType(text) {
    try {
        const lowerText = text.toLowerCase();
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();
        
        Logger.log('Detecção de tipo - Contexto:', { 
            url: url, 
            title: title,
            textLength: text.length 
        });
        
        // PRIORIDADE 1: Verificar URL e título primeiro (mais confiável)
        if (url.includes('termos') || url.includes('terms') || 
            title.includes('termos') || title.includes('terms') ||
            url.includes('condicoes') || url.includes('conditions')) {
            Logger.log('Detectado como Termos de Serviço baseado na URL/título');
            return 'terms_of_service';
        }
        
        if (url.includes('privacidade') || url.includes('privacy') || 
            title.includes('privacidade') || title.includes('privacy')) {
            Logger.log('Detectado como Política de Privacidade baseado na URL/título');
            return 'privacy_policy';
        }
        
        // PRIORIDADE 2: Análise de conteúdo com palavras-chave específicas
        // Palavras-chave específicas para Política de Privacidade (sem ambiguidade)
        const privacyKeywords = [
            'privacy policy', 'política de privacidade', 'privacidade',
            'personal data', 'dados pessoais', 'data protection',
            'cookie policy', 'política de cookies', 'gdpr',
            'data collection', 'recolha de dados', 'data processing',
            'information we collect', 'informações que coletamos',
            'how we use your data', 'como usamos seus dados',
            'data sharing', 'compartilhamento de dados',
            'data retention', 'retenção de dados', 
            'privacy notice', 'aviso de privacidade',
            'personal information', 'informações pessoais',
            'data controller', 'controlador de dados'
        ];
        
        // Palavras-chave específicas para Termos de Serviço (sem ambiguidade)
        const termsKeywords = [
            'terms of service', 'termos de serviço', 'terms and conditions',
            'user agreement', 'contrato de utilizador', 'service agreement',
            'terms of use', 'condições de uso', 'user terms',
            'service terms', 'termos do serviço', 'user conditions',
            'conditions of use', 'condições de utilização',
            'acceptable use', 'uso aceitável', 'prohibited uses',
            'usos proibidos', 'liability', 'responsabilidade',
            'limitation of liability', 'limitação de responsabilidade',
            'user obligations', 'obrigações do utilizador',
            'service description', 'descrição do serviço',
            'payment terms', 'termos de pagamento',
            'cancellation policy', 'política de cancelamento'
        ];
        
        // Contar ocorrências com peso (evitar falsos positivos)
        const privacyCount = privacyKeywords.reduce((count, keyword) => {
            // Usar word boundaries para evitar matches parciais
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const matches = (lowerText.match(regex) || []).length;
            return count + matches;
        }, 0);
        
        const termsCount = termsKeywords.reduce((count, keyword) => {
            // Usar word boundaries para evitar matches parciais
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const matches = (lowerText.match(regex) || []).length;
            return count + matches;
        }, 0);
        
        Logger.log('Detecção de tipo - Contagem:', { 
            privacyCount, 
            termsCount,
            privacyKeywords: privacyKeywords.slice(0, 5),
            termsKeywords: termsKeywords.slice(0, 5)
        });
        
        // Determinar tipo baseado na contagem (com threshold mínimo)
        const minThreshold = 2; // Mínimo de 2 ocorrências para considerar confiável
        
        if (privacyCount >= minThreshold && privacyCount > termsCount) {
            Logger.log('Detectado como Política de Privacidade baseado no conteúdo');
            return 'privacy_policy';
        } else if (termsCount >= minThreshold && termsCount > privacyCount) {
            Logger.log('Detectado como Termos de Serviço baseado no conteúdo');
            return 'terms_of_service';
        } else if (privacyCount > 0 || termsCount > 0) {
            // Se há pelo menos uma ocorrência, usar a maior contagem
            if (privacyCount > termsCount) {
                Logger.log('Detectado como Política de Privacidade (baixa confiança)');
                return 'privacy_policy';
            } else if (termsCount > privacyCount) {
                Logger.log('Detectado como Termos de Serviço (baixa confiança)');
                return 'terms_of_service';
            }
        }
        
        // PRIORIDADE 3: Fallback baseado em palavras-chave simples
        if (lowerText.includes('privacidade') || lowerText.includes('privacy')) {
            Logger.log('Fallback: Detectado como Política de Privacidade');
            return 'privacy_policy';
        } else if (lowerText.includes('termos') || lowerText.includes('terms')) {
            Logger.log('Fallback: Detectado como Termos de Serviço');
            return 'terms_of_service';
        }
        
        Logger.log('Não foi possível determinar o tipo de documento');
        return 'unknown';
        
    } catch (error) {
        Logger.error('Erro ao detectar tipo de documento:', error);
        return 'unknown';
    }
}

// Função para extrair texto da página
function extractPageText() {
  try {
    Logger.log('Iniciando extração de texto...');
    
    // Tentar diferentes métodos de extração
    let pageText = '';
    let extractionMethod = 'unknown';
    
    // Método 1: Tentar extrair de elementos específicos primeiro
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.terms',
      '.privacy',
      '.legal',
      'article',
      '.page-content',
      '.document-content',
      '.policy-content',
      '.terms-content',
      '#content',
      '#main-content',
      '.container .content',
      '.wrapper .content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        pageText = element.innerText || element.textContent || '';
        if (pageText.length > 500) {
          extractionMethod = `selector: ${selector}`;
          Logger.log(`Texto extraído usando seletor '${selector}': ${pageText.length} caracteres`);
          break;
        }
      }
    }
    
    // Método 2: Se não encontrou conteúdo suficiente, usar o corpo da página
    if (pageText.length < 500) {
      Logger.log('Usando método de extração do corpo da página...');
      extractionMethod = 'body_extraction';
      
      // Remover elementos desnecessários que podem conter texto irrelevante
      const elementsToRemove = document.querySelectorAll(
        'script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar, .menu, .navigation, .breadcrumb, .social-share, .comments, .related-posts'
      );
      const originalElements = [];
      
      // Guardar elementos originais e removê-los temporariamente
      elementsToRemove.forEach(element => {
        originalElements.push({
          element: element,
          parent: element.parentNode,
          nextSibling: element.nextSibling
        });
        element.remove();
      });
      
      // Extrair texto do corpo da página
      pageText = document.body.innerText || document.body.textContent || '';
      
      // Restaurar elementos originais
      originalElements.forEach(({ element, parent, nextSibling }) => {
        if (parent) {
          if (nextSibling) {
            parent.insertBefore(element, nextSibling);
          } else {
            parent.appendChild(element);
          }
        }
      });
    }
    
    // Método 3: Fallback - tentar extrair de todos os parágrafos
    if (pageText.length < 100) {
      Logger.log('Usando método de fallback - extração de parágrafos...');
      extractionMethod = 'paragraph_fallback';
      
      const paragraphs = document.querySelectorAll('p, div, span');
      pageText = Array.from(paragraphs)
        .map(p => p.innerText || p.textContent || '')
        .filter(text => text.trim().length > 10)
        .join(' ');
    }
    
    // Limpar e formatar o texto
    const cleanedText = pageText
      .replace(/\s+/g, ' ') // Substituir múltiplos espaços por um único
      .replace(/\n\s*\n/g, '\n') // Remover linhas vazias desnecessárias
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remover caracteres invisíveis
      .trim();
    
    Logger.log(`Texto final extraído: ${cleanedText.length} caracteres usando método: ${extractionMethod}`);
    Logger.log('Primeiros 200 caracteres:', cleanedText.substring(0, 200));
    
    // Validar qualidade do texto extraído
    if (cleanedText.length < 50) {
      Logger.warn('Texto extraído muito curto', { length: cleanedText.length, method: extractionMethod });
    }
    
    return cleanedText;
    
  } catch (error) {
    Logger.error('Erro ao extrair texto da página:', error);
    return 'Erro ao extrair texto da página';
  }
}

// Função para detectar se a página parece ser Termos de Serviço ou Política de Privacidade
function isLegalPage() {
  try {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const bodyText = document.body.innerText.toLowerCase();
    
    // Palavras-chave expandidas para páginas legais
    const legalKeywords = [
      'terms of service', 'terms and conditions', 'privacy policy',
      'privacy notice', 'terms of use', 'user agreement', 'legal',
      'termsos', 'termos de serviço', 'política de privacidade',
      'termos e condições', 'contrato de utilizador',
      'service agreement', 'user terms', 'conditions of use',
      'acceptable use policy', 'data protection', 'cookie policy',
      'gdpr', 'privacy statement', 'legal notice', 'disclaimer',
      'terms of sale', 'terms of purchase', 'refund policy',
      'cancellation policy', 'shipping policy', 'return policy'
    ];
    
    // Verificar URL, título e conteúdo
    const urlMatch = legalKeywords.some(keyword => url.includes(keyword));
    const titleMatch = legalKeywords.some(keyword => title.includes(keyword));
    const contentMatch = legalKeywords.some(keyword => bodyText.includes(keyword));
    
    const hasLegalKeyword = urlMatch || titleMatch || contentMatch;
    
    // Verificar padrões específicos na URL
    const urlPatterns = [
      /\/terms/, /\/privacy/, /\/legal/, /\/policy/, /\/tos/, /\/tos\//,
      /\/terms-of-service/, /\/privacy-policy/, /\/legal-notice/
    ];
    
    const hasUrlPattern = urlPatterns.some(pattern => pattern.test(url));
    
    const isLegal = hasLegalKeyword || hasUrlPattern;
    
    Logger.log('Detecção de página legal:', {
      url: url,
      title: title,
      hasLegalKeyword,
      hasUrlPattern,
      isLegal,
      urlMatch,
      titleMatch,
      contentMatch
    });
    
    return isLegal;
    
  } catch (error) {
    Logger.error('Erro ao detectar página legal:', error);
    return false;
  }
}

// Função principal que será chamada pelo popup
function summarizeCurrentPage() {
  console.log('=== INICIANDO EXTRAÇÃO DE TEXTO ===');
  console.log('URL atual:', window.location.href);
  console.log('Título da página:', document.title);
  
  // Verificar se parece ser uma página legal
  const isLegal = isLegalPage();
  console.log('Página parece ser legal:', isLegal);
  
  const pageText = extractPageText();
  
  console.log('Texto extraído:', pageText.length, 'caracteres');
  
      // Ser mais tolerante com textos menores - alguns termos podem ser curtos
      if (!pageText || pageText.length < 50) {
        console.warn('Texto extraído muito curto ou vazio');
        chrome.runtime.sendMessage({
          action: 'summarizeText',
          text: 'Erro: Não foi possível extrair texto suficiente da página atual. Por favor, certifique-se de que está numa página com Termos de Serviço ou Política de Privacidade.'
        });
        return;
      }
  
  // Adicionar informação sobre o tipo de página detectada
  const enhancedText = isLegal ? 
    `[PÁGINA LEGAL DETECTADA] ${pageText}` : 
    `[PÁGINA GERAL] ${pageText}`;
  
  // Enviar texto para o background script
  console.log('Enviando texto para resumo...');
  chrome.runtime.sendMessage({
    action: 'summarizeText',
    text: enhancedText
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Erro ao enviar mensagem:', chrome.runtime.lastError);
    } else {
      console.log('Texto enviado para resumo com sucesso');
    }
  });
}

// REMOVIDO: Execução automática quando o script é injetado
// summarizeCurrentPage(); // ← Esta linha estava a causar execução automática
