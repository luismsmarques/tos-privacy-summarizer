# 🔍 ToS & Privacy Summarizer

**Versão:** 1.4.0  
**Desenvolvido por:** Luis Marques  
**Licença:** MIT

## 📋 Descrição

O **ToS & Privacy Summarizer** é uma extensão do Chrome que utiliza inteligência artificial para resumir Termos de Serviço e Políticas de Privacidade, ajudando os utilizadores a entender rapidamente o que estão a aceitar antes de clicar em "Aceito".

## ✨ Funcionalidades Principais

- 🤖 **Análise com IA**: Utiliza Google Gemini API para gerar resumos inteligentes
- 🌍 **Multi-idioma**: Suporte para Português, Inglês, Espanhol e Francês
- 🎨 **Interface Moderna**: Design Material Design 3 com temas claro/escuro
- 📊 **Análise de Risco**: Sistema de ratings para avaliar documentos legais
- 💳 **Sistema de Créditos**: 5 créditos grátis + opção de usar API própria
- 🔒 **Privacidade**: Processamento seguro com backend próprio

## 🚀 Instalação

### Chrome Web Store
1. Aceda à [Chrome Web Store](https://chrome.google.com/webstore)
2. Procure por "ToS & Privacy Summarizer"
3. Clique em "Adicionar ao Chrome"

### Instalação Manual (Desenvolvimento)
1. Faça download do código fonte
2. Abra `chrome://extensions/`
3. Ative "Modo de programador"
4. Clique em "Carregar extensão descompactada"
5. Selecione a pasta do projeto

## 📖 Como Usar

1. **Instale a extensão** no Chrome
2. **Navegue** para uma página com Termos de Serviço ou Política de Privacidade
3. **Clique no ícone** da extensão na barra de ferramentas
4. **Clique em "Extrair & Resumir"** para analisar o documento
5. **Leia o resumo** estruturado com pontos-chave e alertas de privacidade

## ⚙️ Configurações

### API Própria (Recomendado)
1. Obtenha uma chave gratuita em [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Abra as configurações da extensão
3. Cole a sua chave da API Gemini
4. Clique em "Guardar Chave"

### Créditos Grátis
- 5 créditos grátis incluídos
- Compre mais créditos se necessário
- Sistema de pagamento seguro com Stripe

## 🌐 Idiomas Suportados

- 🇵🇹 **Português** (Padrão)
- 🇬🇧 **English**
- 🇪🇸 **Español**
- 🇫🇷 **Français**

## 🔧 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express.js
- **IA**: Google Gemini API
- **Base de Dados**: PostgreSQL
- **Pagamentos**: Stripe
- **Deploy**: Vercel

## 📁 Estrutura do Projeto

```
├── manifest.json          # Manifest V3 da extensão
├── background.js          # Service Worker
├── content.js            # Content Script
├── popup.html/js         # Interface principal
├── options.html/js        # Página de configurações
├── onboarding.html/js    # Tutorial de início
├── history.html/js       # Histórico de resumos
├── summary-page.html/js  # Página de resumo detalhado
├── checkout.html/js      # Sistema de pagamentos
├── privacy-policy.html   # Política de privacidade
├── terms-of-service.html # Termos de serviço
├── i18n.js              # Sistema de internacionalização
├── locales/             # Traduções (pt, en, es, fr)
├── icon*.png            # Ícones da extensão
└── material-design-tokens.css # Estilos Material Design
```

## 🔒 Privacidade e Segurança

- ✅ **Dados mínimos**: Recolhemos apenas dados necessários
- ✅ **Armazenamento local**: Configurações guardadas localmente
- ✅ **Comunicação segura**: Todas as comunicações usam HTTPS
- ✅ **Sem rastreamento**: Não recolhemos dados de navegação
- ✅ **Conformidade**: GDPR, LGPD e CCPA

## 🛠️ Desenvolvimento

### Requisitos
- Node.js 18+
- Chrome Browser
- Conta Google AI Studio (para API Gemini)

### Configuração Local
1. Clone o repositório
2. Configure as variáveis de ambiente
3. Execute `npm install` (se aplicável)
4. Carregue a extensão no Chrome

## 📞 Suporte

- **GitHub**: [luismsmarques/tos-privacy-summarizer](https://github.com/luismsmarques/tos-privacy-summarizer)
- **Issues**: Utilize o sistema de issues do GitHub
- **Email**: Através da página da extensão na Chrome Web Store

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- Google Gemini API pela tecnologia de IA
- Material Design pelo sistema de design
- Comunidade open source pelas bibliotecas utilizadas

---

**⚠️ Aviso Legal**: Os resumos gerados são apenas para fins informativos e não constituem aconselhamento jurídico. Sempre consulte um advogado qualificado para questões legais específicas.

**🔗 Links Úteis**:
- [Chrome Web Store](https://chrome.google.com/webstore)
- [Google AI Studio](https://makersuite.google.com/app/apikey)
- [Política de Privacidade](privacy-policy.html)
- [Termos de Serviço](terms-of-service.html)
