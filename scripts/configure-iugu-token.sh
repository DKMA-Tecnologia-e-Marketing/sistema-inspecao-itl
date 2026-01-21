#!/bin/bash

# Script para configurar o token da Iugu no servidor
# Execute: ./scripts/configure-iugu-token.sh

SERVER_IP="31.220.77.103"
SERVER_USER="root"
APP_DIR="/var/www/inspecionasp"
IUGU_TOKEN="4DFF42F2DF96B71276FB0541757D61CB7C1FE25194B191763EB684C79795ABDF"

echo "🔧 Configurando token da Iugu no servidor..."

ssh ${SERVER_USER}@${SERVER_IP} << EOF
cd ${APP_DIR}

# Verificar se o token já existe
if grep -q "IUGU_API_TOKEN" .env.production; then
    echo "⚠️  Token já existe. Atualizando..."
    sed -i 's|IUGU_API_TOKEN=.*|IUGU_API_TOKEN=${IUGU_TOKEN}|' .env.production
else
    echo "➕ Adicionando token..."
    echo "IUGU_API_TOKEN=${IUGU_TOKEN}" >> .env.production
fi

echo "✅ Token configurado!"
echo ""
echo "📋 Últimas linhas do .env.production:"
tail -3 .env.production

echo ""
echo "🔄 Reiniciando backend..."
pm2 restart inspecionasp-backend

echo ""
echo "✅ Configuração concluída!"
EOF

echo ""
echo "🌐 Acesse: https://inspecionasp.com.br/admin/iugu"

