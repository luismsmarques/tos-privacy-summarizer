# 📋 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.2.0] - 2025-10-06

### ✨ Adicionado
- Sistema robusto de criação de resumos com fallback automático
- Detecção automática de tipo de documento (Termos vs Política de Privacidade)
- Migração completa da base de dados com todas as colunas necessárias
- Endpoint de migração SQL direta para resolução de problemas
- Logs detalhados para debugging e monitorização
- Suporte completo para URLs, summaries, titles e document_type
- Sistema de créditos flexível (API compartilhada + API própria)
- Dashboard administrativo com analytics detalhados
- Página de checkout integrada com Stripe
- Sistema de onboarding para novos utilizadores
- Histórico completo de resumos com funcionalidades de exportação
- Página de resumo detalhada com interface Material Design
- Política de privacidade e termos de serviço completos
- Documentação completa para Chrome Web Store

### 🔧 Melhorado
- Função `createSummary` agora funciona com qualquer versão do schema
- Endpoints de analytics suportam tanto `type` quanto `document_type`
- Interface do popup completamente redesenhada
- Sistema de retry para requisições de API
- Tratamento de erros mais robusto
- Performance melhorada na análise de documentos
- Compatibilidade com Manifest V3

### 🐛 Corrigido
- URLs e summaries não apareciam mais como null
- Problema de schema mismatch entre código e base de dados
- Erro de parâmetros incorretos no teste de inserção
- Código duplicado que causava erros no servidor
- Logs de debug excessivos removidos
- Estrutura de arquivos organizada para produção

### 🗑️ Removido
- Arquivos de teste e debug desnecessários
- Documentação de desenvolvimento
- Arquivos de migração temporários
- Configurações de desenvolvimento
- Versões antigas de arquivos

## [1.1.0] - 2025-10-04

### ✨ Adicionado
- Sistema de créditos básico
- Integração com Stripe para pagamentos
- Página de checkout
- Histórico de resumos
- Dashboard administrativo básico

### 🔧 Melhorado
- Interface do usuário
- Performance da análise
- Tratamento de erros

## [1.0.0] - 2025-10-01

### ✨ Adicionado
- Versão inicial da extensão
- Análise básica de Termos de Serviço e Políticas de Privacidade
- Interface popup simples
- Integração com Google Gemini AI
- Configurações básicas

---

## 🔮 Próximas Versões

### [1.3.0] - Planejado
- Suporte para mais idiomas
- Integração com outros modelos de IA
- API pública para desenvolvedores
- Modo offline básico

### [1.4.0] - Futuro
- Extensão para Firefox
- App mobile
- Integração com navegadores empresariais
- Análise de contratos complexos

---

## 📝 Notas de Versão

### Versão 1.2.0
Esta versão representa uma melhoria significativa na estabilidade e funcionalidade da extensão. O problema crítico dos URLs e summaries null foi completamente resolvido, e a extensão está agora pronta para submissão na Chrome Web Store.

**Principais Conquistas:**
- ✅ Problema de dados null resolvido
- ✅ Sistema robusto implementado
- ✅ Documentação completa criada
- ✅ Pronto para produção

### Versão 1.1.0
Introduziu o sistema de monetização e funcionalidades avançadas de gestão.

### Versão 1.0.0
Versão inicial com funcionalidades básicas de análise de documentos legais.
