#!/bin/bash
# Script para verificar se o CSP foi resolvido

echo "=== VERIFICAÇÃO CSP (Content Security Policy) ==="

echo "1. Verificando se ainda há onclick inline..."
if grep -q "onclick=" onboarding.html; then
    echo "❌ Ainda há onclick inline no HTML:"
    grep -n "onclick=" onboarding.html
else
    echo "✅ Nenhum onclick inline encontrado"
fi

echo ""
echo "2. Verificando se todos os botões têm IDs..."
buttons=("startConfigBtn" "skipOnboardingLink" "prevStep2Btn" "testAndNextBtn" "prevStep3Btn" "nextStep3Btn" "prevStep4Btn" "nextStep4Btn" "completeOnboardingBtn")
for button in "${buttons[@]}"; do
    if grep -q "id=\"$button\"" onboarding.html; then
        echo "✅ $button encontrado"
    else
        echo "❌ $button não encontrado"
    fi
done

echo ""
echo "3. Verificando se o JavaScript tem event listeners..."
if grep -q "addEventListener" onboarding.js; then
    echo "✅ Event listeners encontrados no JavaScript"
else
    echo "❌ Event listeners não encontrados"
fi

echo ""
echo "4. Verificando função setupEventListeners..."
if grep -q "function setupEventListeners" onboarding.js; then
    echo "✅ Função setupEventListeners encontrada"
else
    echo "❌ Função setupEventListeners não encontrada"
fi

echo ""
echo "=== VERIFICAÇÃO CONCLUÍDA ==="
echo ""
echo "Se tudo estiver ✅, o CSP deve estar resolvido!"
echo "Recarregue a extensão e teste o onboarding."
