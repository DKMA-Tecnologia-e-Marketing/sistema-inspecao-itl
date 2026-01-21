# Correção Rápida: Erro 502 Bad Gateway

## 🚨 Problema

O erro **502 Bad Gateway** indica que o Nginx não consegue se conectar ao backend na porta 5006.

**Causa mais provável:** `JWT_SECRET` não está definido no servidor, fazendo com que o backend não inicie.

## ✅ Solução Rápida (3 passos)

### Passo 1: Conectar ao servidor

```bash
ssh root@31.220.77.103
cd /var/www/inspecionasp
```

### Passo 2: Executar script de correção

```bash
# Copiar o script para o servidor (do seu computador local)
scp scripts/fix-backend-502.sh root@31.220.77.103:/var/www/inspecionasp/

# No servidor, executar:
cd /var/www/inspecionasp
bash fix-backend-502.sh
```

**OU executar manualmente:**

```bash
# Verificar se JWT_SECRET está definido
grep JWT_SECRET .env.production

# Se não estiver, adicionar:
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production

# Reiniciar backend
pm2 restart inspecionasp-backend

# Verificar status
pm2 status inspecionasp-backend
pm2 logs inspecionasp-backend --lines 20
```

### Passo 3: Testar

```bash
# Testar se o backend responde
curl http://localhost:5006/api/trpc

# Deve retornar JSON (não HTML)
```

## 🔍 Verificações Adicionais

Se o problema persistir:

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
cat /etc/nginx/sites-available/inspecionasp | grep -A 5 "location /api"
```

### 5. Recarregar Nginx

```bash
systemctl reload nginx
```

## 📋 Checklist

- [ ] `JWT_SECRET` está definido no `.env.production`
- [ ] Backend está rodando (`pm2 list`)
- [ ] Porta 5006 está em uso (`lsof -i :5006`)
- [ ] Backend responde localmente (`curl http://localhost:5006/api/trpc`)
- [ ] Nginx está configurado corretamente (`nginx -t`)
- [ ] Nginx foi recarregado (`systemctl reload nginx`)

## 🎯 Resultado Esperado

Após executar a correção:

1. ✅ `JWT_SECRET` está definido
2. ✅ Backend inicia sem erros
3. ✅ Backend responde na porta 5006
4. ✅ Nginx consegue se conectar ao backend
5. ✅ Erro 502 desaparece

## 📞 Se o Problema Persistir

Execute o diagnóstico completo:

```bash
cd /var/www/inspecionasp
bash scripts/diagnostico-backend.sh
```

Ou verifique os logs manualmente:

```bash
pm2 logs inspecionasp-backend --lines 100
tail -f /var/log/nginx/inspecionasp-frontend-error.log
```






