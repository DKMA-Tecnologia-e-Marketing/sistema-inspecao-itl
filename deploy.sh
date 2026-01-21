#!/bin/bash

# Script de Deploy para Produção
# Uso: ./deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy para produção..."

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
    echo -e "${YELLOW}⚠️  PM2 não encontrado. Instalando...${NC}"
    npm install -g pm2
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    pnpm install
fi

# Fazer backup do build anterior (se existir)
if [ -d "dist" ]; then
    echo -e "${YELLOW}💾 Fazendo backup do build anterior...${NC}"
    BACKUP_DIR="dist.backup.$(date +%Y%m%d_%H%M%S)"
    mv dist "$BACKUP_DIR" || true
    echo -e "${GREEN}✓ Backup criado em: $BACKUP_DIR${NC}"
fi

# Fazer build do projeto
echo -e "${YELLOW}🔨 Fazendo build do projeto...${NC}"
pnpm build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build. Deploy cancelado.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build concluído com sucesso${NC}"

# Verificar se o arquivo dist/index.js existe
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}❌ Erro: dist/index.js não encontrado após o build${NC}"
    exit 1
fi

# Verificar se o diretório dist/public existe
if [ ! -d "dist/public" ]; then
    echo -e "${RED}❌ Erro: dist/public não encontrado após o build${NC}"
    exit 1
fi

# Parar o processo PM2 se estiver rodando
echo -e "${YELLOW}🛑 Parando processo PM2 (se estiver rodando)...${NC}"
pm2 stop inspecionasp-backend || true
pm2 delete inspecionasp-backend || true

# Iniciar o processo PM2
echo -e "${YELLOW}▶️  Iniciando processo PM2...${NC}"
pm2 start ecosystem.config.cjs

# Salvar configuração do PM2
pm2 save

# Mostrar status
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo "📊 Status do PM2:"
pm2 status

echo ""
echo "📋 Logs recentes:"
pm2 logs inspecionasp-backend --lines 20 --nostream

echo ""
echo -e "${GREEN}✓ Deploy finalizado com sucesso!${NC}"
echo ""
echo "🔍 Para verificar os logs:"
echo "   pm2 logs inspecionasp-backend"
echo ""
echo "🔍 Para verificar o status:"
echo "   pm2 status"
echo ""
echo "🔍 Para reiniciar:"
echo "   pm2 restart inspecionasp-backend"
