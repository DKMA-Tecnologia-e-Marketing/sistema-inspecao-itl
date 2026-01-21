# Correção do Erro CORS - Headers Duplicados

## 🔍 Problema

O erro `Access-Control-Allow-Origin header contains multiple values` ocorre porque tanto o Nginx quanto o Express estão adicionando headers CORS, causando duplicação.

## ✅ Solução Aplicada

Removido o middleware CORS do Express, já que o Nginx já está configurado para gerenciar CORS.

## 🚀 Como Fazer Deploy da Correção

### Opção 1: Script Automatizado

```bash
./deploy-cors-fix.sh
# Senha: Dk2025dkma
```

### Opção 2: Manual

```bash
# 1. Enviar arquivo corrigido
scp dist/index.js root@inspecionasp.com.br:/var/www/inspecionasp/dist/

# 2. Reiniciar PM2
ssh root@inspecionasp.com.br "cd /var/www/inspecionasp && pm2 restart inspecionasp-backend"
```

## 📋 Verificação

Após o deploy, teste no navegador:

1. Abra https://inspecionasp.com.br
2. Abra o Console do Desenvolvedor (F12)
3. Verifique se não há mais erros de CORS
4. Tente fazer login

## 🔧 Configuração do Nginx

O Nginx já está configurado corretamente em `/etc/nginx/sites-available/inspecionasp`:

```nginx
location / {
    # CORS headers
    add_header Access-Control-Allow-Origin "https://inspecionasp.com.br" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Proxy para backend
    proxy_pass http://localhost:5006;
    # ... outras configurações
}
```

## ⚠️ Nota

Se você precisar testar localmente sem Nginx, o código do Express ainda tem a lógica de CORS comentada que pode ser reativada para desenvolvimento.

