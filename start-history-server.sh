#!/bin/bash

# Script para iniciar servidor local para testar history.html
echo "🚀 Iniciando servidor local para testar history.html..."
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale Node.js primeiro."
    echo "   Visite: https://nodejs.org/"
    exit 1
fi

# Verificar se os arquivos existem
if [ ! -f "history.html" ]; then
    echo "❌ Arquivo history.html não encontrado no diretório atual."
    exit 1
fi

if [ ! -f "serve-history.js" ]; then
    echo "❌ Arquivo serve-history.js não encontrado no diretório atual."
    exit 1
fi

echo "✅ Arquivos encontrados"
echo "🌐 Iniciando servidor em http://localhost:8080"
echo ""
echo "📋 URLs disponíveis:"
echo "   • http://localhost:8080/history.html - Página principal do histórico"
echo "   • http://localhost:8080/test-history.html - Página de testes"
echo ""
echo "💡 Pressione Ctrl+C para parar o servidor"
echo ""

# Iniciar servidor
node serve-history.js
