import { eq, and, desc, asc, sql, gte, lte, like, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  tenants,
  InsertTenant,
  Tenant,
  customers,
  InsertCustomer,
  Customer,
  vehicles,
  InsertVehicle,
  Vehicle,
  serviceCategories,
  InsertServiceCategory,
  ServiceCategory,
  services,
  InsertService,
  Service,
  inspectionScopes,
  InsertInspectionScope,
  InspectionScope,
  inspectionScopeServices,
  InsertInspectionScopeService,
  inspectionTypes,
  InsertInspectionType,
  inspectionLines,
  InsertInspectionLine,
  inspectionLineCapabilities,
  InsertInspectionLineCapability,
  inspectionTypePrices,
  inspectionTypeTenants,
  InsertInspectionTypeTenant,
  InspectionTypeTenant,
  priceConfigurations,
  InsertPriceConfiguration,
  PriceConfiguration,
  detranAuthorizations,
  InsertDetranAuthorization,
  DetranAuthorization,
  appointments,
  InsertAppointment,
  Appointment,
  payments,
  InsertPayment,
  Payment,
  paymentSplits,
  InsertPaymentSplit,
  PaymentSplit,
  splitConfigurations,
  InsertSplitConfiguration,
  SplitConfiguration,
  roles,
  InsertRole,
  Role,
  permissions,
  InsertPermission,
  Permission,
  rolePermissions,
  InsertRolePermission,
  auditLogs,
  InsertAuditLog,
  AuditLog,
  whatsappMessages,
  InsertWhatsappMessage,
  WhatsappMessage,
  financialReconciliations,
  InsertFinancialReconciliation,
  FinancialReconciliation,
  reports,
  InsertReport,
  Report,
  companies,
  InsertCompany,
  Company,
  invoices,
  InsertInvoice,
  Invoice,
  invoiceAppointments,
  InsertInvoiceAppointment,
  InvoiceAppointment,
  userGroups,
  InsertUserGroup,
  UserGroup,
  groupMenuPermissions,
  InsertGroupMenuPermission,
  GroupMenuPermission,
  reconciliationConfig,
  InsertReconciliationConfig,
  ReconciliationConfig,
  reconciliations,
  InsertReconciliation,
  Reconciliation,
  orgaos,
  InsertOrgao,
  Orgao,
  inspectionReports,
  InsertInspectionReport,
  InspectionReport,
  inspectionReportPhotos,
  InsertInspectionReportPhoto,
  InspectionReportPhoto,
  userOrgaos,
  InsertUserOrgao,
  UserOrgao,
  systemConfig,
  InsertSystemConfig,
  SystemConfig,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      console.error("[Database] ❌ DATABASE_URL não está definida!");
      console.error("[Database] Configure DATABASE_URL no arquivo .env ou .env.production");
      return null;
    }
    
    try {
      console.log("[Database] 🔌 Conectando ao banco de dados...");
      console.log("[Database] URL:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"));
      
      // Usar objeto de configuração diretamente (mais confiável)
      const mysql = await import("mysql2/promise");
      const urlStr = process.env.DATABASE_URL.replace(/^mysql2?:\/\//, "http://");
      const url = new URL(urlStr);
      const config = {
        host: (url.hostname === "localhost" ? "127.0.0.1" : url.hostname) || "127.0.0.1",
        port: parseInt(url.port || "3306"),
        user: url.username || "root",
        password: url.password || "",
        database: url.pathname.replace(/^\//, "") || "sistema_inspecao",
      };
      console.log("[Database] Configuração final:", { ...config, password: "****" });
      console.log("[Database] Host sendo usado:", config.host);
      
      const pool = mysql.createPool(config);
      console.log("[Database] Pool criado, testando conexão...");
      _db = drizzle(pool);
      console.log("[Database] Drizzle criado, executando teste...");
      
      // Testar conexão fazendo uma query simples
      const testResult = await _db.execute(sql`SELECT 1`);
      console.log("[Database] Teste executado com sucesso, resultado:", testResult);
      console.log("[Database] ✅ Conexão estabelecida com sucesso!");
    } catch (error: any) {
      console.error("[Database] ❌ Falha ao conectar:", error?.message || error);
      console.error("[Database] Stack:", error?.stack);
      _db = null;
    }
  }
  return _db;
}

// ============= USER QUERIES =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.tenantId !== undefined) {
      values.tenantId = user.tenantId;
      updateSet.tenantId = user.tenantId;
    }
    if (user.groupId !== undefined) {
      values.groupId = user.groupId;
      updateSet.groupId = user.groupId;
    }
    if (user.passwordHash !== undefined) {
      values.passwordHash = user.passwordHash;
      updateSet.passwordHash = user.passwordHash;
    }
    if (user.comissaoPercentual !== undefined) {
      values.comissaoPercentual = user.comissaoPercentual;
      updateSet.comissaoPercentual = user.comissaoPercentual;
    }
    if (user.aptoParaAtender !== undefined) {
      values.aptoParaAtender = user.aptoParaAtender;
      updateSet.aptoParaAtender = user.aptoParaAtender;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUsersByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(desc(users.createdAt));
}

// ============= TENANT QUERIES =============

// Helper para verificar se um valor deve ser incluído no insert
function shouldIncludeValue(value: unknown): boolean {
  if (value === undefined) return false;
  if (value === null) return true; // null é válido para campos opcionais
  if (typeof value === "string" && value.trim() === "") return false; // Omitir strings vazias
  return true;
}

export async function createTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Construir objeto de insert com TODOS os campos explicitamente
    // Campos opcionais que podem ser NULL devem receber null explicitamente ao invés de serem omitidos
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
      // CRÍTICO: latitude, longitude, asaasWalletId e iuguAccountId devem ser null explicitamente se vazios
      // Não omitir esses campos, pois o Drizzle tentará usar DEFAULT
      latitude: (tenant.latitude !== undefined && tenant.latitude !== null && tenant.latitude.trim() !== "") ? tenant.latitude : null,
      longitude: (tenant.longitude !== undefined && tenant.longitude !== null && tenant.longitude.trim() !== "") ? tenant.longitude : null,
      asaasWalletId: (tenant.asaasWalletId !== undefined && tenant.asaasWalletId !== null && tenant.asaasWalletId.trim() !== "") ? tenant.asaasWalletId : null,
      iuguAccountId: (tenant.iuguAccountId !== undefined && tenant.iuguAccountId !== null && tenant.iuguAccountId.trim() !== "") ? tenant.iuguAccountId : null,
      // Campos com default: passar valores explícitos
      ativo: true,
      createdAt: now,
      updatedAt: now,
    };

    console.log("[Database] Final insert values:", {
      keys: Object.keys(insertValues),
      count: Object.keys(insertValues).length,
      values: insertValues,
    });
    console.log("[Database] Tipos dos valores:", Object.entries(insertValues).map(([k, v]) => `${k}: ${typeof v} (${v === null ? 'null' : v})`));
    
    const [result] = await db.insert(tenants).values(insertValues);
    const tenantId = Number(result.insertId);
    
    console.log("[Database] Tenant created with ID:", tenantId);
    
    // Retornar o tenant criado
    const createdTenant = await getTenantById(tenantId);
    if (!createdTenant) {
      throw new Error(`Failed to retrieve created tenant with ID ${tenantId}`);
    }
    return createdTenant;
  } catch (error: any) {
    // Log completo do erro do banco de dados
    console.error("========================================");
    console.error("[Database] ❌ ERRO COMPLETO ao criar tenant:");
    console.error("[Database] Error message:", error?.message);
    console.error("[Database] Error code:", error?.code);
    console.error("[Database] Error errno:", error?.errno);
    console.error("[Database] Error sqlState:", error?.sqlState);
    console.error("[Database] Error sqlMessage:", error?.sqlMessage);
    console.error("[Database] Error sql:", error?.sql);
    console.error("[Database] Error stack:", error?.stack);
    
    // Log detalhado de todas as propriedades do erro
    console.error("[Database] Todas as propriedades do erro:", Object.keys(error || {}));
    if (error?.cause) {
      console.error("[Database] Error cause:", error.cause);
    }
    if (error?.originalError) {
      console.error("[Database] Original error:", error.originalError);
    }
    
    // Tentar extrair mensagem SQL mais específica
    const sqlError = error?.sqlMessage || error?.message || error?.toString();
    console.error("[Database] SQL Error Message (prioritário):", sqlError);
    
    // Log dos dados recebidos
    console.error("[Database] Dados recebidos do frontend:", {
      nome: tenant.nome,
      cnpj: tenant.cnpj,
      telefone: tenant.telefone || "(empty/undefined)",
      email: tenant.email || "(empty/undefined)",
      endereco: tenant.endereco || "(empty/undefined)",
      cidade: tenant.cidade || "(empty/undefined)",
      estado: tenant.estado || "(empty/undefined)",
      cep: tenant.cep || "(empty/undefined)",
      latitude: tenant.latitude || "(empty/undefined)",
      longitude: tenant.longitude || "(empty/undefined)",
      asaasWalletId: tenant.asaasWalletId || "(empty/undefined)",
    });
    
    // Log dos valores que tentaram ser inseridos
    console.error("[Database] Valores que tentaram ser inseridos:", {
      insertValuesAvailable: typeof insertValues !== "undefined",
      insertValuesKeys: typeof insertValues !== "undefined" ? Object.keys(insertValues) : "insertValues não disponível",
      insertValuesContent: typeof insertValues !== "undefined" ? insertValues : "insertValues não disponível",
    });
    console.error("========================================");
    
    // Re-throw com mensagem mais detalhada
    const errorMessage = error?.sqlMessage || error?.message || "Erro desconhecido ao criar tenant";
    const detailedError = new Error(`Failed to create tenant: ${errorMessage}${error?.code ? ` (Code: ${error.code})` : ""}`);
    (detailedError as any).originalError = error;
    throw detailedError;
  }
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];

  try {
    // Usar select explícito para evitar problemas com colunas que podem não existir
    return await db
      .select({
        id: tenants.id,
        nome: tenants.nome,
        cnpj: tenants.cnpj,
        telefone: tenants.telefone,
        email: tenants.email,
        endereco: tenants.endereco,
        cidade: tenants.cidade,
        estado: tenants.estado,
        cep: tenants.cep,
        latitude: tenants.latitude,
        longitude: tenants.longitude,
        asaasWalletId: tenants.asaasWalletId,
        iuguAccountId: tenants.iuguAccountId,
        iuguSubaccountToken: tenants.iuguSubaccountToken,
        diasFuncionamento: tenants.diasFuncionamento,
        horarioInicio: tenants.horarioInicio,
        horarioFim: tenants.horarioFim,
        ativo: tenants.ativo,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .orderBy(asc(tenants.nome));
  } catch (error: any) {
    console.error("[DB] Erro ao buscar tenants:", error.message);
    // Se houver erro, tentar sem iuguSubaccountToken (caso a coluna não exista)
    try {
      return await db
        .select({
          id: tenants.id,
          nome: tenants.nome,
          cnpj: tenants.cnpj,
          telefone: tenants.telefone,
          email: tenants.email,
          endereco: tenants.endereco,
          cidade: tenants.cidade,
          estado: tenants.estado,
          cep: tenants.cep,
          latitude: tenants.latitude,
          longitude: tenants.longitude,
          asaasWalletId: tenants.asaasWalletId,
          iuguAccountId: tenants.iuguAccountId,
          diasFuncionamento: tenants.diasFuncionamento,
          horarioInicio: tenants.horarioInicio,
          horarioFim: tenants.horarioFim,
          ativo: tenants.ativo,
          createdAt: tenants.createdAt,
          updatedAt: tenants.updatedAt,
        })
        .from(tenants)
        .orderBy(asc(tenants.nome));
    } catch (fallbackError: any) {
      console.error("[DB] Erro no fallback ao buscar tenants:", fallbackError.message);
      return [];
    }
  }
}

export async function getActiveTenants() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(tenants).where(eq(tenants.ativo, true)).orderBy(asc(tenants.nome));
}

/**
 * Verificar se a coluna iuguSubaccountToken existe na tabela tenants
 */
async function columnExists(columnName: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    // Tentar fazer um SELECT simples na coluna para verificar se existe
    // Se a coluna não existir, vai dar erro
    try {
      await db.execute(
        sql.raw(`SELECT ${columnName} FROM tenants LIMIT 1`)
      );
      console.log(`[DB] Coluna ${columnName} existe (verificado via SELECT)`);
      return true;
    } catch (selectError: any) {
      if (selectError.message?.includes('Unknown column') || 
          selectError.code === 'ER_BAD_FIELD_ERROR' ||
          selectError.errno === 1054) {
        console.log(`[DB] Coluna ${columnName} NÃO existe (verificado via SELECT)`);
        return false;
      }
      // Se for outro erro, tentar método alternativo
      throw selectError;
    }
  } catch (error: any) {
    console.error("[DB] Erro ao verificar coluna:", error.message || error);
    // Se houver erro, assumir que não existe para tentar adicionar
    return false;
  }
}

/**
 * Adicionar coluna iuguSubaccountToken se não existir
 */
async function ensureIuguSubaccountTokenColumn(): Promise<void> {
  try {
    const exists = await columnExists('iuguSubaccountToken');
    if (exists) {
      console.log("[DB] Coluna iuguSubaccountToken já existe, pulando criação");
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    console.log("[DB] Tentando adicionar coluna iuguSubaccountToken...");
    
    // Usar sql.raw que funciona melhor com Drizzle
    // Drizzle suporta ALTER TABLE via sql.raw
    try {
      const result = await db.execute(
        sql.raw(`ALTER TABLE tenants ADD COLUMN iuguSubaccountToken varchar(255) NULL AFTER iuguAccountId`)
      );
      console.log("[DB] ✓ Coluna iuguSubaccountToken adicionada com sucesso!");
      return;
    } catch (alterError: any) {
      // Se a coluna já existe (pode ter sido adicionada entre a verificação e a execução)
      if (alterError.message?.includes('Duplicate column name') || 
          alterError.message?.includes('ER_DUP_FIELDNAME') ||
          alterError.code === 'ER_DUP_FIELDNAME') {
        console.log("[DB] Coluna iuguSubaccountToken já existe (detectado durante ALTER)");
        return;
      }
      
      // Se o erro for de sintaxe ou permissão, tentar método alternativo
      console.error("[DB] Erro ao executar ALTER TABLE:", alterError.message);
      console.error("[DB] Código do erro:", alterError.code);
      console.error("[DB] SQL State:", alterError.sqlState);
      
      // Tentar verificar novamente se a coluna foi criada
      const existsAfter = await columnExists('iuguSubaccountToken');
      if (existsAfter) {
        console.log("[DB] Coluna foi criada (verificação pós-erro)");
        return;
      }
      
      throw alterError;
    }
  } catch (error: any) {
    console.error("[DB] Erro geral ao garantir coluna iuguSubaccountToken:", {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      stack: error.stack,
    });
    throw error;
  }
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filtrar campos undefined e construir objeto apenas com campos válidos
  const safeData: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      safeData[key] = value;
    }
  }

  // Verificar se há campos para atualizar
  if (Object.keys(safeData).length === 0) {
    throw new Error("No values to set");
  }

  // Se iuguSubaccountToken está sendo atualizado, garantir que a coluna existe
  if ('iuguSubaccountToken' in safeData) {
    try {
      await ensureIuguSubaccountTokenColumn();
    } catch (error: any) {
      console.error("[DB] Erro ao garantir coluna iuguSubaccountToken:", error);
      // Continuar tentando atualizar - se falhar, o erro será capturado abaixo
    }
  }

  try {
    return await db.update(tenants).set(safeData).where(eq(tenants.id, id));
  } catch (error: any) {
    // Se o erro for sobre coluna não existir (iuguSubaccountToken), tentar adicionar e tentar novamente
    if (error.message?.includes('iuguSubaccountToken') || 
        error.message?.includes('Unknown column') ||
        error.message?.includes('doesn\'t exist')) {
      console.warn("[DB] Coluna iuguSubaccountToken não existe, tentando adicionar...");
      try {
        await ensureIuguSubaccountTokenColumn();
        // Tentar novamente após adicionar a coluna
        return await db.update(tenants).set(safeData).where(eq(tenants.id, id));
      } catch (migrationError: any) {
        console.error("[DB] Erro ao adicionar coluna:", migrationError);
        // Se não conseguir adicionar, tentar sem o token
        const { iuguSubaccountToken, ...dataWithoutToken } = safeData;
        if (Object.keys(dataWithoutToken).length === 0) {
          throw new Error("Não foi possível adicionar a coluna iuguSubaccountToken. Verifique as permissões do banco de dados.");
        }
        return await db.update(tenants).set(dataWithoutToken).where(eq(tenants.id, id));
      }
    }
    throw error;
  }
}

export async function deleteTenant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(tenants).where(eq(tenants.id, id));
}

export async function getTenantByLocation(latitude: string, longitude: string) {
  const db = await getDb();
  if (!db) return undefined;

  // Simplified location matching - in production, use geospatial queries
  const result = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.ativo, true), eq(tenants.latitude, latitude), eq(tenants.longitude, longitude)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= CUSTOMER QUERIES =============

export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Construir objeto de insert com valores explícitos para campos com default
    const insertValues: Record<string, unknown> = {
      nome: customer.nome,
      cpf: customer.cpf,
    };

    // Adicionar campos opcionais apenas se tiverem valores válidos
    if (customer.email !== undefined && customer.email !== null && customer.email.trim() !== "") {
      insertValues.email = customer.email;
    }
    if (customer.telefone !== undefined && customer.telefone !== null && customer.telefone.trim() !== "") {
      insertValues.telefone = customer.telefone;
    }
    if (customer.endereco !== undefined && customer.endereco !== null && customer.endereco.trim() !== "") {
      insertValues.endereco = customer.endereco;
    }
    if (customer.cidade !== undefined && customer.cidade !== null && customer.cidade.trim() !== "") {
      insertValues.cidade = customer.cidade;
    }
    if (customer.estado !== undefined && customer.estado !== null && customer.estado.trim() !== "") {
      insertValues.estado = customer.estado;
    }
    if (customer.cep !== undefined && customer.cep !== null && customer.cep.trim() !== "") {
      insertValues.cep = customer.cep;
    }
    
    // Campos com default: passar valores explícitos
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    console.log("[Database] Creating customer with values:", {
      keys: Object.keys(insertValues),
      count: Object.keys(insertValues).length,
    });
    
    const [result] = await db.insert(customers).values(insertValues);
    const customerId = Number(result.insertId);
    
    console.log("[Database] Customer created with ID:", customerId);
    
    return await getCustomerById(customerId);
  } catch (error: any) {
    console.error("[Database] ❌ ERRO ao criar customer:", error?.message);
    console.error("[Database] Error sqlMessage:", error?.sqlMessage);
    console.error("[Database] Error sql:", error?.sql);
    throw error;
  }
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customers).where(eq(customers.cpf, cpf)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se o cliente tem inspeções vinculadas
  const appointments = await getAppointmentsByCustomer(id);
  if (appointments.length > 0) {
    throw new Error(`Não é possível deletar o cliente. Existem ${appointments.length} inspeção(ões) vinculada(s).`);
  }

  // Se não tiver inspeções, deletar o cliente
  await db.delete(customers).where(eq(customers.id, id));
}

/**
 * Retorna todos os clientes (apenas para admin)
 */
export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}

/**
 * Retorna todos os clientes que têm appointments naquele tenant
 * 
 * IMPORTANTE: Cada ITL só pode ver seus próprios clientes (clientes que têm inspeções naquela ITL)
 */
export async function getCustomersByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar todos os appointments do tenant para pegar os customerIds únicos
  const tenantAppointments = await db
    .select({ customerId: appointments.customerId })
    .from(appointments)
    .where(eq(appointments.tenantId, tenantId));
  
  const customerIds = Array.from(new Set(tenantAppointments.map((ap) => ap.customerId).filter((id): id is number => id !== null)));

  if (customerIds.length === 0) {
    return [];
  }

  // Buscar os clientes diretamente usando IN query para melhor performance
  const tenantCustomers = await db
    .select()
    .from(customers)
    .where(sql`${customers.id} IN (${sql.join(customerIds.map(id => sql`${id}`), sql`, `)})`);

  return tenantCustomers;
}

// ============= VEHICLE QUERIES =============

export async function createVehicle(vehicle: InsertVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Normalizar placa: remover hífens, espaços e converter para maiúsculas
    const normalizedPlaca = vehicle.placa.replace(/[^A-Z0-9]/g, "").toUpperCase();
    
    console.log("[Database] Criando vehicle com valores:", {
      placaOriginal: vehicle.placa,
      placaNormalizada: normalizedPlaca,
      customerId: vehicle.customerId,
      renavam: vehicle.renavam,
    });
    
    // Construir objeto de insert com valores explícitos para campos com default
    const insertValues: Record<string, unknown> = {
      placa: normalizedPlaca,
      customerId: vehicle.customerId,
    };

    // Adicionar campos opcionais apenas se tiverem valores válidos
    if (vehicle.renavam !== undefined && vehicle.renavam !== null && String(vehicle.renavam).trim() !== "") {
      insertValues.renavam = vehicle.renavam;
    }
    if (vehicle.marca !== undefined && vehicle.marca !== null && vehicle.marca.trim() !== "") {
      insertValues.marca = vehicle.marca;
    }
    if (vehicle.modelo !== undefined && vehicle.modelo !== null && vehicle.modelo.trim() !== "") {
      insertValues.modelo = vehicle.modelo;
    }
    if (vehicle.ano !== undefined && vehicle.ano !== null) {
      insertValues.ano = vehicle.ano;
    }
    if (vehicle.cor !== undefined && vehicle.cor !== null && vehicle.cor.trim() !== "") {
      insertValues.cor = vehicle.cor;
    }
    if (vehicle.chassi !== undefined && vehicle.chassi !== null && vehicle.chassi.trim() !== "") {
      insertValues.chassi = vehicle.chassi;
    }
    
    // Campos com default: passar valores explícitos
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    console.log("[Database] Valores finais do insert:", insertValues);

    const [result] = await db.insert(vehicles).values(insertValues);
    const vehicleId = Number(result.insertId);
    console.log("[Database] Vehicle criado com ID:", vehicleId);
    
    const createdVehicle = await getVehicleById(vehicleId);
    console.log("[Database] Vehicle retornado:", createdVehicle);
    
    return createdVehicle;
  } catch (error: any) {
    console.error("[Database] ❌ ERRO ao criar vehicle:", error?.message);
    console.error("[Database] Error sqlMessage:", error?.sqlMessage);
    console.error("[Database] Error sql:", error?.sql);
    console.error("[Database] Error stack:", error?.stack);
    throw error;
  }
}

export async function getVehicleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateVehicle(id: number, data: Partial<InsertVehicle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Normalizar placa se fornecida
  const updateData: Partial<InsertVehicle> = { ...data };
  if (data.placa) {
    updateData.placa = data.placa.replace(/[^A-Z0-9]/g, "").toUpperCase();
  }

  await db.update(vehicles).set({ ...updateData, updatedAt: new Date() }).where(eq(vehicles.id, id));
  return await getVehicleById(id);
}

export async function getVehicleByPlaca(placa: string) {
  const db = await getDb();
  if (!db) return undefined;

  // Normalizar placa: remover hífens, espaços e converter para maiúsculas
  const normalizedPlaca = placa.replace(/[^A-Z0-9]/g, "").toUpperCase();
  
  console.log("[Database] Buscando veículo por placa:", { original: placa, normalized: normalizedPlaca });

  // Estratégia 1: Busca normalizada (ignorando hífens e case) - mais flexível
  // Isso funciona mesmo se a placa estiver salva com hífen no banco
  let result = await db
    .select()
    .from(vehicles)
    .where(
      sql`REPLACE(UPPER(${vehicles.placa}), '-', '') = ${normalizedPlaca}`
    )
    .limit(1);
  
  console.log("[Database] Busca 1 (normalizada):", result.length > 0 ? `✅ Encontrado: ${result[0].placa}` : "❌ Não encontrado");
  
  // Estratégia 2: Busca exata (caso a placa já esteja normalizada)
  if (result.length === 0) {
    result = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.placa, normalizedPlaca))
      .limit(1);
    console.log("[Database] Busca 2 (exata):", result.length > 0 ? `✅ Encontrado: ${result[0].placa}` : "❌ Não encontrado");
  }
  
  // Estratégia 3: Busca case-insensitive sem remover hífen
  if (result.length === 0) {
    result = await db
      .select()
      .from(vehicles)
      .where(
        sql`UPPER(${vehicles.placa}) = ${normalizedPlaca}`
      )
      .limit(1);
    console.log("[Database] Busca 3 (case-insensitive):", result.length > 0 ? `✅ Encontrado: ${result[0].placa}` : "❌ Não encontrado");
  }
  
  // Estratégia 4: Busca removendo todos os caracteres não alfanuméricos
  if (result.length === 0) {
    result = await db
      .select()
      .from(vehicles)
      .where(
        sql`REPLACE(REPLACE(REPLACE(UPPER(${vehicles.placa}), '-', ''), ' ', ''), '.', '') = ${normalizedPlaca}`
      )
      .limit(1);
    console.log("[Database] Busca 4 (removendo todos caracteres especiais):", result.length > 0 ? `✅ Encontrado: ${result[0].placa}` : "❌ Não encontrado");
  }
  
  // Debug: Listar todas as placas que começam com os primeiros caracteres (para debug)
  if (result.length === 0 && normalizedPlaca.length >= 3) {
    const debugResult = await db
      .select({ placa: vehicles.placa })
      .from(vehicles)
      .where(
        sql`REPLACE(UPPER(${vehicles.placa}), '-', '') LIKE ${sql.raw(`'${normalizedPlaca.substring(0, 3)}%'`)}`
      )
      .limit(10);
    console.log("[Database] Debug - Placas similares encontradas:", debugResult.map(v => v.placa));
  }
  
  console.log("[Database] Resultado final da busca:", result.length > 0 ? `✅ Encontrado: ${result[0].placa} (ID: ${result[0].id}, customerId: ${result[0].customerId})` : "❌ Não encontrado");
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getVehiclesByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vehicles).where(eq(vehicles.customerId, customerId)).orderBy(desc(vehicles.createdAt));
}

// ============= SERVICE CATEGORY QUERIES =============

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
    console.error("[Database] ❌ ERRO ao criar service category:", error?.message);
    console.error("[Database] Error sqlMessage:", error?.sqlMessage);
    console.error("[Database] Error sql:", error?.sql);
    throw error;
  }
}

export async function getAllServiceCategories() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(serviceCategories).orderBy(asc(serviceCategories.nome));
}

export async function getActiveServiceCategories() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(serviceCategories).where(eq(serviceCategories.ativo, true)).orderBy(asc(serviceCategories.nome));
}

export async function updateServiceCategory(id: number, data: Partial<InsertServiceCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(serviceCategories).set(data).where(eq(serviceCategories.id, id));
}

// ============= SERVICE QUERIES =============

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
    console.error("[Database] ❌ ERRO ao criar service:", error?.message);
    console.error("[Database] Error sqlMessage:", error?.sqlMessage);
    console.error("[Database] Error sql:", error?.sql);
    throw error;
  }
}

export async function getAllServices() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(services).orderBy(asc(services.nome));
}

export async function getServicesByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(services).where(eq(services.categoryId, categoryId)).orderBy(asc(services.nome));
}

export async function updateService(id: number, data: Partial<InsertService>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(services).set(data).where(eq(services.id, id));
}

// ============= INSPECTION SCOPE QUERIES =============

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
    console.error("[Database] ❌ ERRO ao criar inspection scope:", error?.message);
    console.error("[Database] Error sqlMessage:", error?.sqlMessage);
    console.error("[Database] Error sql:", error?.sql);
    throw error;
  }
}

export async function getAllInspectionScopes() {
  const db = await getDb();
  if (!db) return [];

  let result = await db.select().from(inspectionScopes).orderBy(asc(inspectionScopes.nome));
  console.log("[Database] Escopos encontrados:", result.length, result.map(s => ({ id: s.id, nome: s.nome, ativo: s.ativo })));
  
  // Se não houver escopos, criar um escopo padrão
  if (result.length === 0) {
    console.log("[Database] Nenhum escopo encontrado, criando escopo padrão...");
    try {
      const defaultScope = {
        nome: "Escopo Padrão",
        tipo: "tecnica" as const,
        descricao: "Escopo padrão criado automaticamente",
        requerAutorizacaoDetran: false,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.insert(inspectionScopes).values(defaultScope);
      console.log("[Database] Escopo padrão criado com sucesso");
      
      // Buscar novamente para retornar o escopo criado
      result = await db.select().from(inspectionScopes).orderBy(asc(inspectionScopes.nome));
    } catch (error: any) {
      console.error("[Database] Erro ao criar escopo padrão:", error?.message);
      // Continuar mesmo com erro, para não quebrar a aplicação
    }
  }
  
  return result;
}

export async function getInspectionScopesByType(tipo: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(inspectionScopes).where(eq(inspectionScopes.tipo, tipo as any)).orderBy(asc(inspectionScopes.nome));
}

export async function updateInspectionScope(id: number, data: Partial<InsertInspectionScope>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(inspectionScopes).set(data).where(eq(inspectionScopes.id, id));
}

// ============= INSPECTION TYPE QUERIES =============

export async function createInspectionType(data: InsertInspectionType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Construir objeto de insert com valores explícitos para campos com default
    const insertValues: Record<string, unknown> = {
      nome: data.nome,
      precoBase: data.precoBase,
    };

    // Adicionar campos opcionais apenas se tiverem valores válidos
    if (data.categoria !== undefined && data.categoria !== null && data.categoria.trim() !== "") {
      insertValues.categoria = data.categoria;
    }
    if (data.descricao !== undefined && data.descricao !== null && data.descricao.trim() !== "") {
      insertValues.descricao = data.descricao;
    }
    if (data.orgao !== undefined && data.orgao !== null && data.orgao.trim() !== "") {
      insertValues.orgao = data.orgao;
    }
    
    // Campos com default: passar valores explícitos
    insertValues.variacaoMaxima = data.variacaoMaxima ?? 0;
    insertValues.ativo = data.ativo ?? true;
    insertValues.createdAt = new Date();
    insertValues.updatedAt = new Date();

    console.log("[Database] Creating inspection type with values:", {
      keys: Object.keys(insertValues),
      count: Object.keys(insertValues).length,
      values: insertValues,
    });
    console.log("[Database] Tipos dos valores:", Object.entries(insertValues).map(([k, v]) => `${k}: ${typeof v} (${v === null ? 'null' : v})`));
    
    const [result] = await db.insert(inspectionTypes).values(insertValues);
    const inspectionTypeId = Number(result.insertId);
    
    console.log("[Database] Inspection type created with ID:", inspectionTypeId);
    
    // Retornar o tipo de inspeção criado
    const createdType = await getInspectionTypeById(inspectionTypeId);
    if (!createdType) {
      throw new Error(`Failed to retrieve created inspection type with ID ${inspectionTypeId}`);
    }
    return createdType;
  } catch (error: any) {
    // Log completo do erro do banco de dados
    console.error("========================================");
    console.error("[Database] ❌ ERRO COMPLETO ao criar inspection type:");
    console.error("[Database] Error message:", error?.message);
    console.error("[Database] Error code:", error?.code);
    console.error("[Database] Error errno:", error?.errno);
    console.error("[Database] Error sqlState:", error?.sqlState);
    console.error("[Database] Error sqlMessage:", error?.sqlMessage);
    console.error("[Database] Error sql:", error?.sql);
    console.error("[Database] Error stack:", error?.stack);
    
    // Log detalhado de todas as propriedades do erro
    console.error("[Database] Todas as propriedades do erro:", Object.keys(error || {}));
    if (error?.cause) {
      console.error("[Database] Error cause:", error.cause);
    }
    if (error?.originalError) {
      console.error("[Database] Original error:", error.originalError);
    }
    
    // Tentar extrair mensagem SQL mais específica
    const sqlError = error?.sqlMessage || error?.message || error?.toString();
    console.error("[Database] SQL Error Message (prioritário):", sqlError);
    
    // Log dos dados recebidos
    console.error("[Database] Dados recebidos do frontend:", {
      nome: data.nome,
      categoria: data.categoria || "(empty/undefined)",
      descricao: data.descricao || "(empty/undefined)",
      precoBase: data.precoBase,
      variacaoMaxima: data.variacaoMaxima ?? "(empty/undefined)",
      ativo: data.ativo ?? "(empty/undefined)",
    });
    console.error("========================================");
    
    // Re-throw com mensagem mais detalhada
    const errorMessage = error?.sqlMessage || error?.message || "Erro desconhecido ao criar inspection type";
    const detailedError = new Error(`Failed to create inspection type: ${errorMessage}${error?.code ? ` (Code: ${error.code})` : ""}`);
    (detailedError as any).originalError = error;
    throw detailedError;
  }
}

export async function getInspectionTypeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(inspectionTypes).where(eq(inspectionTypes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllInspectionTypes(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(inspectionTypes).orderBy(asc(inspectionTypes.nome));
  if (!includeInactive) {
    query = query.where(eq(inspectionTypes.ativo, true));
  }
  return await query;
}

/**
 * Retorna apenas os tipos de inspeção vinculados diretamente ao tenant
 */
export async function getInspectionTypesByTenant(tenantId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) return [];

  // Buscar relacionamentos diretos entre tipos de inspeção e tenant
  const relationships = await db
    .select()
    .from(inspectionTypeTenants)
    .where(
      includeInactive
        ? eq(inspectionTypeTenants.tenantId, tenantId)
        : and(eq(inspectionTypeTenants.tenantId, tenantId), eq(inspectionTypeTenants.ativo, true))
    );

  if (relationships.length === 0) {
    return [];
  }

  const inspectionTypeIds = relationships.map((rel) => rel.inspectionTypeId);

  // Buscar os tipos de inspeção
  const allTypes = await getAllInspectionTypes(includeInactive);

  // Filtrar apenas os tipos vinculados ao tenant
  return allTypes.filter((type) => inspectionTypeIds.includes(type.id));
}

/**
 * Funções para gerenciar relacionamentos entre tipos de inspeção e tenants
 */
export async function getInspectionTypeTenants(inspectionTypeId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar relacionamentos com informações do tenant
  const relationships = await db
    .select({
      id: inspectionTypeTenants.id,
      inspectionTypeId: inspectionTypeTenants.inspectionTypeId,
      tenantId: inspectionTypeTenants.tenantId,
      ativo: inspectionTypeTenants.ativo,
      createdAt: inspectionTypeTenants.createdAt,
      updatedAt: inspectionTypeTenants.updatedAt,
      tenant: {
        id: tenants.id,
        nome: tenants.nome,
        cnpj: tenants.cnpj,
      },
    })
    .from(inspectionTypeTenants)
    .innerJoin(tenants, eq(inspectionTypeTenants.tenantId, tenants.id))
    .where(and(eq(inspectionTypeTenants.inspectionTypeId, inspectionTypeId), eq(inspectionTypeTenants.ativo, true)));

  return relationships;
}

export async function linkInspectionTypeToTenant(inspectionTypeId: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se já existe
  const existing = await db
    .select()
    .from(inspectionTypeTenants)
    .where(
      and(
        eq(inspectionTypeTenants.inspectionTypeId, inspectionTypeId),
        eq(inspectionTypeTenants.tenantId, tenantId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Atualizar para ativo
    await db
      .update(inspectionTypeTenants)
      .set({ ativo: true, updatedAt: new Date() })
      .where(eq(inspectionTypeTenants.id, existing[0].id));
    return existing[0];
  }

  // Criar novo relacionamento
  const [result] = await db
    .insert(inspectionTypeTenants)
    .values({
      inspectionTypeId,
      tenantId,
      ativo: true,
    });

  return await db
    .select()
    .from(inspectionTypeTenants)
    .where(eq(inspectionTypeTenants.id, Number(result.insertId)))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function unlinkInspectionTypeFromTenant(inspectionTypeId: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(inspectionTypeTenants)
    .set({ ativo: false, updatedAt: new Date() })
    .where(
      and(
        eq(inspectionTypeTenants.inspectionTypeId, inspectionTypeId),
        eq(inspectionTypeTenants.tenantId, tenantId)
      )
    );
}

export async function updateInspectionType(id: number, data: Partial<InsertInspectionType>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(inspectionTypes).set(data).where(eq(inspectionTypes.id, id));
}

// ============= INSPECTION LINES QUERIES =============

export async function createInspectionLine(data: InsertInspectionLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(inspectionLines).values(data);
}

export async function getInspectionLineById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(inspectionLines).where(eq(inspectionLines.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getInspectionLinesByTenant(tenantId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(inspectionLines.tenantId, tenantId)];
  if (!includeInactive) {
    conditions.push(eq(inspectionLines.ativo, true));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  return await db
    .select()
    .from(inspectionLines)
    .where(whereClause)
    .orderBy(asc(inspectionLines.id));
}

export async function updateInspectionLine(id: number, data: Partial<InsertInspectionLine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(inspectionLines).set(data).where(eq(inspectionLines.id, id));
}

// ============= INSPECTION LINE CAPABILITIES QUERIES =============

export async function getCapabilitiesByInspectionLine(inspectionLineId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(inspectionLineCapabilities)
    .where(eq(inspectionLineCapabilities.inspectionLineId, inspectionLineId))
    .orderBy(asc(inspectionLineCapabilities.id));
}

export async function createInspectionLineCapability(data: InsertInspectionLineCapability) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(inspectionLineCapabilities).values(data);
}

export async function updateInspectionLineCapability(id: number, data: Partial<InsertInspectionLineCapability>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(inspectionLineCapabilities).set(data).where(eq(inspectionLineCapabilities.id, id));
}

export async function deleteInspectionLineCapability(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(inspectionLineCapabilities).where(eq(inspectionLineCapabilities.id, id));
}

// ============= INSPECTION TYPE PRICING QUERIES =============

export async function getInspectionTypePricesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(inspectionTypePrices).where(and(eq(inspectionTypePrices.tenantId, tenantId), eq(inspectionTypePrices.ativo, true)));
}

export async function getInspectionTypePrice(tenantId: number, inspectionTypeId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(inspectionTypePrices)
    .where(
      and(eq(inspectionTypePrices.tenantId, tenantId), eq(inspectionTypePrices.inspectionTypeId, inspectionTypeId), eq(inspectionTypePrices.ativo, true))
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type SetInspectionTypePriceInput = {
  tenantId: number;
  inspectionTypeId: number;
  preco: number;
  ultimoAjustePor?: number | null;
  observacoes?: string | null;
  ativo?: boolean;
};

export async function setInspectionTypePrice(data: SetInspectionTypePriceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const inspectionType = await getInspectionTypeById(data.inspectionTypeId);
  if (!inspectionType) {
    throw new Error("Tipo de inspeção não encontrado");
  }

  const minPrice = Math.max(0, inspectionType.precoBase - inspectionType.variacaoMaxima);
  const maxPrice = inspectionType.precoBase + inspectionType.variacaoMaxima;

  if (data.preco < minPrice || data.preco > maxPrice) {
    throw new Error(`Preço fora da faixa permitida (${(minPrice / 100).toFixed(2)} - ${(maxPrice / 100).toFixed(2)})`);
  }

  const existing = await getInspectionTypePrice(data.tenantId, data.inspectionTypeId);
  if (existing) {
    await db
      .update(inspectionTypePrices)
      .set({
        preco: data.preco,
        ultimoAjustePor: data.ultimoAjustePor ?? existing.ultimoAjustePor,
        observacoes: data.observacoes ?? existing.observacoes,
        updatedAt: new Date(),
        ativo: data.ativo ?? existing.ativo,
      })
      .where(eq(inspectionTypePrices.id, existing.id));
    return await getInspectionTypePrice(data.tenantId, data.inspectionTypeId);
  }

  await db.insert(inspectionTypePrices).values({
    tenantId: data.tenantId,
    inspectionTypeId: data.inspectionTypeId,
    preco: data.preco,
    ultimoAjustePor: data.ultimoAjustePor,
    observacoes: data.observacoes,
    ativo: data.ativo ?? true,
  });
  return await getInspectionTypePrice(data.tenantId, data.inspectionTypeId);
}

// ============= PRICE CONFIGURATION QUERIES =============

export async function createPriceConfiguration(config: InsertPriceConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(priceConfigurations).values(config);
}

export async function getPriceConfigurationsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(priceConfigurations).where(eq(priceConfigurations.tenantId, tenantId));
}

export async function getPriceByTenantAndService(tenantId: number, serviceId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(priceConfigurations)
    .where(and(eq(priceConfigurations.tenantId, tenantId), eq(priceConfigurations.serviceId, serviceId), eq(priceConfigurations.ativo, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updatePriceConfiguration(id: number, data: Partial<InsertPriceConfiguration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(priceConfigurations).set(data).where(eq(priceConfigurations.id, id));
}

// ============= APPOINTMENT QUERIES =============

export async function createAppointment(appointment: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(appointments).values(appointment);
  const appointmentId = Number(result.insertId);
  return await getAppointmentById(appointmentId);
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAppointmentsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  const appointmentsList = await db.select().from(appointments).where(eq(appointments.tenantId, tenantId)).orderBy(desc(appointments.dataAgendamento));
  
  // Buscar dados relacionados (cliente, veículo, tipo de inspeção, laudo e pagamento) para cada appointment
  const appointmentsWithData = await Promise.all(
    appointmentsList.map(async (ap) => {
      const customer = ap.customerId ? await getCustomerById(ap.customerId) : null;
      const vehicle = ap.vehicleId ? await getVehicleById(ap.vehicleId) : null;
      const inspectionType = ap.inspectionTypeId ? await getInspectionTypeById(ap.inspectionTypeId) : null;
      const inspectionReport = await getInspectionReportByAppointment(ap.id);
      const payment = await getPaymentByAppointment(ap.id);
      
      return {
        ...ap,
        customer,
        vehicle,
        inspectionType,
        inspectionReport: inspectionReport || null,
        payment: payment || null,
      };
    })
  );
  
  return appointmentsWithData;
}

export async function getAppointmentsByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(appointments).where(eq(appointments.customerId, customerId)).orderBy(desc(appointments.dataAgendamento));
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(appointments).set(data).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se a inspeção tem pagamento aprovado
  const payment = await getPaymentByAppointment(id);
  if (payment && payment.status === "aprovado") {
    throw new Error("Não é possível deletar uma inspeção que já foi paga.");
  }

  // Deletar payments relacionados (se houver)
  await db.delete(payments).where(eq(payments.appointmentId, id));

  // Deletar vínculos com invoices (invoiceAppointments)
  await db.delete(invoiceAppointments).where(eq(invoiceAppointments.appointmentId, id));

  // Deletar inspection reports relacionados (se houver)
  await db.delete(inspectionReports).where(eq(inspectionReports.appointmentId, id));

  // Deletar a inspeção
  await db.delete(appointments).where(eq(appointments.id, id));
}

// ============= PAYMENT QUERIES =============

export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(payments).values(payment);
  const paymentId = Number(result.insertId);
  return await getPaymentById(paymentId);
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPaymentByAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(payments).where(eq(payments.appointmentId, appointmentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPayments() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(payments).orderBy(desc(payments.createdAt));
}

export async function getPaymentsByAsaasId(asaasPaymentId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(payments).where(eq(payments.asaasPaymentId, asaasPaymentId));
  return result;
}

export async function getPaymentsByIuguId(iuguPaymentId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(payments).where(eq(payments.iuguPaymentId, iuguPaymentId));
  return result;
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(payments).set(data).where(eq(payments.id, id));
}

// ============= PAYMENT SPLIT QUERIES =============

export async function createPaymentSplit(split: InsertPaymentSplit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(paymentSplits).values(split);
}

export async function getPaymentSplitsByPayment(paymentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(paymentSplits).where(eq(paymentSplits.paymentId, paymentId));
}

export async function getPaymentSplitsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(paymentSplits).where(eq(paymentSplits.tenantId, tenantId)).orderBy(desc(paymentSplits.createdAt));
}

// ============= SPLIT CONFIGURATION QUERIES =============

export async function createSplitConfiguration(config: InsertSplitConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(splitConfigurations).values(config);
}

export async function getSplitConfigurationsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(splitConfigurations).where(eq(splitConfigurations.tenantId, tenantId));
}

export async function getSplitConfigByTenantAndService(tenantId: number, serviceId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(splitConfigurations)
    .where(and(eq(splitConfigurations.tenantId, tenantId), eq(splitConfigurations.serviceId, serviceId), eq(splitConfigurations.ativo, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateSplitConfiguration(id: number, data: Partial<InsertSplitConfiguration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(splitConfigurations).set(data).where(eq(splitConfigurations.id, id));
}

// ============= AUDIT LOG QUERIES =============

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(auditLogs).values(log);
}

export async function getAuditLogsByTenant(tenantId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getAuditLogs(filters: {
  action?: string;
  userId?: number;
  tenantId?: number | null;
  limit?: number;
} = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.tenantId !== undefined) {
    if (filters.tenantId === null) {
      conditions.push(isNull(auditLogs.tenantId));
    } else {
      conditions.push(eq(auditLogs.tenantId, filters.tenantId));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      tenantId: auditLogs.tenantId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      description: auditLogs.description,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit || 100);

  // Enriquecer com dados de usuário e tenant
  const enrichedResult = await Promise.all(
    result.map(async (log) => {
      let userName = "Usuário desconhecido";
      let tenantName = null;

      if (log.userId) {
        const user = await getUserById(log.userId);
        userName = user?.name || userName;
      }

      if (log.tenantId) {
        const tenant = await getTenantById(log.tenantId);
        tenantName = tenant?.nome || null;
      }

      return {
        ...log,
        userName,
        tenantName,
      };
    })
  );

  return enrichedResult;
}

export async function getAuditLogsByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ============= WHATSAPP MESSAGE QUERIES =============

export async function createWhatsappMessage(message: InsertWhatsappMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(whatsappMessages).values(message);
}

export async function getWhatsappMessagesByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(whatsappMessages).where(eq(whatsappMessages.customerId, customerId)).orderBy(asc(whatsappMessages.createdAt));
}

export async function getWhatsappMessagesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(whatsappMessages).where(eq(whatsappMessages.tenantId, tenantId)).orderBy(desc(whatsappMessages.createdAt));
}

// ============= FINANCIAL RECONCILIATION QUERIES =============

export async function createFinancialReconciliation(reconciliation: InsertFinancialReconciliation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(financialReconciliations).values(reconciliation);
}

export async function getFinancialReconciliationsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(financialReconciliations).where(eq(financialReconciliations.tenantId, tenantId)).orderBy(desc(financialReconciliations.createdAt));
}

export async function updateFinancialReconciliation(id: number, data: Partial<InsertFinancialReconciliation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(financialReconciliations).set(data).where(eq(financialReconciliations.id, id));
}

// ============= REPORT QUERIES =============

export async function createReport(report: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(reports).values(report);
}

export async function getReportsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(reports).where(eq(reports.tenantId, tenantId)).orderBy(desc(reports.createdAt));
}

export async function getAllReports() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(reports).orderBy(desc(reports.createdAt));
}

// ============= COMPANY QUERIES =============

export async function createCompany(company: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(companies).values(company);
  return await getCompanyById(Number(result.insertId));
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCompaniesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(companies)
    .where(and(eq(companies.tenantId, tenantId), eq(companies.ativo, true)))
    .orderBy(asc(companies.nome));
}

export async function updateCompany(id: number, data: Partial<InsertCompany>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, id));
  return await getCompanyById(id);
}

// ============= INVOICE QUERIES =============

export async function createInvoice(invoice: Omit<InsertInvoice, 'numero'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gerar número único da fatura
  const numero = `FAT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  // Construir objeto de insert com TODOS os campos explicitamente
  // Campos opcionais que podem ser NULL devem receber null explicitamente ao invés de serem omitidos
  const now = new Date();
  // Construir objeto base - IMPORTANTE: passar null explicitamente para todos os campos opcionais
  // O Drizzle tenta usar "default" como valor literal quando campos são omitidos
  // Para ENUM MySQL, precisamos usar SQL direto para evitar o problema do Drizzle
  // Construir objeto de insert apenas com campos que existem na tabela
  // IMPORTANTE: Não incluir iuguPaymentId pois não existe na tabela do banco
  // Não incluir formaPagamento se não tiver valor válido
  const insertValues: Record<string, unknown> = {
    tenantId: invoice.tenantId,
    companyId: invoice.companyId,
    numero: numero,
    valorTotal: invoice.valorTotal,
    // Campos opcionais: sempre passar null explicitamente (não omitir)
    asaasPaymentId: null, // Não usado - sistema usa Iugu
    // iuguPaymentId NÃO existe na tabela - NÃO incluir
    qrCode: null,
    boletoUrl: null, // Será preenchido após criar na Iugu
    dataVencimento: invoice.dataVencimento || null,
    dataPagamento: invoice.dataPagamento || null,
    observacoes: (invoice.observacoes && String(invoice.observacoes).trim() !== "") ? invoice.observacoes : null,
    // Campos com default: passar valores explícitos
    status: invoice.status || "pendente",
    createdAt: now,
    updatedAt: now,
  };
  
  // NÃO adicionar iuguPaymentId - campo não existe na tabela
  // iuguPaymentId será adicionado via UPDATE após criar a fatura na Iugu (se o campo existir)
  
  // formaPagamento: ENUM MySQL - usar SQL direto para evitar problema do Drizzle com ENUMs
  // O Drizzle está tentando usar "default" mesmo quando omitimos o campo
  // Vamos usar SQL direto para ter controle total sobre o INSERT
  // Preparar formaPagamento: se tiver valor válido, usar; senão, usar NULL explicitamente no SQL
  let formaPagamentoValue: "pix" | "boleto" | null = null;
  if (invoice.formaPagamento && String(invoice.formaPagamento).trim() !== "") {
    const trimmed = String(invoice.formaPagamento).trim();
    if (trimmed === "pix" || trimmed === "boleto") {
      formaPagamentoValue = trimmed as "pix" | "boleto";
    }
  }
  
  // Se formaPagamento não tiver valor, usar SQL direto para ter controle total
  // O Drizzle está inferindo campos do schema mesmo quando omitimos do objeto
  // Usar SQL direto com apenas os campos que existem na tabela
  if (formaPagamentoValue === null) {
    // Usar SQL direto para evitar que o Drizzle infira campos do schema
    const { sql } = await import("drizzle-orm");
    
    // Converter Date objects para strings no formato MySQL
    const formatDateForMySQL = (date: Date | null | undefined): string | null => {
      if (!date) return null;
      if (date instanceof Date) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      }
      return null;
    };
    
    const params = [
      insertValues.tenantId,
      insertValues.companyId,
      insertValues.numero,
      insertValues.valorTotal,
      insertValues.status,
      insertValues.asaasPaymentId ?? null,
      insertValues.qrCode ?? null,
      insertValues.boletoUrl ?? null,
      formatDateForMySQL(insertValues.dataVencimento),
      formatDateForMySQL(insertValues.dataPagamento),
      insertValues.observacoes ?? null,
      formatDateForMySQL(insertValues.createdAt),
      formatDateForMySQL(insertValues.updatedAt),
    ];
    
    console.log("[Database] Creating invoice with SQL direct (formaPagamento and iuguPaymentId omitted)");
    console.log("[Database] SQL params count:", params.length);
    
    // SQL direto com apenas os campos que existem na tabela
    // NÃO incluir formaPagamento nem iuguPaymentId
    // Usar sql template literal para passar parâmetros corretamente
    const insertSQL = sql`
      INSERT INTO invoices (
        tenantId, companyId, numero, valorTotal, status,
        asaasPaymentId, qrCode, boletoUrl,
        dataVencimento, dataPagamento, observacoes, createdAt, updatedAt
      ) VALUES (
        ${insertValues.tenantId}, ${insertValues.companyId}, ${insertValues.numero}, ${insertValues.valorTotal}, ${insertValues.status},
        ${insertValues.asaasPaymentId ?? null}, ${insertValues.qrCode ?? null}, ${insertValues.boletoUrl ?? null},
        ${formatDateForMySQL(insertValues.dataVencimento)}, ${formatDateForMySQL(insertValues.dataPagamento)}, ${insertValues.observacoes ?? null}, ${formatDateForMySQL(insertValues.createdAt)}, ${formatDateForMySQL(insertValues.updatedAt)}
      )
    `;
    
    console.log("[Database] SQL params:", params.map((p, i) => `${i}: ${p} (${typeof p})`).join(', '));
    
    const [result] = await db.execute(insertSQL);
    const insertId = (result as any).insertId;
    console.log("[Database] Invoice created with ID:", insertId);
    
    if (!insertId) {
      throw new Error("Erro ao criar fatura: insertId não retornado");
    }
    
    return await getInvoiceById(Number(insertId));
  } else {
    // Se tiver valor válido, usar o método normal do Drizzle
    // Remover iuguPaymentId pois não existe na tabela
    insertValues.formaPagamento = formaPagamentoValue;
    delete insertValues.iuguPaymentId; // Remover campo que não existe na tabela
    
    console.log("[Database] Creating invoice with values:", {
      keys: Object.keys(insertValues),
      count: Object.keys(insertValues).length,
      formaPagamento: insertValues.formaPagamento,
    });
    const [result] = await db.insert(invoices).values(insertValues);
    return await getInvoiceById(Number(result.insertId));
  }
  
  return await getInvoiceById(Number(result.insertId));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  // Usar SQL direto para não buscar iuguPaymentId que não existe na tabela
  try {
    const result = await db.execute(sql`
      SELECT 
        id, tenantId, companyId, numero, valorTotal, formaPagamento, status,
        asaasPaymentId, qrCode, boletoUrl,
        dataVencimento, dataPagamento, observacoes, createdAt, updatedAt
      FROM invoices
      WHERE id = ${id}
      LIMIT 1
    `);
    
    // O db.execute pode retornar diferentes formatos dependendo do driver
    // Tentar diferentes formatos de acesso
    let row: any = null;
    
    // Função helper para extrair rows de diferentes formatos
    const extractRows = (data: any): any[] => {
      if (Array.isArray(data)) {
        // Se for array, verificar se o primeiro elemento é também um array
        if (data.length > 0 && Array.isArray(data[0])) {
          // Formato [[{...}]] ou [[{...}], fields]
          return data[0];
        } else {
          // Formato [{...}]
          return data;
        }
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data[0])) {
          // Formato { 0: [{...}] }
          return data[0];
        } else if (Array.isArray(data.rows)) {
          // Formato { rows: [{...}] }
          return data.rows;
        } else if (data[0] && typeof data[0] === 'object') {
          // Formato { 0: {...} }
          return [data[0]];
        }
      }
      return [];
    };
    
    const rows = extractRows(result);
    if (rows.length > 0) {
      row = rows[0];
    }
    
    if (row) {
      console.log(`[getInvoiceById] Row encontrada para id ${id}:`, JSON.stringify(row, null, 2));
      // Garantir que id é sempre um número
      const invoice = {
        ...row,
        id: row.id ? Number(row.id) : id,
        tenantId: row.tenantId ? Number(row.tenantId) : row.tenantId,
        companyId: row.companyId ? Number(row.companyId) : row.companyId,
      };
      console.log(`[getInvoiceById] Invoice processada: id=${invoice.id}, boletoUrl=${invoice.boletoUrl ? 'SIM' : 'NÃO'}`);
      return invoice;
    }
    
    console.log(`[getInvoiceById] Nenhuma row encontrada para id ${id}`);
    return undefined;
  } catch (error: any) {
    console.error(`[getInvoiceById] Erro ao buscar fatura ${id}:`, error.message);
    throw error;
  }
}

export async function getInvoicesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  // Usar SQL direto para não buscar iuguPaymentId que não existe na tabela
  const { sql } = await import("drizzle-orm");
  
  try {
    const result = await db.execute(sql`
      SELECT 
        id, tenantId, companyId, numero, valorTotal, formaPagamento, status,
        asaasPaymentId, qrCode, boletoUrl,
        dataVencimento, dataPagamento, observacoes, createdAt, updatedAt
      FROM invoices
      WHERE tenantId = ${tenantId}
      ORDER BY createdAt DESC
    `);
    
    // O db.execute do MySQL2 retorna um array direto quando usado com sql template literal
    // Mas pode também retornar [rows, fields] dependendo da implementação
    let rows: any[] = [];
    
    if (Array.isArray(result)) {
      // Verificar se é array de arrays [rows, fields] ou array de objetos
      if (result.length > 0 && Array.isArray(result[0])) {
        // Formato [rows, fields]
        rows = result[0];
      } else {
        // Array direto de objetos
        rows = result;
      }
    } else if (result && typeof result === 'object') {
      // Se result é um objeto com propriedades
      if (Array.isArray((result as any)[0])) {
        // Formato [rows, fields]
        rows = (result as any)[0];
      } else if (Array.isArray((result as any).rows)) {
        // Formato { rows: [...] }
        rows = (result as any).rows;
      } else if (Array.isArray((result as any)[0])) {
        // Formato { 0: [...] }
        rows = (result as any)[0];
      } else {
        // Pode ser um único objeto retornado
        rows = [result];
      }
    }
    
    console.log(`[getInvoicesByTenant] Encontradas ${rows.length} faturas`);
    if (rows.length > 0) {
      console.log(`[getInvoicesByTenant] Primeira fatura:`, JSON.stringify(rows[0], null, 2));
    }
    
    // Garantir que os dados estão corretos
    const invoices = rows.map((row: any) => {
      // Se row é um array, pode ser uma estrutura diferente
      if (Array.isArray(row)) {
        return null; // Ignorar linhas inválidas
      }
      
      return {
        id: Number(row.id) || 0,
        tenantId: Number(row.tenantId) || 0,
        companyId: row.companyId ? Number(row.companyId) : null,
        numero: row.numero || null,
        valorTotal: Number(row.valorTotal) || 0,
        formaPagamento: row.formaPagamento || null,
        status: row.status || 'pendente',
        asaasPaymentId: row.asaasPaymentId || null,
        qrCode: row.qrCode || null,
        boletoUrl: row.boletoUrl || null,
        dataVencimento: row.dataVencimento ? new Date(row.dataVencimento) : null,
        dataPagamento: row.dataPagamento ? new Date(row.dataPagamento) : null,
        observacoes: row.observacoes || null,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      };
    }).filter((inv) => inv !== null);
    
    return invoices;
  } catch (error: any) {
    console.error(`[getInvoicesByTenant] Erro ao buscar faturas do tenant ${tenantId}:`, error.message);
    console.error(`[getInvoicesByTenant] Error stack:`, error.stack);
    return [];
  }
}

export async function getPendingInvoicesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, "pendente")))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoicesByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.companyId, companyId))
    .orderBy(desc(invoices.createdAt));
}

export async function updateInvoice(
  invoiceId: number,
  updates: {
    boletoUrl?: string | null;
    qrCode?: string | null;
    dataVencimento?: Date | null;
    formaPagamento?: "pix" | "boleto" | null;
    status?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Usar SQL direto para evitar que o Drizzle infira campos do schema que não existem na tabela
  // (especificamente iuguPaymentId que está no schema mas não existe na tabela real)
  const { sql } = await import("drizzle-orm");
  
  const formatDateForMySQL = (date: Date | null | undefined): string | null => {
    if (!date) return null;
    if (date instanceof Date) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    return null;
  };

  const setParts: string[] = [];
  const params: any[] = [];

  if (updates.boletoUrl !== undefined) {
    setParts.push("boletoUrl = ?");
    params.push(updates.boletoUrl);
  }
  if (updates.qrCode !== undefined) {
    setParts.push("qrCode = ?");
    params.push(updates.qrCode);
  }
  if (updates.dataVencimento !== undefined) {
    setParts.push("dataVencimento = ?");
    params.push(formatDateForMySQL(updates.dataVencimento));
  }
  if (updates.formaPagamento !== undefined) {
    setParts.push("formaPagamento = ?");
    params.push(updates.formaPagamento);
  }
  if (updates.status !== undefined) {
    setParts.push("status = ?");
    params.push(updates.status);
  }
  
  // Sempre atualizar updatedAt
  setParts.push("updatedAt = ?");
  params.push(formatDateForMySQL(new Date()));
  
  // Adicionar invoiceId para o WHERE
  params.push(invoiceId);

  if (setParts.length === 0) {
    // Nada para atualizar, apenas retornar a fatura
    return await getInvoiceById(invoiceId);
  }

  const updateSQL = sql.raw(
    `UPDATE invoices SET ${setParts.join(", ")} WHERE id = ?`,
    params
  );

  console.log(`[updateInvoice] Atualizando fatura ${invoiceId}:`, {
    setParts,
    paramsCount: params.length,
    boletoUrl: updates.boletoUrl,
  });

  await db.execute(updateSQL);

  const updated = await getInvoiceById(invoiceId);
  console.log(`[updateInvoice] Fatura ${invoiceId} atualizada: boletoUrl=${updated?.boletoUrl ? 'SIM' : 'NÃO'}`);
  
  return updated;
}

export async function closeInvoice(invoiceId: number, formaPagamento: "pix" | "boleto") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error("Fatura não encontrada");
  }

  // Gerar dados mockados
  const qrCode = formaPagamento === "pix" 
    ? `00020126400014BR.GOV.BCB.PIX0114+55819999999990208DEMONSTRATION5204000053039865405${(invoice.valorTotal / 100).toFixed(2)}5802BR5920ITL DEMO LTDA6009SAO PAULO62070503***6304ABCD`
    : null;
  
  const boletoUrl = formaPagamento === "boleto"
    ? `https://asaas.com/boleto/mock/${invoiceId}`
    : null;

  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + 7); // 7 dias para vencer

  await db
    .update(invoices)
    .set({
      formaPagamento,
      qrCode,
      boletoUrl,
      dataVencimento,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return await getInvoiceById(invoiceId);
}

/**
 * Buscar inspeções agrupadas por empresa que ainda não foram faturadas
 */
export async function getUninvoicedAppointmentsByCompany(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar todas as inspeções com companyId (vinculadas a empresa)
  // Removendo o filtro de status "realizado" para mostrar todas as inspeções vinculadas
  const appointmentsList = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        sql`${appointments.companyId} IS NOT NULL`
      )
    )
    .orderBy(desc(appointments.dataAgendamento));

  console.log(`[getUninvoicedAppointmentsByCompany] Encontradas ${appointmentsList.length} inspeções com companyId para tenant ${tenantId}`);

  // Buscar todas as inspeções já vinculadas a faturas
  const allInvoiceAppointments = await db.select().from(invoiceAppointments);
  const invoicedAppointmentIds = new Set(allInvoiceAppointments.map((ia) => ia.appointmentId));

  console.log(`[getUninvoicedAppointmentsByCompany] ${invoicedAppointmentIds.size} inspeções já faturadas`);

  // Filtrar apenas as que não foram faturadas
  const uninvoicedAppointments = appointmentsList.filter((ap) => !invoicedAppointmentIds.has(ap.id));

  console.log(`[getUninvoicedAppointmentsByCompany] ${uninvoicedAppointments.length} inspeções não faturadas`);

  // Buscar dados relacionados e agrupar por empresa
  const appointmentsWithData = await Promise.all(
    uninvoicedAppointments.map(async (ap) => {
      const customer = ap.customerId ? await getCustomerById(ap.customerId) : null;
      const vehicle = ap.vehicleId ? await getVehicleById(ap.vehicleId) : null;
      const inspectionType = ap.inspectionTypeId ? await getInspectionTypeById(ap.inspectionTypeId) : null;
      
      // Buscar preço da inspeção
      let preco = 0;
      if (ap.inspectionTypeId) {
        const pricing = await getInspectionTypePrice(tenantId, ap.inspectionTypeId);
        preco = pricing?.preco || 0;
      }

      return {
        ...ap,
        customer,
        vehicle,
        inspectionType,
        preco,
      };
    })
  );

  // Agrupar por companyId
  const groupedByCompany = appointmentsWithData.reduce((acc, appointment) => {
    if (!appointment.companyId) return acc;
    
    const companyId = appointment.companyId;
    if (!acc[companyId]) {
      acc[companyId] = [];
    }
    acc[companyId].push(appointment);
    return acc;
  }, {} as Record<number, typeof appointmentsWithData>);

  // Buscar dados das empresas e calcular totais
  const result = await Promise.all(
    Object.entries(groupedByCompany).map(async ([companyIdStr, appointments]) => {
      const companyId = parseInt(companyIdStr);
      const company = await getCompanyById(companyId);
      const total = appointments.reduce((sum, ap) => sum + ap.preco, 0);

      return {
        company,
        companyId,
        appointments,
        total,
        count: appointments.length,
      };
    })
  );

  return result.filter((group) => group.company !== undefined);
}

export async function linkAppointmentToInvoice(invoiceId: number, appointmentId: number, valor: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(invoiceAppointments).values({
    invoiceId,
    appointmentId,
    valor,
  });
}

export async function getInvoiceAppointments(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoiceAppointments)
    .where(eq(invoiceAppointments.invoiceId, invoiceId));
}

export async function getInvoiceByAppointmentId(appointmentId: number) {
  const db = await getDb();
  if (!db) return null;

  // Buscar o invoiceAppointment vinculado
  const invoiceAppts = await db
    .select()
    .from(invoiceAppointments)
    .where(eq(invoiceAppointments.appointmentId, appointmentId))
    .limit(1);

  if (invoiceAppts.length === 0) {
    console.log(`[getInvoiceByAppointmentId] Nenhuma fatura encontrada para inspeção ${appointmentId}`);
    return null;
  }

  console.log(`[getInvoiceByAppointmentId] Fatura encontrada para inspeção ${appointmentId}: invoiceId=${invoiceAppts[0].invoiceId}`);

  // Buscar a invoice completa
  const invoice = await getInvoiceById(invoiceAppts[0].invoiceId);
  
  if (invoice) {
    console.log(`[getInvoiceByAppointmentId] Fatura ${invoice.id} retornada para inspeção ${appointmentId}: boletoUrl=${invoice.boletoUrl ? 'SIM' : 'NÃO'}`);
  } else {
    console.log(`[getInvoiceByAppointmentId] Fatura ${invoiceAppts[0].invoiceId} não encontrada no banco`);
  }
  
  return invoice || null;
}

// ============= USER GROUP QUERIES =============

export async function createUserGroup(group: InsertUserGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(userGroups).values(group);
  return await getUserGroupById(Number(result.insertId));
}

export async function getUserGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(userGroups).where(eq(userGroups.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserGroupsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(userGroups)
    .where(and(eq(userGroups.tenantId, tenantId), eq(userGroups.ativo, true)))
    .orderBy(asc(userGroups.nome));
}

export async function updateUserGroup(id: number, data: Partial<InsertUserGroup>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userGroups).set({ ...data, updatedAt: new Date() }).where(eq(userGroups.id, id));
  return await getUserGroupById(id);
}

export async function deleteUserGroup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userGroups).set({ ativo: false, updatedAt: new Date() }).where(eq(userGroups.id, id));
}

// ============= GROUP MENU PERMISSIONS QUERIES =============

export async function setGroupMenuPermissions(groupId: number, menuPaths: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Remover permissões existentes
  await db.delete(groupMenuPermissions).where(eq(groupMenuPermissions.groupId, groupId));

  // Adicionar novas permissões
  if (menuPaths.length > 0) {
    await db.insert(groupMenuPermissions).values(
      menuPaths.map((path) => ({
        groupId,
        menuPath: path,
      }))
    );
  }
}

export async function getGroupMenuPermissions(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(groupMenuPermissions)
    .where(eq(groupMenuPermissions.groupId, groupId));
}

export async function getUserMenuPermissions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const user = await getUserById(userId);
  if (!user || !user.groupId) return [];

  return await getGroupMenuPermissions(user.groupId);
}

// ============= RECONCILIATION CONFIG QUERIES =============

export async function getReconciliationConfig() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(reconciliationConfig)
    .where(eq(reconciliationConfig.ativo, true))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertReconciliationConfig(config: InsertReconciliationConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getReconciliationConfig();
  if (existing) {
    await db.update(reconciliationConfig).set({ ...config, updatedAt: new Date() }).where(eq(reconciliationConfig.id, existing.id));
    return await getReconciliationConfig();
  } else {
    const [result] = await db.insert(reconciliationConfig).values(config);
    return await db.select().from(reconciliationConfig).where(eq(reconciliationConfig.id, Number(result.insertId))).limit(1)[0];
  }
}

// ============= RECONCILIATION QUERIES =============

export async function createReconciliation(reconciliation: InsertReconciliation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(reconciliations).values(reconciliation);
  return await getReconciliationById(Number(result.insertId));
}

export async function getReconciliationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(reconciliations).where(eq(reconciliations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getReconciliationsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(reconciliations)
    .where(eq(reconciliations.tenantId, tenantId))
    .orderBy(desc(reconciliations.dataConciliacao));
}

export async function updateReconciliation(id: number, data: Partial<InsertReconciliation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reconciliations).set({ ...data, updatedAt: new Date() }).where(eq(reconciliations.id, id));
  return await getReconciliationById(id);
}

// Buscar inspeções do dia com dados relacionados
export async function getAppointmentsByDate(tenantId: number, date: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointmentsList = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.createdAt, startOfDay),
        lte(appointments.createdAt, endOfDay)
      )
    )
    .orderBy(desc(appointments.createdAt));

  // Buscar dados relacionados
  const appointmentsWithData = await Promise.all(
    appointmentsList.map(async (ap) => {
      const vehicle = ap.vehicleId ? await getVehicleById(ap.vehicleId) : null;
      const inspectionType = ap.inspectionTypeId ? await getInspectionTypeById(ap.inspectionTypeId) : null;
      const inspectionLine = ap.inspectionLineId ? await getInspectionLineById(ap.inspectionLineId) : null;
      const payment = await getPaymentByAppointment(ap.id);

      return {
        ...ap,
        vehicle,
        inspectionType,
        inspectionLine,
        payment: payment || null,
      };
    })
  );

  return appointmentsWithData;
}

// ============= ORGAO QUERIES =============

export async function createOrgao(data: InsertOrgao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Limpar valores vazios para undefined
  const cleanData: any = {
    nome: data.nome.trim(),
    ativo: data.ativo ?? true,
  };

  if (data.sigla && data.sigla.trim()) {
    cleanData.sigla = data.sigla.trim();
  }

  if (data.descricao && data.descricao.trim()) {
    cleanData.descricao = data.descricao.trim();
  }

  const [result] = await db.insert(orgaos).values(cleanData);
  return await getOrgaoById(Number(result.insertId));
}

export async function getOrgaoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(orgaos).where(eq(orgaos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllOrgaos(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(orgaos).orderBy(asc(orgaos.nome));
  if (!includeInactive) {
    query = query.where(eq(orgaos.ativo, true));
  }
  return await query;
}

export async function updateOrgao(id: number, data: Partial<InsertOrgao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(orgaos).set(data).where(eq(orgaos.id, id));
}

export async function deleteOrgao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(orgaos).where(eq(orgaos.id, id));
}

// ============= USER ORGAO QUERIES =============

export async function linkUserToOrgao(userId: number, orgaoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se já existe
  const existing = await db
    .select()
    .from(userOrgaos)
    .where(and(eq(userOrgaos.userId, userId), eq(userOrgaos.orgaoId, orgaoId)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [result] = await db.insert(userOrgaos).values({ userId, orgaoId });
  return await db
    .select()
    .from(userOrgaos)
    .where(eq(userOrgaos.id, Number(result.insertId)))
    .limit(1)
    .then((r) => r[0]);
}

export async function unlinkUserFromOrgao(userId: number, orgaoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(userOrgaos)
    .where(and(eq(userOrgaos.userId, userId), eq(userOrgaos.orgaoId, orgaoId)));
}

export async function getUserOrgaos(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: userOrgaos.id,
      userId: userOrgaos.userId,
      orgaoId: userOrgaos.orgaoId,
      createdAt: userOrgaos.createdAt,
      orgao: orgaos,
    })
    .from(userOrgaos)
    .innerJoin(orgaos, eq(userOrgaos.orgaoId, orgaos.id))
    .where(eq(userOrgaos.userId, userId));
}

export async function getOrgaoUsers(orgaoId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: userOrgaos.id,
      userId: userOrgaos.userId,
      orgaoId: userOrgaos.orgaoId,
      createdAt: userOrgaos.createdAt,
      user: users,
    })
    .from(userOrgaos)
    .innerJoin(users, eq(userOrgaos.userId, users.id))
    .where(eq(userOrgaos.orgaoId, orgaoId));
}

// ============= INSPECTION REPORT QUERIES =============

export async function createInspectionReport(data: InsertInspectionReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(inspectionReports).values(data);
  return await getInspectionReportById(Number(result.insertId));
}

export async function getInspectionReportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(inspectionReports).where(eq(inspectionReports.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getInspectionReportByAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select({
        id: inspectionReports.id,
        appointmentId: inspectionReports.appointmentId,
        orgaoId: inspectionReports.orgaoId,
        numeroCertificado: inspectionReports.numeroCertificado,
        numeroLaudo: inspectionReports.numeroLaudo,
        dataEmissao: inspectionReports.dataEmissao,
        dataValidade: inspectionReports.dataValidade,
        responsavelTecnico: inspectionReports.responsavelTecnico,
        cft: inspectionReports.cft,
        crea: inspectionReports.crea,
        pdfPath: inspectionReports.pdfPath,
        status: inspectionReports.status,
        createdAt: inspectionReports.createdAt,
        updatedAt: inspectionReports.updatedAt,
      })
      .from(inspectionReports)
      .where(eq(inspectionReports.appointmentId, appointmentId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Erro ao buscar inspection report:", error);
    return undefined;
  }
}

export async function getInspectionReportsByOrgao(orgaoId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(inspectionReports)
    .where(eq(inspectionReports.orgaoId, orgaoId))
    .orderBy(desc(inspectionReports.createdAt));
}

export async function updateInspectionReport(id: number, data: Partial<InsertInspectionReport>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(inspectionReports).set(data).where(eq(inspectionReports.id, id));
}

export async function deleteInspectionReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(inspectionReports).where(eq(inspectionReports.id, id));
}

// ============= INSPECTION REPORT PHOTO QUERIES =============

export async function createInspectionReportPhoto(data: InsertInspectionReportPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(inspectionReportPhotos).values(data);
  return await getInspectionReportPhotoById(Number(result.insertId));
}

export async function getInspectionReportPhotoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(inspectionReportPhotos)
    .where(eq(inspectionReportPhotos.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getInspectionReportPhotosByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(inspectionReportPhotos)
    .where(eq(inspectionReportPhotos.reportId, reportId))
    .orderBy(asc(inspectionReportPhotos.tipo));
}

export async function deleteInspectionReportPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(inspectionReportPhotos).where(eq(inspectionReportPhotos.id, id));
}

export async function deleteInspectionReportPhotosByReport(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(inspectionReportPhotos).where(eq(inspectionReportPhotos.reportId, reportId));
}

// ============= SYSTEM CONFIG QUERIES =============

export async function getSystemConfig(key: string): Promise<SystemConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error: any) {
    // Se a tabela não existir, retornar undefined
    if (error.message?.includes("doesn't exist") || error.code === "ER_NO_SUCH_TABLE") {
      console.log(`[DB] Tabela systemConfig não existe ainda`);
      return undefined;
    }
    console.error(`[DB] Erro ao buscar systemConfig ${key}:`, error.message);
    return undefined;
  }
}

export async function setSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const existing = await getSystemConfig(key);
    if (existing) {
      await db
        .update(systemConfig)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(systemConfig.id, existing.id));
      const updated = await getSystemConfig(key);
      if (!updated) throw new Error("Failed to update system config");
      return updated;
    } else {
      const [result] = await db.insert(systemConfig).values({
        key,
        value,
        description,
      });
      const inserted = await getSystemConfig(key);
      if (!inserted) throw new Error("Failed to create system config");
      return inserted;
    }
  } catch (error: any) {
    // Se a tabela não existir, lançar erro mais claro
    if (error.message?.includes("doesn't exist") || error.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Tabela systemConfig não existe. Execute a criação da tabela primeiro.");
    }
    throw error;
  }
}

export async function getAllSystemConfigs(): Promise<SystemConfig[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(systemConfig).orderBy(asc(systemConfig.key));
  } catch (error: any) {
    // Se a tabela não existir, retornar array vazio
    if (error.message?.includes("doesn't exist") || error.code === "ER_NO_SUCH_TABLE") {
      console.log(`[DB] Tabela systemConfig não existe ainda`);
      return [];
    }
    console.error(`[DB] Erro ao buscar todas as systemConfigs:`, error.message);
    return [];
  }
}
