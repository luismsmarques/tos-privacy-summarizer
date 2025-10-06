# 🌐 Estrutura de Branches - ToS Privacy Summarizer

## 📋 Branches Disponíveis

### **`main` - Produção (Vercel)**
- **Propósito**: Ambiente de produção na Vercel
- **URL**: `https://tos-privacy-summarizer.vercel.app`
- **Deploy**: Automático via Vercel
- **Configuração**: `vercel.json` com variáveis de produção

### **`development` - Desenvolvimento Local**
- **Propósito**: Ambiente de desenvolvimento local
- **URL**: `http://localhost:3000`
- **Deploy**: Manual via scripts
- **Configuração**: Scripts de desenvolvimento

## 🔄 Workflow de Desenvolvimento

### **Para Desenvolvimento Local**
```bash
# Mudar para branch de desenvolvimento
git checkout development

# Instalar dependências
cd backend && npm install

# Configurar ambiente local
source config-dev.sh

# Iniciar servidor
npm start
```

### **Para Deploy em Produção**
```bash
# Mudar para branch principal
git checkout main

# Fazer merge das alterações de desenvolvimento
git merge development

# Fazer push para produção
git push origin main

# Deploy automático na Vercel
```

## 🛠️ Scripts por Ambiente

### **Desenvolvimento Local (`development` branch)**
- `./start-server.sh` - Iniciar servidor local
- `./stop-server.sh` - Parar servidor local
- `./quick-login.sh` - Login rápido
- `source config-dev.sh` - Configurar ambiente
- `./test-environments.sh` - Testar ambos ambientes

### **Produção (`main` branch)**
- Deploy automático via Vercel
- Configurações em `vercel.json`
- Variáveis de ambiente no dashboard Vercel

## 📊 Configurações por Ambiente

### **Desenvolvimento Local**
```bash
JWT_SECRET="tos-privacy-summarizer-secure-jwt-secret-key-2024-development"
NODE_ENV="development"
PORT=3000
DATABASE_URL="postgresql://..."
```

### **Produção Vercel**
```bash
JWT_SECRET="5tM2emNMyQBi2WpNapQbt4izhVkR4vcEVo2ZsJc23800hMpCxWNJNzoUufOM2sJlBnTrQzw95ahEBNVkKSgiiIbJSNW1s70PTBa2CCz5QjgI7iQiuVAo90LvOTLIhS2Y34QtQQQ16KcGwSDhCEZJK0DH96uV10Cxxz4y8awK0uUyj97pQ35CyX9GJu9o2XtmXyJI9927InhZ9x1zQntePq6bjqIwYqKZ4QK8gkpi6Mq6eHKvEE1VH7t2acjvfCED"
NODE_ENV="production"
DATABASE_URL="postgresql://..."
```

## 🎯 Comandos Úteis

### **Gestão de Branches**
```bash
# Ver todas as branches
git branch -a

# Mudar para desenvolvimento
git checkout development

# Mudar para produção
git checkout main

# Criar nova feature branch
git checkout -b feature/nova-funcionalidade
```

### **Deploy e Merge**
```bash
# Fazer merge de desenvolvimento para produção
git checkout main
git merge development
git push origin main

# Fazer merge de produção para desenvolvimento
git checkout development
git merge main
git push origin development
```

## 🔍 Verificação de Ambiente

### **Testar Ambiente Atual**
```bash
# Executar teste completo
./test-environments.sh

# Verificar branch atual
git branch --show-current

# Verificar configurações
echo $NODE_ENV
echo $JWT_SECRET
```

## 📈 Benefícios desta Estrutura

1. **Separação Clara**: Desenvolvimento vs Produção
2. **Deploy Seguro**: Testes locais antes da produção
3. **Rollback Fácil**: Possibilidade de reverter alterações
4. **Colaboração**: Múltiplos desenvolvedores podem trabalhar
5. **Configurações Isoladas**: Cada ambiente com suas configurações

---

**Estrutura implementada com sucesso!** 🎉
