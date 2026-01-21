# Documentação: Correção do Erro "crypto is not defined"

## Problema

O erro `crypto is not defined` ocorre em produção quando o código tenta acessar a API Web Crypto, que não está disponível em todos os ambientes de produção.

## Causa Raiz

1. **nanoid** usa `crypto.getRandomValues()` para gerar IDs únicos
2. **jose** (biblioteca JWT) usa crypto, mas já foi removida do frontend via alias
3. Em produção, o código minificado tenta acessar `crypto` diretamente antes do polyfill executar

## Diferença entre Dev e Produção

- **DEV**: Vite processa código em tempo real, não completamente minificado
- **PROD**: Código já compilado/minificado, acesso a `crypto` acontece antes do polyfill

## Solução Implementada

### 1. Polyfill no HTML (client/index.html)
- Executa ANTES de qualquer módulo ES6
- Define `crypto` em `globalThis`, `window`, e `self`
- Usa Function constructor para garantir acesso global

### 2. Plugin Vite (vite-crypto-plugin.ts)
- Injeta polyfill no início de cada chunk JavaScript
- Garante que crypto esteja disponível antes de qualquer código executar

### 3. Plugin de Substituição (vite-crypto-replace-plugin.ts)
- Substitui `crypto` por `globalThis.crypto` durante o build
- Processa dependências como `@trpc/client`, `nanoid`, etc.

### 4. nodePolyfills
- Habilita polyfill para crypto via vite-plugin-node-polyfills

### 5. Script Pós-Build (scripts/fix-crypto-direct.mjs)
- Substitui referências a `crypto` no código compilado final
- Preserva o polyfill mas substitui todas as outras referências
- **CRÍTICO**: Substitui `jsxDEV` por `jsx` (React 19 em produção não deve usar jsxDEV)

### 6. Alias para jose
- Substitui `jose` por módulo vazio no frontend (jose-stub.ts)
- `jose` só é usado no backend

## Arquivos Modificados

- `client/index.html` - Polyfill inline
- `vite.config.ts` - Configuração de plugins e aliases
- `vite-crypto-plugin.ts` - Plugin que injeta polyfill
- `vite-crypto-replace-plugin.ts` - Plugin que substitui referências
- `scripts/fix-crypto-direct.mjs` - Script pós-build
- `client/src/_core/jose-stub.ts` - Stub vazio para jose

## Como Funciona

1. HTML carrega → Polyfill executa primeiro
2. Vite build → Plugins processam código
3. Pós-build → Script substitui referências restantes
4. Browser → Polyfill disponível antes de qualquer código executar

## Verificação

Após build, verificar:
```bash
grep -o '\bcrypto\b' dist/public/assets/index-*.js | wc -l
# Deve retornar apenas referências no polyfill (2-3)

grep -o 'globalThis\.crypto' dist/public/assets/index-*.js | wc -l
# Deve retornar todas as substituições
```

## Se o Problema Persistir

1. Verificar qual dependência específica está causando o problema
2. Substituir por alternativa que não use crypto
3. Ou usar abordagem diferente (ex: chamadas HTTP diretas em vez de tRPC)

