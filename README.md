# 🤖 ToS & Privacy Summarizer

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Ready-green)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.3.0-blue)](https://github.com/luismsmarques/tos-privacy-summarizer)
[![License](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-Production%20Ready-success)](https://github.com/luismsmarques/tos-privacy-summarizer)

**O Seu Advogado Digital com IA.** Analise Termos de Serviço e Políticas de Privacidade de forma segura, receba ratings de risco e poupe horas de leitura com o poder do Google Gemini. Acionável e Seguro.

> 🎯 **Projeto Organizado e Limpo** - Código de produção otimizado, sem ficheiros de teste desnecessários

## ✨ Funcionalidades Principais

### 🤖 **Análise com IA**
- Utiliza **Google Gemini AI** para análise inteligente de documentos legais
- Transforma texto jurídico complexo em informações claras e compreensíveis
- **Processamento em tempo real** com feedback visual
- Detecção automática do tipo de documento (Termos de Serviço vs Política de Privacidade)

### 📄 **Resumos Estruturados**
- **Resumo Conciso**: Visão geral em linguagem simples
- **Pontos-Chave**: 5-7 pontos essenciais destacados
- **Formatação Markdown** para melhor legibilidade
- **Alertas de Privacidade**: Riscos importantes identificados automaticamente

### 🎯 **Sistema de Rating Inteligente** ⭐ **NOVO!**
- **Score de Risco (1-10)**: Avaliação instantânea do nível de risco do documento
- **Complexidade (1-10)**: Medição da dificuldade de compreensão
- **Boas Práticas (1-10)**: Avaliação da transparência e ética do documento
- **Semáforo Visual**: Cores intuitivas (Verde/Amarelo/Vermelho) para identificação rápida
- **Algoritmo Avançado**: Cálculo baseado em conteúdo, tamanho e tipo de documento

### 🎯 **Foco Personalizado**
- **Privacidade**: Concentra-se em questões de dados pessoais e privacidade
- **Termos**: Foca em direitos e responsabilidades do utilizador
- **Geral**: Análise equilibrada de ambos os aspetos

### 📊 **Histórico e Gestão Avançada**
- **Histórico completo** dos resumos criados com filtros avançados
- **Dashboard administrativo** com analytics detalhados em tempo real
- **Sistema de créditos** flexível e transparente
- **Exportação de dados** em múltiplos formatos (JSON, CSV, TXT)

### 💳 **Sistema de Créditos Inteligente**
- **API Compartilhada**: Use créditos gratuitos incluídos
- **API Própria**: Configure sua própria chave Google Gemini
- **Compra de Créditos**: Sistema de pagamento integrado com Stripe
- **Gestão transparente** de créditos e utilização

#### **Porquê Pagar?**
**O Nosso Comprometimento:** Cada resumo de alta precisão requer o uso do modelo avançado Google Gemini, processamento em backend seguro (Vercel) e gestão de base de dados. O nosso sistema de créditos cobre estes custos, garantindo a mais alta qualidade, velocidade e privacidade, que extensões gratuitas e menos robustas não conseguem oferecer.

## 🚀 Instalação e Configuração

### **Opção 1: Chrome Web Store (Recomendado)**
1. Aceda à [Chrome Web Store](https://chrome.google.com/webstore)
2. Procure por "ToS & Privacy Summarizer"
3. Clique em "Adicionar ao Chrome"
4. Confirme a instalação

### **Opção 2: Instalação Manual (Desenvolvimento)**
1. Clone o repositório:
   ```bash
   git clone https://github.com/luismsmarques/tos-privacy-summarizer.git
   cd tos-privacy-summarizer
   ```

2. Carregue a extensão no Chrome:
   - Abra `chrome://extensions/`
   - Ative "Modo de programador"
   - Clique em "Carregar extensão não compactada"
   - Selecione a pasta do projeto

## 🔧 Configuração

### **Configuração Inicial**
1. Clique no ícone da extensão na barra de ferramentas
2. Siga o tutorial de onboarding
3. Escolha entre API compartilhada ou própria

### **API Compartilhada (Recomendado para Iniciantes)**
- ✅ Não requer configuração
- ✅ Créditos gratuitos incluídos
- ✅ Ideal para uso ocasional
- ✅ Sem necessidade de chave API

### **API Própria (Para Uso Avançado)**
1. Obtenha uma chave API do Google Gemini:
   - Aceda ao [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Crie uma nova chave API
   - Copie a chave

2. Configure na extensão:
   - Abra as configurações da extensão
   - Cole a sua chave API
   - Salve as configurações

## 📱 Como Usar

### **Uso Básico**
1. **Navegue** para uma página com Termos de Serviço ou Política de Privacidade
2. **Clique** no ícone da extensão na barra de ferramentas
3. **Aguarde** a análise automática do texto (10-30 segundos)
4. **Leia** o resumo claro e compreensível

### **Funcionalidades Avançadas**
- **Histórico**: Veja todos os resumos criados anteriormente
- **Foco Personalizado**: Escolha entre análise de privacidade, termos ou geral
- **Exportar**: Guarde resumos em formato JSON
- **Compartilhar**: Partilhe resumos com outros utilizadores

## 🏗️ Arquitetura do Projeto

### **Estrutura de Arquivos**
```
tos-privacy-summarizer/
├── 📁 Extensão Chrome
│   ├── manifest.json              # Configuração da extensão
│   ├── background.js              # Service Worker principal
│   ├── content.js                 # Script de extração de conteúdo
│   ├── popup.html + popup.js      # Interface principal
│   ├── options.html + options.js  # Página de configurações
│   ├── onboarding.html + js       # Tutorial inicial
│   ├── summary-page.html + js     # Página de resumo detalhado
│   ├── history.html + js         # Histórico de resumos
│   ├── checkout.html + js         # Página de checkout
│   └── privacy-policy.html        # Política de privacidade
│
├── 📁 Backend (Vercel)
│   ├── server.js                  # Servidor principal
│   ├── package.json               # Dependências do backend
│   ├── vercel.json                # Configuração Vercel
│   ├── routes/
│   │   ├── gemini.js             # API Gemini
│   │   ├── analytics.js          # Analytics e dados
│   │   ├── auth.js               # Autenticação
│   │   ├── users.js              # Gestão de utilizadores
│   │   ├── credits.js            # Sistema de créditos
│   │   └── stripe.js             # Pagamentos
│   ├── utils/
│   │   ├── database.js           # Conexão à base de dados
│   │   ├── auth.js               # Utilitários de autenticação
│   │   └── emailService.js       # Serviço de email
│   └── database/
│       └── schema.sql            # Schema da base de dados
│
├── 📁 Dashboard Administrativo
│   ├── index.html                # Dashboard principal
│   ├── dashboard.js              # Lógica do dashboard
│   ├── dashboard.css             # Estilos do dashboard
│   └── chart.min.js             # Gráficos
│
├── 📁 Documentação
│   ├── README.md                 # Este arquivo
│   ├── PROJECT-TODO.md           # Lista de tarefas do projeto
│   └── docs/                     # Documentação adicional
│       ├── STORE-DESCRIPTION.md  # Descrição para Chrome Web Store
│       ├── SUBMISSION-GUIDE.md    # Guia de submissão
│       ├── CHANGELOG.md           # Histórico de mudanças
│       ├── RELEASE-NOTES-v1.3.0.md # Notas da versão atual
│       ├── PRIVACY-POLICY.md      # Política de privacidade
│       ├── CONTRIBUTING.md        # Guia de contribuição
│       └── ENVIRONMENT-GUIDE.md   # Guia de ambiente
│
└── 📁 Scripts de Gestão
    ├── scripts/                  # Scripts de automação
    │   ├── manage-environments.sh # Gestão de ambientes
    │   └── test-environments.sh   # Testes de ambiente
    └── debug-tools/              # Ferramentas de debug (desenvolvimento)
```

### **Tecnologias Utilizadas**

#### **Frontend (Extensão)**
- **Manifest V3**: Última versão do Chrome Extensions API
- **Vanilla JavaScript**: Sem dependências externas
- **Material Design**: Interface moderna e responsiva
- **Chrome APIs**: activeTab, scripting, storage

#### **Backend**
- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **PostgreSQL**: Base de dados (Vercel Postgres)
- **Google Gemini AI**: Processamento de linguagem natural
- **Stripe**: Processamento de pagamentos
- **JWT**: Autenticação segura

#### **Infraestrutura**
- **Vercel**: Hospedagem do backend
- **Chrome Web Store**: Distribuição da extensão
- **GitHub**: Controlo de versões

## 🔒 Privacidade e Segurança

### **Política de Privacidade**
- **Dados Locais**: Configurações guardadas localmente no Chrome
- **Texto Temporário**: Conteúdo enviado apenas para processamento
- **Sem Armazenamento**: Não guardamos conteúdo dos seus documentos
- **API Segura**: Utiliza Google Gemini com segurança máxima

### **Permissões Necessárias**
- **activeTab**: Aceder ao conteúdo da página atual
- **scripting**: Extrair texto da página
- **storage**: Guardar configurações localmente

### **Conformidade**
- ✅ **GDPR Compliant**
- ✅ **Chrome Web Store Policies**
- ✅ **Manifest V3 Security**
- ✅ **Política de Privacidade Transparente**

## 🛠️ Desenvolvimento

### **Pré-requisitos**
- Node.js >= 18.0.0
- Chrome Browser
- Conta Google (para Gemini API)
- Conta Vercel (para backend)

### **Configuração do Ambiente**
1. Clone o repositório
2. Instale dependências do backend:
   ```bash
   cd backend
   npm install
   ```

3. Configure variáveis de ambiente:
   ```bash
   cp backend/env.example backend/.env
   # Edite o arquivo .env com suas configurações
   ```

4. Configure o backend no Vercel:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

### **Scripts Disponíveis**
```bash
# Desenvolvimento
npm run dev          # Executar em modo desenvolvimento
npm run build        # Construir para produção
npm start           # Iniciar servidor

# Backend
cd backend
npm start           # Iniciar servidor backend
npm run dev         # Modo desenvolvimento com nodemon
```


## 🆕 Últimas Atualizações (v1.3.0)

### **✅ Organização e Limpeza do Projeto**
- **Código Limpo**: Removidos todos os ficheiros de teste e debug desnecessários
- **Estrutura Otimizada**: Projeto organizado para produção
- **Documentação Atualizada**: README reorganizado com informações claras
- **Ficheiros ZIP Removidos**: Limpeza de versões antigas compactadas
- **Cookies de Debug Removidos**: Limpeza de ficheiros sensíveis

### **✅ Melhorias Implementadas**
- **Dashboard Corrigido**: Estatísticas agora mostram dados reais em vez de fallback
- **Conexão Backend**: Problemas de CORS e URL resolvidos
- **Segurança Aprimorada**: `.gitignore` melhorado com arquivos sensíveis
- **Organização**: Estrutura de pastas otimizada para distribuição
- **Documentação**: README atualizado com todas as funcionalidades

### **🔧 Correções Técnicas**
- Contagem de resumos corrigida (512 total, 511 bem-sucedidos)
- URLs do backend configuradas corretamente
- CORS configurado para localhost:8080
- Arquivos de ambiente protegidos no Git

## 📊 Analytics e Monitorização

### **Dashboard Administrativo**
- **URL**: `https://tos-privacy-summarizer.vercel.app/dashboard`
- **Funcionalidades**:
  - Estatísticas de utilização
  - Gráficos de performance
  - Gestão de utilizadores
  - Monitorização de erros

### **Métricas Disponíveis**
- Total de utilizadores ativos
- Resumos criados (bem-sucedidos e falhados)
- Taxa de sucesso em tempo real
- Tempo médio de processamento
- Tipos de documentos analisados
- Distribuição geográfica dos utilizadores

## 🤝 Contribuição

### **Como Contribuir**
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### **Áreas de Contribuição**
- 🐛 **Bug Fixes**: Corrigir problemas existentes
- ✨ **Novas Funcionalidades**: Adicionar funcionalidades úteis
- 📚 **Documentação**: Melhorar documentação
- 🎨 **UI/UX**: Melhorar interface e experiência
- 🔧 **Performance**: Otimizar velocidade e eficiência

## 📞 Suporte e Contacto

### **Canais de Suporte**
- **GitHub Issues**: [Reportar problemas](https://github.com/luismsmarques/tos-privacy-summarizer/issues)
- **GitHub Discussions**: [Discussões da comunidade](https://github.com/luismsmarques/tos-privacy-summarizer/discussions)
- **Email**: Contacte através do GitHub

### **FAQ Frequente**

**P: A extensão funciona em todos os sites?**
R: Sim, funciona em qualquer site que contenha Termos de Serviço ou Políticas de Privacidade.

**P: Os meus dados são seguros?**
R: Sim, utilizamos apenas o texto necessário para análise e não guardamos conteúdo permanentemente.

**P: Posso usar minha própria chave API?**
R: Sim, pode configurar sua própria chave Google Gemini nas configurações.

**P: Quanto custa usar a extensão?**
R: A extensão é gratuita com créditos incluídos. Pode comprar créditos adicionais se necessário.


**P: O dashboard mostra dados reais?**
R: Sim, desde a v1.2.0 o dashboard mostra dados reais da base de dados em tempo real.
## 📈 Roadmap

### **Versão 1.4.0 (Próxima)**
- [ ] Suporte para mais idiomas
- [ ] Integração com outros modelos de IA
- [ ] API pública para desenvolvedores
- [ ] Modo offline básico

### **Versão 1.5.0 (Futuro)**
- [ ] Extensão para Firefox
- [ ] App mobile
- [ ] Integração com navegadores empresariais
- [ ] Análise de contratos complexos

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT** - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **Google Gemini AI** - Pelo processamento de linguagem natural
- **Vercel** - Pela hospedagem do backend
- **Chrome Web Store** - Pela plataforma de distribuição
- **Comunidade Open Source** - Pelas bibliotecas e ferramentas utilizadas

---

## 🎯 Casos de Uso

### **Para Consumidores**
- Entenda o que está a aceitar antes de clicar "Aceito"
- Identifique riscos de privacidade importantes
- Compare políticas de diferentes serviços

### **Para Empresas**
- Analise termos de concorrentes rapidamente
- Identifique melhores práticas de privacidade
- Monitore mudanças em políticas legais

### **Para Estudantes**
- Estude documentos legais de forma compreensível
- Aprenda sobre direitos do consumidor
- Desenvolva literacia digital

### **Para Profissionais**
- Obtenha resumos rápidos de documentos longos
- Identifique pontos-chave em contratos
- Economize tempo em análises legais

---

**Desenvolvido com ❤️ para tornar a internet mais transparente e compreensível.**

[![GitHub stars](https://img.shields.io/github/stars/luismsmarques/tos-privacy-summarizer?style=social)](https://github.com/luismsmarques/tos-privacy-summarizer)
[![GitHub forks](https://img.shields.io/github/forks/luismsmarques/tos-privacy-summarizer?style=social)](https://github.com/luismsmarques/tos-privacy-summarizer/fork)