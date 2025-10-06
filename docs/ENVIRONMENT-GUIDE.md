# 🌐 ToS Privacy Summarizer - Gestão de Ambientes

## 📋 Estrutura de Branches Implementada

### **`main` - Produção (Vercel)**
- **Propósito**: Ambiente de produção na Vercel
- **URL**: `https://tos-privacy-summarizer.vercel.app/dashboard/`
- **Deploy**: Automático via Vercel
- **Credenciais**: `admin` / `admin123`

### **`development` - Desenvolvimento Local**
- **Propósito**: Ambiente de desenvolvimento local
- **URL**: `http://localhost:3000/dashboard/`
- **Deploy**: Manual via scripts
- **Credenciais**: `admin` / `admin123`

## 🚀 Como Usar

### **Script de Gestão de Ambientes**
```bash
# Ver status atual
./manage-environments.sh status

# Configurar ambiente de desenvolvimento
./manage-environments.sh dev

# Configurar ambiente de produção
./manage-environments.sh production

# Testar ambos os ambientes
./manage-environments.sh test
```

### **Desenvolvimento Local**
```bash
# Mudar para desenvolvimento
./manage-environments.sh dev

# Iniciar servidor
cd backend && ./start-server.sh

# Ou manualmente
cd backend && source config-dev.sh && npm start
```

### **Deploy em Produção**
```bash
# Mudar para produção
./manage-environments.sh production

# Fazer push (deploy automático na Vercel)
git push origin main
```

## 🛠️ Scripts Disponíveis

### **Gestão de Ambientes**
- `./manage-environments.sh` - Script principal de gestão
- `./test-environments.sh` - Testar ambos os ambientes

### **Desenvolvimento Local**
- `./backend/start-server.sh` - Iniciar servidor local
- `./backend/stop-server.sh` - Parar servidor local
- `./backend/quick-login.sh` - Login rápido
- `./backend/config-dev.sh` - Configurar ambiente local

## 📊 Workflow de Desenvolvimento

1. **Desenvolvimento**:
   ```bash
   ./manage-environments.sh dev
   cd backend && ./start-server.sh
   ```

2. **Testes**:
   ```bash
   ./test-environments.sh
   ```

3. **Deploy**:
   ```bash
   ./manage-environments.sh production
   git push origin main
   ```

## 🔍 Verificação de Status

```bash
# Ver branch atual
git branch --show-current

# Ver status do ambiente
./manage-environments.sh status

# Testar funcionamento
./test-environments.sh
```

## 📈 Benefícios

- ✅ **Separação Clara**: Desenvolvimento vs Produção
- ✅ **Deploy Seguro**: Testes locais antes da produção
- ✅ **Configurações Isoladas**: Cada ambiente com suas configurações
- ✅ **Scripts Automatizados**: Facilita a gestão
- ✅ **Rollback Fácil**: Possibilidade de reverter alterações

---

**Estrutura implementada com sucesso!** 🎉
