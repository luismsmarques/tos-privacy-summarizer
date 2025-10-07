#!/bin/bash

# 🛠️ SCRIPT DE CONFIGURAÇÃO AUTOMÁTICA DO AMBIENTE
# ToS & Privacy Summarizer - Setup de Desenvolvimento

set -e  # Parar em caso de erro

echo "🚀 Configurando ambiente de desenvolvimento..."
echo "================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar Node.js
log_info "Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js encontrado: $NODE_VERSION"
    
    # Verificar versão mínima (18+)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        log_error "Node.js 18+ é necessário. Versão atual: $NODE_VERSION"
        exit 1
    fi
else
    log_error "Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

# Verificar NPM
log_info "Verificando NPM..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "NPM encontrado: $NPM_VERSION"
else
    log_error "NPM não encontrado."
    exit 1
fi

# Instalar dependências do backend
log_info "Instalando dependências do backend..."
cd backend
if [ -f "package.json" ]; then
    npm install
    log_success "Dependências do backend instaladas"
else
    log_error "package.json não encontrado no backend"
    exit 1
fi

# Instalar dependências das ferramentas de debug
log_info "Instalando ferramentas de debug..."
cd ../debug-tools
if [ -f "package.json" ]; then
    npm install
    log_success "Ferramentas de debug instaladas"
else
    log_warning "Ferramentas de debug não encontradas"
fi

# Voltar ao diretório raiz
cd ..

# Verificar arquivo .env
log_info "Verificando configuração de ambiente..."
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/env.example" ]; then
        log_warning "Arquivo .env não encontrado. Copiando env.example..."
        cp backend/env.example backend/.env
        log_success "Arquivo .env criado. Configure suas chaves API!"
    else
        log_error "Arquivo env.example não encontrado"
        exit 1
    fi
else
    log_success "Arquivo .env encontrado"
fi

# Verificar estrutura de diretórios
log_info "Verificando estrutura do projeto..."
REQUIRED_DIRS=("backend" "dashboard" "debug-tools" "docs" "locales" "screenshots")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log_success "Diretório $dir encontrado"
    else
        log_warning "Diretório $dir não encontrado"
    fi
done

# Verificar arquivos essenciais
log_info "Verificando arquivos essenciais..."
REQUIRED_FILES=("manifest.json" "popup.html" "background.js" "content.js")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "Arquivo $file encontrado"
    else
        log_error "Arquivo essencial $file não encontrado"
        exit 1
    fi
done

# Criar diretórios de logs se não existirem
log_info "Criando diretórios de logs..."
mkdir -p logs
log_success "Diretório de logs criado"

# Verificar permissões
log_info "Verificando permissões..."
if [ -w "." ]; then
    log_success "Permissões de escrita OK"
else
    log_error "Sem permissões de escrita no diretório atual"
    exit 1
fi

# Teste rápido do backend
log_info "Testando backend..."
cd backend
if npm run start --dry-run &> /dev/null || node -c server.js &> /dev/null; then
    log_success "Backend configurado corretamente"
else
    log_warning "Possíveis problemas no backend"
fi
cd ..

# Resumo final
echo ""
echo "================================================"
log_success "CONFIGURAÇÃO CONCLUÍDA!"
echo "================================================"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configure suas chaves API no arquivo backend/.env"
echo "2. Execute 'cd backend && npm run dev' para iniciar o servidor"
echo "3. Carregue a extensão no Chrome (Developer Mode)"
echo "4. Execute testes com 'cd debug-tools && npm test'"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "• Iniciar backend: cd backend && npm run dev"
echo "• Executar testes: cd debug-tools && npm test"
echo "• Ver logs: tail -f logs/app.log"
echo "• Deploy: vercel --prod"
echo ""
log_info "Ambiente pronto para desenvolvimento! 🚀"
