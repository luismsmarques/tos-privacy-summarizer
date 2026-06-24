# 🔒 Configuração Segura para Produção
# ToS & Privacy Summarizer - v1.3.0

## ⚠️ IMPORTANTE: Configurações de Segurança

### **Variáveis de Ambiente Obrigatórias no Vercel**

Configure estas variáveis no dashboard do Vercel antes do deploy:

```bash
# 1. SENHA ADMINISTRATIVA FORTE (OBRIGATÓRIO)
ADMIN_PASSWORD=GereUmaSenhaForteComPeloMenos16Caracteres123!

# 2. JWT SECRET FORTE (OBRIGATÓRIO)
JWT_SECRET=GereUmaChaveAleatoriaDePeloMenos64CaracteresParaSegurancaMaxima123456789

# 3. CHAVE API GEMINI (OBRIGATÓRIO)
GEMINI_API_KEY=sua_chave_real_da_api_gemini_aqui

# 4. CONFIGURAÇÕES DE PRODUÇÃO
NODE_ENV=production
FRONTEND_URL=https://tos-privacy-summarizer.vercel.app
CORS_ORIGIN=https://tos-privacy-summarizer.vercel.app

# 5. CONFIGURAÇÕES DE SEGURANÇA
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DEFAULT_FREE_CREDITS=5
CREDIT_PRICE_CENTS=100

# 6. CONFIGURAÇÕES DE EMAIL (OPCIONAL)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app

# 7. CONFIGURAÇÕES STRIPE (OPCIONAL)
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_stripe
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica_stripe
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret
```

## 🚀 Como Configurar no Vercel

### **Passo 1: Aceder ao Dashboard**
1. Ir para: https://vercel.com/dashboard
2. Selecionar o projeto `tos-privacy-summarizer`
3. Ir para **Settings** → **Environment Variables**

### **Passo 2: Adicionar Variáveis**
1. Clicar em **Add New**
2. Adicionar cada variável acima
3. Marcar como **Production** environment
4. Clicar em **Save**

### **Passo 3: Redeploy**
1. Ir para **Deployments**
2. Clicar nos três pontos do último deploy
3. Selecionar **Redeploy**

## 🔐 Geradores de Senhas Seguras

### **Para ADMIN_PASSWORD:**
```bash
# Usar gerador online ou comando:
openssl rand -base64 32
```

### **Para JWT_SECRET:**
```bash
# Gerar chave de 64 caracteres:
openssl rand -hex 32
```

## ✅ Checklist de Segurança

- [ ] ✅ Senha administrativa forte configurada
- [ ] ✅ JWT secret único e forte
- [ ] ✅ Chave API Gemini real configurada
- [ ] ✅ Variáveis de ambiente configuradas no Vercel
- [ ] ✅ Redeploy realizado após configuração
- [ ] ✅ Teste de login com novas credenciais
- [ ] ✅ Verificação de funcionamento da API

## 🧪 Teste de Configuração

Após configurar as variáveis, teste:

```bash
# Teste de login
curl -X POST https://tos-privacy-summarizer.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SUA_NOVA_SENHA"}'

# Teste da API
curl https://tos-privacy-summarizer.vercel.app/api/analytics/users
```

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs no Vercel Dashboard
2. Confirmar que todas as variáveis estão configuradas
3. Verificar se o redeploy foi realizado
4. Contactar suporte técnico se necessário

---

**⚠️ CRÍTICO**: Nunca commitar senhas ou chaves no código!  
**✅ SEGURO**: Usar sempre variáveis de ambiente para dados sensíveis.
