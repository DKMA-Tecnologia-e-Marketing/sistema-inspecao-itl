import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "operator", "orgao"]).default("user").notNull(),
  tenantId: int("tenantId"),
  groupId: int("groupId"), // Grupo de usuário (para permissões de menu)
  comissaoPercentual: decimal("comissaoPercentual", { precision: 5, scale: 2 }), // Comissão em percentual (ex: 50.00 = 50%)
  aptoParaAtender: boolean("aptoParaAtender").default(true).notNull(), // Se o profissional está apto para atender
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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
  iuguAccountId: varchar("iuguAccountId", { length: 100 }), // ID da conta/subconta na Iugu para split
  iuguSubaccountToken: varchar("iuguSubaccountToken", { length: 255 }), // Token da API da subconta Iugu
  diasFuncionamento: json("diasFuncionamento"), // Array de dias da semana que atende (0-6, domingo-sábado)
  horarioInicio: varchar("horarioInicio", { length: 5 }), // HH:mm - Horário de início do expediente
  horarioFim: varchar("horarioFim", { length: 5 }), // HH:mm - Horário de fim do expediente
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

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

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

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

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

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

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = typeof serviceCategories.$inferInsert;

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

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

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

export type InspectionScope = typeof inspectionScopes.$inferSelect;
export type InsertInspectionScope = typeof inspectionScopes.$inferInsert;

/**
 * Relação Escopo-Serviço (muitos para muitos)
 */
export const inspectionScopeServices = mysqlTable("inspectionScopeServices", {
  id: int("id").autoincrement().primaryKey(),
  inspectionScopeId: int("inspectionScopeId").notNull(),
  serviceId: int("serviceId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InspectionScopeService = typeof inspectionScopeServices.$inferSelect;
export type InsertInspectionScopeService = typeof inspectionScopeServices.$inferInsert;

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

export type PriceConfiguration = typeof priceConfigurations.$inferSelect;
export type InsertPriceConfiguration = typeof priceConfigurations.$inferInsert;

/**
 * Tipos de Inspeção (ex.: GNV Inclusão, Sinistro, etc.)
 */
export const inspectionTypes = mysqlTable("inspectionTypes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  categoria: varchar("categoria", { length: 100 }),
  descricao: text("descricao"),
  orgao: varchar("orgao", { length: 255 }), // Órgão responsável pela inspeção
  precoBase: int("precoBase").notNull(), // Valor em centavos
  variacaoMaxima: int("variacaoMaxima").default(0).notNull(), // Valor em centavos
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionType = typeof inspectionTypes.$inferSelect;
export type InsertInspectionType = typeof inspectionTypes.$inferInsert;

/**
 * Linhas de Inspeção por Estabelecimento
 */
export const inspectionLines = mysqlTable("inspectionLines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  nome: varchar("nome", { length: 255 }),
  tipo: mysqlEnum("tipo", ["leve", "mista", "pesado", "motocicleta", "outra"]).notNull(),
  descricao: text("descricao"),
  quantidade: int("quantidade").default(1).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionLine = typeof inspectionLines.$inferSelect;
export type InsertInspectionLine = typeof inspectionLines.$inferInsert;

/**
 * Capacidades de Tipos de Inspeção por Linha
 */
export const inspectionLineCapabilities = mysqlTable("inspectionLineCapabilities", {
  id: int("id").autoincrement().primaryKey(),
  inspectionLineId: int("inspectionLineId").notNull(),
  inspectionTypeId: int("inspectionTypeId").notNull(),
  capacidade: int("capacidade").default(0).notNull(),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionLineCapability = typeof inspectionLineCapabilities.$inferSelect;
export type InsertInspectionLineCapability = typeof inspectionLineCapabilities.$inferInsert;

/**
 * Precificação de Tipos de Inspeção por Tenant (com variação limitada)
 */
export const inspectionTypePrices = mysqlTable("inspectionTypePrices", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  inspectionTypeId: int("inspectionTypeId").notNull(),
  preco: int("preco").notNull(), // Valor em centavos
  ultimoAjustePor: int("ultimoAjustePor"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionTypePrice = typeof inspectionTypePrices.$inferSelect;
export type InsertInspectionTypePrice = typeof inspectionTypePrices.$inferInsert;

/**
 * Relação direta entre Tipos de Inspeção e Tenants (ITLs)
 */
export const inspectionTypeTenants = mysqlTable("inspectionTypeTenants", {
  id: int("id").autoincrement().primaryKey(),
  inspectionTypeId: int("inspectionTypeId").notNull(),
  tenantId: int("tenantId").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionTypeTenant = typeof inspectionTypeTenants.$inferSelect;
export type InsertInspectionTypeTenant = typeof inspectionTypeTenants.$inferInsert;

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

export type DetranAuthorization = typeof detranAuthorizations.$inferSelect;
export type InsertDetranAuthorization = typeof detranAuthorizations.$inferInsert;

/**
 * Agendamentos
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  customerId: int("customerId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  inspectionTypeId: int("inspectionTypeId"),
  inspectionScopeId: int("inspectionScopeId").notNull(),
  detranAuthorizationId: int("detranAuthorizationId"),
  professionalId: int("professionalId"), // ID do profissional/operador que irá atender
  companyId: int("companyId"), // ID da empresa que vai faturar esta inspeção (opcional)
  dataAgendamento: timestamp("dataAgendamento").notNull(),
  status: mysqlEnum("status", ["pendente", "confirmado", "realizado", "cancelado"]).default("pendente").notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Pagamentos
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  valorTotal: int("valorTotal").notNull(), // Valor em centavos
  status: mysqlEnum("status", ["pendente", "processando", "aprovado", "recusado", "estornado"]).default("pendente").notNull(),
  asaasPaymentId: varchar("asaasPaymentId", { length: 100 }),
  iuguPaymentId: varchar("iuguPaymentId", { length: 100 }), // ID do pagamento na Iugu
  metodoPagamento: varchar("metodoPagamento", { length: 50 }),
  dataPagamento: timestamp("dataPagamento"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

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

export type PaymentSplit = typeof paymentSplits.$inferSelect;
export type InsertPaymentSplit = typeof paymentSplits.$inferInsert;

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

export type SplitConfiguration = typeof splitConfigurations.$inferSelect;
export type InsertSplitConfiguration = typeof splitConfigurations.$inferInsert;

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

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

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

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * Relação Role-Permission (muitos para muitos)
 */
export const rolePermissions = mysqlTable("rolePermissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(),
  permissionId: int("permissionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

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

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

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

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

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

export type FinancialReconciliation = typeof financialReconciliations.$inferSelect;
export type InsertFinancialReconciliation = typeof financialReconciliations.$inferInsert;

/**
 * Empresas (para faturamento)
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(), // ITL que cadastrou a empresa
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  razaoSocial: varchar("razaoSocial", { length: 255 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Faturas
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  companyId: int("companyId").notNull(),
  numero: varchar("numero", { length: 50 }).notNull().unique(),
  valorTotal: int("valorTotal").notNull(), // Valor em centavos
  formaPagamento: mysqlEnum("formaPagamento", ["pix", "boleto"]),
  status: mysqlEnum("status", ["pendente", "pago", "cancelado"]).default("pendente").notNull(),
  asaasPaymentId: varchar("asaasPaymentId", { length: 100 }), // ID do pagamento no Asaas
  iuguPaymentId: varchar("iuguPaymentId", { length: 100 }), // ID do pagamento na Iugu
  qrCode: text("qrCode"), // QR Code PIX (mockado por enquanto)
  boletoUrl: text("boletoUrl"), // URL do boleto (mockado por enquanto)
  dataVencimento: timestamp("dataVencimento"),
  dataPagamento: timestamp("dataPagamento"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Relação entre Faturas e Inspeções (Appointments)
 */
export const invoiceAppointments = mysqlTable("invoiceAppointments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  appointmentId: int("appointmentId").notNull(),
  valor: int("valor").notNull(), // Valor em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceAppointment = typeof invoiceAppointments.$inferSelect;
export type InsertInvoiceAppointment = typeof invoiceAppointments.$inferInsert;

/**
 * Grupos de Usuários (por Tenant)
 */
export const userGroups = mysqlTable("userGroups", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = typeof userGroups.$inferInsert;

/**
 * Permissões de Menu por Grupo
 */
export const groupMenuPermissions = mysqlTable("groupMenuPermissions", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  menuPath: varchar("menuPath", { length: 255 }).notNull(), // Ex: "/tenant/appointments", "/tenant/pricing"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupMenuPermission = typeof groupMenuPermissions.$inferSelect;
export type InsertGroupMenuPermission = typeof groupMenuPermissions.$inferInsert;

/**
 * Configuração de Conciliação (Admin)
 */
export const reconciliationConfig = mysqlTable("reconciliationConfig", {
  id: int("id").autoincrement().primaryKey(),
  frequencia: mysqlEnum("frequencia", ["diaria", "semanal", "mensal"]).notNull(),
  diaSemana: int("diaSemana"), // 0-6 (domingo-sábado) para semanal
  diaMes: int("diaMes"), // 1-31 para mensal
  horario: varchar("horario", { length: 5 }), // HH:mm
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReconciliationConfig = typeof reconciliationConfig.$inferSelect;
export type InsertReconciliationConfig = typeof reconciliationConfig.$inferInsert;

/**
 * Conciliações Realizadas
 */
export const reconciliations = mysqlTable("reconciliations", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  dataReferencia: date("dataReferencia").notNull(), // Data das inspeções sendo conciliadas
  dataConcilacao: timestamp("dataConciliacao").defaultNow().notNull(),
  totalInspecoesPlataforma: int("totalInspecoesPlataforma").default(0).notNull(),
  totalInspecoesGoverno: int("totalInspecoesGoverno").default(0).notNull(),
  inspecoesConciliadas: int("inspecoesConciliadas").default(0).notNull(),
  inspecoesDivergentes: int("inspecoesDivergentes").default(0).notNull(),
  inspecoesForaSistema: int("inspecoesForaSistema").default(0).notNull(), // Inspeções no governo mas não na plataforma
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida", "erro"]).default("pendente").notNull(),
  observacoes: text("observacoes"),
  detalhes: json("detalhes"), // JSON com detalhes das divergências
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertReconciliation = typeof reconciliations.$inferInsert;

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

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Órgãos (INMETRO, DETRAN, PMSP, etc.)
 */
export const orgaos = mysqlTable("orgaos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  sigla: varchar("sigla", { length: 50 }),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Orgao = typeof orgaos.$inferSelect;
export type InsertOrgao = typeof orgaos.$inferInsert;

/**
 * Laudos de Inspeção
 */
export const inspectionReports = mysqlTable("inspectionReports", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  orgaoId: int("orgaoId").notNull(),
  numeroCertificado: varchar("numeroCertificado", { length: 50 }),
  numeroLaudo: varchar("numeroLaudo", { length: 50 }),
  dataEmissao: timestamp("dataEmissao").defaultNow().notNull(),
  dataValidade: timestamp("dataValidade"),
  responsavelTecnico: varchar("responsavelTecnico", { length: 255 }),
  cft: varchar("cft", { length: 50 }),
  crea: varchar("crea", { length: 50 }),
  pdfPath: varchar("pdfPath", { length: 500 }),
  status: mysqlEnum("status", ["rascunho", "gerado", "assinado"]).default("rascunho").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionReport = typeof inspectionReports.$inferSelect;
export type InsertInspectionReport = typeof inspectionReports.$inferInsert;

/**
 * Fotos dos Laudos
 */
export const inspectionReportPhotos = mysqlTable("inspectionReportPhotos", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  tipo: mysqlEnum("tipo", ["traseira", "dianteira", "placa", "panoramica"]).notNull(),
  filePath: varchar("filePath", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InspectionReportPhoto = typeof inspectionReportPhotos.$inferSelect;
export type InsertInspectionReportPhoto = typeof inspectionReportPhotos.$inferInsert;

/**
 * Vinculação Usuário-Órgão
 */
export const userOrgaos = mysqlTable("userOrgaos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgaoId: int("orgaoId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserOrgao = typeof userOrgaos.$inferSelect;
export type InsertUserOrgao = typeof userOrgaos.$inferInsert;

/**
 * Configurações do Sistema
 */
export const systemConfig = mysqlTable("systemConfig", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * Técnicos (Inspetor Técnico e Responsável Técnico)
 */
export const tecnicos = mysqlTable("tecnicos", {
  id: int("id").autoincrement().primaryKey(),
  tipo: mysqlEnum("tipo", ["inspetor", "responsavel"]).notNull(),
  nomeCompleto: varchar("nomeCompleto", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  cft: varchar("cft", { length: 50 }), // Apenas para Inspetor Técnico
  crea: varchar("crea", { length: 50 }), // Apenas para Responsável Técnico
  tenantId: int("tenantId"), // Opcional: pode estar vinculado a um estabelecimento
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tecnico = typeof tecnicos.$inferSelect;
export type InsertTecnico = typeof tecnicos.$inferInsert;
