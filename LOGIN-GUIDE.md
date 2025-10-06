# 🔐 Guia de Login no Dashboard

## ❌ Problema Identificado

O erro "invalid signature" ocorre quando há múltiplos servidores rodando com diferentes JWT_SECRETs, causando conflito na verificação dos tokens.

## ✅ Solução Rápida

### **Passo 1: Parar todos os servidores**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
./stop-server.sh
```

### **Passo 2: Iniciar servidor único**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
source config-dev.sh
npm start
```

### **Passo 3: Aceder ao dashboard**
- **URL**: `http://localhost:3000/dashboard/`
- **Credenciais**: `admin` / `admin123`

## 🚀 Método Automático

**Usar o script de login rápido:**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
./quick-login.sh
```

Este script:
1. ✅ Faz login automaticamente
2. ✅ Obtém o token válido
3. ✅ Abre o dashboard no navegador
4. ✅ Mostra as credenciais

## 🔍 Verificação

**Testar se está funcionando:**
```bash
# Verificar se o servidor está rodando
curl http://localhost:3000/health

# Testar login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📊 Status Atual

- ✅ Servidor único rodando
- ✅ JWT_SECRET configurado corretamente
- ✅ Login funcionando
- ✅ Dashboard acessível

## 🎯 Próximos Passos

1. **Aceder**: `http://localhost:3000/dashboard/`
2. **Login**: `admin` / `admin123`
3. **Explorar**: Overview, Utilizadores, Resumos, etc.

---

**Problema resolvido!** 🎉
