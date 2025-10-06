# Debug Tools - ToS Privacy Summarizer

Esta pasta contém ferramentas de debug e teste para o projeto ToS Privacy Summarizer.

## Scripts Disponíveis

### `test-database.js`

Script para testar a conexão com a base de dados e verificar dados reais.

#### O que faz:
- Testa a conexão com a base de dados Neon Postgres
- Verifica tabelas existentes
- Conta registros em cada tabela
- Mostra estatísticas de resumos, utilizadores e requests
- Testa queries de analytics
- Exibe os últimos resumos criados

#### Como usar:

1. **Configuração**:
   ```bash
   cd /Users/LuisMarques_1/ToS_DR/backend
   npm install pg dotenv
   ```

2. **Executar o script**:
   ```bash
   cd /Users/LuisMarques_1/ToS_DR/debug-tools
   node test-database.js
   ```

#### Requisitos:
- Node.js instalado
- Pacotes `pg` e `dotenv` instalados no backend
- Arquivo `.env` configurado com `ANALYTICS_URL` ou `DATABASE_URL`

#### Exemplo de saída:
```
🔍 Testando conexão com a base de dados...
✅ Conexão estabelecida com sucesso

📋 Verificando tabelas existentes...
Tabelas encontradas: ['users', 'summaries', 'requests', ...]

📊 Verificando dados na tabela summaries...
Total de resumos: 511
Resumos bem-sucedidos: 510
Resumos falhados: 1
Tempo médio (s): 2.9

👥 Verificando dados na tabela users...
Total de utilizadores: 28

📈 Testando query do analytics overview...
Overview Analytics:
- Total Users: 28
- Successful Summaries: 510
- Failed Summaries: 1
- Avg Duration (s): 2.9
```

#### Quando usar:
- Para verificar se os dados do dashboard estão corretos
- Para debug de problemas de conexão com a base de dados
- Para verificar estatísticas reais vs. dados exibidos
- Para validar queries de analytics
- Para monitorar crescimento de dados

### `test-api.js`

Script para testar os endpoints da API do dashboard.

#### O que faz:
- Testa o health check do servidor
- Verifica endpoints de analytics (overview, summaries, realtime)
- Testa autenticação admin
- Valida endpoints protegidos
- Compara dados da API com dados da base de dados

#### Como usar:

1. **Configuração**:
   ```bash
   # Certificar que o backend está rodando
   cd /Users/LuisMarques_1/ToS_DR/backend
   npm start
   ```

2. **Executar o script**:
   ```bash
   cd /Users/LuisMarques_1/ToS_DR/debug-tools
   node test-api.js
   ```

#### Requisitos:
- Backend rodando em http://localhost:3000
- Node.js instalado
- Arquivo `.env` configurado com credenciais admin

#### Exemplo de saída:
```
🔍 Testando API do dashboard...
🌐 URL base: http://localhost:3000

1️⃣ Testando health check...
✅ Health check OK: OK

2️⃣ Testando endpoint de overview...
✅ Overview API OK
📊 Dados retornados:
  - Total Users: 28
  - Successful Summaries: 510
  - Failed Summaries: 1
  - Avg Duration (ms): 2876.94
  - Today Requests: 0

3️⃣ Testando endpoint de summaries...
✅ Summaries API OK
📊 Dados retornados:
  - Total Summaries: 511
  - Successful: 510
  - Failed: 1
  - Avg Duration: 2876.94
```

#### Quando usar:
- Para verificar se a API está funcionando corretamente
- Para debug de problemas de endpoints
- Para validar dados retornados pela API
- Para testar autenticação e autorização
- Para comparar dados da API vs. base de dados

### `run-all-tests.js`

Script que executa todos os testes de debug automaticamente.

#### O que faz:
- Executa o teste de base de dados
- Executa o teste de API
- Mostra resultados consolidados
- Identifica problemas rapidamente

#### Como usar:

1. **Executar todos os testes**:
   ```bash
   cd /Users/LuisMarques_1/ToS_DR/debug-tools
   node run-all-tests.js
   ```

2. **Ou usar como executável**:
   ```bash
   cd /Users/LuisMarques_1/ToS_DR/debug-tools
   ./run-all-tests.js
   ```

#### Requisitos:
- Backend rodando em http://localhost:3000
- Node.js instalado
- Dependências instaladas no backend
- Arquivo `.env` configurado

#### Exemplo de saída:
```
🚀 Executando todos os testes de debug...
📅 Data/Hora: 06/10/2025, 01:00:00
============================================================

1️⃣ TESTE DE BASE DE DADOS
----------------------------------------
✅ Teste de base de dados concluído
🔍 Testando conexão com a base de dados...
✅ Conexão estabelecida com sucesso
...

2️⃣ TESTE DE API
----------------------------------------
✅ Teste de API concluído
🔍 Testando API do dashboard...
✅ Health check OK: OK
...
```

#### Quando usar:
- Para verificação completa do sistema
- Para debug rápido de problemas
- Para validação após mudanças
- Para monitoramento regular
- Para documentação de problemas

#### Troubleshooting:

**Erro de conexão**:
```
❌ Erro no teste: AggregateError [ECONNREFUSED]
```
- Verificar se `ANALYTICS_URL` está configurada no `.env`
- Verificar se a base de dados Neon está ativa
- Verificar conectividade de rede

**Erro de módulo**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'pg'
```
- Executar `npm install pg dotenv` no diretório backend
- Verificar se está executando do diretório correto

**Dados inconsistentes**:
- Comparar dados do script com dados do dashboard
- Verificar se há problemas de cache no frontend
- Verificar se as queries de analytics estão corretas

## Estrutura da Base de Dados

### Tabelas principais:
- `users`: Utilizadores registrados
- `summaries`: Resumos gerados
- `requests`: Logs de requests da API
- `credits_history`: Histórico de créditos
- `performance_hourly`: Métricas de performance

### Views de analytics:
- `analytics_overview`: Visão geral das estatísticas
- `analytics_users`: Estatísticas de utilizadores
- `analytics_summaries`: Estatísticas de resumos

## Configuração do Ambiente

### Variáveis de ambiente necessárias:
```env
# Base de dados
DATABASE_URL=postgresql://user:pass@host:port/database?sslmode=require
ANALYTICS_URL=postgresql://user:pass@host:port/database?sslmode=require

# Autenticação admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=your-secret-key
```

### Dependências:
```json
{
  "pg": "^8.x",
  "dotenv": "^16.x"
}
```

## Casos de Uso Comuns

### 1. Verificar dados do dashboard
Quando o dashboard mostra dados incorretos, execute o script para verificar os dados reais na base de dados.

### 2. Debug de performance
Use o script para verificar se há problemas de performance nas queries de analytics.

### 3. Validação de migrações
Após executar migrações de base de dados, use o script para verificar se as mudanças foram aplicadas corretamente.

### 4. Monitoramento de crescimento
Execute periodicamente para monitorar o crescimento de dados e identificar tendências.

## Contribuição

Para adicionar novos scripts de debug:

1. Crie o script na pasta `debug-tools/`
2. Adicione documentação no README
3. Inclua exemplos de uso
4. Documente requisitos e dependências
5. Adicione casos de troubleshooting

## Notas Importantes

- ⚠️ **Nunca** execute scripts de debug em produção sem autorização
- 🔒 Mantenha as credenciais de base de dados seguras
- 📊 Use os dados apenas para debug e desenvolvimento
- 🧹 Limpe dados de teste quando necessário
