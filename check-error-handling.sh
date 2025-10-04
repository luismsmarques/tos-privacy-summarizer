#!/bin/bash
# Script para verificar o sistema de tratamento de erros

echo "=== VERIFICAÇÃO DO SISTEMA DE TRATAMENTO DE ERROS ==="

echo "1. Verificando CSS das notificações..."
if grep -q "notification-container" popup.html; then
    echo "✅ notification-container encontrado"
else
    echo "❌ notification-container não encontrado"
fi

if grep -q "\.notification\." popup.html; then
    echo "✅ Estilos de notificação encontrados"
else
    echo "❌ Estilos de notificação não encontrados"
fi

echo ""
echo "2. Verificando funções JavaScript..."
functions=("showNotification" "showErrorNotification" "showSuccessNotification" "showWarningNotification" "showInfoNotification")
for func in "${functions[@]}"; do
    if grep -q "function $func" popup.js; then
        echo "✅ Função $func encontrada"
    else
        echo "❌ Função $func não encontrada"
    fi
done

echo ""
echo "3. Verificando tipos de erro implementados..."
errorTypes=("api_key_missing" "api_key_invalid" "network_error" "page_error" "processing_error" "onboarding_incomplete" "quota_exceeded" "content_too_long")
for errorType in "${errorTypes[@]}"; do
    if grep -q "$errorType" popup.js; then
        echo "✅ Tipo de erro $errorType encontrado"
    else
        echo "❌ Tipo de erro $errorType não encontrado"
    fi
done

echo ""
echo "4. Verificando tratamento de erros no background.js..."
if grep -q "API Gemini" background.js; then
    echo "✅ Tratamento de erros da API encontrado"
else
    echo "❌ Tratamento de erros da API não encontrado"
fi

if grep -q "Limite de uso" background.js; then
    echo "✅ Tratamento de quota encontrado"
else
    echo "❌ Tratamento de quota não encontrado"
fi

echo ""
echo "5. Verificando tratamento de erros no content.js..."
if grep -q "texto suficiente" content.js; then
    echo "✅ Tratamento de erro de extração encontrado"
else
    echo "❌ Tratamento de erro de extração não encontrado"
fi

echo ""
echo "=== VERIFICAÇÃO CONCLUÍDA ==="
echo ""
echo "Tipos de erro implementados:"
echo "- 🔑 api_key_missing: Chave da API não configurada"
echo "- ❌ api_key_invalid: Chave da API inválida"
echo "- 🌐 network_error: Erro de conexão"
echo "- 📄 page_error: Erro na página"
echo "- ⚙️ processing_error: Erro no processamento"
echo "- 🚀 onboarding_incomplete: Configuração incompleta"
echo "- 📊 quota_exceeded: Limite de uso atingido"
echo "- 📝 content_too_long: Conteúdo muito longo"
echo ""
echo "Recarregue a extensão para testar o novo sistema de notificações!"
