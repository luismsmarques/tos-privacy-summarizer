# 🚀 Guia de Configuração Supabase

## 📋 Passos para Configurar Supabase

### 1. **Criar Projeto Supabase**
1. Aceder a: https://supabase.com
2. Criar conta gratuita
3. Clicar em "New Project"
4. Escolher organização
5. Dar nome ao projeto: `tos-privacy-summarizer`
6. Definir password forte para a base de dados
7. Escolher região mais próxima (ex: Europe West)
8. Clicar "Create new project"

### 2. **Obter Credenciais**
1. No dashboard do projeto, ir para **Settings** → **API**
2. Copiar:
   - **Project URL** (ex: `https://xyz.supabase.co`)
   - **anon public** key (chave longa)

### 3. **Executar Schema SQL**
1. No dashboard, ir para **SQL Editor**
2. Clicar "New query"
3. Copiar todo o conteúdo de `supabase-schema.sql`
4. Colar no editor
5. Clicar "Run" para executar

### 4. **Configurar Variáveis no Vercel**
1. Ir para o dashboard do Vercel
2. Selecionar projeto `tos-privacy-summarizer`
3. Ir para **Settings** → **Environment Variables**
4. Adicionar:
   ```
   SUPABASE_URL = https://xyz.supabase.co
   SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Clicar "Save"

### 5. **Testar Configuração**
Após deploy, testar:
```bash
# Testar API de analytics
curl "https://tos-privacy-summarizer.vercel.app/api/analytics?endpoint=overview"

# Testar API de logging
curl -X POST "https://tos-privacy-summarizer.vercel.app/api/log-analytics" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","url":"https://example.com","documentType":"terms_of_service","textLength":1000,"responseTime":2.5,"success":true}'
```

## 🔍 Verificar Dados Reais

### Dashboard Analytics
- Aceder: `https://tos-privacy-summarizer.vercel.app/dashboard`
- Os dados agora são **reais** da base de dados Supabase

### Supabase Dashboard
- Ver dados em tempo real em: **Table Editor**
- Tabelas: `users`, `summaries`, `analytics`

## 📊 Estrutura de Dados

### Tabela `users`
- `id`: UUID único
- `device_id`: ID único do dispositivo
- `created_at`: Data de criação
- `last_active`: Última atividade
- `total_summaries`: Total de resumos feitos
- `credits_used`: Créditos utilizados

### Tabela `summaries`
- `id`: UUID único
- `user_id`: Referência ao utilizador
- `url`: URL do documento processado
- `document_type`: Tipo (terms_of_service, privacy_policy, other)
- `text_length`: Tamanho do texto
- `response_time`: Tempo de resposta em segundos
- `success`: Se foi bem-sucedido
- `error_message`: Mensagem de erro (se houver)
- `created_at`: Data de criação

### Tabela `analytics`
- `id`: UUID único
- `date`: Data (única por dia)
- `total_users`: Total de utilizadores
- `total_summaries`: Total de resumos
- `avg_response_time`: Tempo médio de resposta
- `uptime`: Uptime do sistema
- `requests_per_minute`: Pedidos por minuto
- `error_rate`: Taxa de erro

## 🚨 Troubleshooting

### Erro: "Failed to fetch analytics data"
- Verificar se as variáveis de ambiente estão configuradas no Vercel
- Verificar se o schema SQL foi executado corretamente
- Verificar logs do Vercel para erros específicos

### Erro: "Analytics logged successfully" mas dados não aparecem
- Verificar se as políticas RLS estão corretas
- Verificar se os triggers estão funcionando
- Verificar se há dados na tabela `summaries`

### Dashboard mostra dados vazios
- Verificar se há dados nas tabelas
- Verificar se a API está retornando dados corretos
- Verificar console do browser para erros JavaScript

## ✅ Checklist Final

- [ ] Projeto Supabase criado
- [ ] Credenciais obtidas
- [ ] Schema SQL executado
- [ ] Variáveis configuradas no Vercel
- [ ] Deploy feito
- [ ] APIs testadas
- [ ] Dashboard funcionando com dados reais
- [ ] Logging funcionando na extensão
