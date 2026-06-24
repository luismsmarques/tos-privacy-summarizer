# 🔒 GUIA DE CONFIGURAÇÃO SEGURA - ToS & Privacy Summarizer

## ⚠️ **IMPORTANTE: CONFIGURAÇÃO DE SEGURANÇA**

Este projeto requer configuração de variáveis de ambiente seguras antes do deployment em produção.

### 🚨 **Problemas de Segurança Corrigidos**

- ✅ Removidas credenciais hardcoded do código
- ✅ JWT secret removido do vercel.json
- ✅ Senhas padrão removidas dos scripts
- ✅ Arquivos de configuração atualizados

---

## 🔧 **Configuração no Vercel Dashboard**

### **1. Aceder ao Vercel Dashboard**
1. Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione o projeto `tos-privacy-summarizer`
3. Vá para **Settings** → **Environment Variables**

### **2. Configurar Variáveis Obrigatórias**

#### **JWT_SECRET** (CRÍTICO)
```
Nome: JWT_SECRET
Valor: [GERE UMA CHAVE SEGURA DE 64+ CARACTERES]
Exemplo: aBc123XyZ789... (mínimo 64 caracteres aleatórios)
```

#### **ADMIN_PASSWORD** (CRÍTICO)
```
Nome: ADMIN_PASSWORD
Valor: [SENHA FORTE PARA ADMINISTRADOR]
Exemplo: AdminSecure2024!@#
```

#### **ADMIN_USERNAME** (Opcional)
```
Nome: ADMIN_USERNAME
Valor: admin
```

### **3. Variáveis Opcionais**

#### **GEMINI_API_KEY** (Para API própria)
```
Nome: GEMINI_API_KEY
Valor: [sua chave da API Google Gemini]
```

#### **STRIPE_SECRET_KEY** (Para pagamentos)
```
Nome: STRIPE_SECRET_KEY
Valor: [sua chave secreta do Stripe]
```

---

## 🛠️ **Configuração Local (Desenvolvimento)**

### **1. Criar arquivo .env**
```bash
cd backend
cp ../env.example .env
```

### **2. Editar .env com suas configurações**
```bash
# Ambiente
NODE_ENV=development

# JWT Secret - GERE UMA CHAVE SEGURA
JWT_SECRET=sua-chave-jwt-segura-aqui-minimo-64-caracteres

# Credenciais Administrativas
ADMIN_USERNAME=admin
ADMIN_PASSWORD=sua-senha-segura-aqui

# Outras configurações...
```

---

## 🔐 **Geração de Chaves Seguras**

### **JWT Secret (64+ caracteres)**
```bash
# Opção 1: Usando OpenSSL
openssl rand -base64 64

# Opção 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Opção 3: Online (use apenas para desenvolvimento)
# https://generate-secret.vercel.app/64
```

### **Senha Administrativa Forte**
- Mínimo 12 caracteres
- Incluir maiúsculas, minúsculas, números e símbolos
- Exemplo: `AdminSecure2024!@#`

---

## ✅ **Verificação de Segurança**

### **Checklist de Segurança**
- [ ] JWT_SECRET configurado (64+ caracteres)
- [ ] ADMIN_PASSWORD alterado da padrão
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Arquivo .env criado localmente
- [ ] Credenciais não estão no código fonte
- [ ] Deploy realizado com configurações seguras

### **Teste de Configuração**
```bash
# Testar ambiente local
cd backend
npm start

# Testar login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua-senha-aqui"}'
```

---

## 🚀 **Deploy Seguro**

### **1. Configurar Vercel**
- Todas as variáveis de ambiente configuradas
- JWT_SECRET e ADMIN_PASSWORD definidos
- Deploy automático ativado

### **2. Testar Produção**
```bash
# Testar login em produção
curl -X POST https://tos-privacy-summarizer.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua-senha-aqui"}'
```

### **3. Aceder ao Dashboard**
- URL: `https://tos-privacy-summarizer.vercel.app/dashboard/`
- Utilizador: `admin`
- Senha: `[sua senha configurada]`

---

## 📞 **Suporte**

Se encontrar problemas:

1. **Verificar variáveis de ambiente** no Vercel Dashboard
2. **Testar configuração local** primeiro
3. **Verificar logs** do Vercel para erros
4. **Contactar suporte** se necessário

---

## ⚠️ **AVISOS IMPORTANTES**

- **NUNCA** commite arquivos `.env` para o Git
- **SEMPRE** use senhas fortes em produção
- **MANTENHA** as chaves secretas seguras
- **ROTACIONE** credenciais periodicamente
- **MONITORE** logs de acesso

---

**Configuração segura é fundamental para a segurança do projeto!** 🔒
