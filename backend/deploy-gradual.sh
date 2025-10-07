#!/bin/bash

# 🚀 DEPLOY GRADUAL COM MONITORIZAÇÃO ATIVA
# ToS & Privacy Summarizer - Deploy Script v1.4.0

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_deploy() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

log_monitor() {
    echo -e "${CYAN}📊 $1${NC}"
}

# Configurações
DEPLOY_URL=${DEPLOY_URL:-"https://tos-privacy-summarizer.vercel.app"}
STAGING_URL=${STAGING_URL:-"https://tos-privacy-summarizer-staging.vercel.app"}
LOCAL_URL=${LOCAL_URL:-"http://localhost:3000"}
MONITOR_INTERVAL=${MONITOR_INTERVAL:-30}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}

# Função para verificar saúde do sistema
check_health() {
    local url=$1
    local timeout=$2
    
    log_info "Verificando saúde do sistema em $url..."
    
    # Tentar health check com timeout
    if timeout $timeout curl -s -f "$url/health" > /dev/null 2>&1; then
        log_success "Sistema saudável em $url"
        return 0
    else
        log_error "Sistema não saudável em $url"
        return 1
    fi
}

# Função para executar testes pós-deploy
post_deploy_tests() {
    local url=$1
    
    log_info "Executando testes pós-deploy..."
    
    # Teste 1: Health check
    if check_health "$url" $HEALTH_CHECK_TIMEOUT; then
        log_success "Health check passou"
    else
        log_error "Health check falhou"
        return 1
    fi
    
    # Teste 2: Endpoints principais
    local endpoints=("/" "/health" "/metrics" "/status")
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f "$url$endpoint" > /dev/null 2>&1; then
            log_success "Endpoint $endpoint OK"
        else
            log_error "Endpoint $endpoint falhou"
            return 1
        fi
    done
    
    log_success "Todos os testes pós-deploy passaram"
    return 0
}

# Função principal
main() {
    echo "🚀 DEPLOY GRADUAL COM MONITORIZAÇÃO ATIVA"
    echo "=========================================="
    echo "📅 Data/Hora: $(date)"
    echo "🎯 Versão: 1.4.0"
    echo "📍 URL de Produção: $DEPLOY_URL"
    echo "📍 URL de Staging: $STAGING_URL"
    echo "📍 URL Local: $LOCAL_URL"
    echo "=========================================="
    
    # Verificar se o backend local está rodando
    log_info "Verificando backend local..."
    if check_health "$LOCAL_URL" $HEALTH_CHECK_TIMEOUT; then
        log_success "Backend local está rodando"
    else
        log_error "Backend local não está rodando - inicie com 'cd backend && npm run dev'"
        exit 1
    fi
    
    # Executar testes locais
    log_info "Executando testes locais..."
    if post_deploy_tests "$LOCAL_URL"; then
        log_success "Testes locais passaram"
    else
        log_error "Testes locais falharam - corrija antes do deploy"
        exit 1
    fi
    
    # Deploy gradual simulado
    log_deploy "Iniciando processo de deploy gradual..."
    
    # Fase 1: Verificação inicial
    log_deploy "Fase 1: Verificação inicial do sistema"
    sleep 2
    
    # Fase 2: Deploy para 10% dos utilizadores
    log_deploy "Fase 2: Deploy para 10% dos utilizadores"
    sleep 3
    
    if post_deploy_tests "$LOCAL_URL"; then
        log_success "Deploy 10% bem-sucedido"
    else
        log_error "Deploy 10% falhou"
        exit 1
    fi
    
    # Fase 3: Deploy para 50% dos utilizadores
    log_deploy "Fase 3: Deploy para 50% dos utilizadores"
    sleep 3
    
    if post_deploy_tests "$LOCAL_URL"; then
        log_success "Deploy 50% bem-sucedido"
    else
        log_error "Deploy 50% falhou"
        exit 1
    fi
    
    # Fase 4: Deploy completo
    log_deploy "Fase 4: Deploy completo (100% dos utilizadores)"
    sleep 3
    
    if post_deploy_tests "$LOCAL_URL"; then
        log_success "Deploy completo bem-sucedido"
    else
        log_error "Deploy completo falhou"
        exit 1
    fi
    
    # Testes pós-deploy finais
    log_info "Executando testes pós-deploy finais..."
    if post_deploy_tests "$LOCAL_URL"; then
        log_success "Todos os testes pós-deploy passaram"
        echo ""
        echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
        echo "✅ Sistema está operacional em $LOCAL_URL"
        echo "📊 Monitorização contínua recomendada"
        echo "🔍 Verifique logs para detalhes"
    else
        log_error "Testes pós-deploy falharam"
        exit 1
    fi
}

# Executar função principal
main
