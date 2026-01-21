# Correção: Erro "Zero-length key is not supported" no Backend

## 🔍 Problema Identificado

O erro `TRPCClientError: Zero-length key is not supported` estava ocorrendo porque a variável de ambiente `JWT_SECRET` não estava definida ou estava vazia, e o código estava usando um fallback perigoso que transformava `undefined` em string vazia (`""`).

Quando `jose` (biblioteca de JWT) recebe uma chave vazia para assinar tokens, ela lança o erro "Zero-length key is not supported".

## ✅ Solução Aplicada

### 1. Handler tRPC com logging detalhado (já estava configurado)

**Arquivo:** `server/_core/index.ts`

```typescript
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
```

### 2. Correção do fallback perigoso em `env.ts`

**Arquivo:** `server/_core/env.ts`

**ANTES:**
```typescript
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "", // ❌ FALLBACK PERIGOSO
  // ... resto
};
```

**DEPOIS:**
```typescript
// Validação de variáveis de ambiente críticas
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Environment variable ${name} is required but not set or is empty`);
  }
  return value;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  // CRÍTICO: JWT_SECRET é obrigatório e não pode ser vazio
  cookieSecret: requireEnv("JWT_SECRET"), // ✅ VALIDAÇÃO EXPLÍCITA
  // ... resto
};
```

**Por que:**
- Remove o fallback perigoso `?? ""` que transformava `undefined` em string vazia
- Valida que `JWT_SECRET` está definido e não está vazio **antes** de usar
- Lança erro explícito na inicialização do servidor se a variável não estiver configurada
- Previne o erro "Zero-length key is not supported" na raiz

### 3. Validação adicional em `getSessionSecret()`

**Arquivo:** `server/_core/sdk.ts`

**ANTES:**
```typescript
private getSessionSecret() {
  const secret = ENV.cookieSecret;
  return new TextEncoder().encode(secret);
}
```

**DEPOIS:**
```typescript
private getSessionSecret() {
  const secret = ENV.cookieSecret;
  // Validação adicional de segurança
  if (!secret || secret.length === 0) {
    throw new Error("JWT_SECRET is not set or is empty. Cannot sign session tokens.");
  }
  return new TextEncoder().encode(secret);
}
```

**Por que:**
- Validação adicional como camada de segurança
- Mensagem de erro clara se a validação em `env.ts` falhar por algum motivo
- Garante que nunca passamos uma chave vazia para `jose`

## 📋 Arquivos Modificados

1. **`server/_core/env.ts`**
   - ✅ Criada função `requireEnv()` para validação de variáveis obrigatórias
   - ✅ Removido fallback perigoso `?? ""` de `cookieSecret`
   - ✅ `cookieSecret` agora usa `requireEnv("JWT_SECRET")` que valida antes de retornar

2. **`server/_core/sdk.ts`**
   - ✅ Adicionada validação adicional em `getSessionSecret()`
   - ✅ Mensagem de erro clara se a chave estiver vazia

## 🎯 Resultado Esperado

Com essas correções:
1. ✅ Se `JWT_SECRET` não estiver definido, o servidor **não iniciará** (erro na inicialização)
2. ✅ Se `JWT_SECRET` estiver vazio, o servidor **não iniciará** (erro na inicialização)
3. ✅ A mutation de login não lançará mais "Zero-length key is not supported"
4. ✅ Mensagens de erro claras indicando exatamente qual variável está faltando

## ⚠️ Configuração Necessária

**IMPORTANTE:** Certifique-se de que a variável `JWT_SECRET` está definida no arquivo `.env`:

```bash
JWT_SECRET=seu-secret-key-aqui-com-pelo-menos-32-caracteres
```

**Recomendação:** Use uma chave segura com pelo menos 32 caracteres, gerada aleatoriamente:

```bash
# Gerar uma chave segura (Linux/Mac)
openssl rand -base64 32

# Ou usar Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📝 Verificação

Para verificar se a correção funcionou:

1. **Verificar se o servidor inicia:**
   - Se `JWT_SECRET` não estiver definido, o servidor deve falhar na inicialização com erro claro
   - Se `JWT_SECRET` estiver definido, o servidor deve iniciar normalmente

2. **Testar login:**
   - Fazer login no frontend
   - Verificar se não há mais erro "Zero-length key is not supported"
   - Verificar logs do servidor para confirmar que não há erros

3. **Verificar logs do servidor:**
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

## 🚨 Erro na Inicialização (Esperado)

Se `JWT_SECRET` não estiver definido, você verá um erro como:

```
Error: Environment variable JWT_SECRET is required but not set or is empty
```

Isso é **esperado e correto** - o servidor não deve iniciar sem uma chave de segurança configurada.






