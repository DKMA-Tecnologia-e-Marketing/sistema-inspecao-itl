#!/bin/bash
echo "=== DIAGNÓSTICO DO BACKEND ==="
echo ""
echo "1. Status do PM2:"
pm2 list | grep inspecionasp || echo "  ❌ Backend não encontrado no PM2"
echo ""
echo "2. Porta 5006:"
lsof -i :5006 || echo "  ❌ Nenhum processo na porta 5006"
echo ""
echo "3. JWT_SECRET:"
if [ -f ".env.production" ]; then
  if grep -q "^JWT_SECRET=" .env.production; then
    echo "  ✅ JWT_SECRET está definido"
  else
    echo "  ❌ JWT_SECRET NÃO está definido!"
  fi
else
  echo "  ❌ Arquivo .env.production não encontrado!"
fi
echo ""
echo "4. Teste de conexão:"
curl -s -o /dev/null -w "  Status: %{http_code}\n" http://localhost:5006/api/trpc || echo "  ❌ Não foi possível conectar"
echo ""
echo "5. Últimas linhas dos logs:"
pm2 logs inspecionasp-backend --lines 10 --nostream 2>&1 | tail -10
