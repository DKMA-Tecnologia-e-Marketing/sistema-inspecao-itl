#!/bin/bash

# Script de deploy manual - requer senha interativa
# Use este script se o deploy.sh automático não funcionar

set -e

SERVER_IP="31.220.77.103"
SERVER_USER="root"
APP_DIR="/var/www/inspecionasp"

echo "🚀 Deploy Manual do Inspeciona SP..."
echo ""
echo "📦 Verificando se o arquivo deploy.tar.gz existe..."
if [ ! -f "deploy.tar.gz" ]; then
    echo "❌ Arquivo deploy.tar.gz não encontrado!"
    echo "   Execute primeiro: pnpm build:frontend && pnpm build:backend"
    echo "   Depois crie o tar: tar -czf deploy.tar.gz dist/ package.json pnpm-lock.yaml ecosystem.config.cjs scripts/ drizzle/ server/ client/ shared/ vite.config.ts drizzle.config.ts tsconfig.json"
    exit 1
fi

echo "✅ Arquivo encontrado: $(du -h deploy.tar.gz | cut -f1)"
echo ""
echo "📤 Enviando arquivo para o servidor..."
echo "   Você será solicitado a digitar a senha SSH"
scp -o StrictHostKeyChecking=no deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

echo ""
echo "🔧 Executando deploy no servidor..."
echo "   Você será solicitado a digitar a senha SSH novamente"
ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    APP_DIR="/var/www/inspecionasp"
    
    echo "📦 Extraindo arquivos..."
    cd $APP_DIR
    tar -xzf /tmp/deploy.tar.gz
    
    echo "📥 Instalando dependências..."
    pnpm install --prod --frozen-lockfile
    
    echo "🔄 Reiniciando aplicação..."
    pm2 restart inspecionasp-backend || pm2 start ecosystem.config.cjs --only inspecionasp-backend
    
    echo "⏳ Aguardando backend iniciar..."
    sleep 5
    
    echo "🧪 Testando backend..."
    if curl -s http://localhost:5006/health > /dev/null; then
        echo "✅ Backend está respondendo"
    else
        echo "⚠️  Backend pode não estar respondendo"
    fi
    
    echo "🧹 Limpando cache do Nginx..."
    systemctl reload nginx || service nginx reload
    
    pm2 save
    
    echo "✅ Deploy concluído!"
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
echo "🌐 Frontend: https://inspecionasp.com.br"
echo "🔌 Backend: https://api.inspecionasp.com.br"





