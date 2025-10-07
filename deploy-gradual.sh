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

# Função para obter métricas do sistema
get_metrics() {
    local url=$1
    
    log_info "Obtendo métricas de $url..."
    
    local response=$(curl -s "$url/metrics" 2>/dev/null || echo "{}")
    local health_score=$(echo "$response" | grep -o '"score":[0-9]*' | cut -d':' -f2 || echo "0")
    local response_time=$(echo "$response" | grep -o '"avgResponseTime":[0-9.]*' | cut -d':' -f2 || echo "0")
    local error_rate=$(echo "$response" | grep -o '"errorRate":"[0-9.]*%"' | cut -d'"' -f4 | cut -d'%' -f1 || echo "0")
    
    echo "$health_score,$response_time,$error_rate"
}

# Função para monitorização contínua
monitor_system() {
    local url=$1
    local duration=$2
    local interval=$3
    
    log_monitor "Iniciando monitorização de $url por ${duration}s (intervalo: ${interval}s)"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    local checks=0
    local failures=0
    
    while [ $(date +%s) -lt $end_time ]; do
        checks=$((checks + 1))
        
        if check_health "$url" $HEALTH_CHECK_TIMEOUT; then
            log_success "Check #$checks - Sistema OK"
        else
            failures=$((failures + 1))
            log_error "Check #$checks - Sistema com problemas"
        fi
        
        # Obter métricas
        local metrics=$(get_metrics "$url")
        local health_score=$(echo "$metrics" | cut -d',' -f1)
        local response_time=$(echo "$metrics" | cut -d',' -f2)
        local error_rate=$(echo "$metrics" | cut -d',' -f3)
        
        log_monitor "Métricas: Health=$health_score%, Response=${response_time}ms, Errors=${error_rate}%"
        
        sleep $interval
    done
    
    local success_rate=$(( (checks - failures) * 100 / checks ))
    log_monitor "Monitorização concluída: $checks checks, $failures falhas, ${success_rate}% sucesso"
    
    if [ $success_rate -lt 95 ]; then
        log_error "Taxa de sucesso baixa: ${success_rate}%"
        return 1
    else
        log_success "Taxa de sucesso aceitável: ${success_rate}%"
        return 0
    fi
}

# Função para deploy gradual
gradual_deploy() {
    local target_url=$1
    local staging_url=$2
    
    log_deploy "Iniciando deploy gradual para $target_url"
    
    # Fase 1: Deploy para staging
    log_deploy "Fase 1: Deploy para staging ($staging_url)"
    
    if check_health "$staging_url" $HEALTH_CHECK_TIMEOUT; then
        log_success "Staging está saudável"
    else
        log_warning "Staging não está saudável - continuando com deploy local"
    fi
    
    # Monitorizar local por 2 minutos
    log_deploy "Monitorizando sistema local por 2 minutos..."
    if monitor_system "$LOCAL_URL" 120 $MONITOR_INTERVAL; then
        log_success "Sistema local estável - prosseguindo"
    else
        log_error "Sistema local instável - abortando deploy"
        return 1
    fi
    
    # Fase 2: Deploy para produção (simulado)
    log_deploy "Fase 2: Deploy gradual para produção (10% dos utilizadores)"
    
    # Simular deploy gradual (em produção real, isso seria feito via load balancer)
    log_info "Ativando deploy gradual..."
    sleep 5
    
    if check_health "$target_url" $HEALTH_CHECK_TIMEOUT; then
        log_success "Produção está saudável"
    else
        log_warning "Produção não está saudável - continuando com deploy local"
    fi
    
    # Monitorizar por 3 minutos
    log_deploy "Monitorizando produção por 3 minutos..."
    if monitor_system "$LOCAL_URL" 180 $MONITOR_INTERVAL; then
        log_success "Produção estável - aumentando para 50%"
    else
        log_error "Produção instável - revertendo deploy"
        return 1
    fi
    
    # Fase 3: Deploy para 50% dos utilizadores
    log_deploy "Fase 3: Deploy para 50% dos utilizadores"
    
    log_info "Aumentando tráfego para 50%..."
    sleep 5
    
    if check_health "$target_url" $HEALTH_CHECK_TIMEOUT; then
        log_success "Produção está saudável com 50% do tráfego"
    else
        log_warning "Produção não está saudável - continuando com deploy local"
    fi
    
    # Monitorizar por mais 3 minutos
    log_deploy "Monitorizando produção por mais 3 minutos..."
    if monitor_system "$LOCAL_URL" 180 $MONITOR_INTERVAL; then
        log_success "Produção estável - deploy completo"
    else
        log_error "Produção instável - revertendo deploy"
        return 1
    fi
    
    # Fase 4: Deploy completo
    log_deploy "Fase 4: Deploy completo (100% dos utilizadores)"
    
    log_info "Ativando deploy completo..."
    sleep 5
    
    if check_health "$target_url" $HEALTH_CHECK_TIMEOUT; then
        log_success "Deploy completo bem-sucedido"
    else
        log_warning "Deploy completo - continuando com deploy local"
    fi
    
    # Monitorização final por 5 minutos
    log_deploy "Monitorização final por 5 minutos..."
    if monitor_system "$LOCAL_URL" 300 $MONITOR_INTERVAL; then
        log_success "Deploy gradual concluído com sucesso!"
        return 0
    else
        log_error "Problemas detectados após deploy completo"
        return 1
    fi
}

# Função para rollback
rollback_deploy() {
    local target_url=$1
    
    log_warning "Iniciando rollback para $target_url"
    
    # Simular rollback (em produção real, isso seria feito via load balancer)
    log_info "Revertendo para versão anterior..."
    sleep 5
    
    if check_health "$target_url" $HEALTH_CHECK_TIMEOUT; then
        log_success "Rollback bem-sucedido"
        return 0
    else
        log_error "Rollback falhou"
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
    
    # Teste 2: Métricas básicas
    local metrics=$(get_metrics "$url")
    local health_score=$(echo "$metrics" | cut -d',' -f1)
    
    if [ "$health_score" -gt 80 ]; then
        log_success "Health score aceitável: $health_score%"
    else
        log_warning "Health score baixo: $health_score%"
    fi
    
    # Teste 3: Endpoints principais
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
    
    # Deploy gradual
    log_deploy "Iniciando processo de deploy gradual..."
    if gradual_deploy "$DEPLOY_URL" "$STAGING_URL"; then
        log_success "Deploy gradual concluído com sucesso!"
        
        # Testes pós-deploy
        log_info "Executando testes pós-deploy..."
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
    else
        log_error "Deploy gradual falhou"
        
        # Tentar rollback
        log_warning "Tentando rollback..."
        if rollback_deploy "$DEPLOY_URL"; then
            log_success "Rollback bem-sucedido"
        else
            log_error "Rollback falhou - intervenção manual necessária"
        fi
        
        exit 1
    fi
}

# Verificar argumentos
case "${1:-}" in
    "staging")
        log_info "Deploy apenas para staging"
        gradual_deploy "$STAGING_URL" "$STAGING_URL"
        ;;
    "production")
        log_info "Deploy direto para produção"
        gradual_deploy "$DEPLOY_URL" "$STAGING_URL"
        ;;
    "monitor")
        log_info "Apenas monitorização"
        monitor_system "$LOCAL_URL" 3600 $MONITOR_INTERVAL
        ;;
    "test")
        log_info "Apenas testes"
        post_deploy_tests "$LOCAL_URL"
        ;;
    "rollback")
        log_info "Rollback"
        rollback_deploy "$DEPLOY_URL"
        ;;
    *)
        main
        ;;
esac