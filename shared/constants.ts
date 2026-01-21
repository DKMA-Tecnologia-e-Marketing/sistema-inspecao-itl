export const APP_NAME = "Sistema de Inspeção ITL";

export const INSPECTION_SCOPE_TYPES = {
  inmetro: "Inmetro",
  prefeitura_sp: "Prefeitura SP",
  prefeitura_guarulhos: "Prefeitura Guarulhos",
  mercosul: "Mercosul",
  tecnica: "Técnica/Específica",
} as const;

export const APPOINTMENT_STATUS = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
} as const;

export const PAYMENT_STATUS = {
  pendente: "Pendente",
  processando: "Processando",
  aprovado: "Aprovado",
  recusado: "Recusado",
  estornado: "Estornado",
} as const;

export const SPLIT_STATUS = {
  pendente: "Pendente",
  processado: "Processado",
  pago: "Pago",
  erro: "Erro",
} as const;

export const USER_ROLES = {
  admin: "Administrador",
  operator: "Operador",
  user: "Usuário",
} as const;

export const RECONCILIATION_STATUS = {
  aberto: "Aberto",
  fechado: "Fechado",
  conciliado: "Conciliado",
} as const;

export const WHATSAPP_MESSAGE_STATUS = {
  pendente: "Pendente",
  enviada: "Enviada",
  entregue: "Entregue",
  lida: "Lida",
  erro: "Erro",
} as const;

export const DETRAN_AUTH_STATUS = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  expirada: "Expirada",
} as const;
