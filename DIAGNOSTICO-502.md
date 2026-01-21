# Diagnóstico: Erro 502 Bad Gateway

## 🔍 Problema

O erro **502 Bad Gateway** indica que o Nginx não consegue se conectar ao backend na porta 5006.

## ✅ Verificações Necessárias

### 1. Verificar se o backend está rodando

```bash
# Conectar ao servidor
ssh root@31.220.77.103

# Verificar status do PM2
pm2 list
pm2 status inspecionasp-backend

# Verificar se a porta 5006 está em uso
lsof -i :5006
netstat -tlnp | grep 5006
```

### 2. Verificar logs do backend

```bash
# Ver logs recentes
pm2 logs inspecionasp-backend --lines 50

# Ver logs de erro
pm2 logs inspecionasp-backend --err --lines 50
```

### 3. Verificar se JWT_SECRET está configurado

O backend agora **requer** que `JWT_SECRET` esteja definido. Se não estiver, o servidor não iniciará.

```bash
# Verificar variáveis de ambiente
cd /var/www/inspecionasp
cat .env.production | grep JWT_SECRET

# Se não estiver definido, adicionar:
echo "JWT_SECRET=sua-chave-secreta-aqui" >> .env.production
```

### 4. Testar conexão direta com o backend

```bash
# No servidor, testar se o backend responde
curl http://localhost:5006/api/trpc

# Deve retornar JSON (não HTML)
```

### 5. Verificar configuração do Nginx

```bash
# Verificar configuração do Nginx
cat /etc/nginx/sites-available/inspecionasp | grep -A 10 "location /api"

# Deve mostrar:
# location /api/ {
#     proxy_pass http://localhost:5006;
#     ...
# }

# Testar configuração do Nginx
nginx -t

# Recarregar Nginx
systemctl reload nginx
```

## 🔧 Soluções Possíveis

### Solução 1: Backend não está rodando

Se o backend não estiver rodando:

```bash
cd /var/www/inspecionasp
pm2 restart inspecionasp-backend
# ou
pm2 start ecosystem.config.cjs --only inspecionasp-backend
```

### Solução 2: JWT_SECRET não está definido

Se o backend não iniciar por falta de `JWT_SECRET`:

```bash
cd /var/www/inspecionasp

# Gerar uma chave segura
openssl rand -base64 32

# Adicionar ao .env.production
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production

# Reiniciar backend
pm2 restart inspecionasp-backend
```

### Solução 3: Backend está crashando na inicialização

Verificar logs para identificar o erro:

```bash
pm2 logs inspecionasp-backend --lines 100
```

Erros comuns:
- `Environment variable JWT_SECRET is required but not set or is empty`
- `Port 5006 is already in use`
- Erro de conexão com banco de dados

### Solução 4: Porta 5006 está ocupada por outro processo

```bash
# Verificar qual processo está usando a porta
lsof -i :5006

# Se necessário, matar o processo
kill -9 <PID>

# Reiniciar backend
pm2 restart inspecionasp-backend
```

## 📋 Checklist de Diagnóstico

- [ ] Backend está rodando (`pm2 list`)
- [ ] Porta 5006 está em uso (`lsof -i :5006`)
- [ ] Backend responde localmente (`curl http://localhost:5006/api/trpc`)
- [ ] JWT_SECRET está definido (`.env.production`)
- [ ] Nginx está configurado corretamente (`nginx -t`)
- [ ] Nginx está rodando (`systemctl status nginx`)
- [ ] Logs do backend não mostram erros (`pm2 logs inspecionasp-backend`)

## 🚨 Erro Mais Provável

Com base nas mudanças recentes, o erro mais provável é:

**`JWT_SECRET` não está definido no servidor de produção**

O código agora valida que `JWT_SECRET` está definido na inicialização. Se não estiver, o servidor não iniciará e o Nginx retornará 502.

### Correção Rápida:

```bash
ssh root@31.220.77.103
cd /var/www/inspecionasp

# Verificar se JWT_SECRET existe
grep JWT_SECRET .env.production

# Se não existir, adicionar:
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production

# Reiniciar backend
pm2 restart inspecionasp-backend

# Verificar logs
pm2 logs inspecionasp-backend --lines 20
```






