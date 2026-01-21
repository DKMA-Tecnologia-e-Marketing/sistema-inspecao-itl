#!/bin/bash

# Script para fazer deploy da correção de CORS
# Execute: ./deploy-cors-fix.sh

echo "📤 Enviando arquivo corrigido para o servidor..."
echo "Por favor, insira a senha quando solicitado: Dk2025dkma"

scp -o StrictHostKeyChecking=no dist/index.js root@inspecionasp.com.br:/var/www/inspecionasp/dist/

echo ""
echo "🔄 Reiniciando PM2..."
ssh -o StrictHostKeyChecking=no root@inspecionasp.com.br "cd /var/www/inspecionasp && pm2 restart inspecionasp-backend"

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🔍 Verificando status..."
ssh -o StrictHostKeyChecking=no root@inspecionasp.com.br "pm2 status inspecionasp-backend"

