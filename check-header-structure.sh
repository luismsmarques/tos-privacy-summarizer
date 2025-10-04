#!/bin/bash
# Script para verificar a nova estrutura do header

echo "=== VERIFICAÇÃO DA NOVA ESTRUTURA DO HEADER ==="

echo "1. Verificando se header-actions existe..."
if grep -q "header-actions" popup.html; then
    echo "✅ header-actions encontrado"
else
    echo "❌ header-actions não encontrado"
fi

echo ""
echo "2. Verificando se header-action-btn existe..."
if grep -q "header-action-btn" popup.html; then
    echo "✅ header-action-btn encontrado"
else
    echo "❌ header-action-btn não encontrado"
fi

echo ""
echo "3. Verificando se ambos os botões estão no header..."
if grep -q 'id="openSettings"' popup.html && grep -q 'id="themeToggle"' popup.html; then
    echo "✅ Ambos os botões encontrados no header"
else
    echo "❌ Botões não encontrados no header"
fi

echo ""
echo "4. Verificando se o botão de configurações foi removido do button-group..."
if grep -A 10 -B 2 'button-group' popup.html | grep -q 'openSettings'; then
    echo "❌ Botão openSettings ainda está no button-group"
else
    echo "✅ Botão openSettings removido do button-group"
fi

echo ""
echo "5. Verificando CSS dos novos elementos..."
if grep -q "\.header-actions" popup.html; then
    echo "✅ CSS .header-actions encontrado"
else
    echo "❌ CSS .header-actions não encontrado"
fi

if grep -q "\.header-action-btn" popup.html; then
    echo "✅ CSS .header-action-btn encontrado"
else
    echo "❌ CSS .header-action-btn não encontrado"
fi

echo ""
echo "=== VERIFICAÇÃO CONCLUÍDA ==="
echo ""
echo "Se tudo estiver ✅, a nova estrutura está implementada!"
echo "Recarregue a extensão para ver as mudanças."
