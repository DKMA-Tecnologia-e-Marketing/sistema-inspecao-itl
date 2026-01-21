# Correção do Erro 502 em Produção

## 🔍 Problema
Erro 502 (Bad Gateway) ao acessar `https://api.inspecionasp.com.br/api/trpc/auth.login?batch=1`

## ✅ Correções Aplicadas

### 1. Configuração de CORS
Adicionada configuração de CORS no servidor para permitir requisições do frontend:
- Permite origens: `inspecionasp.com.br`, `www.inspecionasp.com.br`, e localhost para desenvolvimento
- Headers permitidos: `Content-Type`, `Authorization`, `X-Requested-With`
- Credenciais habilitadas para cookies/sessões

### 2. Servidor Escutando em Todas as Interfaces
O servidor agora escuta em `0.0.0.0` (todas as interfaces) em vez de apenas `localhost`, permitindo conexões externas.

### 3. Endpoints de Teste
- `/health` - Health check básico
- `/api/test` - Endpoint de teste para verificar se a API está respondendo

## 🔧 Verificações Necessárias em Produção

### 1. Verificar se o Backend Está Rodando
```bash
# SSH no servidor
ssh usuario@servidor

# Verificar processos Node.js
pm2 list
# ou
ps aux | grep node

# Verificar logs
pm2 logs
# ou
journalctl -u seu-servico -f
```

### 2. Verificar Porta e Conectividade
```bash
# Verificar se a porta está aberta
netstat -tulpn | grep 5006
# ou
ss -tulpn | grep 5006

# Testar conectividade local
curl http://localhost:5006/health
curl http://localhost:5006/api/test
```

### 3. Verificar Configuração do Nginx/Proxy
O nginx precisa estar configurado para fazer proxy reverso para o backend:

```nginx
server {
    listen 443 ssl http2;
    server_name api.inspecionasp.com.br;

    # Certificado SSL
    ssl_certificate /caminho/para/cert.pem;
    ssl_certificate_key /caminho/para/key.pem;

    location /api/ {
        proxy_pass http://localhost:5006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts aumentados para requisições tRPC
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://localhost:5006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 4. Verificar Variáveis de Ambiente
Certifique-se de que as variáveis de ambiente estão configuradas:
```bash
# Verificar .env ou variáveis do sistema
cat .env
# ou
env | grep -E "NODE_ENV|PORT|JWT_SECRET|DATABASE"
```

### 5. Verificar Firewall
```bash
# Verificar se a porta está aberta no firewall
sudo ufw status
# ou
sudo firewall-cmd --list-all
```

## 🚀 Passos para Deploy

1. **Fazer build do projeto:**
```bash
pnpm build
```

2. **Iniciar o servidor com PM2:**
```bash
pm2 start dist/index.js --name "inspeciona-api" --env production
pm2 save
```

3. **Verificar se está rodando:**
```bash
pm2 status
pm2 logs inspeciona-api
```

4. **Testar endpoints:**
```bash
curl https://api.inspecionasp.com.br/health
curl https://api.inspecionasp.com.br/api/test
```

## 📋 Checklist de Diagnóstico

- [ ] Backend está rodando (verificar com `pm2 list` ou `ps aux`)
- [ ] Porta 5006 está aberta e escutando (`netstat -tulpn | grep 5006`)
- [ ] Nginx está configurado corretamente e reiniciado (`sudo nginx -t && sudo systemctl reload nginx`)
- [ ] Variáveis de ambiente estão configuradas
- [ ] Firewall permite conexões na porta necessária
- [ ] Logs do backend não mostram erros (`pm2 logs`)
- [ ] Logs do nginx não mostram erros (`sudo tail -f /var/log/nginx/error.log`)

## 🔍 Logs Importantes

### Backend (PM2)
```bash
pm2 logs inspeciona-api --lines 100
```

### Nginx
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## ⚠️ Problemas Comuns

1. **502 Bad Gateway**: Backend não está rodando ou nginx não consegue conectar
   - Solução: Verificar se o backend está rodando e se a porta está correta no nginx

2. **CORS Error**: Frontend não consegue fazer requisições
   - Solução: Verificar se o CORS está configurado corretamente (já aplicado)

3. **Connection Refused**: Porta não está aberta ou firewall bloqueando
   - Solução: Verificar firewall e se o servidor está escutando em 0.0.0.0

4. **Timeout**: Backend está lento ou travado
   - Solução: Aumentar timeouts no nginx e verificar logs do backend

