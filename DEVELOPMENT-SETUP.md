# 🛠️ SETUP DO AMBIENTE DE DESENVOLVIMENTO

## 📋 **CHECKLIST DE CONFIGURAÇÃO**

### **✅ Ambiente Base**
- [x] Node.js 18+ instalado
- [x] NPM/Yarn configurado
- [x] Git configurado
- [x] Editor de código (VS Code recomendado)

### **🔧 Dependências Principais**
- [x] Backend: Express.js + PostgreSQL/SQLite
- [x] Frontend: Chrome Extension API
- [x] IA: Google Gemini API
- [x] Pagamentos: Stripe
- [x] Email: Nodemailer

### **🔐 Configurações de Segurança**
- [x] Variáveis de ambiente (.env)
- [x] JWT para autenticação
- [x] Rate limiting
- [x] CORS configurado
- [x] Helmet para segurança

### **📊 Ferramentas de Desenvolvimento**
- [x] Debug tools configurados
- [x] Testes automatizados
- [x] Linting e formatação
- [x] Monitorização de logs

---

## 🚀 **COMANDOS DE DESENVOLVIMENTO**

### **Backend**
```bash
cd backend
npm install
npm run dev
```

### **Frontend (Extensão)**
```bash
# Carregar extensão no Chrome
# Developer Mode > Load unpacked > Selecionar pasta do projeto
```

### **Testes**
```bash
cd debug-tools
npm install
npm test
```

### **Deploy**
```bash
# Vercel (recomendado)
vercel --prod

# Ou manual
npm run build
```

---

## 📁 **ESTRUTURA DO PROJETO**

```
ToS_DR/
├── backend/           # API e servidor
├── dashboard/         # Interface administrativa
├── debug-tools/       # Ferramentas de teste
├── docs/             # Documentação
├── locales/          # Internacionalização
├── screenshots/      # Imagens para Chrome Store
└── *.html, *.js      # Extensão Chrome
```

---

## 🔄 **WORKFLOW DE DESENVOLVIMENTO**

1. **Desenvolvimento Local**
   - Modificar código
   - Testar localmente
   - Commit com mensagem clara

2. **Testes**
   - Executar testes automatizados
   - Verificar linting
   - Testar funcionalidades

3. **Deploy**
   - Deploy para staging
   - Testes de integração
   - Deploy para produção

4. **Monitorização**
   - Verificar logs
   - Monitorar métricas
   - Feedback dos utilizadores

---

## 📈 **MÉTRICAS DE DESENVOLVIMENTO**

### **Performance**
- Tempo de resposta < 2s
- Uptime > 99.9%
- Taxa de erro < 0.1%

### **Qualidade**
- Cobertura de testes > 80%
- Zero vulnerabilidades críticas
- Código limpo e documentado

### **Produtividade**
- Deploy automático
- Feedback rápido
- Iteração contínua

---

**Status**: ✅ **AMBIENTE CONFIGURADO**  
**Próximo**: Implementação faseada  
**Data**: $(date)
