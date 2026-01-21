# Deploy Manual - Passo a Passo

## Conectar ao Servidor

```bash
ssh root@inspecionasp.com.br
# Senha: Dk2025dkma
```

## Comandos para Executar no Servidor

### 1. Navegar para o diretório do projeto

```bash
cd /var/www/inspecionasp
```

### 2. Fazer backup do build anterior (se existir)

```bash
if [ -d "dist" ]; then
    BACKUP_DIR="dist.backup.$(date +%Y%m%d_%H%M%S)"
    mv dist "$BACKUP_DIR"
    echo "Backup criado: $BACKUP_DIR"
fi
```

### 3. Fazer pull das mudanças (se usar Git)

```bash
git pull
```

### 4. Instalar dependências (se necessário)

```bash
pnpm install
```

### 5. Fazer build do projeto

```bash
pnpm build
```

### 6. Parar o processo PM2 atual

```bash
pm2 stop inspecionasp-backend
pm2 delete inspecionasp-backend
```

### 7. Iniciar o novo processo PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### 8. Verificar status

```bash
pm2 status
pm2 logs inspecionasp-backend --lines 20
```

### 9. Testar endpoints

```bash
curl http://localhost:5006/health
curl http://localhost:5006/api/test
```

## Script Completo (Copiar e Colar)

```bash
cd /var/www/inspecionasp && \
if [ -d "dist" ]; then BACKUP_DIR="dist.backup.$(date +%Y%m%d_%H%M%S)"; mv dist "$BACKUP_DIR"; echo "Backup: $BACKUP_DIR"; fi && \
git pull && \
pnpm install && \
pnpm build && \
pm2 stop inspecionasp-backend || true && \
pm2 delete inspecionasp-backend || true && \
pm2 start ecosystem.config.cjs && \
pm2 save && \
pm2 status && \
echo "✅ Deploy concluído!"
```

## Verificações Pós-Deploy

### 1. Verificar se o backend está rodando

```bash
pm2 status
curl http://localhost:5006/health
```

### 2. Verificar logs

```bash
pm2 logs inspecionasp-backend --lines 50
```

### 3. Verificar se o Nginx está configurado

```bash
sudo nginx -t
sudo systemctl status nginx
```

### 4. Testar endpoints públicos

```bash
curl https://api.inspecionasp.com.br/health
curl https://api.inspecionasp.com.br/api/test
```

## Troubleshooting

### Se o PM2 não iniciar:

```bash
# Verificar logs de erro
pm2 logs inspecionasp-backend --err

# Verificar se o arquivo existe
ls -la dist/index.js

# Testar manualmente
NODE_ENV=production node dist/index.js
```

### Se houver erro de permissão:

```bash
# Verificar permissões
ls -la dist/
chmod +x dist/index.js
```

### Se o backend não responder:

```bash
# Verificar se a porta está aberta
netstat -tulpn | grep 5006

# Verificar variáveis de ambiente
cat .env.production
```

