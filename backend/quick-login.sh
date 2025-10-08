#!/bin/bash

# Script para facilitar o login no dashboard
# ToS Privacy Summarizer - Quick Login Script

echo "🔐 Fazendo login no dashboard..."

# Fazer login e obter token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"CHANGE_THIS_PASSWORD_IN_PRODUCTION"}')

# Extrair token da resposta
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Erro: Não foi possível obter token de login"
    echo "Resposta: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login realizado com sucesso!"
echo "🔑 Token obtido: ${TOKEN:0:20}..."
echo ""
echo "🌐 Abrindo dashboard no navegador..."

# Abrir dashboard no navegador
open "http://localhost:3000/dashboard/"

echo "📋 Instruções:"
echo "1. O dashboard deve abrir no seu navegador"
echo "2. Se aparecer a página de login, use: admin / [sua senha configurada]"
echo "3. O token já está configurado no servidor"
echo ""
echo "🔗 URL: http://localhost:3000/dashboard/"
echo "👤 Utilizador: admin"
echo "🔒 Palavra-passe: [configurada no ambiente]"
