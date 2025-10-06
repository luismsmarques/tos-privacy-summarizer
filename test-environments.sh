#!/bin/bash

# Script para testar ambos os ambientes (Local e Vercel)
# ToS Privacy Summarizer - Environment Test Script

echo "🧪 Testando ambientes do ToS Privacy Summarizer..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local name=$2
    local expected_status=$3
    
    echo -n "🔍 Testando $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHOU (Status: $response)${NC}"
        return 1
    fi
}

# Função para testar login
test_login() {
    local base_url=$1
    local name=$2
    
    echo -n "🔐 Testando login $name... "
    
    response=$(curl -s -X POST "$base_url/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}')
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHOU${NC}"
        return 1
    fi
}

echo "📊 TESTE DO AMBIENTE LOCAL"
echo "=========================="

# Testar ambiente local
local_ok=true

if ! test_endpoint "http://localhost:3000/health" "Health Check Local" "200"; then
    local_ok=false
fi

if ! test_login "http://localhost:3000" "Local"; then
    local_ok=false
fi

if ! test_endpoint "http://localhost:3000/api/analytics/debug" "Debug Local" "200"; then
    local_ok=false
fi

echo ""
echo "🌐 TESTE DO AMBIENTE VERCEL"
echo "==========================="

# Testar ambiente Vercel
vercel_ok=true

if ! test_endpoint "https://tos-privacy-summarizer.vercel.app/health" "Health Check Vercel" "200"; then
    vercel_ok=false
fi

if ! test_login "https://tos-privacy-summarizer.vercel.app" "Vercel"; then
    vercel_ok=false
fi

if ! test_endpoint "https://tos-privacy-summarizer.vercel.app/api/analytics/debug" "Debug Vercel" "200"; then
    vercel_ok=false
fi

echo ""
echo "📋 RESUMO DOS TESTES"
echo "===================="

if [ "$local_ok" = true ]; then
    echo -e "🏠 Local: ${GREEN}✅ FUNCIONANDO${NC}"
    echo "   URL: http://localhost:3000/dashboard/"
else
    echo -e "🏠 Local: ${RED}❌ COM PROBLEMAS${NC}"
    echo "   Execute: cd backend && source config-dev.sh && npm start"
fi

if [ "$vercel_ok" = true ]; then
    echo -e "☁️  Vercel: ${GREEN}✅ FUNCIONANDO${NC}"
    echo "   URL: https://tos-privacy-summarizer.vercel.app/dashboard/"
else
    echo -e "☁️  Vercel: ${RED}❌ COM PROBLEMAS${NC}"
    echo "   Verifique o deploy na Vercel"
fi

echo ""
echo "🔑 Credenciais para ambos: admin / admin123"
echo ""

if [ "$local_ok" = true ] && [ "$vercel_ok" = true ]; then
    echo -e "${GREEN}🎉 AMBOS OS AMBIENTES ESTÃO FUNCIONANDO!${NC}"
elif [ "$local_ok" = true ] || [ "$vercel_ok" = true ]; then
    echo -e "${YELLOW}⚠️  APENAS UM AMBIENTE ESTÁ FUNCIONANDO${NC}"
else
    echo -e "${RED}❌ NENHUM AMBIENTE ESTÁ FUNCIONANDO${NC}"
fi
