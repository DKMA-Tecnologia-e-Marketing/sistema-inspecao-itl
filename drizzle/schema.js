import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";
/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin", "operator"]).default("user").notNull(),
    tenantId: int("tenantId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
/**
 * Tenants (Estabelecimentos ITL) - Multitenant core table
 */
export const tenants = mysqlTable("tenants", {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
    telefone: varchar("telefone", { length: 20 }),
    email: varchar("email", { length: 320 }),
    endereco: text("endereco"),
    cidade: varchar("cidade", { length: 100 }),
    estado: varchar("estado", { length: 2 }),
    cep: varchar("cep", { length: 10 }),
    latitude: varchar("latitude", { length: 50 }),
    longitude: varchar("longitude", { length: 50 }),
    asaasWalletId: varchar("asaasWalletId", { length: 100 }),
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Clientes (Declarantes)
 */
export const customers = mysqlTable("customers", {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 255 }).notNull(),
    cpf: varchar("cpf", { length: 14 }).notNull(),
    email: varchar("email", { length: 320 }),
    telefone: varchar("telefone", { length: 20 }),
    emailVerificado: boolean("emailVerificado").default(false).notNull(),
    telefoneVerificado: boolean("telefoneVerificado").default(false).notNull(),
    endereco: text("endereco"),
    cep: varchar("cep", { length: 10 }),
    cidade: varchar("cidade", { length: 100 }),
    estado: varchar("estado", { length: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Veículos
 */
export const vehicles = mysqlTable("vehicles", {
    id: int("id").autoincrement().primaryKey(),
    placa: varchar("placa", { length: 10 }).notNull(),
    renavam: varchar("renavam", { length: 20 }),
    chassi: varchar("chassi", { length: 30 }),
    marca: varchar("marca", { length: 100 }),
    modelo: varchar("modelo", { length: 100 }),
    ano: int("ano"),
    cor: varchar("cor", { length: 50 }),
    customerId: int("customerId").notNull(),
    dadosInfosimples: json("dadosInfosimples"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Categorias de Serviço
 */
export const serviceCategories = mysqlTable("serviceCategories", {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 255 }).notNull(),
    descricao: text("descricao"),
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Serviços
 */
export const services = mysqlTable("services", {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 255 }).notNull(),
    descricao: text("descricao"),
    categoryId: int("categoryId").notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Escopos de Vistoria
 */
export const inspectionScopes = mysqlTable("inspectionScopes", {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 255 }).notNull(),
    tipo: mysqlEnum("tipo", ["inmetro", "prefeitura_sp", "prefeitura_guarulhos", "mercosul", "tecnica"]).notNull(),
    descricao: text("descricao"),
    requerAutorizacaoDetran: boolean("requerAutorizacaoDetran").default(false).notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Relação Escopo-Serviço (muitos para muitos)
 */
export const inspectionScopeServices = mysqlTable("inspectionScopeServices", {
    id: int("id").autoincrement().primaryKey(),
    inspectionScopeId: int("inspectionScopeId").notNull(),
    serviceId: int("serviceId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Configuração de Preços (por tenant e serviço)
 */
export const priceConfigurations = mysqlTable("priceConfigurations", {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    serviceId: int("serviceId").notNull(),
    preco: int("preco").notNull(), // Valor em centavos
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Autorizações Detran
 */
export const detranAuthorizations = mysqlTable("detranAuthorizations", {
    id: int("id").autoincrement().primaryKey(),
    codigo: varchar("codigo", { length: 100 }).notNull().unique(),
    vehicleId: int("vehicleId").notNull(),
    dataEmissao: timestamp("dataEmissao").notNull(),
    dataValidade: timestamp("dataValidade"),
    status: mysqlEnum("status", ["pendente", "aprovada", "rejeitada", "expirada"]).default("pendente").notNull(),
    observacoes: text("observacoes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Agendamentos
 */
export const appointments = mysqlTable("appointments", {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    customerId: int("customerId").notNull(),
    vehicleId: int("vehicleId").notNull(),
    inspectionScopeId: int("inspectionScopeId").notNull(),
    detranAuthorizationId: int("detranAuthorizationId"),
    dataAgendamento: timestamp("dataAgendamento").notNull(),
    status: mysqlEnum("status", ["pendente", "confirmado", "realizado", "cancelado"]).default("pendente").notNull(),
    observacoes: text("observacoes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Pagamentos
 */
export const payments = mysqlTable("payments", {
    id: int("id").autoincrement().primaryKey(),
    appointmentId: int("appointmentId").notNull(),
    valorTotal: int("valorTotal").notNull(), // Valor em centavos
    status: mysqlEnum("status", ["pendente", "processando", "aprovado", "recusado", "estornado"]).default("pendente").notNull(),
    asaasPaymentId: varchar("asaasPaymentId", { length: 100 }),
    metodoPagamento: varchar("metodoPagamento", { length: 50 }),
    dataPagamento: timestamp("dataPagamento"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Split de Pagamentos
 */
export const paymentSplits = mysqlTable("paymentSplits", {
    id: int("id").autoincrement().primaryKey(),
    paymentId: int("paymentId").notNull(),
    tenantId: int("tenantId").notNull(),
    valor: int("valor").notNull(), // Valor em centavos
    percentual: int("percentual"), // Percentual em centésimos (ex: 2500 = 25%)
    status: mysqlEnum("status", ["pendente", "processado", "pago", "erro"]).default("pendente").notNull(),
    asaasSplitId: varchar("asaasSplitId", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Configuração de Split (regras de divisão)
 */
export const splitConfigurations = mysqlTable("splitConfigurations", {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    serviceId: int("serviceId").notNull(),
    percentualTenant: int("percentualTenant").notNull(), // Percentual em centésimos
    percentualPlataforma: int("percentualPlataforma").notNull(), // Percentual em centésimos
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Roles (Papéis de usuário)
 */
export const roles = mysqlTable("roles", {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 100 }).notNull().unique(),
    descricao: text("descricao"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Permissões
 */
export const permissions = mysqlTable("permissions", {
    id: int("id").autoincrement().primaryKey(),
    nome: varchar("nome", { length: 100 }).notNull().unique(),
    descricao: text("descricao"),
    modulo: varchar("modulo", { length: 100 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Relação Role-Permission (muitos para muitos)
 */
export const rolePermissions = mysqlTable("rolePermissions", {
    id: int("id").autoincrement().primaryKey(),
    roleId: int("roleId").notNull(),
    permissionId: int("permissionId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Logs de Auditoria
 */
export const auditLogs = mysqlTable("auditLogs", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tenantId: int("tenantId"),
    acao: varchar("acao", { length: 255 }).notNull(),
    modulo: varchar("modulo", { length: 100 }).notNull(),
    entidade: varchar("entidade", { length: 100 }),
    entidadeId: int("entidadeId"),
    dadosAntigos: json("dadosAntigos"),
    dadosNovos: json("dadosNovos"),
    ipAddress: varchar("ipAddress", { length: 50 }),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Mensagens WhatsApp
 */
export const whatsappMessages = mysqlTable("whatsappMessages", {
    id: int("id").autoincrement().primaryKey(),
    customerId: int("customerId").notNull(),
    tenantId: int("tenantId"),
    appointmentId: int("appointmentId"),
    mensagem: text("mensagem").notNull(),
    direcao: mysqlEnum("direcao", ["enviada", "recebida"]).notNull(),
    status: mysqlEnum("status", ["pendente", "enviada", "entregue", "lida", "erro"]).default("pendente").notNull(),
    whatsappMessageId: varchar("whatsappMessageId", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Conciliação Financeira
 */
export const financialReconciliations = mysqlTable("financialReconciliations", {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    dataInicio: timestamp("dataInicio").notNull(),
    dataFim: timestamp("dataFim").notNull(),
    valorTotal: int("valorTotal").notNull(), // Valor em centavos
    quantidadeTransacoes: int("quantidadeTransacoes").notNull(),
    status: mysqlEnum("status", ["aberto", "fechado", "conciliado"]).default("aberto").notNull(),
    observacoes: text("observacoes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Relatórios
 */
export const reports = mysqlTable("reports", {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId"),
    nome: varchar("nome", { length: 255 }).notNull(),
    tipo: varchar("tipo", { length: 100 }).notNull(),
    parametros: json("parametros"),
    dados: json("dados"),
    geradoPor: int("geradoPor").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
