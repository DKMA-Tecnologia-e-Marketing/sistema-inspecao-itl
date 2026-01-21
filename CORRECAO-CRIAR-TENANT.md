# Correção: Erro ao Criar Estabelecimento (Tenant)

## 🔍 Problema Identificado

O erro `Failed query: insert into tenants` ocorria porque a função `createTenant` não estava tratando corretamente os valores opcionais (`null` vs `undefined`).

Quando campos opcionais como `latitude`, `longitude`, `asaasWalletId` não eram fornecidos, o Drizzle estava tentando usar `default` em vez de `null`, causando erro na inserção.

## ✅ Solução Aplicada

### Arquivo: `server/db.ts`

**ANTES:**
```typescript
export async function createTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tenants).values(tenant);
  return result;
}
```

**DEPOIS:**
```typescript
export async function createTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Preparar valores, garantindo que campos opcionais sejam null quando não fornecidos
    const values: InsertTenant = {
      nome: tenant.nome,
      cnpj: tenant.cnpj,
      telefone: tenant.telefone ?? null,
      email: tenant.email ?? null,
      endereco: tenant.endereco ?? null,
      cidade: tenant.cidade ?? null,
      estado: tenant.estado ?? null,
      cep: tenant.cep ?? null,
      latitude: tenant.latitude ?? null,
      longitude: tenant.longitude ?? null,
      asaasWalletId: tenant.asaasWalletId ?? null,
      // ativo, createdAt, updatedAt têm defaults no schema
    };

    const [result] = await db.insert(tenants).values(values);
    const tenantId = Number(result.insertId);
    
    // Retornar o tenant criado
    return await getTenantById(tenantId);
  } catch (error) {
    console.error("[Database] Failed to create tenant:", error);
    throw error;
  }
}
```

## 📋 Mudanças

1. ✅ **Tratamento de valores opcionais**: Campos opcionais agora são explicitamente definidos como `null` quando não fornecidos (usando `?? null`)
2. ✅ **Retorno correto**: A função agora retorna o tenant criado (não apenas o resultado da inserção)
3. ✅ **Tratamento de erros**: Adicionado try/catch com log de erro
4. ✅ **Uso correto do insertId**: Extrai o ID do registro inserido e busca o tenant completo

## 🎯 Resultado Esperado

Após a correção:
- ✅ Campos opcionais são tratados corretamente como `null`
- ✅ A inserção no banco de dados funciona corretamente
- ✅ O tenant criado é retornado com todos os dados
- ✅ Erros são logados para facilitar debug

## 📝 Verificação

Para verificar se a correção funcionou:

1. **Testar criação de tenant:**
   - Tentar criar um estabelecimento novamente
   - Verificar se não há mais erro de inserção

2. **Verificar logs do backend:**
   - Se houver erro, será logado com detalhes
   - Verificar se o tenant foi criado corretamente no banco

3. **Verificar dados no banco:**
   - Confirmar que o tenant foi inserido com os valores corretos
   - Verificar que campos opcionais estão como `null` quando não fornecidos






