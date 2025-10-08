# Configuração permanente para desenvolvimento local
# Este arquivo define as variáveis de ambiente necessárias

# JWT Secret para desenvolvimento
export JWT_SECRET="tos-privacy-summarizer-secure-jwt-secret-key-2024-development"

# Configurações do servidor
export NODE_ENV="development"
export PORT=3000

# Credenciais de administrador
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="CHANGE_THIS_PASSWORD_IN_PRODUCTION"

# Base de dados
export DATABASE_URL="postgresql://neondb_owner:npg_1234567890abcdef@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
export ANALYTICS_URL="postgresql://neondb_owner:npg_1234567890abcdef@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Configurações de segurança
export RATE_LIMIT_WINDOW_MS=900000
export RATE_LIMIT_MAX_REQUESTS=100

# URLs
export FRONTEND_URL="http://localhost:3000"
export CORS_ORIGIN="http://localhost:3000"

echo "✅ Variáveis de ambiente configuradas para desenvolvimento local"
