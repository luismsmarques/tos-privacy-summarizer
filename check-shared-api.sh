#!/bin/bash
# Script para verificar o sistema de API compartilhada

echo "=== VERIFICAÇÃO DO SISTEMA DE API COMPARTILHADA ==="

echo "1. Verificando HTML das opções de API..."
if grep -q "sharedApiOption" onboarding.html; then
    echo "✅ Opção de API compartilhada encontrada"
else
    echo "❌ Opção de API compartilhada não encontrada"
fi

if grep -q "ownApiOption" onboarding.html; then
    echo "✅ Opção de chave própria encontrada"
else
    echo "❌ Opção de chave própria não encontrada"
fi

echo ""
echo "2. Verificando botões específicos..."
buttons=("useSharedApiBtn" "buyCreditsBtn" "useOwnApiBtn")
for button in "${buttons[@]}"; do
    if grep -q "id=\"$button\"" onboarding.html; then
        echo "✅ Botão $button encontrado"
    else
        echo "❌ Botão $button não encontrado"
    fi
done

echo ""
echo "3. Verificando funções JavaScript..."
functions=("useSharedApi" "buyCredits" "useOwnApi" "getSharedCredits" "decrementSharedCredits" "saveSharedApiConfig")
for func in "${functions[@]}"; do
    if grep -q "function $func" onboarding.js; then
        echo "✅ Função $func encontrada"
    else
        echo "❌ Função $func não encontrada"
    fi
done

echo ""
echo "4. Verificando CSS das opções..."
if grep -q "\.api-option" onboarding.html; then
    echo "✅ CSS .api-option encontrado"
else
    echo "❌ CSS .api-option não encontrado"
fi

if grep -q "\.credits-info" onboarding.html; then
    echo "✅ CSS .credits-info encontrado"
else
    echo "❌ CSS .credits-info não encontrado"
fi

echo ""
echo "5. Verificando suporte no background.js..."
if grep -q "SHARED_API_KEY" background.js; then
    echo "✅ Chave compartilhada definida"
else
    echo "❌ Chave compartilhada não definida"
fi

if grep -q "apiType" background.js; then
    echo "✅ Suporte a tipos de API encontrado"
else
    echo "❌ Suporte a tipos de API não encontrado"
fi

if grep -q "sharedCredits" background.js; then
    echo "✅ Suporte a créditos encontrado"
else
    echo "❌ Suporte a créditos não encontrado"
fi

echo ""
echo "=== VERIFICAÇÃO CONCLUÍDA ==="
echo ""
echo "Funcionalidades implementadas:"
echo "- 🎁 Opção de créditos gratuitos (5 análises)"
echo "- 🔧 Opção de chave própria"
echo "- 💳 Sistema de compra de créditos"
echo "- 📊 Controle de créditos restantes"
echo "- 🔄 Decremento automático de créditos"
echo "- 🛡️ Fallback para chave própria"
echo ""
echo "Próximos passos:"
echo "1. Substituir SHARED_API_KEY pela chave real"
echo "2. Configurar URL de compra do Stripe"
echo "3. Implementar sistema de pagamento"
echo "4. Testar fluxo completo"
echo ""
echo "Recarregue a extensão para testar o novo sistema!"
