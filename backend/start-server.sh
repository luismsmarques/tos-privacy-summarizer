#!/bin/bash

# Script para iniciar o servidor backend com configurações corretas
# ToS Privacy Summarizer - Backend Startup Script

echo "🚀 Iniciando servidor backend do ToS Privacy Summarizer..."

# Definir variáveis de ambiente necessárias
export JWT_SECRET="tos-privacy-summarizer-secure-jwt-secret-key-2024-development"
export NODE_ENV="development"
export PORT=3000

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório backend/"
    exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não está instalado"
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Erro: npm não está instalado"
    exit 1
fi

echo "✅ Configurações:"
echo "   - JWT_SECRET: Configurado"
echo "   - NODE_ENV: $NODE_ENV"
echo "   - PORT: $PORT"
echo ""

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Verificar se a porta 3000 está em uso e liberar se necessário
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Porta 3000 em uso. Liberando..."
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
    sleep 2
fi

echo "🔧 Iniciando servidor..."
echo "📊 Dashboard disponível em: http://localhost:3000/dashboard/"
echo "🔑 Credenciais: admin / admin123"
echo ""

# Iniciar o servidor
npm start
