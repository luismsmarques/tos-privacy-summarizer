#!/bin/bash

# Script para parar o servidor backend
# ToS Privacy Summarizer - Stop Server Script

echo "🛑 Parando servidor backend do ToS Privacy Summarizer..."

# Verificar se há processos na porta 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "🔍 Encontrado processo na porta 3000..."
    
    # Mostrar informações do processo
    echo "📋 Processo encontrado:"
    lsof -i:3000
    
    # Parar o processo
    echo "⏹️  Parando processo..."
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
    
    # Verificar se foi parado
    sleep 2
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo "❌ Erro: Não foi possível parar o processo"
        exit 1
    else
        echo "✅ Servidor parado com sucesso"
    fi
else
    echo "ℹ️  Nenhum processo encontrado na porta 3000"
fi

echo "🏁 Script concluído"
