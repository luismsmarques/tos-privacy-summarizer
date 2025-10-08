#!/bin/bash

# Script para gestão de ambientes - ToS Privacy Summarizer
# Environment Management Script

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Gestão de Ambientes - ToS Privacy Summarizer${NC}"
echo ""

# Função para mostrar status atual
show_status() {
    echo -e "${YELLOW}📊 Status Atual:${NC}"
    echo "Branch: $(git branch --show-current)"
    echo "Ambiente: $NODE_ENV"
    echo "Porta: $PORT"
    echo ""
}

# Função para ambiente de desenvolvimento
setup_development() {
    echo -e "${GREEN}🔧 Configurando Ambiente de Desenvolvimento...${NC}"
    
    # Mudar para branch de desenvolvimento
    git checkout development
    
    # Configurar variáveis de ambiente
    cd backend
    source config-dev.sh
    
    echo -e "${GREEN}✅ Ambiente de desenvolvimento configurado!${NC}"
    echo "URL: http://localhost:3000/dashboard/"
    echo "Credenciais: admin / [configurada no ambiente]"
    echo ""
    echo "Para iniciar o servidor:"
    echo "  ./start-server.sh"
    echo "  ou"
    echo "  npm start"
}

# Função para ambiente de produção
setup_production() {
    echo -e "${BLUE}☁️  Configurando Ambiente de Produção...${NC}"
    
    # Mudar para branch principal
    git checkout main
    
    echo -e "${BLUE}✅ Ambiente de produção configurado!${NC}"
    echo "URL: https://tos-privacy-summarizer.vercel.app/dashboard/"
    echo "Credenciais: admin / [configurada no ambiente]"
    echo ""
    echo "Deploy automático via Vercel quando fizer push para main"
}

# Função para testar ambientes
test_environments() {
    echo -e "${YELLOW}🧪 Testando Ambientes...${NC}"
    ./test-environments.sh
}

# Função para mostrar ajuda
show_help() {
    echo -e "${YELLOW}📋 Comandos Disponíveis:${NC}"
    echo ""
    echo "  dev, development    - Configurar ambiente de desenvolvimento"
    echo "  prod, production     - Configurar ambiente de produção"
    echo "  test                 - Testar ambos os ambientes"
    echo "  status               - Mostrar status atual"
    echo "  help                 - Mostrar esta ajuda"
    echo ""
    echo -e "${YELLOW}📖 Exemplos:${NC}"
    echo "  ./manage-environments.sh dev"
    echo "  ./manage-environments.sh production"
    echo "  ./manage-environments.sh test"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ] && [ ! -f "backend/package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Mostrar status inicial
show_status

# Processar argumentos
case "${1:-help}" in
    "dev"|"development")
        setup_development
        ;;
    "prod"|"production")
        setup_production
        ;;
    "test")
        test_environments
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac
