#!/bin/bash

# Script de Setup Inicial para Produção
# Uso: ./deploy-setup.sh

set -e  # Parar em caso de erro

echo "🔧 Configurando ambiente de produção..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script a partir do diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 instalado${NC}"
else
    echo -e "${GREEN}✓ PM2 já está instalado${NC}"
fi

# Verificar se o pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando pnpm...${NC}"
    npm install -g pnpm
    echo -e "${GREEN}✓ pnpm instalado${NC}"
else
    echo -e "${GREEN}✓ pnpm já está instalado${NC}"
fi

# Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
pnpm install

# Verificar se existe arquivo .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env.production não encontrado${NC}"
    echo -e "${YELLOW}   Criando template...${NC}"
    cat > .env.production << 'EOF'
# Configurações de Produção
NODE_ENV=production
PORT=5006

# Database
DATABASE_URL=mysql://usuario:senha@localhost:3306/inspecionasp

# JWT Secret (GERE UM NOVO PARA PRODUÇÃO!)
JWT_SECRET=seu-jwt-secret-super-seguro-aqui

# Cookie Secret (GERE UM NOVO PARA PRODUÇÃO!)
COOKIE_SECRET=seu-cookie-secret-super-seguro-aqui

# API URLs
VITE_API_URL=https://api.inspecionasp.com.br/api/trpc

# Integrações (configure conforme necessário)
# INFOSIMPLES_API_KEY=
# ASAAS_API_KEY=
# ASAAS_ENVIRONMENT=production
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=
# EMAIL_HOST=
# EMAIL_PORT=
# EMAIL_USER=
# EMAIL_PASS=
EOF
    echo -e "${GREEN}✓ Template .env.production criado${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edite o arquivo .env.production com suas configurações reais!${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env.production encontrado${NC}"
fi

# Criar diretórios necessários
echo -e "${YELLOW}📁 Criando diretórios necessários...${NC}"
mkdir -p dist
mkdir -p /var/log/pm2 2>/dev/null || echo -e "${YELLOW}⚠️  Não foi possível criar /var/log/pm2 (pode precisar de sudo)${NC}"

# Verificar configuração do PM2
if [ ! -f "ecosystem.config.cjs" ]; then
    echo -e "${RED}❌ Erro: ecosystem.config.cjs não encontrado${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Configuração do PM2 encontrada${NC}"
fi

# Fazer build inicial
echo -e "${YELLOW}🔨 Fazendo build inicial...${NC}"
pnpm build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build concluído${NC}"

# Configurar PM2 para iniciar no boot
echo -e "${YELLOW}⚙️  Configurando PM2 para iniciar no boot...${NC}"
pm2 startup || echo -e "${YELLOW}⚠️  Execute o comando sugerido acima com sudo${NC}"

echo ""
echo -e "${GREEN}✅ Setup concluído!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "   1. Edite o arquivo .env.production com suas configurações"
echo "   2. Execute: ./deploy.sh para fazer o deploy"
echo "   3. Configure o Nginx para fazer proxy reverso"
echo "   4. Configure o SSL/HTTPS"
echo ""
echo "📖 Veja o arquivo PRODUCAO-502-FIX.md para mais detalhes"
