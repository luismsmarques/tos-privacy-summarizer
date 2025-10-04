#!/bin/bash

# Script de Teste - Backend Seguro ToS Summarizer
# ================================================

echo "🔐 Testando Backend Seguro - ToS Summarizer"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cores
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Verificar se estamos no diretório correto
if [ ! -d "backend" ]; then
    print_status "error" "Diretório 'backend' não encontrado!"
    print_status "info" "Execute este script a partir da raiz do projeto"
    exit 1
fi

cd backend

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    print_status "error" "package.json não encontrado!"
    exit 1
fi

print_status "info" "Verificando estrutura do backend..."

# Verificar arquivos essenciais
files=("server.js" "routes/gemini.js" "routes/users.js" "routes/credits.js" "routes/stripe.js" "env.example")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        print_status "success" "Arquivo $file encontrado"
    else
        print_status "error" "Arquivo $file não encontrado"
        exit 1
    fi
done

# Verificar se .env existe
if [ ! -f ".env" ]; then
    print_status "warning" "Arquivo .env não encontrado"
    print_status "info" "Copiando env.example para .env..."
    cp env.example .env
    print_status "warning" "IMPORTANTE: Configure GEMINI_API_KEY no arquivo .env"
else
    print_status "success" "Arquivo .env encontrado"
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    print_status "warning" "Dependências não instaladas"
    print_status "info" "Instalando dependências..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "success" "Dependências instaladas com sucesso"
    else
        print_status "error" "Erro ao instalar dependências"
        exit 1
    fi
else
    print_status "success" "Dependências já instaladas"
fi

# Verificar configuração da chave da API
if grep -q "your_gemini_api_key_here" .env; then
    print_status "warning" "Chave da API Gemini não configurada!"
    print_status "info" "Configure GEMINI_API_KEY no arquivo .env com a sua chave real"
    print_status "info" "Obtenha a chave em: https://makersuite.google.com/app/apikey"
else
    print_status "success" "Chave da API Gemini configurada"
fi

# Testar se o servidor inicia
print_status "info" "Testando inicialização do servidor..."

# Tentar iniciar o servidor em background
timeout 10s npm start > /dev/null 2>&1 &
SERVER_PID=$!

# Aguardar um pouco para o servidor inicializar
sleep 3

# Verificar se o processo ainda está rodando
if kill -0 $SERVER_PID 2>/dev/null; then
    print_status "success" "Servidor iniciou com sucesso"
    
    # Testar endpoint de health
    print_status "info" "Testando endpoint de health..."
    if curl -s http://localhost:3000/health > /dev/null; then
        print_status "success" "Endpoint /health respondeu"
    else
        print_status "warning" "Endpoint /health não respondeu (servidor pode estar a inicializar)"
    fi
    
    # Parar o servidor
    kill $SERVER_PID 2>/dev/null
    print_status "info" "Servidor parado"
else
    print_status "error" "Erro ao iniciar servidor"
    print_status "info" "Verifique os logs: npm start"
fi

# Verificar configuração da extensão
print_status "info" "Verificando configuração da extensão..."

cd ..

if grep -q "localhost:3000" background.js; then
    print_status "success" "Extensão configurada para usar backend local"
elif grep -q "your-backend-domain.com" background.js; then
    print_status "warning" "Extensão configurada para usar backend de produção"
    print_status "info" "Atualize BACKEND_BASE_URL em background.js com a URL real"
else
    print_status "success" "Extensão configurada para usar backend"
fi

# Resumo final
echo ""
echo "📋 RESUMO DA CONFIGURAÇÃO"
echo "========================"

if [ -f "backend/.env" ] && ! grep -q "your_gemini_api_key_here" backend/.env; then
    print_status "success" "Backend configurado e pronto para uso"
    echo ""
    print_status "info" "Para iniciar o backend:"
    print_status "info" "  cd backend && npm run dev"
    echo ""
    print_status "info" "Para fazer deploy:"
    print_status "info" "  Consulte BACKEND-DEPLOYMENT-GUIDE.md"
else
    print_status "warning" "Configuração incompleta"
    echo ""
    print_status "info" "Próximos passos:"
    print_status "info" "  1. Configure GEMINI_API_KEY em backend/.env"
    print_status "info" "  2. Execute: cd backend && npm run dev"
    print_status "info" "  3. Teste a extensão"
fi

echo ""
print_status "info" "Documentação completa:"
print_status "info" "  - BACKEND-DEPLOYMENT-GUIDE.md"
print_status "info" "  - SECURITY-SETUP.md"
