#!/bin/bash
# Script para verificar o novo indicador de status

echo "=== VERIFICAÇÃO DO INDICADOR DE STATUS ==="

echo "1. Verificando se status-indicator existe no HTML..."
if grep -q "status-indicator" popup.html; then
    echo "✅ status-indicator encontrado"
else
    echo "❌ status-indicator não encontrado"
fi

echo ""
echo "2. Verificando se o CSS dos estados existe..."
states=("status-ready" "status-warning" "status-error" "status-configuring")
for state in "${states[@]}"; do
    if grep -q "\.$state" popup.html; then
        echo "✅ CSS .$state encontrado"
    else
        echo "❌ CSS .$state não encontrado"
    fi
done

echo ""
echo "3. Verificando se as funções JavaScript existem..."
functions=("updateStatusIndicator" "updateStatusProcessing" "restoreStatus")
for func in "${functions[@]}"; do
    if grep -q "function $func" popup.js; then
        echo "✅ Função $func encontrada"
    else
        echo "❌ Função $func não encontrada"
    fi
done

echo ""
echo "4. Verificando ícones de status..."
icons=("check_circle" "waving_hand" "key_off" "sync")
for icon in "${icons[@]}"; do
    if grep -q "$icon" popup.js; then
        echo "✅ Ícone $icon encontrado"
    else
        echo "❌ Ícone $icon não encontrado"
    fi
done

echo ""
echo "=== VERIFICAÇÃO CONCLUÍDA ==="
echo ""
echo "Estados do indicador:"
echo "- 🟢 status-ready: Extensão configurada (check_circle)"
echo "- 🟡 status-warning: Onboarding não completado (waving_hand)"
echo "- 🔴 status-error: API key não configurada (key_off)"
echo "- 🔵 status-configuring: Processando (sync com animação)"
echo ""
echo "Recarregue a extensão para ver o novo indicador de status!"
