#!/bin/bash
# Script para testar se a extensão carrega sem erros

echo "=== TESTE DE CARREGAMENTO DA EXTENSÃO ==="

echo "1. Verificando manifest.json..."
if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo "✅ manifest.json é válido"
else
    echo "❌ manifest.json tem erros de sintaxe"
    python3 -m json.tool manifest.json
fi

echo ""
echo "2. Verificando arquivos essenciais..."
files=("background.js" "content.js" "popup.js" "popup.html" "options.html" "options.js")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file existe"
    else
        echo "❌ $file não encontrado"
    fi
done

echo ""
echo "3. Verificando ícones..."
icons=("icon16.png" "icon32.png" "icon48.png" "icon128.png")
for icon in "${icons[@]}"; do
    if [ -f "$icon" ]; then
        echo "✅ $icon existe"
    else
        echo "❌ $icon não encontrado"
    fi
done

echo ""
echo "4. Verificando tamanho dos arquivos..."
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(wc -c < "$file")
        echo "📊 $file: ${size} bytes"
    fi
done

echo ""
echo "=== TESTE CONCLUÍDO ==="
