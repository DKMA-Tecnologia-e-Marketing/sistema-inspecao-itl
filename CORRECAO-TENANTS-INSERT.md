# Correção: Erro "default" em INSERT de tenants

## 🔍 Problema Identificado

O Drizzle ORM estava gerando INSERTs com campos usando `default` como valor literal no SQL para campos opcionais que foram omitidos do objeto de insert:

```sql
insert into `tenants` (..., `latitude`, `longitude`, `asaasWalletId`, ...) 
values (..., default, default, default, ...)
```

Quando campos opcionais são **omitidos** do objeto `insertValues`, o Drizzle tenta usar `default` como valor literal, mas o MySQL não aceita isso quando o campo não tem DEFAULT configurado ou quando o campo permite NULL.

## 📋 Schema da Tabela `tenants`

```sql
CREATE TABLE `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `cnpj` varchar(18) NOT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `endereco` text,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `latitude` varchar(50) DEFAULT NULL,        -- ✅ Permite NULL
  `longitude` varchar(50) DEFAULT NULL,       -- ✅ Permite NULL
  `asaasWalletId` varchar(100) DEFAULT NULL, -- ✅ Permite NULL
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_cnpj_unique` (`cnpj`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```

**Observação importante**: Os campos `latitude`, `longitude` e `asaasWalletId` são **NULL** (permitem NULL), mas quando omitidos do objeto de insert, o Drizzle tenta usar `default` como valor literal, causando erro.

## ✅ Solução Aplicada

**Passar `null` explicitamente** para campos opcionais que podem ser NULL, ao invés de omiti-los completamente.

### Código ANTES (❌ Problema)

```typescript
const insertValues: Record<string, unknown> = {
  nome: tenant.nome,
  cnpj: tenant.cnpj,
};

// Adicionar campos opcionais apenas se tiverem valores válidos
if (tenant.telefone !== undefined && tenant.telefone !== null && tenant.telefone.trim() !== "") {
  insertValues.telefone = tenant.telefone;
}
// ... outros campos ...

// latitude, longitude e asaasWalletId: omitir completamente se vazios ou undefined
if (tenant.latitude !== undefined && tenant.latitude !== null && tenant.latitude.trim() !== "") {
  insertValues.latitude = tenant.latitude;
}
// ❌ PROBLEMA: Se latitude for vazio/undefined, o campo é OMITIDO
// O Drizzle então tenta usar DEFAULT como valor literal, causando erro

insertValues.ativo = true;
insertValues.createdAt = new Date();
insertValues.updatedAt = new Date();
```

**Resultado**: Quando `latitude`, `longitude` ou `asaasWalletId` são omitidos, o Drizzle gera SQL com `default` como valor literal, causando erro.

### Código DEPOIS (✅ Correção)

```typescript
const now = new Date();
const insertValues: Record<string, unknown> = {
  nome: tenant.nome,
  cnpj: tenant.cnpj,
  // Campos opcionais: passar valor se existir, senão null
  telefone: (tenant.telefone !== undefined && tenant.telefone !== null && tenant.telefone.trim() !== "") ? tenant.telefone : null,
  email: (tenant.email !== undefined && tenant.email !== null && tenant.email.trim() !== "") ? tenant.email : null,
  endereco: (tenant.endereco !== undefined && tenant.endereco !== null && tenant.endereco.trim() !== "") ? tenant.endereco : null,
  cidade: (tenant.cidade !== undefined && tenant.cidade !== null && tenant.cidade.trim() !== "") ? tenant.cidade : null,
  estado: (tenant.estado !== undefined && tenant.estado !== null && tenant.estado.trim() !== "") ? tenant.estado : null,
  cep: (tenant.cep !== undefined && tenant.cep !== null && tenant.cep.trim() !== "") ? tenant.cep : null,
  // CRÍTICO: latitude, longitude e asaasWalletId devem ser null explicitamente se vazios
  // Não omitir, pois o Drizzle tentará usar DEFAULT
  latitude: (tenant.latitude !== undefined && tenant.latitude !== null && tenant.latitude.trim() !== "") ? tenant.latitude : null,
  longitude: (tenant.longitude !== undefined && tenant.longitude !== null && tenant.longitude.trim() !== "") ? tenant.longitude : null,
  asaasWalletId: (tenant.asaasWalletId !== undefined && tenant.asaasWalletId !== null && tenant.asaasWalletId.trim() !== "") ? tenant.asaasWalletId : null,
  // Campos com default: passar valores explícitos
  ativo: true,
  createdAt: now,
  updatedAt: now,
};
```

**Resultado**: Todos os campos opcionais que podem ser NULL recebem `null` explicitamente quando não têm valor, evitando que o Drizzle tente usar `default` como valor literal.

## 📊 Comparação SQL Gerado

### ANTES (❌ Erro)
```sql
insert into `tenants` (`id`, `nome`, `cnpj`, `telefone`, `email`, `endereco`, `cidade`, `estado`, `cep`, `latitude`, `longitude`, `asaasWalletId`, `ativo`, `createdAt`, `updatedAt`) 
values (default, ?, ?, ?, ?, ?, ?, ?, ?, default, default, default, ?, ?, ?)
--                                                                      ^^^^^^^  ^^^^^^^  ^^^^^^^
--                                                              ❌ Tentando usar DEFAULT como valor literal
```

### DEPOIS (✅ Correto)
```sql
insert into `tenants` (`id`, `nome`, `cnpj`, `telefone`, `email`, `endereco`, `cidade`, `estado`, `cep`, `latitude`, `longitude`, `asaasWalletId`, `ativo`, `createdAt`, `updatedAt`) 
values (default, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
--                                                                      ^  ^  ^
--                                                              ✅ Passando NULL explicitamente
```

## 🎯 Regra Geral para Inserts com Drizzle

**Para campos opcionais que podem ser NULL:**

1. ✅ **SEMPRE** passar `null` explicitamente quando o campo não tiver valor
2. ❌ **NUNCA** omitir campos opcionais do objeto de insert
3. ✅ Passar valores explícitos para campos com default (`ativo`, `createdAt`, `updatedAt`)

**Padrão recomendado:**
```typescript
const insertValues = {
  // Campos obrigatórios
  campoObrigatorio: input.campoObrigatorio,
  
  // Campos opcionais: valor se existir, senão null
  campoOpcional: (input.campoOpcional && input.campoOpcional.trim() !== "") 
    ? input.campoOpcional 
    : null,
  
  // Campos com default: valores explícitos
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## ✅ Resultado Esperado

- ✅ Nenhum campo usa `default` como valor literal no SQL
- ✅ Campos opcionais NULL recebem `null` explicitamente
- ✅ INSERT funciona corretamente para tenants
- ✅ Logs detalhados capturam erros reais do banco se ocorrerem






