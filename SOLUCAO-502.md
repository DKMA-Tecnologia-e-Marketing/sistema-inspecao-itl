# Solução: Erro 502 Bad Gateway

## 🔍 Causa Raiz

O erro **502 Bad Gateway** ocorre porque o backend não está rodando ou não está respondendo na porta 5006. Com base nas mudanças recentes, a causa mais provável é:

**`JWT_SECRET` não está definido no servidor de produção**

O código agora valida que `JWT_SECRET` está definido na inicialização (`server/_core/env.ts`). Se não estiver, o servidor não iniciará e o Nginx retornará 502.

## ✅ Solução Imediata

### Passo 1: Conectar ao servidor

```bash
ssh root@31.220.77.103
cd /var/www/inspecionasp
```

### Passo 2: Verificar se JWT_SECRET está definido

```bash
grep JWT_SECRET .env.production
```

### Passo 3: Se não estiver definido, adicionar

```bash
# Gerar uma chave segura
openssl rand -base64 32

# Adicionar ao .env.production
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production
```

### Passo 4: Reiniciar o backend

```bash
pm2 restart inspecionasp-backend

# Aguardar alguns segundos
sleep 5

# Verificar status
pm2 status inspecionasp-backend

# Verificar logs
pm2 logs inspecionasp-backend --lines 20
```

### Passo 5: Testar conexão

```bash
curl http://localhost:5006/api/trpc
```

Deve retornar JSON (não HTML).

## 🔧 Melhorias no Deploy

O script `deploy.sh` foi atualizado para:

1. **Verificar automaticamente** se `JWT_SECRET` está definido
2. **Gerar automaticamente** `JWT_SECRET` se não estiver definido
3. **Verificar** se o backend iniciou corretamente após o deploy
4. **Testar** se o backend está respondendo

## 📋 Verificações Adicionais

Se o problema persistir após adicionar `JWT_SECRET`:

### 1. Verificar se o backend está rodando

```bash
pm2 list
pm2 status inspecionasp-backend
```

### 2. Verificar logs de erro

```bash
pm2 logs inspecionasp-backend --err --lines 50
```

### 3. Verificar se a porta está em uso

```bash
lsof -i :5006
```

### 4. Verificar configuração do Nginx

```bash
nginx -t
cat /etc/nginx/sites-available/inspecionasp | grep -A 10 "location /api"
```

### 5. Recarregar Nginx

```bash
systemctl reload nginx
```

## 🚨 Erros Comuns

### Erro: "Environment variable JWT_SECRET is required"

**Solução:** Adicionar `JWT_SECRET` ao `.env.production` e reiniciar o backend.

### Erro: "Port 5006 is already in use"

**Solução:** 
```bash
lsof -i :5006
kill -9 <PID>
pm2 restart inspecionasp-backend
```

### Erro: Backend inicia mas não responde

**Solução:** Verificar logs para identificar o erro específico:
```bash
pm2 logs inspecionasp-backend --lines 100
```

## 📝 Próximos Passos

1. Execute a solução imediata acima
2. Teste o login novamente
3. Se o erro persistir, verifique os logs do backend
4. Se necessário, execute o script de diagnóstico:
   ```bash
   cd /var/www/inspecionasp
   ./scripts/diagnostico-backend.sh
   ```






