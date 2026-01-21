# Instruções de Correção: Erro 502 Bad Gateway

## 🚨 Problema

O erro **502 Bad Gateway** persiste mesmo após tentativas de correção. Isso indica que o backend não está iniciando corretamente.

## ✅ Solução Passo a Passo

### Passo 1: Conectar ao servidor

```bash
ssh root@31.220.77.103
cd /var/www/inspecionasp
```

### Passo 2: Executar diagnóstico completo

```bash
# Copiar script de diagnóstico (do seu computador local)
scp scripts/diagnostico-completo-502.sh root@31.220.77.103:/var/www/inspecionasp/

# No servidor, executar:
cd /var/www/inspecionasp
bash diagnostico-completo-502.sh
```

### Passo 3: Verificar e corrigir JWT_SECRET

```bash
# Verificar se JWT_SECRET existe e não está vazio
grep JWT_SECRET .env.production

# Se não existir ou estiver vazio, criar:
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production

# Verificar novamente
cat .env.production | grep JWT_SECRET
```

### Passo 4: Parar e reiniciar o backend completamente

```bash
# Parar completamente
pm2 delete inspecionasp-backend

# Aguardar alguns segundos
sleep 3

# Iniciar novamente
cd /var/www/inspecionasp
pm2 start ecosystem.config.cjs --only inspecionasp-backend

# Aguardar inicialização
sleep 5

# Verificar status
pm2 status inspecionasp-backend
```

### Passo 5: Verificar logs detalhados

```bash
# Ver todos os logs
pm2 logs inspecionasp-backend --lines 50

# Ver apenas erros
pm2 logs inspecionasp-backend --err --lines 50

# Ver logs em tempo real
pm2 logs inspecionasp-backend
```

### Passo 6: Testar conexão direta

```bash
# Testar se o backend responde
curl -v http://localhost:5006/api/trpc

# Deve retornar JSON, não HTML
# Se retornar erro de conexão, o backend não está rodando
```

### Passo 7: Verificar se há erros na inicialização

```bash
# Tentar iniciar manualmente para ver erros
cd /var/www/inspecionasp
NODE_ENV=production PORT=5006 node dist/index.js

# Isso mostrará qualquer erro na inicialização
# Pressione Ctrl+C para parar após ver os erros
```

## 🔍 Problemas Comuns e Soluções

### Problema 1: "Environment variable JWT_SECRET is required"

**Solução:**
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production
pm2 restart inspecionasp-backend
```

### Problema 2: "Port 5006 is already in use"

**Solução:**
```bash
# Encontrar processo usando a porta
lsof -i :5006

# Matar o processo (substituir PID)
kill -9 <PID>

# Reiniciar backend
pm2 restart inspecionasp-backend
```

### Problema 3: Backend inicia mas crasha imediatamente

**Solução:**
```bash
# Ver logs para identificar o erro
pm2 logs inspecionasp-backend --err --lines 100

# Verificar se há problemas com banco de dados
grep DATABASE_URL .env.production

# Verificar se há problemas com outras variáveis
cat .env.production
```

### Problema 4: Backend não aparece no PM2

**Solução:**
```bash
# Verificar se o arquivo ecosystem.config.cjs existe
ls -la ecosystem.config.cjs

# Verificar se o arquivo dist/index.js existe
ls -la dist/index.js

# Tentar iniciar manualmente
cd /var/www/inspecionasp
pm2 start ecosystem.config.cjs --only inspecionasp-backend
```

## 📋 Checklist de Verificação

Execute cada item e marque como concluído:

- [ ] Conectado ao servidor
- [ ] Arquivo `.env.production` existe
- [ ] `JWT_SECRET` está definido e não está vazio
- [ ] `NODE_ENV=production` está definido
- [ ] `PORT=5006` está definido
- [ ] Backend aparece no `pm2 list`
- [ ] Backend está com status "online" no PM2
- [ ] Porta 5006 está em uso (`lsof -i :5006`)
- [ ] Backend responde localmente (`curl http://localhost:5006/api/trpc`)
- [ ] Nenhum erro nos logs do backend
- [ ] Nginx está configurado corretamente (`nginx -t`)
- [ ] Nginx foi recarregado (`systemctl reload nginx`)

## 🎯 Resultado Esperado

Após seguir todos os passos:

1. ✅ `JWT_SECRET` está definido no `.env.production`
2. ✅ Backend aparece no PM2 com status "online"
3. ✅ Porta 5006 está em uso
4. ✅ `curl http://localhost:5006/api/trpc` retorna JSON (não HTML)
5. ✅ Nginx consegue se conectar ao backend
6. ✅ Erro 502 desaparece

## 🆘 Se Nada Funcionar

Execute o diagnóstico completo e envie os resultados:

```bash
cd /var/www/inspecionasp
bash diagnostico-completo-502.sh > diagnostico-resultado.txt 2>&1
cat diagnostico-resultado.txt
```

Isso mostrará exatamente qual é o problema.






