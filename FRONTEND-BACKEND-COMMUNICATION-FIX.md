# Correção: Erro "Servidor retornou uma página de erro" - Comunicação Frontend/Backend

## 🔍 Problema Identificado

O erro `TRPCClientError: Servidor retornou uma página de erro. Verifique se o backend está rodando.` estava ocorrendo porque:

1. **Em desenvolvimento:** O frontend estava usando URL relativa `/api/trpc`, mas o proxy do Vite pode não estar configurado corretamente ou o backend não está rodando na porta esperada.

2. **Em produção:** A URL pode estar incorreta ou o backend não está respondendo corretamente.

3. **O código detecta HTML em vez de JSON:** O fetch customizado verifica se a resposta é HTML e lança o erro.

## ✅ Solução Aplicada

### 1. Código que gera o erro (já existia)

**Arquivo:** `client/src/main.tsx` (linhas 30-46)

```typescript
fetch(input, init) {
  return fetch(input, {
    ...(init ?? {}),
    credentials: "include",
    mode: "cors",
  }).then(async (response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      const text = await response.text();
      console.error("API retornou HTML em vez de JSON:", text.substring(0, 200));
      throw new Error("Servidor retornou uma página de erro. Verifique se o backend está rodando.");
    }
    return response;
  }).catch((error) => {
    console.error("Fetch error:", error);
    throw error;
  });
}
```

**Lógica:** 
- Faz fetch com `credentials: "include"` e `mode: "cors"`
- Verifica se o `content-type` da resposta é `text/html`
- Se for HTML, lança o erro (isso indica que o servidor retornou uma página de erro em vez de JSON)

### 2. Configuração da URL da API

**Arquivo:** `client/src/main.tsx` (linhas 18-24)

**ANTES:**
```typescript
const getApiUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || "https://api.inspecionasp.com.br/api/trpc";
  }
  return "/api/trpc";
};
```

**DEPOIS:**
```typescript
const getApiUrl = () => {
  if (import.meta.env.PROD) {
    // Em produção, usar a URL completa da API
    const apiUrl = import.meta.env.VITE_API_URL || "https://api.inspecionasp.com.br/api/trpc";
    console.log("[tRPC Client] Usando URL de produção:", apiUrl);
    return apiUrl;
  }
  // Em desenvolvimento, usar proxy do Vite (configurado em vite.config.ts)
  // O proxy redireciona /api para http://localhost:5006
  const apiUrl = "/api/trpc";
  console.log("[tRPC Client] Usando URL de desenvolvimento:", apiUrl);
  return apiUrl;
};
```

**Por que:**
- Adiciona logs para debug
- Comentários explicando a lógica
- Em desenvolvimento, usa `/api/trpc` que é redirecionado pelo proxy do Vite para `http://localhost:5006/api/trpc`

### 3. Configuração do Backend

**Arquivo:** `server/_core/index.ts`

**Porta:** 5006 (configurável via `process.env.PORT`)
**Endpoint tRPC:** `/api/trpc`

```typescript
const preferredPort = parseInt(process.env.PORT || "5006");
const port = await findAvailablePort(preferredPort);

server.listen(port, () => {
  console.log(`🚀 Backend API running on http://localhost:${port}/`);
  console.log(`📡 tRPC endpoint: http://localhost:${port}/api/trpc`);
});
```

### 4. Logging no Backend

**Arquivo:** `server/_core/index.ts`

**ADICIONADO:**
```typescript
// Logging middleware para todas as requisições (antes de outras rotas)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.url.startsWith("/api/trpc")) {
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Origin:", req.headers.origin);
  }
  next();
});
```

**Por que:**
- Loga todas as requisições recebidas
- Para requisições tRPC, loga headers importantes
- Facilita debug de problemas de comunicação

### 5. Configuração do Proxy do Vite

**Arquivo:** `vite.config.ts`

```typescript
server: {
  port: 5005,
  host: true,
  proxy: {
    "/api": {
      target: "http://localhost:5006",
      changeOrigin: true,
      secure: false,
    },
  },
  // ...
}
```

**Por que:**
- Em desenvolvimento, o Vite roda na porta 5005
- Requisições para `/api/*` são redirecionadas para `http://localhost:5006`
- Isso permite que o frontend use URLs relativas (`/api/trpc`)

## 📋 Arquivos Modificados

1. **`client/src/main.tsx`**
   - ✅ Adicionados logs para debug da URL usada
   - ✅ Comentários explicando a lógica

2. **`server/_core/index.ts`**
   - ✅ Adicionado middleware de logging para todas as requisições
   - ✅ Logs específicos para requisições tRPC

## 🎯 Resultado Esperado

Com essas correções:
1. ✅ Em desenvolvimento, o frontend usa `/api/trpc` que é redirecionado para `http://localhost:5006/api/trpc`
2. ✅ Em produção, o frontend usa a URL completa da API
3. ✅ Logs no backend mostram todas as requisições recebidas
4. ✅ Logs no frontend mostram qual URL está sendo usada
5. ✅ Se houver erro, os logs ajudarão a identificar o problema

## ⚠️ Verificações Necessárias

### Em Desenvolvimento:

1. **Backend deve estar rodando:**
   ```bash
   # Verificar se o backend está rodando na porta 5006
   lsof -i :5006
   # ou
   curl http://localhost:5006/api/trpc
   ```

2. **Frontend deve estar rodando:**
   ```bash
   # Frontend deve estar na porta 5005
   lsof -i :5005
   ```

3. **Proxy do Vite deve estar funcionando:**
   - Verificar se requisições para `/api/trpc` são redirecionadas para `http://localhost:5006/api/trpc`
   - Verificar logs do Vite para confirmar o proxy

### Em Produção:

1. **Variável de ambiente `VITE_API_URL`:**
   ```bash
   # Deve estar definida no .env ou no build
   VITE_API_URL=https://api.inspecionasp.com.br/api/trpc
   ```

2. **Backend deve estar acessível:**
   ```bash
   # Testar se o backend responde
   curl https://api.inspecionasp.com.br/api/trpc
   ```

3. **CORS deve estar configurado:**
   - O backend deve permitir requisições do frontend
   - Verificar headers CORS nas respostas

## 📝 Debug

Se o erro persistir:

1. **Verificar logs do backend:**
   - Ver se as requisições estão chegando
   - Ver se há erros no servidor

2. **Verificar logs do frontend:**
   - Ver qual URL está sendo usada
   - Ver se há erros de CORS ou rede

3. **Verificar resposta do servidor:**
   - Se o servidor retornar HTML em vez de JSON, verificar:
     - Se o endpoint está correto (`/api/trpc`)
     - Se o backend está rodando
     - Se há erro no servidor que está retornando página de erro

4. **Testar diretamente:**
   ```bash
   # Testar endpoint diretamente
   curl -X POST http://localhost:5006/api/trpc/auth.login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   ```

## 🔧 Stack Trace Original (quando ocorrer)

Quando o erro ocorrer, os logs mostrarão:
- **Frontend:** Qual URL está sendo usada
- **Backend:** Se a requisição chegou, qual método, qual URL, qual content-type
- **Erro:** Stack trace completo do erro

Isso permitirá identificar exatamente onde o problema está ocorrendo.






