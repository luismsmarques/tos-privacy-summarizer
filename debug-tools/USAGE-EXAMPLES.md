# Exemplos de Uso - Debug Tools
# ToS Privacy Summarizer

## Cenários Comuns

### 1. Verificar dados do dashboard
Quando o dashboard mostra dados incorretos:

```bash
# Executar teste completo
cd /Users/LuisMarques_1/ToS_DR/debug-tools
node run-all-tests.js

# Ou executar testes individuais
node test-database.js
node test-api.js
```

### 2. Debug de problemas de conexão
Quando há problemas de conectividade:

```bash
# Testar apenas a base de dados
node test-database.js

# Verificar logs de erro
# Procurar por: ECONNREFUSED, ENOTFOUND, etc.
```

### 3. Validação após mudanças
Após fazer mudanças no código:

```bash
# Executar todos os testes
./run-all-tests.js

# Verificar se os dados estão consistentes
# Comparar resultados dos dois testes
```

### 4. Monitoramento regular
Para verificar o estado do sistema:

```bash
# Executar teste rápido
node test-database.js | grep "RESUMO FINAL"

# Verificar crescimento de dados
node test-database.js | grep "Total de"
```

## Interpretação de Resultados

### Dados Corretos (Exemplo)
```
📊 RESUMO FINAL:
- Total de utilizadores: 28
- Total de resumos: 511
- Resumos bem-sucedidos: 510
- Resumos falhados: 1
- Taxa de sucesso: 99.8%
- Tempo médio: 2.9s
- Requests hoje: 0
```

### Problemas Comuns

#### Base de dados vazia
```
Total de resumos: 0
Total de utilizadores: 0
```
**Solução**: Verificar se há dados na base de dados ou executar seed.

#### API não responde
```
❌ Overview API falhou: Token de acesso necessário
```
**Solução**: Verificar se o middleware de autenticação foi removido.

#### Dados inconsistentes
```
Base de dados: 511 resumos
API: 100 resumos
```
**Solução**: Verificar queries da API e cache do frontend.

## Troubleshooting Rápido

### Erro: ECONNREFUSED
```bash
# Verificar se o backend está rodando
curl http://localhost:3000/health

# Se não estiver, iniciar
cd ../backend && npm start
```

### Erro: Cannot find package 'pg'
```bash
# Instalar dependências
cd ../backend && npm install pg dotenv
```

### Erro: ANALYTICS_URL não configurada
```bash
# Verificar arquivo .env
cat ../backend/.env | grep ANALYTICS_URL

# Se não existir, copiar do exemplo
cp ../backend/env.example ../backend/.env
```

## Comandos Úteis

### Verificar status do sistema
```bash
# Health check rápido
curl -s http://localhost:3000/health | jq

# Dados de overview
curl -s http://localhost:3000/api/analytics/overview | jq
```

### Comparar dados
```bash
# Executar teste e salvar resultado
node test-database.js > debug-output.txt

# Comparar com resultado anterior
diff debug-output.txt debug-output-previous.txt
```

### Monitorar crescimento
```bash
# Executar teste e extrair apenas números
node test-database.js | grep -E "(Total de|Resumos|Utilizadores)" > growth-log.txt
```

## Integração com CI/CD

### Script de validação
```bash
#!/bin/bash
# validate-system.sh

cd /Users/LuisMarques_1/ToS_DR/debug-tools

# Executar testes
node run-all-tests.js

# Verificar se não há erros críticos
if grep -q "❌" debug-output.txt; then
    echo "Sistema com problemas detectados"
    exit 1
else
    echo "Sistema funcionando corretamente"
    exit 0
fi
```

### Cron job para monitoramento
```bash
# Adicionar ao crontab
# Executar a cada hora
0 * * * * cd /Users/LuisMarques_1/ToS_DR/debug-tools && node test-database.js >> system-monitor.log 2>&1
```
