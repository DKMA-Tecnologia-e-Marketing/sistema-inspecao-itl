# Guia de Deploy - Inspeciona SP

Este guia explica como fazer o deploy da aplicação Inspeciona SP no servidor de produção.

## Informações do Servidor

- **IP**: 31.220.77.103
- **Usuário**: root
- **Frontend**: https://inspecionasp.com.br
- **Backend**: https://api.inspecionasp.com.br

## Pré-requisitos

1. Node.js 20.x ou superior
2. pnpm instalado globalmente
3. PM2 instalado globalmente
4. Nginx instalado e configurado
5. Certificados SSL configurados (Let's Encrypt)

## Passo a Passo

### 1. Configuração Inicial do Servidor (Execute apenas uma vez)

```bash
chmod +x deploy-setup.sh
./deploy-setup.sh
```

Este script irá:
- Instalar Node.js, pnpm, PM2 e Nginx
- Criar diretórios necessários
- Configurar firewall básico

### 2. Configurar Certificados SSL

```bash
# No servidor, execute:
certbot --nginx -d inspecionasp.com.br -d www.inspecionasp.com.br
certbot --nginx -d api.inspecionasp.com.br
```

### 3. Configurar Nginx

```bash
# No servidor, copie o arquivo de configuração:
scp nginx-inspecionasp.conf root@31.220.77.103:/etc/nginx/sites-available/inspecionasp

# Conecte ao servidor:
ssh root@31.220.77.103

# Crie o symlink:
ln -s /etc/nginx/sites-available/inspecionasp /etc/nginx/sites-enabled/

# Teste a configuração:
nginx -t

# Recarregue o nginx:
systemctl reload nginx
```

### 4. Configurar Variáveis de Ambiente

```bash
# No servidor, crie o arquivo .env.production:
cd /var/www/inspecionasp
cp .env.production.example .env.production
nano .env.production  # Edite com suas configurações
```

### 5. Deploy da Aplicação

```bash
# No seu ambiente local:
chmod +x deploy.sh
./deploy.sh
```

O script irá:
1. Fazer build da aplicação
2. Criar um arquivo tar.gz com os arquivos necessários
3. Enviar para o servidor
4. Extrair e configurar no servidor
5. Reiniciar os processos PM2

### 6. Verificar Status

```bash
# Conecte ao servidor:
ssh root@31.220.77.103

# Verificar status do PM2:
pm2 status
pm2 logs inspecionasp-backend
pm2 logs inspecionasp-frontend

# Verificar logs do Nginx:
tail -f /var/log/nginx/inspecionasp-frontend-access.log
tail -f /var/log/nginx/inspecionasp-api-access.log
```

## Estrutura de Diretórios no Servidor

```
/var/www/inspecionasp/
├── dist/              # Build da aplicação
├── node_modules/      # Dependências
├── package.json
├── pnpm-lock.yaml
├── ecosystem.config.js # Configuração PM2
└── .env.production    # Variáveis de ambiente
```

## Comandos Úteis

### PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs inspecionasp-backend
pm2 logs inspecionasp-frontend

# Reiniciar
pm2 restart inspecionasp-backend
pm2 restart inspecionasp-frontend

# Parar
pm2 stop inspecionasp-backend
pm2 stop inspecionasp-frontend

# Deletar
pm2 delete inspecionasp-backend
pm2 delete inspecionasp-frontend
```

### Nginx

```bash
# Testar configuração
nginx -t

# Recarregar configuração
systemctl reload nginx

# Reiniciar
systemctl restart nginx

# Ver status
systemctl status nginx
```

### Logs

```bash
# Logs do PM2
pm2 logs

# Logs do Nginx
tail -f /var/log/nginx/inspecionasp-frontend-access.log
tail -f /var/log/nginx/inspecionasp-frontend-error.log
tail -f /var/log/nginx/inspecionasp-api-access.log
tail -f /var/log/nginx/inspecionasp-api-error.log
```

## Troubleshooting

### Aplicação não inicia

1. Verificar logs do PM2: `pm2 logs`
2. Verificar variáveis de ambiente: `cat /var/www/inspecionasp/.env.production`
3. Verificar se a porta está disponível: `netstat -tulpn | grep 5006`

### Erro 502 Bad Gateway

1. Verificar se o backend está rodando: `pm2 status`
2. Verificar logs do Nginx: `tail -f /var/log/nginx/inspecionasp-api-error.log`
3. Verificar se o proxy está apontando para a porta correta

### Certificado SSL não funciona

1. Verificar certificados: `certbot certificates`
2. Renovar certificado: `certbot renew`
3. Verificar configuração do Nginx

## Atualização

Para atualizar a aplicação, simplesmente execute novamente:

```bash
./deploy.sh
```

O script criará um backup automático antes de atualizar.

## Backup

Os backups são criados automaticamente em `/var/www/inspecionasp/` com o formato:
`backup-YYYYMMDD-HHMMSS.tar.gz`

Para restaurar um backup:

```bash
cd /var/www/inspecionasp
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz
pm2 restart inspecionasp-backend
pm2 restart inspecionasp-frontend
```


