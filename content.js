// Content script para extrair texto da página
console.log('Content script carregado');

// Sistema de logging melhorado
const Logger = {
    log: (message, data = null) => {
        console.log(`[ToS-Extension] ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[ToS-Extension ERROR] ${message}`, error || '');
    },
    warn: (message, data = null) => {
        console.warn(`[ToS-Extension WARNING] ${message}`, data || '');
    }
};

// Sistema de tratamento de erros centralizado
const ErrorHandler = {
    handleError: (error, context = '') => {
        const errorInfo = {
            message: error.message || 'Erro desconhecido',
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        Logger.error(`Erro em ${context}:`, errorInfo);
        
        // Enviar erro para background script para logging centralizado
        chrome.runtime.sendMessage({
            action: 'logError',
            error: errorInfo
        }).catch(() => {
            // Ignorar erros de comunicação para evitar loops
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

// Listener para mensagens do popup com tratamento de erros melhorado
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    Logger.log('Mensagem recebida:', request.action);
    
    try {
        switch (request.action) {
            case 'ping':
                sendResponse(ErrorHandler.createSafeResponse(true, { message: 'Content script ativo' }));
                break;
                
            case 'analyzePage':
                try {
                    const analysis = analyzePage();
                    sendResponse(ErrorHandler.createSafeResponse(true, analysis));
                } catch (error) {
                    const errorInfo = ErrorHandler.handleError(error, 'analyzePage');
                    sendResponse(ErrorHandler.createSafeResponse(false, null, errorInfo));
                }
                break;
                
            case 'summarizeText':
                try {
                    const text = extractPageText();
                    if (!text || text.length < 50) {
                        const error = new Error('Texto insuficiente para análise. Certifique-se de estar numa página com conteúdo legal.');
                        sendResponse(ErrorHandler.createSafeResponse(false, null, error));
                        return;
                    }
                    
                    // Enviar para background script com tratamento de erro
                    chrome.runtime.sendMessage({
                        action: 'summarizeText',
                        text: text,
                        focus: request.focus || 'privacy'
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            Logger.error('Erro ao enviar para background:', chrome.runtime.lastError);
                        }
                    });
                    
                    sendResponse(ErrorHandler.createSafeResponse(true, { message: 'Texto enviado para análise' }));
                } catch (error) {
                    const errorInfo = ErrorHandler.handleError(error, 'summarizeText');
                    sendResponse(ErrorHandler.createSafeResponse(false, null, errorInfo));
                }
                break;
                
            default:
                const error = new Error(`Ação não reconhecida: ${request.action}`);
                sendResponse(ErrorHandler.createSafeResponse(false, null, error));
        }
    } catch (error) {
        const errorInfo = ErrorHandler.handleError(error, 'messageHandler');
        sendResponse(ErrorHandler.createSafeResponse(false, null, errorInfo));
    }
    
    return true; // Manter canal aberto para resposta assíncrona
});

// Função para analisar a página com tratamento de erros melhorado
function analyzePage() {
    try {
        Logger.log('Iniciando análise da página...');
        
        const text = extractPageText();
        const type = detectDocumentType(text);
        const isLegal = isLegalPage();
        const complexity = calculateTextComplexity(text);
        
        const analysis = {
            textLength: text.length,
            type: type,
            url: window.location.href,
            title: document.title,
            isLegalPage: isLegal,
            complexity: complexity,
            confidence: calculateDetectionConfidence(text, type, isLegal),
            timestamp: new Date().toISOString()
        };
        
        Logger.log('Análise concluída:', analysis);
        return analysis;
        
    } catch (error) {
        const errorInfo = ErrorHandler.handleError(error, 'analyzePage');
        Logger.warn('Análise falhou, retornando dados básicos');
        
        return {
            textLength: 0,
            type: 'unknown',
            url: window.location.href,
            title: document.title,
            isLegalPage: false,
            complexity: 'unknown',
            confidence: 0,
            error: errorInfo.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Função para detectar tipo de documento
function detectDocumentType(text) {
    const lowerText = text.toLowerCase();
    
    // Palavras-chave para Política de Privacidade
    const privacyKeywords = [
        'privacy policy', 'política de privacidade', 'privacidade',
        'personal data', 'dados pessoais', 'data protection',
        'cookie policy', 'política de cookies', 'gdpr',
        'data collection', 'recolha de dados', 'data processing'
    ];
    
    // Palavras-chave para Termos de Serviço
    const termsKeywords = [
        'terms of service', 'termos de serviço', 'terms and conditions',
        'user agreement', 'contrato de utilizador', 'service agreement',
        'terms of use', 'condições de uso', 'user terms'
    ];
    
    // Contar ocorrências
    const privacyCount = privacyKeywords.reduce((count, keyword) => {
        return count + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);
    
    const termsCount = termsKeywords.reduce((count, keyword) => {
        return count + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);
    
    // Determinar tipo baseado na contagem
    if (privacyCount > termsCount) {
        return 'privacy_policy';
    } else if (termsCount > privacyCount) {
        return 'terms_of_service';
    } else {
        // Se não conseguir determinar, usar padrão baseado no contexto
        if (lowerText.includes('privacy') || lowerText.includes('privacidade')) {
            return 'privacy_policy';
        } else if (lowerText.includes('terms') || lowerText.includes('termos')) {
            return 'terms_of_service';
        } else {
            return 'unknown';
        }
    }
}

// Função para extrair texto da página com otimizações e tratamento de erros melhorado
function extractPageText() {
    try {
        Logger.log('Iniciando extração de texto...');
        
        // Verificar se a página está carregada
        if (document.readyState !== 'complete') {
            Logger.warn('Página ainda não carregada completamente');
        }
        
        let pageText = '';
        let extractionMethod = '';
        
        // Método 1: Tentar extrair de elementos específicos primeiro (mais preciso)
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
            '#main-content'
        ];
        
        for (const selector of contentSelectors) {
            try {
                const element = document.querySelector(selector);
                if (element && element.innerText) {
                    const text = element.innerText.trim();
                    if (text.length > 500) {
                        pageText = text;
                        extractionMethod = `seletor: ${selector}`;
                        Logger.log(`Texto extraído usando seletor '${selector}': ${text.length} caracteres`);
                        break;
                    }
                }
            } catch (selectorError) {
                Logger.warn(`Erro ao processar seletor ${selector}:`, selectorError);
                continue;
            }
        }
        
        // Método 2: Se não encontrou conteúdo suficiente, usar estratégia de limpeza do corpo
        if (pageText.length < 500) {
            Logger.log('Usando método de extração do corpo da página...');
            
            try {
                // Criar uma cópia do DOM para manipulação segura
                const clonedBody = document.body.cloneNode(true);
                
                // Remover elementos desnecessários de forma mais eficiente
                const elementsToRemove = clonedBody.querySelectorAll(
                    'script, style, nav, header, footer, aside, ' +
                    '.advertisement, .ads, .sidebar, .menu, .navigation, ' +
                    '.social-media, .share-buttons, .comments, .related-posts, ' +
                    '.cookie-notice, .popup, .modal, .overlay, ' +
                    '[role="banner"], [role="navigation"], [role="complementary"]'
                );
                
                elementsToRemove.forEach(element => {
                    try {
                        element.remove();
                    } catch (e) {
                        // Ignorar erros de remoção
                    }
                });
                
                // Extrair texto da versão limpa
                pageText = clonedBody.innerText || clonedBody.textContent || '';
                extractionMethod = 'corpo limpo';
                
            } catch (bodyError) {
                Logger.warn('Erro na limpeza do corpo, usando método direto:', bodyError);
                
                // Fallback: extrair diretamente do corpo
                pageText = document.body.innerText || document.body.textContent || '';
                extractionMethod = 'corpo direto';
            }
        }
        
        // Método 3: Se ainda não tem texto suficiente, tentar extrair de parágrafos
        if (pageText.length < 200) {
            Logger.log('Tentando extrair de parágrafos...');
            
            try {
                const paragraphs = document.querySelectorAll('p');
                const paragraphTexts = Array.from(paragraphs)
                    .map(p => p.innerText?.trim())
                    .filter(text => text && text.length > 50)
                    .slice(0, 10); // Limitar a 10 parágrafos
                
                if (paragraphTexts.length > 0) {
                    pageText = paragraphTexts.join('\n\n');
                    extractionMethod = 'parágrafos';
                    Logger.log(`Texto extraído de ${paragraphTexts.length} parágrafos: ${pageText.length} caracteres`);
                }
            } catch (paragraphError) {
                Logger.warn('Erro ao extrair parágrafos:', paragraphError);
            }
        }
        
        // Limpar e formatar o texto
        const cleanedText = cleanExtractedText(pageText);
        
        Logger.log(`Texto final extraído: ${cleanedText.length} caracteres (método: ${extractionMethod})`);
        
        if (cleanedText.length > 0) {
            Logger.log('Primeiros 200 caracteres:', cleanedText.substring(0, 200));
        } else {
            Logger.warn('Nenhum texto foi extraído da página');
        }
        
        return cleanedText;
        
    } catch (error) {
        const errorInfo = ErrorHandler.handleError(error, 'extractPageText');
        Logger.error('Falha crítica na extração de texto:', errorInfo);
        
        // Tentar fallback básico
        try {
            const fallbackText = document.body?.innerText || document.body?.textContent || '';
            return cleanExtractedText(fallbackText);
        } catch (fallbackError) {
            Logger.error('Fallback também falhou:', fallbackError);
            return '';
        }
    }
}

// Função auxiliar para limpar texto extraído
function cleanExtractedText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text
        .replace(/\s+/g, ' ') // Substituir múltiplos espaços por um único
        .replace(/\n\s*\n/g, '\n') // Remover linhas vazias desnecessárias
        .replace(/[^\w\s\.,;:!?\-\(\)\[\]\/]/g, '') // Remover caracteres especiais desnecessários
        .replace(/\s+/g, ' ') // Limpar espaços duplos novamente
        .trim();
}

// Função para calcular complexidade do texto
function calculateTextComplexity(text) {
    if (!text || text.length === 0) {
        return 'unknown';
    }
    
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    if (avgWordsPerSentence > 25) return 'very_high';
    if (avgWordsPerSentence > 20) return 'high';
    if (avgWordsPerSentence > 15) return 'medium';
    if (avgWordsPerSentence > 10) return 'low';
    return 'very_low';
}

// Função para calcular confiança na detecção
function calculateDetectionConfidence(text, type, isLegal) {
    let confidence = 0;
    
    // Baseado no tipo detectado
    if (type === 'privacy_policy' || type === 'terms_of_service') {
        confidence += 40;
    }
    
    // Baseado na detecção de página legal
    if (isLegal) {
        confidence += 30;
    }
    
    // Baseado no tamanho do texto
    if (text.length > 1000) confidence += 20;
    else if (text.length > 500) confidence += 10;
    
    // Baseado em palavras-chave específicas
    const legalKeywords = ['terms', 'privacy', 'policy', 'agreement', 'conditions', 'service'];
    const keywordMatches = legalKeywords.filter(keyword => 
        text.toLowerCase().includes(keyword)
    ).length;
    
    confidence += Math.min(keywordMatches * 5, 20);
    
    return Math.min(confidence, 100);
}

// Função melhorada para detectar se a página parece ser Termos de Serviço ou Política de Privacidade
function isLegalPage() {
    try {
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();
        const bodyText = (document.body?.innerText || '').toLowerCase();
        
        // Palavras-chave expandidas e mais específicas
        const legalKeywords = {
            // Inglês
            'terms of service': 10,
            'terms and conditions': 10,
            'privacy policy': 10,
            'privacy notice': 8,
            'terms of use': 8,
            'user agreement': 8,
            'service agreement': 8,
            'legal terms': 7,
            'user terms': 7,
            'data protection': 6,
            'cookie policy': 6,
            'gdpr': 5,
            
            // Português
            'termos de serviço': 10,
            'política de privacidade': 10,
            'termos e condições': 10,
            'contrato de utilizador': 8,
            'termos de uso': 8,
            'acordo de utilizador': 8,
            'política de cookies': 6,
            'proteção de dados': 6,
            'rgpd': 5,
            
            // Padrões de URL
            '/terms': 8,
            '/privacy': 8,
            '/legal': 6,
            '/tos': 8,
            '/policy': 6
        };
        
        // Calcular score baseado em múltiplos fatores
        let totalScore = 0;
        let matches = [];
        
        // Verificar URL
        for (const [keyword, score] of Object.entries(legalKeywords)) {
            if (url.includes(keyword)) {
                totalScore += score;
                matches.push(`URL: ${keyword}`);
            }
        }
        
        // Verificar título
        for (const [keyword, score] of Object.entries(legalKeywords)) {
            if (title.includes(keyword)) {
                totalScore += score * 1.5; // Título tem peso maior
                matches.push(`Título: ${keyword}`);
            }
        }
        
        // Verificar conteúdo (apenas primeiros 2000 caracteres para performance)
        const contentSample = bodyText.substring(0, 2000);
        for (const [keyword, score] of Object.entries(legalKeywords)) {
            if (contentSample.includes(keyword)) {
                totalScore += score * 0.8; // Conteúdo tem peso menor
                matches.push(`Conteúdo: ${keyword}`);
            }
        }
        
        // Verificar elementos específicos da página
        const legalElements = document.querySelectorAll(
            'h1, h2, h3, [class*="terms"], [class*="privacy"], [class*="legal"], [id*="terms"], [id*="privacy"]'
        );
        
        let elementMatches = 0;
        legalElements.forEach(element => {
            const text = element.textContent?.toLowerCase() || '';
            for (const keyword of Object.keys(legalKeywords)) {
                if (text.includes(keyword)) {
                    elementMatches++;
                    break;
                }
            }
        });
        
        if (elementMatches > 0) {
            totalScore += Math.min(elementMatches * 2, 10);
            matches.push(`Elementos: ${elementMatches} matches`);
        }
        
        // Verificar padrões estruturais
        const hasLegalStructure = checkLegalStructure();
        if (hasLegalStructure) {
            totalScore += 5;
            matches.push('Estrutura legal detectada');
        }
        
        const isLegal = totalScore >= 15; // Threshold ajustável
        
        Logger.log('Detecção de página legal:', {
            url: url.substring(0, 100),
            title: title.substring(0, 50),
            score: totalScore,
            matches: matches,
            isLegal: isLegal,
            confidence: Math.min(totalScore / 2, 100)
        });
        
        return isLegal;
        
    } catch (error) {
        ErrorHandler.handleError(error, 'isLegalPage');
        return false;
    }
}

// Função auxiliar para verificar estrutura legal
function checkLegalStructure() {
    try {
        // Verificar se há seções típicas de documentos legais
        const legalSections = [
            'introduction', 'definitions', 'acceptance', 'modifications',
            'termination', 'liability', 'governing law', 'contact',
            'introdução', 'definições', 'aceitação', 'modificações',
            'rescisão', 'responsabilidade', 'lei aplicável', 'contacto'
        ];
        
        const bodyText = (document.body?.innerText || '').toLowerCase();
        const sectionMatches = legalSections.filter(section => 
            bodyText.includes(section)
        ).length;
        
        // Verificar se há listas numeradas ou com bullets (comum em documentos legais)
        const lists = document.querySelectorAll('ol, ul');
        const hasLists = lists.length > 2;
        
        // Verificar se há parágrafos longos (característico de documentos legais)
        const paragraphs = document.querySelectorAll('p');
        const longParagraphs = Array.from(paragraphs).filter(p => 
            p.textContent && p.textContent.length > 200
        ).length;
        
        return sectionMatches >= 3 || (hasLists && longParagraphs > 5);
        
    } catch (error) {
        Logger.warn('Erro ao verificar estrutura legal:', error);
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
