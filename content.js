// Content script para extrair texto da página
console.log('Content script carregado');

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

// Executar automaticamente quando o script é injetado
// (isto será chamado pelo popup.js via chrome.scripting.executeScript)
summarizeCurrentPage();
