#!/bin/bash

# Script de Deploy Remoto
# Uso: ./deploy-remote.sh

set -e

# Configurações do servidor
SERVER_HOST="inspecionasp.com.br"
SERVER_USER="root"
SERVER_DIR="/var/www/inspecionasp"

echo "🚀 Iniciando deploy remoto para $SERVER_USER@$SERVER_HOST..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Fazer build local primeiro
echo "🔨 Fazendo build local..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Deploy cancelado."
    exit 1
fi

echo "✅ Build local concluído"

# Criar arquivo temporário com comandos para executar no servidor
cat > /tmp/deploy-commands.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

cd /var/www/inspecionasp || exit 1

echo "📦 Fazendo backup do build anterior..."
if [ -d "dist" ]; then
    BACKUP_DIR="dist.backup.$(date +%Y%m%d_%H%M%S)"
    mv dist "$BACKUP_DIR" || true
    echo "✓ Backup criado: $BACKUP_DIR"
fi

echo "📥 Recebendo arquivos..."
# Os arquivos serão enviados via rsync ou scp

echo "🔄 Parando PM2..."
pm2 stop inspecionasp-backend || true
pm2 delete inspecionasp-backend || true

echo "▶️  Iniciando PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Deploy concluído no servidor!"
pm2 status
DEPLOY_SCRIPT

# Enviar arquivos para o servidor
echo "📤 Enviando arquivos para o servidor..."

# Enviar dist/
echo "  - Enviando dist/..."
rsync -avz --delete \
    --exclude 'node_modules' \
    dist/ \
    $SERVER_USER@$SERVER_HOST:$SERVER_DIR/dist/

# Enviar ecosystem.config.cjs
echo "  - Enviando ecosystem.config.cjs..."
scp ecosystem.config.cjs $SERVER_USER@$SERVER_HOST:$SERVER_DIR/

# Enviar package.json (para referência)
echo "  - Enviando package.json..."
scp package.json $SERVER_USER@$SERVER_HOST:$SERVER_DIR/

# Executar comandos no servidor
echo "🔧 Executando comandos no servidor..."
ssh $SERVER_USER@$SERVER_HOST << 'SSH_SCRIPT'
set -e
cd /var/www/inspecionasp

echo "📦 Fazendo backup do build anterior..."
if [ -d "dist" ]; then
    BACKUP_DIR="dist.backup.$(date +%Y%m%d_%H%M%S)"
    mv dist "$BACKUP_DIR" || true
    echo "✓ Backup criado: $BACKUP_DIR"
fi

# Mover dist recebido para o lugar certo (se foi enviado para outro local)
if [ -d "dist.new" ]; then
    mv dist.new dist
fi

echo "🔄 Parando PM2..."
pm2 stop inspecionasp-backend || true
pm2 delete inspecionasp-backend || true

echo "▶️  Iniciando PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Deploy concluído!"
echo ""
echo "📊 Status do PM2:"
pm2 status

echo ""
echo "📋 Logs recentes:"
pm2 logs inspecionasp-backend --lines 10 --nostream
SSH_SCRIPT

echo ""
echo "✅ Deploy remoto concluído com sucesso!"
echo ""
echo "🔍 Para verificar os logs:"
echo "   ssh $SERVER_USER@$SERVER_HOST 'pm2 logs inspecionasp-backend'"

