# ToS & Privacy Summarizer

Uma extensão do Chrome que utiliza IA (Gemini API) para resumir Termos de Serviço e Políticas de Privacidade de forma clara e concisa.

## 📁 Estrutura de Ficheiros

- `manifest.json` - Configuração da extensão (Manifest V3)
- `background.js` - Service Worker para comunicação com API Gemini
- `content.js` - Script injetado para extrair texto da página
- `popup.html` - Interface do utilizador
- `popup.js` - Lógica do popup e comunicação

## 🚀 Instalação

1. **Descarregar/Clonar** os ficheiros da extensão
2. **Obter chave da API Gemini**:
   - Aceder ao [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Criar uma nova chave de API
3. **Configurar a chave**:
   - Abrir `background.js`
   - Substituir `YOUR_GEMINI_API_KEY` pela sua chave real
4. **Instalar no Chrome**:
   - Abrir Chrome e ir para `chrome://extensions/`
   - Ativar "Modo de programador" (Developer mode)
   - Clicar "Carregar extensão não empacotada" (Load unpacked)
   - Selecionar a pasta que contém os ficheiros da extensão

## 🎯 Como Usar

1. **Navegar** para uma página com Termos de Serviço ou Política de Privacidade
2. **Clicar** no ícone da extensão na barra de ferramentas
3. **Clicar** no botão "🔍 Extrair & Resumir"
4. **Aguardar** o processamento (pode demorar alguns segundos)
5. **Ler** o resumo formatado no popup

## ⚙️ Funcionalidades

- **Extração inteligente** de texto da página
- **Resumo automático** usando IA Gemini
- **Formatação Markdown** para melhor legibilidade
- **Interface moderna** e responsiva
- **Tratamento de erros** robusto

## 🔧 Configuração Avançada

### Limites da API
- O texto é limitado a 100,000 caracteres por questões de API
- Ajustar `maxLength` em `background.js` se necessário

### Personalização do Prompt
- Modificar o prompt em `background.js` na função `summarizeWithGemini()`
- Ajustar parâmetros como `temperature`, `topK`, `topP`

## 🛠️ Desenvolvimento

### Estrutura de Comunicação
```
popup.js → chrome.scripting.executeScript → content.js
content.js → chrome.runtime.sendMessage → background.js
background.js → Gemini API → chrome.runtime.sendMessage → popup.js
```

### Permissões Necessárias
- `activeTab`: Para interagir com o separador atual
- `scripting`: Para injetar o content script

## 🐛 Resolução de Problemas

### Erro de API Key
- Verificar se a chave da API está correta
- Confirmar que a chave tem permissões para a Gemini API

### Erro de Extração
- Verificar se a página contém texto suficiente
- Algumas páginas podem ter proteções contra extração

### Erro de Permissões
- Verificar se a extensão tem as permissões necessárias
- Recarregar a extensão se necessário

## 📝 Notas Importantes

- A extensão funciona melhor com páginas de texto estático
- Páginas com muito JavaScript podem ter resultados inconsistentes
- O resumo é gerado em português por padrão
- A API Gemini tem limites de uso (verificar quotas)

## 🔄 Atualizações Futuras

- [ ] Suporte para múltiplos idiomas
- [ ] Configuração de prompts personalizados
- [ ] Histórico de resumos
- [ ] Exportação de resumos
- [ ] Suporte para outras APIs de IA
