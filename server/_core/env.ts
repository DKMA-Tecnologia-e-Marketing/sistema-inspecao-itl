// Validação de variáveis de ambiente críticas
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    const error = new Error(`Environment variable ${name} is required but not set or is empty`);
    console.error("❌ [ENV] Fatal error:", error.message);
    console.error("❌ [ENV] Stack:", error.stack);
    throw error;
  }
  return value;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  // CRÍTICO: JWT_SECRET é obrigatório e não pode ser vazio
  // Se não estiver definido, o servidor não iniciará
  cookieSecret: requireEnv("JWT_SECRET"),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Infosimples
  infosimplesApiKey: process.env.INFOSIMPLES_API_KEY ?? "",
  // ASAAS
  asaasApiKey: process.env.ASAAS_API_KEY ?? "",
  asaasWebhookUrl: process.env.ASAAS_WEBHOOK_URL ?? "",
  // IUGU
  iuguApiToken: process.env.IUGU_API_TOKEN ?? "",
  iuguWebhookUrl: process.env.IUGU_WEBHOOK_URL ?? "",
  // E-mail
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  // SMS (Twilio)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
};
