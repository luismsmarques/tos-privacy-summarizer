# Configuração do Dashboard - Solução para "Token Inválido"

## Problema Identificado
O erro 401 "Token Inválido" no Dashboard estava ocorrendo devido a:
1. Falta de configuração adequada das variáveis de ambiente no Vercel
2. Problemas com cookies em ambiente de produção
3. Middleware de autenticação muito restritivo

## Soluções Implementadas

### 1. Configuração de Variáveis de Ambiente
As seguintes variáveis foram adicionadas ao `vercel.json`:
- `JWT_SECRET`: Chave secreta para tokens JWT
- `ADMIN_USERNAME`: Nome de usuário do administrador (admin)
- `ADMIN_PASSWORD`: Senha do administrador (admin123)
- `NODE_ENV`: Ambiente de produção

### 2. Melhorias no Middleware de Autenticação
- Permitir acesso direto a arquivos estáticos
- Melhor tratamento de cookies com `decodeURIComponent`
- Interface de login melhorada com credenciais pré-preenchidas
- Mensagens de erro mais claras

### 3. Configuração de Cookies Otimizada
- `httpOnly: false` para permitir acesso via JavaScript
- `secure: true` apenas em produção (HTTPS)
- `sameSite: 'lax'` para compatibilidade com Vercel
- `path: '/'` para disponibilidade em todo o site

## Como Acessar o Dashboard

### Credenciais Padrão:
- **Usuário**: `admin`
- **Senha**: `admin123`

### Passos para Acesso:
1. Acesse: `https://tos-privacy-summarizer.vercel.app/dashboard/`
2. Se não estiver logado, será exibida a página de login
3. Use as credenciais acima
4. Após o login, será redirecionado automaticamente para o dashboard

## Configuração Adicional no Vercel

Para configurar as variáveis de ambiente no painel do Vercel:

1. Acesse o projeto no Vercel Dashboard
2. Vá em Settings > Environment Variables
3. Adicione as seguintes variáveis:

```
JWT_SECRET=tos-privacy-summarizer-jwt-secret-key-2024-vercel-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
GEMINI_API_KEY=sua_chave_da_api_gemini_aqui
NODE_ENV=production
```

## Teste Local

Para testar localmente:
1. Copie `env.example` para `.env`
2. Configure as variáveis necessárias
3. Execute: `npm start` no diretório backend
4. Acesse: `http://localhost:3000/dashboard/`

## Logs de Debug

O sistema agora inclui logs detalhados para debug:
- Verificação de cookies
- Validação de tokens
- Processo de autenticação

Verifique os logs no Vercel Dashboard para diagnosticar problemas.
