// Content script para extrair texto da página
console.log('Content script carregado');

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script recebeu mensagem:', request.action);
    
    switch (request.action) {
        case 'ping':
            sendResponse({ success: true, message: 'Content script ativo' });
            break;
            
        case 'analyzePage':
            try {
                const analysis = analyzePage();
                sendResponse({ success: true, analysis: analysis });
            } catch (error) {
                console.error('Erro na análise da página:', error);
                sendResponse({ success: false, error: error.message });
            }
            break;
            
        case 'summarizeText':
            try {
                const text = extractPageText();
                if (text.length < 50) {
                    sendResponse({ success: false, error: 'Texto insuficiente para análise' });
                    return;
                }
                
                // Enviar para background script
                chrome.runtime.sendMessage({
                    action: 'summarizeText',
                    text: text,
                    focus: request.focus || 'privacy'
                });
                
                sendResponse({ success: true, message: 'Texto enviado para análise' });
            } catch (error) {
                console.error('Erro ao extrair texto:', error);
                sendResponse({ success: false, error: error.message });
            }
            break;
            
        default:
            sendResponse({ success: false, error: 'Ação não reconhecida' });
    }
    
    // Não retornar true aqui - todas as respostas são síncronas
});

// Função para analisar a página
function analyzePage() {
    try {
        console.log('Analisando página...');
        
        const text = extractPageText();
        const type = detectDocumentType(text);
        
        return {
            textLength: text.length,
            type: type,
            url: window.location.href,
            title: document.title
        };
    } catch (error) {
        console.error('Erro ao analisar página:', error);
        return {
            textLength: 0,
            type: 'unknown',
            url: window.location.href,
            title: document.title
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

// Função para extrair texto da página
function extractPageText() {
  try {
    console.log('Iniciando extração de texto...');
    
    // Tentar diferentes métodos de extração
    let pageText = '';
    
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
      '.page-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        pageText = element.innerText || element.textContent || '';
        if (pageText.length > 500) {
          console.log(`Texto extraído usando seletor '${selector}': ${pageText.length} caracteres`);
          break;
        }
      }
    }
    
    // Método 2: Se não encontrou conteúdo suficiente, usar o corpo da página
    if (pageText.length < 500) {
      console.log('Usando método de extração do corpo da página...');
      
      // Remover elementos desnecessários que podem conter texto irrelevante
      const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar');
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
    
    // Limpar e formatar o texto
    const cleanedText = pageText
      .replace(/\s+/g, ' ') // Substituir múltiplos espaços por um único
      .replace(/\n\s*\n/g, '\n') // Remover linhas vazias desnecessárias
      .trim();
    
    console.log(`Texto final extraído: ${cleanedText.length} caracteres`);
    console.log('Primeiros 200 caracteres:', cleanedText.substring(0, 200));
    
    return cleanedText;
    
  } catch (error) {
    console.error('Erro ao extrair texto da página:', error);
    return 'Erro ao extrair texto da página';
  }
}

// Função para detectar se a página parece ser Termos de Serviço ou Política de Privacidade
function isLegalPage() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase();
  
  const legalKeywords = [
    'terms of service',
    'terms and conditions',
    'privacy policy',
    'privacy notice',
    'terms of use',
    'user agreement',
    'legal',
    'termsos',
    'termos de serviço',
    'política de privacidade',
    'termos e condições',
    'contrato de utilizador'
  ];
  
  const hasLegalKeyword = legalKeywords.some(keyword => 
    url.includes(keyword) || 
    title.includes(keyword) || 
    bodyText.includes(keyword)
  );
  
  console.log('Detecção de página legal:', {
    url: url,
    title: title,
    hasLegalKeyword: hasLegalKeyword
  });
  
  return hasLegalKeyword;
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
