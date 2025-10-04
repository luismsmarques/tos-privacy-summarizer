# 🚀 Guia de Configuração e Deployment - Backend Seguro

## 📋 Visão Geral

Este guia explica como configurar e fazer deploy do backend seguro para a extensão ToS & Privacy Summarizer, mantendo a chave da API Gemini protegida.

## 🔧 Configuração Local

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar arquivo .env com as suas configurações
nano .env
```

**Configurações obrigatórias no `.env`:**

```env
# Chave da API Gemini (OBRIGATÓRIO)
GEMINI_API_KEY=sua_chave_gemini_aqui

# Chave secreta JWT (gerar uma chave forte)
JWT_SECRET=sua_chave_jwt_secreta_aqui

# Porta do servidor
PORT=3000
```

### 3. Executar Backend Local

```bash
# Modo desenvolvimento (com auto-reload)
npm run dev

# Modo produção
npm start
```

O backend estará disponível em: `http://localhost:3000`

### 4. Testar Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Verificar créditos (substituir USER_ID)
curl http://localhost:3000/api/credits/USER_ID
```

## 🌐 Deployment em Produção

### Opção 1: Railway (Recomendado)

1. **Criar conta no Railway:**
   - Aceder a [railway.app](https://railway.app)
   - Fazer login com GitHub

2. **Conectar repositório:**
   - Criar novo projeto
   - Conectar repositório GitHub
   - Selecionar pasta `backend`

3. **Configurar variáveis de ambiente:**
   ```env
   GEMINI_API_KEY=sua_chave_gemini_real
   JWT_SECRET=chave_jwt_forte_producao
   NODE_ENV=production
   PORT=3000
   ```

4. **Deploy automático:**
   - Railway faz deploy automático a cada push
   - URL será: `https://seu-projeto.railway.app`

### Opção 2: Heroku

1. **Instalar Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Criar aplicação:**
   ```bash
   heroku create tos-summarizer-backend
   ```

3. **Configurar variáveis:**
   ```bash
   heroku config:set GEMINI_API_KEY=sua_chave_gemini
   heroku config:set JWT_SECRET=sua_chave_jwt
   heroku config:set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

### Opção 3: VPS (DigitalOcean, AWS, etc.)

1. **Configurar servidor:**
   ```bash
   # Instalar Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Instalar PM2 para gestão de processos
   sudo npm install -g pm2
   ```

2. **Clonar e configurar:**
   ```bash
   git clone seu-repositorio
   cd backend
   npm install --production
   cp env.example .env
   # Editar .env com configurações de produção
   ```

3. **Executar com PM2:**
   ```bash
   pm2 start server.js --name "tos-backend"
   pm2 save
   pm2 startup
   ```

## 🔐 Configuração de Segurança

### 1. Chave da API Gemini

**Como obter:**
1. Aceder a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Criar nova chave da API
3. Copiar e guardar em local seguro

**⚠️ IMPORTANTE:**
- NUNCA commitar a chave real no código
- Usar sempre variáveis de ambiente
- Rotacionar chaves periodicamente

### 2. Configuração CORS

Para produção, atualizar CORS no `server.js`:

```javascript
app.use(cors({
    origin: [
        'chrome-extension://*', // Extensões Chrome
        'https://your-frontend-domain.com' // Seu frontend
    ],
    credentials: true
}));
```

### 3. Rate Limiting

Configurar limites apropriados no `.env`:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests por IP
```

## 💳 Integração Stripe (Opcional)

### 1. Criar conta Stripe

1. Aceder a [stripe.com](https://stripe.com)
2. Criar conta de desenvolvedor
3. Obter chaves de teste

### 2. Configurar variáveis

```env
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta
STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret
```

### 3. Configurar webhook

1. No dashboard Stripe, criar webhook
2. URL: `https://seu-backend.com/api/stripe/webhook`
3. Eventos: `checkout.session.completed`
4. Copiar webhook secret para `.env`

## 🔄 Atualizar Extensão

### 1. Atualizar URL do Backend

No arquivo `background.js`, alterar:

```javascript
// Para produção
const BACKEND_BASE_URL = 'https://seu-backend-domain.com';
```

### 2. Testar Conexão

```javascript
// Testar se o backend está acessível
fetch('https://seu-backend-domain.com/health')
  .then(response => response.json())
  .then(data => console.log('Backend OK:', data));
```

## 📊 Monitorização

### 1. Logs

O backend usa Morgan para logging. Em produção, configurar:

```javascript
// Para produção, usar formato combinado
app.use(morgan('combined'));
```

### 2. Health Check

Endpoint disponível: `GET /health`

Resposta:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 3. Métricas

Adicionar métricas com ferramentas como:
- Prometheus + Grafana
- DataDog
- New Relic

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro 500 - Chave API não configurada**
   - Verificar se `GEMINI_API_KEY` está definida
   - Confirmar que a chave é válida

2. **Erro CORS**
   - Verificar configuração CORS no servidor
   - Confirmar que a extensão está a usar HTTPS em produção

3. **Rate limit atingido**
   - Aumentar limites no `.env`
   - Implementar sistema de cache

4. **Webhook Stripe não funciona**
   - Verificar URL do webhook
   - Confirmar webhook secret

### Logs de Debug

```bash
# Ver logs em tempo real
pm2 logs tos-backend

# Ver logs específicos
tail -f logs/access.log
tail -f logs/error.log
```

## 📈 Escalabilidade

### Para Alto Volume

1. **Base de Dados:**
   - Migrar de Map para PostgreSQL/MongoDB
   - Implementar connection pooling

2. **Cache:**
   - Redis para cache de sessões
   - Cache de respostas da API Gemini

3. **Load Balancing:**
   - Nginx como proxy reverso
   - Múltiplas instâncias do backend

4. **CDN:**
   - CloudFlare para cache estático
   - Distribuição global

## 🔒 Checklist de Segurança

- [ ] Chave da API Gemini em variáveis de ambiente
- [ ] JWT secret forte e único
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] HTTPS em produção
- [ ] Logs de segurança configurados
- [ ] Backup da base de dados
- [ ] Monitorização de anomalias
- [ ] Rotação periódica de chaves
- [ ] Testes de penetração

## 📞 Suporte

Para problemas ou dúvidas:
- Criar issue no GitHub
- Contactar: support@tos-summarizer.com
- Documentação: [docs.tos-summarizer.com](https://docs.tos-summarizer.com)
