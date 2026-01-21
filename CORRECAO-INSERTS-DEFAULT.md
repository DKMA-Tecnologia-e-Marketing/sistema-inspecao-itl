# Correção: Erro "default" em Inserts do Drizzle

## 🔍 Problema Identificado

O Drizzle ORM estava gerando INSERTs com campos usando `default` como valor literal no SQL:
```sql
insert into `inspectionTypes` (..., `descricao`, `ativo`, `createdAt`, `updatedAt`) 
values (..., default, default, default, default)
```

O MySQL não aceita `default` como valor literal em INSERTs quando o campo não tem DEFAULT configurado no schema, causando erros como:
- `Field 'descricao' doesn't have a default value`
- `Field 'createdAt' doesn't have a default value`
- etc.

## ✅ Solução Aplicada (Abordagem B)

**Parar de usar DEFAULT no insert** - Passar valores explícitos para todos os campos com default.

### Schemas das Tabelas

#### `tenants`
```sql
CREATE TABLE `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `cnpj` varchar(18) NOT NULL UNIQUE,
  `telefone` varchar(20) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `endereco` text DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `latitude` varchar(50) DEFAULT NULL,
  `longitude` varchar(50) DEFAULT NULL,
  `asaasWalletId` varchar(100) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT now(),
  `updatedAt` timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

#### `inspectionTypes`
```sql
CREATE TABLE `inspectionTypes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `precoBase` int NOT NULL,
  `variacaoMaxima` int NOT NULL DEFAULT 0,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT now(),
  `updatedAt` timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

## 📋 Funções Corrigidas

### 1. `createTenant` ✅

**ANTES:**
```typescript
export async function createTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(tenants).values(tenant);
  return result;
}
```

**DEPOIS:**
```typescript
export async function createTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const insertValues: Record<string, unknown> = {
      nome: tenant.nome,
      cnpj: tenant.cnpj,
    };

    // Adicionar campos opcionais apenas se tiverem valores válidos
    if (tenant.telefone !== undefined && tenant.telefone !== null && tenant.telefone.trim() !== "") {
      insertValues.telefone = tenant.telefone;
    }
    // ... outros campos opcionais ...

    // CRÍTICO: Adicionar campos com default explicitamente
    insertValues.ativo = true;
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    const [result] = await db.insert(tenants).values(insertValues);
    const tenantId = Number(result.insertId);
    return await getTenantById(tenantId);
  } catch (error: any) {
    // Logs detalhados do erro
    console.error("[Database] ❌ ERRO COMPLETO ao criar tenant:", error?.sqlMessage);
    throw error;
  }
}
```

### 2. `createInspectionType` ✅

**ANTES:**
```typescript
export async function createInspectionType(data: InsertInspectionType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(inspectionTypes).values(data);
}
```

**DEPOIS:**
```typescript
export async function createInspectionType(data: InsertInspectionType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const insertValues: Record<string, unknown> = {
      nome: data.nome,
      precoBase: data.precoBase,
    };

    if (data.categoria !== undefined && data.categoria !== null && data.categoria.trim() !== "") {
      insertValues.categoria = data.categoria;
    }
    if (data.descricao !== undefined && data.descricao !== null && data.descricao.trim() !== "") {
      insertValues.descricao = data.descricao;
    }
    
    // Campos com default: passar valores explícitos
    insertValues.variacaoMaxima = data.variacaoMaxima ?? 0;
    insertValues.ativo = data.ativo ?? true;
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    const [result] = await db.insert(inspectionTypes).values(insertValues);
    const inspectionTypeId = Number(result.insertId);
    return await getInspectionTypeById(inspectionTypeId);
  } catch (error: any) {
    console.error("[Database] ❌ ERRO COMPLETO ao criar inspection type:", error?.sqlMessage);
    throw error;
  }
}
```

### 3. `createCustomer` ✅

**ANTES:**
```typescript
export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(customers).values(customer);
  return await getCustomerById(Number(result.insertId));
}
```

**DEPOIS:**
```typescript
export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const insertValues: Record<string, unknown> = {
      nome: customer.nome,
      cpf: customer.cpf,
    };

    // Adicionar campos opcionais...
    
    // Campos com default: passar valores explícitos
    insertValues.emailVerificado = customer.emailVerificado ?? false;
    insertValues.telefoneVerificado = customer.telefoneVerificado ?? false;
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    const [result] = await db.insert(customers).values(insertValues);
    return await getCustomerById(Number(result.insertId));
  } catch (error: any) {
    console.error("[Database] ❌ ERRO ao criar customer:", error?.sqlMessage);
    throw error;
  }
}
```

### 4. `createVehicle` ✅

**ANTES:**
```typescript
export async function createVehicle(vehicle: InsertVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(vehicles).values(vehicle);
  return await getVehicleById(Number(result.insertId));
}
```

**DEPOIS:**
```typescript
export async function createVehicle(vehicle: InsertVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const insertValues: Record<string, unknown> = {
      placa: vehicle.placa,
      renavam: vehicle.renavam,
      customerId: vehicle.customerId,
    };

    // Adicionar campos opcionais...
    
    // Campos com default: passar valores explícitos
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    const [result] = await db.insert(vehicles).values(insertValues);
    return await getVehicleById(Number(result.insertId));
  } catch (error: any) {
    console.error("[Database] ❌ ERRO ao criar vehicle:", error?.sqlMessage);
    throw error;
  }
}
```

### 5. `createServiceCategory` ✅

**ANTES:**
```typescript
export async function createServiceCategory(category: InsertServiceCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(serviceCategories).values(category);
}
```

**DEPOIS:**
```typescript
export async function createServiceCategory(category: InsertServiceCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const insertValues: Record<string, unknown> = {
      nome: category.nome,
    };

    if (category.descricao !== undefined && category.descricao !== null && category.descricao.trim() !== "") {
      insertValues.descricao = category.descricao;
    }
    
    // Campos com default: passar valores explícitos
    insertValues.ativo = category.ativo ?? true;
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    return await db.insert(serviceCategories).values(insertValues);
  } catch (error: any) {
    console.error("[Database] ❌ ERRO ao criar service category:", error?.sqlMessage);
    throw error;
  }
}
```

### 6. `createService` ✅

**ANTES:**
```typescript
export async function createService(service: InsertService) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(services).values(service);
}
```

**DEPOIS:**
```typescript
export async function createService(service: InsertService) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const insertValues: Record<string, unknown> = {
      nome: service.nome,
      categoryId: service.categoryId,
    };

    if (service.descricao !== undefined && service.descricao !== null && service.descricao.trim() !== "") {
      insertValues.descricao = service.descricao;
    }
    
    // Campos com default: passar valores explícitos
    insertValues.ativo = service.ativo ?? true;
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    return await db.insert(services).values(insertValues);
  } catch (error: any) {
    console.error("[Database] ❌ ERRO ao criar service:", error?.sqlMessage);
    throw error;
  }
}
```

### 7. `createInspectionScope` ✅

**ANTES:**
```typescript
export async function createInspectionScope(scope: InsertInspectionScope) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(inspectionScopes).values(scope);
}
```

**DEPOIS:**
```typescript
export async function createInspectionScope(scope: InsertInspectionScope) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const insertValues: Record<string, unknown> = {
      nome: scope.nome,
      tipo: scope.tipo,
    };

    if (scope.descricao !== undefined && scope.descricao !== null && scope.descricao.trim() !== "") {
      insertValues.descricao = scope.descricao;
    }
    
    // Campos com default: passar valores explícitos
    insertValues.requerAutorizacaoDetran = scope.requerAutorizacaoDetran ?? false;
    insertValues.ativo = scope.ativo ?? true;
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    return await db.insert(inspectionScopes).values(insertValues);
  } catch (error: any) {
    console.error("[Database] ❌ ERRO ao criar inspection scope:", error?.sqlMessage);
    throw error;
  }
}
```

## 📋 Padrão Aplicado

Para TODAS as funções de insert:

1. ✅ Construir objeto `insertValues` apenas com campos obrigatórios
2. ✅ Adicionar campos opcionais apenas se tiverem valores válidos (não undefined, não null, não string vazia)
3. ✅ **CRÍTICO**: Adicionar campos com default explicitamente:
   - `ativo: true` (ou valor do input)
   - `createdAt: new Date()`
   - `updatedAt: new Date()`
   - Outros campos com default conforme necessário
4. ✅ Logs detalhados de erro incluindo `sqlMessage`, `sql`, `code`

## 🎯 Resultado Esperado

- ✅ Nenhum campo usa `default` como valor literal no SQL
- ✅ Todos os campos com default recebem valores explícitos
- ✅ Logs detalhados mostram erros reais do banco se ocorrerem
- ✅ Inserts funcionam corretamente para `tenants`, `inspectionTypes`, `customers`, `vehicles`, `serviceCategories`, `services`, `inspectionScopes`

## ⚠️ Funções que Ainda Precisam de Correção

As seguintes funções ainda podem ter o mesmo problema (não corrigidas ainda):
- `createInspectionLine`
- `createInspectionLineCapability`
- `createPriceConfiguration`
- `createAppointment`
- `createPayment`
- `createPaymentSplit`
- `createSplitConfiguration`
- `createAuditLog`
- `createWhatsappMessage`
- `createFinancialReconciliation`
- `createReport`
- `createCompany`
- `createInvoice`
- `createInvoiceAppointment`
- `createUserGroup`
- `createGroupMenuPermission`
- `createReconciliationConfig`
- `createReconciliation`

**Recomendação**: Aplicar o mesmo padrão para essas funções quando necessário.






