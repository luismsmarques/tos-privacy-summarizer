# 🤝 Guia de Contribuição

Obrigado pelo seu interesse em contribuir para o **ToS & Privacy Summarizer**! Este documento fornece diretrizes para contribuições.

## 🚀 Como Contribuir

### **1. Fork e Clone**
```bash
# Fork o repositório no GitHub
# Clone o seu fork
git clone https://github.com/SEU_USERNAME/tos-privacy-summarizer.git
cd tos-privacy-summarizer
```

### **2. Configurar Ambiente**
```bash
# Instalar dependências do backend
cd backend
npm install

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com suas configurações
```

### **3. Criar Branch**
```bash
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

### **4. Desenvolver**
- Faça suas mudanças
- Teste localmente
- Siga as convenções de código

### **5. Commit e Push**
```bash
git add .
git commit -m "feat: adicionar nova funcionalidade"
git push origin feature/nome-da-feature
```

### **6. Pull Request**
- Abra um Pull Request no GitHub
- Descreva suas mudanças
- Aguarde revisão

## 📋 Tipos de Contribuição

### 🐛 **Bug Fixes**
- Corrigir problemas existentes
- Melhorar tratamento de erros
- Otimizar performance

### ✨ **Novas Funcionalidades**
- Adicionar funcionalidades úteis
- Melhorar experiência do usuário
- Integrar novas APIs

### 📚 **Documentação**
- Melhorar README
- Adicionar exemplos de uso
- Criar tutoriais

### 🎨 **UI/UX**
- Melhorar interface
- Otimizar responsividade
- Adicionar animações

### 🔧 **Infraestrutura**
- Melhorar CI/CD
- Otimizar build
- Adicionar testes

## 📝 Convenções de Código

### **JavaScript**
```javascript
// Use const/let em vez de var
const userName = 'example';
let isActive = true;

// Use arrow functions quando apropriado
const processData = (data) => {
  return data.map(item => item.processed);
};

// Use async/await em vez de Promises
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### **HTML**
```html
<!-- Use semântica apropriada -->
<section class="summary-section">
  <h2>Resumo do Documento</h2>
  <p class="summary-content">...</p>
</section>

<!-- Use atributos acessíveis -->
<button aria-label="Analisar documento" class="analyze-btn">
  Analisar
</button>
```

### **CSS**
```css
/* Use BEM methodology */
.summary-card {
  padding: 1rem;
  border-radius: 8px;
}

.summary-card__title {
  font-size: 1.2rem;
  font-weight: bold;
}

.summary-card__content {
  margin-top: 0.5rem;
}
```

## 🧪 Testes

### **Testes Manuais**
1. Instalar extensão em modo desenvolvimento
2. Testar funcionalidades principais
3. Verificar em diferentes sites
4. Testar diferentes tipos de documentos

### **Testes Automatizados**
```bash
# Executar testes do backend
cd backend
npm test

# Verificar linting
npm run lint
```

## 📋 Checklist de Pull Request

### **Antes de Submeter**
- [ ] Código testado localmente
- [ ] Documentação atualizada
- [ ] Convenções de código seguidas
- [ ] Sem erros de linting
- [ ] Funcionalidade testada em diferentes cenários

### **Descrição do PR**
- [ ] Descrição clara das mudanças
- [ ] Screenshots se aplicável
- [ ] Referência a issues relacionadas
- [ ] Lista de funcionalidades adicionadas/corrigidas

## 🐛 Reportar Bugs

### **Template de Bug Report**
```markdown
**Descrição do Bug**
Uma descrição clara do problema.

**Passos para Reproduzir**
1. Ir para '...'
2. Clicar em '...'
3. Ver erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável, adicionar screenshots.

**Informações do Sistema**
- Chrome Version: [ex: 118.0.5993.88]
- OS: [ex: Windows 10, macOS 14]
- Extensão Version: [ex: 1.2.0]
```

## ✨ Sugerir Funcionalidades

### **Template de Feature Request**
```markdown
**Funcionalidade Sugerida**
Uma descrição clara da funcionalidade.

**Problema que Resolve**
Qual problema esta funcionalidade resolve?

**Solução Proposta**
Como você imagina que deveria funcionar?

**Alternativas Consideradas**
Outras soluções que você considerou?

**Contexto Adicional**
Qualquer contexto adicional sobre a funcionalidade.
```

## 🏷️ Sistema de Labels

### **Labels para Issues**
- `bug`: Algo não está funcionando
- `enhancement`: Nova funcionalidade ou melhoria
- `documentation`: Melhorias na documentação
- `good first issue`: Bom para iniciantes
- `help wanted`: Precisa de ajuda da comunidade
- `priority: high`: Alta prioridade
- `priority: medium`: Prioridade média
- `priority: low`: Baixa prioridade

### **Labels para Pull Requests**
- `ready for review`: Pronto para revisão
- `needs testing`: Precisa de testes
- `breaking change`: Mudança que quebra compatibilidade
- `dependencies`: Atualização de dependências

## 📞 Comunicação

### **Canais de Comunicação**
- **GitHub Issues**: Para bugs e feature requests
- **GitHub Discussions**: Para discussões gerais
- **Pull Request Comments**: Para discussões específicas de código

### **Código de Conduta**
- Seja respeitoso e construtivo
- Foque no problema, não na pessoa
- Seja paciente com novos contribuidores
- Ajude outros a aprender

## 🎯 Áreas Prioritárias

### **Alta Prioridade**
- Melhorar performance da análise
- Adicionar mais idiomas
- Melhorar acessibilidade
- Otimizar para mobile

### **Média Prioridade**
- Adicionar testes automatizados
- Melhorar documentação
- Adicionar mais modelos de IA
- Integração com outros navegadores

### **Baixa Prioridade**
- Temas personalizáveis
- Funcionalidades avançadas de exportação
- Integração com serviços de terceiros
- Funcionalidades experimentais

## 🏆 Reconhecimento

### **Contribuidores**
Todos os contribuidores serão reconhecidos:
- No README do projeto
- No arquivo CONTRIBUTORS
- Nos releases notes

### **Tipos de Contribuição**
- **Código**: Desenvolvimento de funcionalidades
- **Documentação**: Melhoria da documentação
- **Design**: Melhoria da interface
- **Testes**: Criação e execução de testes
- **Tradução**: Tradução para outros idiomas
- **Feedback**: Relatórios de bugs e sugestões

## 📚 Recursos Úteis

### **Documentação**
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/migrating/)
- [Google Gemini API](https://ai.google.dev/docs)

### **Ferramentas**
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Vercel Documentation](https://vercel.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

---

**Obrigado por contribuir para tornar a internet mais transparente e compreensível!** 🎉
