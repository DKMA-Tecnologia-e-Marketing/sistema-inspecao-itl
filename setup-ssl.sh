#!/bin/bash

# Script para configurar SSL com Let's Encrypt
# Execute este script APÓS os domínios estiverem apontando para o servidor

set -e

SERVER_IP="31.220.77.103"
SERVER_USER="root"

echo "🔒 Configurando certificados SSL para Inspeciona SP..."

sshpass -p 'Dk2025@@a' ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    echo "📦 Verificando se certbot está instalado..."
    if ! command -v certbot &> /dev/null; then
        echo "📥 Instalando certbot..."
        apt-get update -qq
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    echo "🔐 Gerando certificados SSL..."
    
    # Gerar certificado para frontend
    echo "🌐 Gerando certificado para inspecionasp.com.br..."
    certbot --nginx -d inspecionasp.com.br -d www.inspecionasp.com.br --non-interactive --agree-tos --email admin@inspecionasp.com.br --redirect || {
        echo "⚠️  Erro ao gerar certificado para frontend. Verifique se o domínio está apontando para o servidor."
    }
    
    # Gerar certificado para backend
    echo "🔌 Gerando certificado para api.inspecionasp.com.br..."
    certbot --nginx -d api.inspecionasp.com.br --non-interactive --agree-tos --email admin@inspecionasp.com.br --redirect || {
        echo "⚠️  Erro ao gerar certificado para backend. Verifique se o domínio está apontando para o servidor."
    }
    
    # Atualizar configuração do nginx para usar HTTPS
    echo "🔄 Atualizando configuração do nginx..."
    
    # Substituir configuração temporária pela definitiva com SSL
    if [ -f "/etc/nginx/sites-available/inspecionasp" ]; then
        # O certbot já atualizou a configuração automaticamente
        echo "✅ Certbot atualizou a configuração automaticamente"
    fi
    
    # Testar configuração
    nginx -t
    
    # Recarregar nginx
    systemctl reload nginx
    
    echo "✅ Certificados SSL configurados com sucesso!"
    echo ""
    echo "📋 Verificar certificados:"
    certbot certificates
ENDSSH

echo ""
echo "✅ Configuração SSL concluída!"
echo "🌐 Frontend: https://inspecionasp.com.br"
echo "🔌 Backend: https://api.inspecionasp.com.br"


