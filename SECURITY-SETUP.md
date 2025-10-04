# 🔐 Configuração Segura - ToS Summarizer Backend

## ⚠️ IMPORTANTE: Segurança da Chave da API

**NUNCA coloque a chave real da API Gemini no código da extensão!**

### ❌ O que NÃO fazer:
```javascript
// PERIGOSO - Chave exposta no código
const SHARED_API_KEY = 'AIzaSyBvQ4v8Q9wX2yZ3aBcD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5';
```

### ✅ O que fazer:
```javascript
// SEGURO - Usar backend com chave protegida
const BACKEND_BASE_URL = 'https://your-backend-domain.com';
```

## 🚀 Configuração Rápida

### 1. Configurar Backend Local

```bash
# Instalar dependências
cd backend
npm install

# Configurar ambiente
cp env.example .env
# Editar .env com a sua chave Gemini real
```

### 2. Configurar Chave da API

No arquivo `.env`:
```env
GEMINI_API_KEY=sua_chave_gemini_real_aqui
```

### 3. Executar Backend

```bash
npm run dev
```

### 4. Testar

```bash
curl http://localhost:3000/health
```

## 🌐 Deploy para Produção

### Opção 1: Railway (Mais Fácil)

1. Criar conta em [railway.app](https://railway.app)
2. Conectar repositório GitHub
3. Configurar variáveis de ambiente:
   - `GEMINI_API_KEY`: sua chave real
   - `NODE_ENV`: production
4. Deploy automático!

### Opção 2: Heroku

```bash
heroku create tos-summarizer-backend
heroku config:set GEMINI_API_KEY=sua_chave_real
git push heroku main
```

## 🔄 Atualizar Extensão

No arquivo `background.js`, alterar:

```javascript
// Para produção
const BACKEND_BASE_URL = 'https://seu-backend-domain.com';
```

## 📊 Benefícios da Solução Segura

- ✅ **Chave Protegida**: Nunca exposta no código
- ✅ **Controlo Total**: Monitorização e rate limiting  
- ✅ **Gestão de Créditos**: Sistema robusto de pagamentos
- ✅ **Escalabilidade**: Suporta milhares de utilizadores
- ✅ **Conformidade**: Respeita termos de serviço

## 🆘 Precisa de Ajuda?

- 📖 Guia completo: `BACKEND-DEPLOYMENT-GUIDE.md`
- 🐛 Problemas: Criar issue no GitHub
- 💬 Suporte: support@tos-summarizer.com
