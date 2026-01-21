# Instruções de Deploy - Inspeciona SP

## Informações do Servidor

- **IP**: 31.220.77.103
- **Usuário**: root
- **Senha**: Dk2025@@a
- **Frontend**: https://inspecionasp.com.br
- **Backend**: https://api.inspecionasp.com.br

## Pré-requisitos Locais

1. Instalar `sshpass` (para autenticação automática):
   ```bash
   # macOS
   brew install hudochenkov/sshpass/sshpass
   
   # Linux
   sudo apt-get install sshpass
   ```

2. Ou configure chave SSH para acesso sem senha

## Passo 1: Configuração Inicial do Servidor (Uma vez apenas)

Execute o script de setup inicial:

```bash
chmod +x deploy-setup.sh
./deploy-setup.sh
```

Este script irá:
- Instalar Node.js 20.x
- Instalar pnpm
- Instalar PM2
- Instalar Nginx
- Criar diretórios necessários

## Passo 2: Configurar Certificados SSL

Conecte ao servidor e configure os certificados:

```bash
ssh root@31.220.77.103
```

No servidor:

```bash
# Instalar certbot se não estiver instalado
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Obter certificados
certbot --nginx -d inspecionasp.com.br -d www.inspecionasp.com.br
certbot --nginx -d api.inspecionasp.com.br
```

## Passo 3: Configurar Nginx

No servidor:

```bash
# Copiar arquivo de configuração (do seu computador local)
# Ou criar manualmente:

nano /etc/nginx/sites-available/inspecionasp
```

Cole o conteúdo do arquivo `nginx-inspecionasp.conf` e ajuste os caminhos dos certificados SSL.

```bash
# Criar symlink
ln -s /etc/nginx/sites-available/inspecionasp /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Recarregar nginx
systemctl reload nginx
```

## Passo 4: Configurar Variáveis de Ambiente

No servidor:

```bash
cd /var/www/inspecionasp
nano .env.production
```

Configure as seguintes variáveis:

```env
# API URL (usado pelo frontend)
VITE_API_URL=https://api.inspecionasp.com.br/api/trpc

# Porta do backend
PORT=5006

# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=mysql://usuario:senha@localhost:3306/inspecionasp

# Session Secret (gere uma chave aleatória segura)
SESSION_SECRET=sua-chave-secreta-aqui

# Outras variáveis conforme necessário
```

## Passo 5: Primeiro Deploy

No seu computador local, na raiz do projeto:

```bash
# Tornar scripts executáveis
chmod +x deploy.sh deploy-setup.sh

# Executar deploy
./deploy.sh
```

O script irá:
1. Fazer build da aplicação
2. Criar arquivo tar.gz
3. Enviar para o servidor
4. Extrair e configurar
5. Instalar dependências
6. Reiniciar aplicação

## Passo 6: Verificar Deploy

Conecte ao servidor:

```bash
ssh root@31.220.77.103
```

Verificar status:

```bash
# Status do PM2
pm2 status
pm2 logs inspecionasp-backend

# Status do Nginx
systemctl status nginx

# Testar URLs
curl http://localhost:5006/api/trpc
curl http://localhost:5006/health
```

## Atualizações Futuras

Para atualizar a aplicação, simplesmente execute:

```bash
./deploy.sh
```

O script criará um backup automático antes de atualizar.

## Comandos Úteis no Servidor

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
```

### Nginx

```bash
# Testar configuração
nginx -t

# Recarregar
systemctl reload nginx

# Reiniciar
systemctl restart nginx

# Ver logs
tail -f /var/log/nginx/inspecionasp-frontend-access.log
tail -f /var/log/nginx/inspecionasp-api-access.log
```

### Logs

```bash
# Logs do PM2
pm2 logs

# Logs do Nginx
tail -f /var/log/nginx/inspecionasp-frontend-error.log
tail -f /var/log/nginx/inspecionasp-api-error.log
```

## Troubleshooting

### Erro: "Cannot connect to server"

- Verifique se o servidor está acessível: `ping 31.220.77.103`
- Verifique se a porta SSH está aberta: `telnet 31.220.77.103 22`

### Erro: "Permission denied"

- Verifique se está usando o usuário correto (root)
- Verifique permissões dos diretórios: `ls -la /var/www/inspecionasp`

### Aplicação não inicia

- Verifique logs: `pm2 logs inspecionasp-backend`
- Verifique variáveis de ambiente: `cat /var/www/inspecionasp/.env.production`
- Verifique se a porta está disponível: `netstat -tulpn | grep 5006`

### Erro 502 Bad Gateway

- Verifique se o backend está rodando: `pm2 status`
- Verifique logs do Nginx: `tail -f /var/log/nginx/inspecionasp-api-error.log`
- Verifique se o proxy está correto no nginx

### Certificado SSL não funciona

- Verifique certificados: `certbot certificates`
- Renove certificado: `certbot renew --dry-run`
- Verifique configuração do Nginx

## Backup e Restauração

### Criar Backup Manual

```bash
cd /var/www/inspecionasp
tar -czf backup-manual-$(date +%Y%m%d-%H%M%S).tar.gz dist/ .env.production
```

### Restaurar Backup

```bash
cd /var/www/inspecionasp
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz
pm2 restart inspecionasp-backend
```

## Notas Importantes

1. **Segurança**: Nunca commite o arquivo `.env.production` no git
2. **Backup**: Sempre faça backup antes de atualizar
3. **SSL**: Certifique-se de que os certificados SSL estão configurados corretamente
4. **Firewall**: Certifique-se de que as portas 80 e 443 estão abertas
5. **Outras Aplicações**: O nginx está configurado para não interferir com outras aplicações no servidor


