# 🌐 Guia Completo - Dashboard Local e Vercel

## ✅ Status Atual

### **Servidor Local (Desenvolvimento)**
- **URL**: `http://localhost:3000/dashboard/`
- **Status**: ✅ Funcionando
- **Login**: ✅ Funcionando
- **Base de Dados**: ✅ Conectada

### **Servidor Vercel (Produção)**
- **URL**: `https://tos-privacy-summarizer.vercel.app/dashboard/`
- **Status**: ✅ Funcionando
- **Login**: ✅ Funcionando
- **Base de Dados**: ✅ Conectada

## 🚀 Como Aceder ao Dashboard

### **Ambiente Local (Desenvolvimento)**

**Método 1 - Script Automático:**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
./quick-login.sh
```

**Método 2 - Manual:**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
source config-dev.sh
npm start
```

**Credenciais:**
- **Utilizador**: `admin`
- **Palavra-passe**: `admin123`

### **Ambiente Vercel (Produção)**

**Acesso direto:**
- **URL**: `https://tos-privacy-summarizer.vercel.app/dashboard/`
- **Utilizador**: `admin`
- **Palavra-passe**: `admin123`

## 🔧 Configurações

### **Local (Desenvolvimento)**
```bash
JWT_SECRET="tos-privacy-summarizer-secure-jwt-secret-key-2024-development"
NODE_ENV="development"
PORT=3000
```

### **Vercel (Produção)**
```bash
JWT_SECRET="5tM2emNMyQBi2WpNapQbt4izhVkR4vcEVo2ZsJc23800hMpCxWNJNzoUufOM2sJlBnTrQzw95ahEBNVkKSgiiIbJSNW1s70PTBa2CCz5QjgI7iQiuVAo90LvOTLIhS2Y34QtQQQ16KcGwSDhCEZJK0DH96uV10Cxxz4y8awK0uUyj97pQ35CyX9GJu9o2XtmXyJI9927InhZ9x1zQntePq6bjqIwYqKZ4QK8gkpi6Mq6eHKvEE1VH7t2acjvfCED"
NODE_ENV="production"
```

## 📊 Testes de Funcionamento

### **Teste Local**
```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Debug
curl http://localhost:3000/api/analytics/debug
```

### **Teste Vercel**
```bash
# Health check
curl https://tos-privacy-summarizer.vercel.app/health

# Login
curl -X POST https://tos-privacy-summarizer.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Debug
curl https://tos-privacy-summarizer.vercel.app/api/analytics/debug
```

## 🛠️ Scripts Disponíveis

### **Local**
- `./start-server.sh` - Iniciar servidor
- `./stop-server.sh` - Parar servidor
- `./quick-login.sh` - Login rápido
- `source config-dev.sh` - Configurar ambiente

### **Vercel**
- Deploy automático via Git
- Configurações em `vercel.json`
- Variáveis de ambiente no dashboard Vercel

## 🔍 Resolução de Problemas

### **Problema: "invalid signature"**
**Causa**: Múltiplos servidores com diferentes JWT_SECRETs
**Solução**: 
```bash
# Parar todos os servidores
./stop-server.sh

# Iniciar servidor único
source config-dev.sh && npm start
```

### **Problema: "EADDRINUSE"**
**Causa**: Porta 3000 em uso
**Solução**:
```bash
# Liberar porta
kill -9 $(lsof -ti:3000)

# Ou usar script
./stop-server.sh
```

## 📈 Funcionalidades Disponíveis

### **Dashboard Completo**
- ✅ Overview com métricas
- ✅ Gestão de utilizadores
- ✅ Histórico de resumos
- ✅ Configurações avançadas
- ✅ Analytics em tempo real

### **APIs Funcionais**
- ✅ `/api/auth/login` - Autenticação
- ✅ `/api/analytics/*` - Analytics
- ✅ `/api/users/*` - Gestão de utilizadores
- ✅ `/api/gemini/*` - Processamento de IA

## 🎯 Próximos Passos

1. **Escolher ambiente**: Local ou Vercel
2. **Aceder ao dashboard**: URLs acima
3. **Fazer login**: `admin` / `admin123`
4. **Explorar funcionalidades**: Overview, Utilizadores, etc.

---

**Ambos os ambientes estão funcionando perfeitamente!** 🎉
