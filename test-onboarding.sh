#!/bin/bash
# Script para testar o onboarding

echo "=== TESTE DO ONBOARDING ==="

echo "1. Verificando arquivos do onboarding..."
if [ -f "onboarding.html" ]; then
    echo "✅ onboarding.html existe"
else
    echo "❌ onboarding.html não encontrado"
fi

if [ -f "onboarding.js" ]; then
    echo "✅ onboarding.js existe"
else
    echo "❌ onboarding.js não encontrado"
fi

echo ""
echo "2. Verificando se o HTML referencia o JS..."
if grep -q "onboarding.js" onboarding.html; then
    echo "✅ HTML referencia onboarding.js"
else
    echo "❌ HTML não referencia onboarding.js"
fi

echo ""
echo "3. Verificando funções JavaScript essenciais..."
if grep -q "function nextStep" onboarding.js; then
    echo "✅ Função nextStep() encontrada"
else
    echo "❌ Função nextStep() não encontrada"
fi

if grep -q "function testAndNext" onboarding.js; then
    echo "✅ Função testAndNext() encontrada"
else
    echo "❌ Função testAndNext() não encontrada"
fi

if grep -q "function completeOnboarding" onboarding.js; then
    echo "✅ Função completeOnboarding() encontrada"
else
    echo "❌ Função completeOnboarding() não encontrada"
fi

echo ""
echo "4. Verificando tamanho dos arquivos..."
if [ -f "onboarding.html" ]; then
    size=$(wc -c < "onboarding.html")
    echo "📊 onboarding.html: ${size} bytes"
fi

if [ -f "onboarding.js" ]; then
    size=$(wc -c < "onboarding.js")
    echo "📊 onboarding.js: ${size} bytes"
fi

echo ""
echo "=== TESTE CONCLUÍDO ==="
echo ""
echo "Para testar o onboarding:"
echo "1. Recarregue a extensão no Chrome"
echo "2. A extensão deve abrir automaticamente o onboarding"
echo "3. Teste os botões de navegação"
