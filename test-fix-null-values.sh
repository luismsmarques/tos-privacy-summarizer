#!/bin/bash

# Script de teste para verificar se o problema de URL e Summary null foi resolvido
# Execute este script para testar a funcionalidade

echo "🧪 Testando correção do problema de URL e Summary null..."
echo ""

# URL base do backend
BACKEND_URL="https://tos-privacy-summarizer.vercel.app"

echo "1. Testando conexão à base de dados..."
curl -s -X GET "$BACKEND_URL/api/analytics/debug" | jq '.success'

echo ""
echo "2. Executando migração completa..."
curl -s -X POST "$BACKEND_URL/api/analytics/migrate" | jq '.success'

echo ""
echo "3. Testando inserção de resumo de teste..."
curl -s -X POST "$BACKEND_URL/api/analytics/test-db-connection" | jq '.success'

echo ""
echo "4. Verificando estrutura da tabela summaries..."
curl -s -X GET "$BACKEND_URL/api/analytics/tables" | jq '.tables.tests.summaries'

echo ""
echo "5. Testando endpoint de histórico de resumos..."
curl -s -X GET "$BACKEND_URL/api/analytics/summaries-history?limit=5" | jq '.data[0] | {url, summary, document_type}'

echo ""
echo "✅ Teste concluído!"
echo ""
echo "Se todos os testes retornaram 'true' e os dados mostram URLs e summaries válidos,"
echo "o problema foi resolvido com sucesso!"
