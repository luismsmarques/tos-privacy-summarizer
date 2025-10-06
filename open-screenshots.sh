#!/bin/bash

# Script para abrir templates HTML para captura de screenshots
# ToS & Privacy Summarizer - Chrome Web Store

echo "📸 Abrindo templates HTML para captura de screenshots..."
echo ""

# Navegar para a pasta screenshots
cd "$(dirname "$0")/screenshots"

# Verificar se a pasta existe
if [ ! -d "screenshots" ]; then
    echo "❌ Pasta screenshots não encontrada!"
    echo "Execute primeiro: node create-screenshots.js"
    exit 1
fi

echo "🎯 Abrindo templates HTML no Chrome..."
echo ""

# Abrir cada arquivo HTML no Chrome
echo "1. Popup Principal (640x400)"
open -a "Google Chrome" "popup-principal-640x400.html"

echo "2. Página de Resumo (640x400)"
open -a "Google Chrome" "pagina-resumo-640x400.html"

echo "3. Histórico (640x400)"
open -a "Google Chrome" "historico-640x400.html"

echo "4. Configurações (640x400)"
open -a "Google Chrome" "configuracoes-640x400.html"

echo "5. Onboarding (640x400)"
open -a "Google Chrome" "onboarding-640x400.html"

echo ""
echo "✅ Todos os templates HTML foram abertos no Chrome!"
echo ""
echo "📋 Próximos passos:"
echo "1. Capturar screenshot de cada aba: Cmd + Shift + 4"
echo "2. Selecionar apenas a área da imagem (sem bordas)"
echo "3. Salvar como PNG com nomes descritivos"
echo "4. Upload na Chrome Web Store"
echo ""
echo "📸 Screenshots necessários:"
echo "- tos-summarizer-screenshot-1.png (Popup Principal)"
echo "- tos-summarizer-screenshot-2.png (Página de Resumo)"
echo "- tos-summarizer-screenshot-3.png (Histórico)"
echo "- tos-summarizer-screenshot-4.png (Configurações)"
echo "- tos-summarizer-screenshot-5.png (Onboarding)"
echo ""
echo "🎨 Dimensões corretas: 640x400 pixels"
echo "📁 Formato: PNG 24-bit (sem transparência)"
echo ""
echo "🚀 Após capturar, volte à Chrome Web Store para upload!"
