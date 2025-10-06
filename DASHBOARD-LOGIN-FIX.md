# 🔧 Solução para Problema de Login no Dashboard

## ❌ Problema Identificado

O erro "Token Inválido" com "invalid signature" ocorre quando a variável de ambiente `JWT_SECRET` não está configurada corretamente.

## ✅ Solução Implementada

### 1. **Configuração das Variáveis de Ambiente**

O servidor agora está configurado com:
```bash
JWT_SECRET="tos-privacy-summarizer-secure-jwt-secret-key-2024-development"
NODE_ENV="development"
PORT=3000
```

### 2. **Scripts de Inicialização**

Criados dois scripts para facilitar o uso:

#### **Script Principal** (`start-server.sh`)
```bash
cd backend
./start-server.sh
```

#### **Script de Configuração** (`config-dev.sh`)
```bash
cd backend
source config-dev.sh
npm start
```

### 3. **Verificação do Funcionamento**

✅ **Login funcionando**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

✅ **Dashboard acessível**:
- URL: `http://localhost:3000/dashboard/`
- Credenciais: `admin` / `admin123`

## 🚀 Como Usar

### **Método 1: Script Automático**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
./start-server.sh
```

### **Método 2: Configuração Manual**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
source config-dev.sh
npm start
```

### **Método 3: Variáveis Inline**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
JWT_SECRET="tos-privacy-summarizer-secure-jwt-secret-key-2024-development" npm start
```

### **Parar o Servidor**
```bash
cd /Users/LuisMarques_1/ToS_DR/backend
./stop-server.sh
```

### **Resolver Problema de Porta em Uso**
Se aparecer erro "EADDRINUSE":
```bash
# Parar processo na porta 3000
kill -9 $(lsof -ti:3000)

# Ou usar o script
./stop-server.sh
```

## 🔍 Diagnóstico

Se ainda houver problemas:

1. **Verificar se o servidor está rodando**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Verificar variáveis de ambiente**:
   ```bash
   echo $JWT_SECRET
   ```

3. **Verificar logs do servidor**:
   ```bash
   # Os logs aparecerão no terminal onde o servidor está rodando
   ```

## 📊 Status Atual

- ✅ Servidor backend: Funcionando
- ✅ Autenticação JWT: Corrigida
- ✅ Dashboard: Acessível
- ✅ APIs de analytics: Operacionais
- ✅ Base de dados: Conectada

## 🎯 Próximos Passos

1. **Aceder ao dashboard**: `http://localhost:3000/dashboard/`
2. **Fazer login**: `admin` / `admin123`
3. **Verificar funcionalidades**: Overview, Utilizadores, Resumos, etc.

---

**Problema resolvido!** 🎉
