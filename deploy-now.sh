#!/bin/bash

# Script de Deploy Imediato
# Conecta ao servidor e faz o deploy

set -e

SERVER_HOST="inspecionasp.com.br"
SERVER_USER="root"
SERVER_PASS="Dk2025dkma"
SERVER_DIR="/var/www/inspecionasp"

echo "🚀 Iniciando deploy para $SERVER_USER@$SERVER_HOST..."

# Verificar se sshpass está instalado
if ! command -v sshpass &> /dev/null; then
    echo "📦 Instalando sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass || echo "⚠️  Instale sshpass manualmente: brew install hudochenkov/sshpass/sshpass"
    else
        sudo apt-get install -y sshpass || echo "⚠️  Instale sshpass manualmente"
    fi
fi

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Fazer build local
echo "🔨 Fazendo build local..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Deploy cancelado."
    exit 1
fi

echo "✅ Build local concluído"

# Criar arquivo temporário com o script de deploy
cat > /tmp/deploy-server.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

cd /var/www/inspecionasp || { echo "❌ Diretório não encontrado"; exit 1; }

echo "📦 Fazendo backup do build anterior..."
if [ -d "dist" ]; then
    BACKUP_DIR="dist.backup.$(date +%Y%m%d_%H%M%S)"
    mv dist "$BACKUP_DIR" || true
    echo "✓ Backup criado: $BACKUP_DIR"
fi

echo "🔄 Parando PM2..."
pm2 stop inspecionasp-backend 2>/dev/null || true
pm2 delete inspecionasp-backend 2>/dev/null || true

echo "▶️  Iniciando PM2..."
pm2 start ecosystem.config.cjs || { echo "❌ Erro ao iniciar PM2"; exit 1; }
pm2 save

echo "✅ Deploy concluído no servidor!"
echo ""
echo "📊 Status do PM2:"
pm2 status

echo ""
echo "📋 Logs recentes:"
pm2 logs inspecionasp-backend --lines 10 --nostream

echo ""
echo "🔍 Testando endpoints..."
curl -s http://localhost:5006/health | head -3 || echo "⚠️  Health check falhou"
DEPLOY_SCRIPT

# Enviar arquivos para o servidor
echo "📤 Enviando arquivos para o servidor..."

# Verificar se rsync está disponível
if command -v rsync &> /dev/null; then
    echo "  - Enviando dist/ via rsync..."
    sshpass -p "$SERVER_PASS" rsync -avz --delete \
        -e "ssh -o StrictHostKeyChecking=no" \
        dist/ \
        $SERVER_USER@$SERVER_HOST:$SERVER_DIR/dist/
    
    echo "  - Enviando ecosystem.config.cjs..."
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
        ecosystem.config.cjs \
        $SERVER_USER@$SERVER_HOST:$SERVER_DIR/
else
    echo "  - rsync não encontrado, usando scp..."
    echo "  - Enviando dist/ (isso pode demorar)..."
    sshpass -p "$SERVER_PASS" scp -r -o StrictHostKeyChecking=no \
        dist \
        $SERVER_USER@$SERVER_HOST:$SERVER_DIR/
    
    echo "  - Enviando ecosystem.config.cjs..."
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
        ecosystem.config.cjs \
        $SERVER_USER@$SERVER_HOST:$SERVER_DIR/
fi

# Enviar e executar script de deploy
echo "🔧 Executando deploy no servidor..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
    /tmp/deploy-server.sh \
    $SERVER_USER@$SERVER_HOST:/tmp/deploy-server.sh

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no \
    $SERVER_USER@$SERVER_HOST \
    "chmod +x /tmp/deploy-server.sh && /tmp/deploy-server.sh"

echo ""
echo "✅ Deploy remoto concluído com sucesso!"
echo ""
echo "🔍 Para verificar os logs:"
echo "   ssh $SERVER_USER@$SERVER_HOST 'pm2 logs inspecionasp-backend'"
echo ""
echo "🌐 Teste o site:"
echo "   https://inspecionasp.com.br"
echo "   https://api.inspecionasp.com.br/health"

