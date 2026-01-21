# 🚀 Guia de Deploy para Produção

Este guia contém instruções completas para fazer deploy do sistema em produção.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- pnpm instalado (`npm install -g pnpm`)
- PM2 instalado (`npm install -g pm2`)
- Acesso SSH ao servidor de produção
- Nginx configurado (ou outro proxy reverso)
- Banco de dados MySQL configurado

## 🔧 Setup Inicial (Primeira Vez)

### 1. Conectar ao Servidor

```bash
ssh usuario@seu-servidor.com
```

### 2. Clonar o Repositório (se ainda não tiver)

```bash
cd /var/www
git clone seu-repositorio inspecionasp
cd inspecionasp
```

### 3. Executar Script de Setup

```bash
chmod +x deploy-setup.sh
./deploy-setup.sh
```

Este script irá:
- Instalar PM2 e pnpm (se necessário)
- Instalar dependências do projeto
- Criar template do `.env.production`
- Fazer build inicial
- Configurar PM2

### 4. Configurar Variáveis de Ambiente

Edite o arquivo `.env.production`:

```bash
nano .env.production
```

Configure pelo menos:
- `DATABASE_URL` - URL de conexão com o banco de dados
- `JWT_SECRET` - Chave secreta para JWT (gere uma aleatória)
- `COOKIE_SECRET` - Chave secreta para cookies (gere uma aleatória)
- `VITE_API_URL` - URL da API em produção

**⚠️ IMPORTANTE:** Gere secrets seguros:
```bash
# Gerar JWT_SECRET
openssl rand -base64 32

# Gerar COOKIE_SECRET
openssl rand -base64 32
```

## 🚀 Deploy

### Deploy Automatizado

```bash
./deploy.sh
```

Este script irá:
- Fazer backup do build anterior
- Fazer build do projeto (frontend + backend)
- Parar o processo PM2 atual
- Iniciar o novo processo PM2
- Mostrar status e logs

### Deploy Manual

Se preferir fazer manualmente:

```bash
# 1. Fazer build
pnpm build

# 2. Parar processo atual
pm2 stop inspecionasp-backend
pm2 delete inspecionasp-backend

# 3. Iniciar novo processo
pm2 start ecosystem.config.cjs

# 4. Salvar configuração
pm2 save
```

## 🌐 Configuração do Nginx

Crie ou edite o arquivo de configuração do Nginx:

```bash
sudo nano /etc/nginx/sites-available/inspecionasp
```

### Configuração para API (api.inspecionasp.com.br)

```nginx
server {
    listen 443 ssl http2;
    server_name api.inspecionasp.com.br;

    # Certificado SSL (ajuste os caminhos)
    ssl_certificate /etc/letsencrypt/live/api.inspecionasp.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.inspecionasp.com.br/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy para o backend
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
        
        # Tamanho máximo de requisição
        client_max_body_size 50M;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Test endpoint
    location /api/test {
        proxy_pass http://localhost:5006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name api.inspecionasp.com.br;
    return 301 https://$server_name$request_uri;
}
```

### Configuração para Frontend (inspecionasp.com.br)

```nginx
server {
    listen 443 ssl http2;
    server_name inspecionasp.com.br www.inspecionasp.com.br;

    # Certificado SSL
    ssl_certificate /etc/letsencrypt/live/inspecionasp.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inspecionasp.com.br/privkey.pem;

    # Root do frontend build
    root /var/www/inspecionasp/dist/public;
    index index.html;

    # Servir arquivos estáticos
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para API
    location /api/ {
        proxy_pass https://api.inspecionasp.com.br;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name inspecionasp.com.br www.inspecionasp.com.br;
    return 301 https://$server_name$request_uri;
}
```

### Ativar Configuração

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/inspecionasp /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

## 🔍 Verificação e Monitoramento

### Verificar Status do PM2

```bash
pm2 status
pm2 logs inspecionasp-backend
pm2 monit
```

### Testar Endpoints

```bash
# Health check
curl https://api.inspecionasp.com.br/health

# Test endpoint
curl https://api.inspecionasp.com.br/api/test

# Verificar se o backend está respondendo
curl http://localhost:5006/health
```

### Verificar Logs

```bash
# Logs do PM2
pm2 logs inspecionasp-backend --lines 100

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs do sistema
journalctl -u nginx -f
```

## 🔄 Atualizações

Para atualizar o sistema:

```bash
# 1. Fazer pull das mudanças
git pull

# 2. Executar deploy
./deploy.sh
```

## 🛠️ Comandos Úteis

### PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs inspecionasp-backend

# Reiniciar
pm2 restart inspecionasp-backend

# Parar
pm2 stop inspecionasp-backend

# Deletar
pm2 delete inspecionasp-backend

# Monitoramento em tempo real
pm2 monit
```

### Nginx

```bash
# Testar configuração
sudo nginx -t

# Recarregar (sem downtime)
sudo systemctl reload nginx

# Reiniciar
sudo systemctl restart nginx

# Ver status
sudo systemctl status nginx
```

### Banco de Dados

```bash
# Executar migrations
pnpm db:push

# Criar usuário admin
pnpm create-admin --email admin@inspecionasp.com.br --nome "Administrador"
```

## 🐛 Troubleshooting

### Erro 502 Bad Gateway

1. Verificar se o backend está rodando:
   ```bash
   pm2 status
   curl http://localhost:5006/health
   ```

2. Verificar logs do backend:
   ```bash
   pm2 logs inspecionasp-backend --lines 50
   ```

3. Verificar configuração do Nginx:
   ```bash
   sudo nginx -t
   ```

4. Verificar se a porta está aberta:
   ```bash
   netstat -tulpn | grep 5006
   ```

### Backend não inicia

1. Verificar variáveis de ambiente:
   ```bash
   cat .env.production
   ```

2. Verificar logs de erro:
   ```bash
   pm2 logs inspecionasp-backend --err
   ```

3. Testar manualmente:
   ```bash
   NODE_ENV=production node dist/index.js
   ```

### CORS Error

Verificar se o CORS está configurado no servidor (já está implementado no código).

Verificar se o Nginx está passando os headers corretos.

## 📝 Checklist de Deploy

- [ ] Servidor configurado com Node.js e pnpm
- [ ] PM2 instalado e configurado
- [ ] Banco de dados MySQL criado e acessível
- [ ] Arquivo `.env.production` configurado
- [ ] Build executado com sucesso
- [ ] PM2 iniciado e rodando
- [ ] Nginx configurado e testado
- [ ] SSL/HTTPS configurado
- [ ] Endpoints testados e funcionando
- [ ] Logs verificados sem erros
- [ ] PM2 configurado para iniciar no boot

## 🔐 Segurança

- [ ] Secrets gerados com valores aleatórios seguros
- [ ] Arquivo `.env.production` com permissões restritas (chmod 600)
- [ ] Firewall configurado
- [ ] SSL/HTTPS ativado
- [ ] Backups do banco de dados configurados
- [ ] Logs de auditoria ativados

## 📞 Suporte

Em caso de problemas, verifique:
1. Logs do PM2: `pm2 logs inspecionasp-backend`
2. Logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Documentação: `PRODUCAO-502-FIX.md`

