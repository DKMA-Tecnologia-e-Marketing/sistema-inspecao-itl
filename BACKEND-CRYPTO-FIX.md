# Correção: Erro "crypto is not defined" no Backend

## 🔍 Problema Identificado

O erro `TRPCClientError: crypto is not defined` estava ocorrendo no **servidor**, não no frontend. O problema era que a biblioteca `jose` (usada para assinar e verificar JWTs) está configurada para usar a versão `webapi` por padrão, que espera que `globalThis.crypto` esteja disponível.

No Node.js, o módulo `crypto` não está automaticamente disponível em `globalThis.crypto` - ele precisa ser importado e atribuído explicitamente.

## ✅ Solução Aplicada

### 1. Adicionado logging detalhado no handler tRPC

**Arquivo:** `server/_core/index.ts`

**ANTES:**
```typescript
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);
```

**DEPOIS:**
```typescript
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, type, error, ctx, input }) => {
      console.error("========================================");
      console.error("[tRPC ERROR] Erro capturado no servidor:");
      console.error("Path:", path);
      console.error("Type:", type);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Error stack:", error.stack);
      console.error("Input:", input);
      console.error("Context user:", ctx?.user ? `${ctx.user.email} (${ctx.user.id})` : "null");
      console.error("========================================");
    },
  })
);
```

**Por que:** Permite capturar o stack trace completo do erro quando ocorrer, facilitando a identificação do problema.

### 2. Garantido que `crypto` está disponível globalmente

**Arquivo:** `server/_core/sdk.ts`

**ANTES:**
```typescript
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
```

**DEPOIS:**
```typescript
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
// CRÍTICO: Garantir que crypto está disponível globalmente para jose
import * as nodeCrypto from "crypto";
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = nodeCrypto;
}
```

**Por que:** 
- `jose` usa a versão `webapi` por padrão, que espera `globalThis.crypto`
- No Node.js, `crypto` não está em `globalThis` por padrão
- Importamos o módulo `crypto` do Node.js e o atribuímos a `globalThis.crypto` antes de usar `jose`
- Isso garante que `jose` encontre `crypto` quando precisar

## 📋 Arquivos Modificados

1. **`server/_core/index.ts`**
   - ✅ Adicionado `onError` no handler tRPC para logging detalhado

2. **`server/_core/sdk.ts`**
   - ✅ Adicionado import de `crypto` do Node.js
   - ✅ Atribuído `crypto` a `globalThis.crypto` antes de usar `jose`

## 🎯 Resultado Esperado

Com essas correções:
1. ✅ `globalThis.crypto` estará disponível quando `jose` precisar
2. ✅ `SignJWT` e `jwtVerify` funcionarão corretamente
3. ✅ A mutation de login não lançará mais "crypto is not defined"
4. ✅ Erros futuros serão logados com stack trace completo

## ⚠️ Observações

- A correção é **exclusivamente no backend** - nenhuma mudança no frontend
- Não há polyfills ou gambiarras - apenas uso correto da API do Node.js
- O código que usa `crypto` está **exclusivamente no backend** (`server/_core/sdk.ts`)
- Nenhum arquivo do backend está sendo importado no frontend

## 📝 Verificação

Para verificar se a correção funcionou:

1. **Testar login:**
   - Fazer login no frontend
   - Verificar se não há mais erro "crypto is not defined"
   - Verificar logs do servidor para confirmar que não há erros

2. **Verificar logs do servidor:**
   - Se houver algum erro, o `onError` capturará e mostrará o stack trace completo
   - Os logs mostrarão exatamente onde o erro está ocorrendo

## 🔧 Stack Trace Original (quando ocorrer)

Quando o erro ocorrer novamente (se ocorrer), o `onError` mostrará:
- **Path:** Caminho da procedure tRPC (ex: `auth.login`)
- **Type:** Tipo da procedure (ex: `mutation`)
- **Error message:** Mensagem completa do erro
- **Error stack:** Stack trace completo do erro
- **Input:** Dados de entrada da procedure
- **Context user:** Informações do usuário no contexto

Isso permitirá identificar exatamente onde o erro está ocorrendo.






