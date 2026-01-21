#!/bin/bash

# Script de correção rápida para erro 502
# Execute no servidor: bash fix-backend-502.sh

set -e

APP_DIR="/var/www/inspecionasp"
cd $APP_DIR || exit 1

echo "🔍 DIAGNÓSTICO DO ERRO 502"
echo "=========================="
echo ""

# 1. Verificar se JWT_SECRET está definido
echo "1️⃣ Verificando JWT_SECRET..."
if [ ! -f ".env.production" ]; then
  echo "   ❌ Arquivo .env.production não encontrado!"
  echo "   ✅ Criando arquivo .env.production..."
  touch .env.production
fi

if ! grep -q "^JWT_SECRET=" .env.production 2>/dev/null; then
  echo "   ❌ JWT_SECRET não encontrado!"
  echo "   ✅ Gerando JWT_SECRET..."
  JWT_SECRET_VALUE=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-key-$(date +%s)")
  echo "JWT_SECRET=$JWT_SECRET_VALUE" >> .env.production
  echo "   ✅ JWT_SECRET gerado e adicionado"
else
  echo "   ✅ JWT_SECRET já está configurado"
fi

# 2. Verificar status do PM2
echo ""
echo "2️⃣ Verificando status do backend..."
if pm2 list | grep -q "inspecionasp-backend.*online"; then
  echo "   ✅ Backend está rodando"
else
  echo "   ❌ Backend NÃO está rodando"
fi

# 3. Verificar porta 5006
echo ""
echo "3️⃣ Verificando porta 5006..."
if lsof -i :5006 >/dev/null 2>&1; then
  echo "   ✅ Porta 5006 está em uso"
  lsof -i :5006 | head -2
else
  echo "   ❌ Porta 5006 NÃO está em uso (backend não está rodando)"
fi

# 4. Verificar logs recentes
echo ""
echo "4️⃣ Últimas linhas dos logs do backend:"
pm2 logs inspecionasp-backend --lines 10 --nostream 2>&1 | tail -10 || echo "   ⚠️  Não foi possível ler logs"

# 5. Tentar reiniciar o backend
echo ""
echo "5️⃣ Reiniciando backend..."
pm2 restart inspecionasp-backend || pm2 start ecosystem.config.cjs --only inspecionasp-backend

# 6. Aguardar e verificar
echo ""
echo "6️⃣ Aguardando backend iniciar..."
sleep 5

if pm2 list | grep -q "inspecionasp-backend.*online"; then
  echo "   ✅ Backend iniciado com sucesso"
else
  echo "   ❌ Backend ainda não está rodando"
  echo ""
  echo "   📋 Logs de erro:"
  pm2 logs inspecionasp-backend --err --lines 20 --nostream 2>&1 | tail -20
fi

# 7. Testar conexão
echo ""
echo "7️⃣ Testando conexão com backend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5006/api/trpc 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "   ✅ Backend está respondendo (HTTP $HTTP_CODE)"
else
  echo "   ❌ Backend não está respondendo (HTTP $HTTP_CODE)"
fi

echo ""
echo "=========================="
echo "✅ Diagnóstico concluído!"
echo ""
echo "Se o problema persistir, verifique:"
echo "  - Logs: pm2 logs inspecionasp-backend"
echo "  - Status: pm2 status"
echo "  - Porta: lsof -i :5006"






