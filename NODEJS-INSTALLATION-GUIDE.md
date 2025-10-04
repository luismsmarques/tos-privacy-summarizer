# 🚀 Instalação e Configuração - Backend Seguro

## ⚠️ Problema Detectado

O Node.js não está instalado no seu sistema. Vou mostrar como resolver isso.

## 🔧 Instalação do Node.js

### Opção 1: Usando Homebrew (Recomendado para macOS)

```bash
# Instalar Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js
brew install node

# Verificar instalação
brew install node
npm --version
```

### Opção 2: Download Direto

1. Aceder a [nodejs.org](https://nodejs.org)
2. Baixar versão LTS (Long Term Support)
3. Instalar o pacote baixado

### Opção 3: Usando nvm (Node Version Manager)

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recarregar terminal
source ~/.bashrc

# Instalar Node.js LTS
nvm install --lts
nvm use --lts
```

## 🚀 Configuração Rápida (Após Instalar Node.js)

```bash
# Ir para o diretório backend
cd backend

# Instalar dependências
npm install

# Configurar ambiente
cp env.example .env

# Editar .env com a sua chave Gemini
nano .env
```

## 🔐 Configuração da Chave da API

### 1. Obter Chave da API Gemini

1. Aceder a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Fazer login com conta Google
3. Criar nova chave da API
4. Copiar a chave

### 2. Configurar no Backend

No arquivo `backend/.env`:

```env
# Substituir pela sua chave real
GEMINI_API_KEY=AIzaSyBvQ4v8Q9wX2yZ3aBcD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5

# Outras configurações
PORT=3000
NODE_ENV=development
JWT_SECRET=sua_chave_jwt_secreta_aqui
```

## 🧪 Testar Configuração

```bash
# Executar backend
cd backend
npm run dev

# Em outro terminal, testar
curl http://localhost:3000/health
```

## 🌐 Deploy para Produção (Sem Node.js Local)

Se não quiser instalar Node.js localmente, pode fazer deploy diretamente:

### Opção 1: Railway (Mais Fácil)

1. Criar conta em [railway.app](https://railway.app)
2. Conectar repositório GitHub
3. Configurar variáveis de ambiente
4. Deploy automático!

### Opção 2: Heroku

1. Criar conta em [heroku.com](https://heroku.com)
2. Instalar Heroku CLI
3. Fazer deploy via Git

### Opção 3: Vercel

1. Criar conta em [vercel.com](https://vercel.com)
2. Conectar repositório
3. Deploy automático

## 🔄 Atualizar Extensão

Após fazer deploy, atualizar `background.js`:

```javascript
// Substituir pela URL do seu backend
const BACKEND_BASE_URL = 'https://seu-backend-domain.com';
```

## 📋 Checklist de Segurança

- [ ] ✅ Chave da API Gemini configurada em variáveis de ambiente
- [ ] ✅ Nunca commitar chave real no código
- [ ] ✅ Usar HTTPS em produção
- [ ] ✅ Configurar CORS corretamente
- [ ] ✅ Implementar rate limiting
- [ ] ✅ Monitorizar logs de segurança

## 🆘 Precisa de Ajuda?

- 📖 Guia completo: `BACKEND-DEPLOYMENT-GUIDE.md`
- 🔐 Configuração segura: `SECURITY-SETUP.md`
- 🐛 Problemas: Criar issue no GitHub

## ⚡ Solução Rápida

Se quiser testar rapidamente sem instalar Node.js:

1. **Fazer deploy direto no Railway:**
   - Criar conta em railway.app
   - Conectar GitHub
   - Configurar GEMINI_API_KEY
   - Deploy automático

2. **Atualizar extensão:**
   - Alterar BACKEND_BASE_URL para URL do Railway
   - Testar extensão

3. **Resultado:**
   - ✅ Chave da API protegida
   - ✅ Backend funcionando
   - ✅ Extensão segura
