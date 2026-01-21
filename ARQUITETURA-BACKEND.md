# Arquitetura do Backend - Portas e Proxy Reverso

## ✅ Arquitetura Atual (Arquitetura Atual - CORRETA)

```
Cliente (Internet)
    ↓ HTTPS:443
Nginx (api.inspecionasp.com.br)
    ↓ HTTP:5006 (proxy reverso)
Node.js Backend (localhost:5006)
```

### Por que esta arquitetura é recomendada?

1. **Nginx gerencia SSL/TLS**
   - Nginx é otimizado para SSL/TLS
   - Melhor performance que Node.js gerenciando SSL diretamente
   - Suporte a HTTP/2, OCSP Stapling, etc.

2. **Rate Limiting e Proteção**
   - Nginx pode fazer rate limiting antes de chegar ao backend
   - Proteção contra DDoS básica
   - Bloqueio de requisições maliciosas

3. **Cache e Compressão**
   - Nginx pode fazer cache de respostas estáticas
   - Compressão Gzip/Brotli otimizada
   - Reduz carga no backend

4. **Segurança**
   - Backend não precisa expor SSL diretamente
   - Backend roda apenas em localhost (não acessível externamente)
   - Nginx como camada de segurança adicional

5. **Separação de Responsabilidades**
   - Nginx: SSL, proxy, cache, compressão, rate limiting
   - Backend: Lógica de negócio apenas

## ❌ Arquitetura Alternativa (NÃO Recomendada)

```
Cliente (Internet)
    ↓ HTTPS:443
Node.js Backend (diretamente na porta 443)
```

### Por que NÃO é recomendado?

1. **Node.js precisa gerenciar SSL**
   - Menos eficiente que Nginx
   - Mais complexo de configurar
   - Sem suporte nativo a HTTP/2

2. **Sem rate limiting**
   - Vulnerável a ataques DDoS
   - Sem proteção contra abuso

3. **Sem cache/compressão**
   - Toda requisição vai para o backend
   - Mais carga no servidor

4. **Menos seguro**
   - Backend exposto diretamente
   - Sem camada de proteção adicional

## 📊 Configuração Atual

### Portas em Uso

- **Porta 80 (HTTP)**: Nginx - Redireciona para HTTPS
- **Porta 443 (HTTPS)**: Nginx - Proxy reverso para backend
- **Porta 5006 (HTTP interno)**: Node.js Backend - Apenas localhost

### Verificação

```bash
# Portas escutando
ss -tlnp | grep -E ':(443|5006|80)'

# Resultado esperado:
# :80   → Nginx (HTTP)
# :443  → Nginx (HTTPS)
# :5006 → Node.js Backend (HTTP interno)
```

### Fluxo de Requisição

1. Cliente faz requisição: `https://api.inspecionasp.com.br/api/trpc`
2. Nginx recebe na porta 443 (HTTPS)
3. Nginx faz proxy reverso para `http://localhost:5006`
4. Backend Node.js processa a requisição
5. Resposta volta pelo Nginx (com headers CORS, segurança, etc.)
6. Cliente recebe resposta HTTPS

## ⚠️ Problema Identificado

O CORS está configurado incorretamente no Nginx:

```nginx
# ❌ ERRADO: Usando HTTP
add_header Access-Control-Allow-Origin "http://inspecionasp.com.br" always;

# ✅ CORRETO: Deve usar HTTPS
add_header Access-Control-Allow-Origin "https://inspecionasp.com.br" always;
```

## ✅ Conclusão

A arquitetura atual está **CORRETA**:
- ✅ Backend na porta 5006 (HTTP interno)
- ✅ Nginx na porta 443 (HTTPS externo)
- ✅ Proxy reverso funcionando

**Não é necessário mudar a porta do backend**. A configuração atual segue as melhores práticas da indústria.






