#!/bin/bash

# Script de diagnóstico completo para erro 502
# Execute no servidor: bash diagnostico-completo-502.sh

set -e

APP_DIR="/var/www/inspecionasp"
cd $APP_DIR || { echo "❌ Erro: Não foi possível acessar $APP_DIR"; exit 1; }

echo "=========================================="
echo "🔍 DIAGNÓSTICO COMPLETO - ERRO 502"
echo "=========================================="
echo ""

# 1. Verificar arquivo .env.production
echo "1️⃣ Verificando arquivo .env.production..."
if [ ! -f ".env.production" ]; then
  echo "   ❌ Arquivo .env.production NÃO existe!"
  echo "   ✅ Criando arquivo..."
  touch .env.production
else
  echo "   ✅ Arquivo .env.production existe"
fi

# 2. Verificar JWT_SECRET
echo ""
echo "2️⃣ Verificando JWT_SECRET..."
JWT_SECRET=$(grep "^JWT_SECRET=" .env.production 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "" ]; then
  echo "   ❌ JWT_SECRET NÃO está definido ou está vazio!"
  echo "   ✅ Gerando JWT_SECRET..."
  NEW_JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-key-$(date +%s)")
  if grep -q "^JWT_SECRET=" .env.production 2>/dev/null; then
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env.production
 udo
  else
    echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env.production
  fi
  echo "   ✅ JWT_SECRET gerado e adicionado"
else
  echo "   ✅ JWT_SECRET está definido (valor: ${JWT_SECRET:0:10}...)"
fi

# 3. Verificar outras variáveis críticas
echo ""
echo "3️⃣ Verificando outras variáveis críticas..."
if ! grep -q "^NODE_ENV=" .env.production 2>/dev/null; then
  echo "   ⚠️  NODE_ENV não definido, adicionando..."
  echo "NODE_ENV=production" >> .env.production
fi
if ! grep -q "^PORT=" .env.production 2>/dev/null; then
  echo "   ⚠️  PORT não definido, adicionando..."
  echo "PORT=5006" >> .env.production
fi

# 4. Verificar status do PM2
echo ""
echo "4️⃣ Verificando status do PM2..."
pm2 list
BACKEND_STATUS=$(pm2 jlist | grep -o '"name":"inspecionasp-backend"[^}]*' | grep -o '"pm_id":[0-9]*' | cut -d':' -f2 || echo "")
if [ -n "$BACKEND_STATUS" ]; then
  echo "   ✅ Backend encontrado no PM2 (ID: $BACKEND_STATUS)"
  ONLINE=$(pm2 jlist | grep -A 5 '"name":"inspecionasp-backend"' | grep -o '"pm2_env":{"status":"[^"]*"' | grep -o 'online\|stopped\|errored' || echo "unknown")
  echo "   Status: $ONLINE"
  if [ "$ONLINE" != "online" ]; then
    echo "   ❌ Backend NÃO está online!"
  fi
else
  echo "   ❌ Backend NÃO encontrado no PM2"
fi

# 5. Verificar porta 5006
echo ""
echo "5️⃣ Verificando porta 5006..."
PORT_CHECK=$(lsof -i :5006 2>/dev/null | wc -l)
if [ "$PORT_CHECK" -gt 0 ]; then
  echo "   ✅ Porta 5006 está em uso"
  lsof -i :5006 | head -3
else
  echo "   ❌ Porta 5006 NÃO está em uso (backend não está rodando)"
fi

# 6. Verificar logs recentes
echo ""
echo "6️⃣ Últimas 30 linhas dos logs do backend:"
echo "----------------------------------------"
pm2 logs inspecionasp-backend --lines 30 --nostream 2>&1 | tail -30 || echo "   ⚠️  Não foi possível ler logs"
echo "----------------------------------------"

# 7. Verificar logs de erro
echo ""
echo "7️⃣ Últimas 20 linhas dos logs de ERRO:"
echo "----------------------------------------"
pm2 logs inspecionasp-backend --err --lines 20 --nostream 2>&1 | tail -20 || echo "   ⚠️  Não foi possível ler logs de erro"
echo "----------------------------------------"

# 8. Tentar iniciar/restart do backend
echo ""
echo "8️⃣ Tentando reiniciar o backend..."
pm2 delete inspecionasp-backend 2>/dev/null || true
sleep 2
pm2 start ecosystem.config.cjs --only inspecionasp-backend || {
  echo "   ❌ Erro ao iniciar backend com PM2"
  echo "   Tentando iniciar manualmente..."
  cd $APP_DIR
  NODE_ENV=production PORT=5006 node dist/index.js &
  sleep 3
}

# 9. Aguardar e verificar novamente
echo ""
echo "9️⃣ Aguardando 5 segundos e verificando status..."
sleep 5

if pm2 list | grep -q "inspecionasp-backend.*online"; then
  echo "   ✅ Backend está online agora!"
else
  echo "   ❌ Backend ainda NÃO está online"
  echo ""
  echo "   📋 Últimos logs de erro:"
  pm2 logs inspecionasp-backend --err --lines 30 --nostream 2>&1 | tail -30
fi

# 10. Testar conexão HTTP
echo ""
echo "🔟 Testando conexão HTTP com backend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5006/api/trpc 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "   ✅ Backend está respondendo (HTTP $HTTP_CODE)"
  echo "   Resposta:"
  curl -s http://localhost:5006/api/trpc | head -5
else
  echo "   ❌ Backend NÃO está respondendo (HTTP $HTTP_CODE)"
  echo "   Tentando conexão direta..."
  timeout 2 telnet localhost 5006 2>/dev/null || echo "   ❌ Não foi possível conectar na porta 5006"
fi

# 11. Verificar configuração do Nginx
echo ""
echo "1️⃣1️⃣ Verificando configuração do Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
  echo "   ✅ Configuração do Nginx está válida"
else
  echo "   ❌ Erro na configuração do Nginx:"
  nginx -t 2>&1
fi

NGINX_PROXY=$(grep -A 5 "location /api" /etc/nginx/sites-available/inspecionasp 2>/dev/null | grep "proxy_pass" || echo "")
if [ -n "$NGINX_PROXY" ]; then
  echo "   ✅ Proxy do Nginx configurado: $NGINX_PROXY"
else
  echo "   ⚠️  Proxy do Nginx pode não estar configurado corretamente"
fi

# 12. Verificar logs do Nginx
echo ""
echo "1️⃣2️⃣ Últimas 10 linhas dos logs de erro do Nginx:"
echo "----------------------------------------"
tail -10 /var/log/nginx/inspecionasp-frontend-error.log 2>/dev/null || echo "   ⚠️  Não foi possível ler logs do Nginx"
echo "----------------------------------------"

echo ""
echo "=========================================="
echo "✅ DIAGNÓSTICO CONCLUÍDO"
echo "=========================================="
echo ""
echo "📋 Resumo:"
echo "  - JWT_SECRET: $(grep "^JWT_SECRET=" .env.production 2>/dev/null | cut -d'=' -f2- | cut -c1-20)..."
echo "  - Backend PM2: $(pm2 list | grep inspecionasp-backend | awk '{print $10}' || echo 'NÃO ENCONTRADO')"
echo "  - Porta 5006: $(lsof -i :5006 >/dev/null 2>&1 && echo 'EM USO' || echo 'LIVRE')"
echo "  - HTTP Response: $HTTP_CODE"
echo ""
echo "🔧 Próximos passos:"
echo "  1. Se JWT_SECRET estava faltando, o backend deve iniciar agora"
echo "  2. Verifique os logs acima para identificar outros problemas"
echo "  3. Se necessário, execute: pm2 restart inspecionasp-backend"
echo "  4. Teste: curl http://localhost:5006/api/trpc"






