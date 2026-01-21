import { ENV } from "../_core/env";

// Para desenvolvimento, usar console.log
// Em produção, usar Twilio
let twilioClient: any = null;

async function initializeSMS() {
  if (ENV.twilioAccountSid && ENV.twilioAuthToken) {
    // Carregar twilio apenas se configurado
    try {
      const twilio = await import("twilio");
      twilioClient = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);
    } catch (error) {
      console.warn("[SMS] Twilio não disponível. Use 'pnpm add twilio' para habilitar envio de SMS.");
    }
  }
}

// Inicializar ao carregar o módulo
initializeSMS();

/**
 * Enviar SMS
 */
export async function enviarSMS(telefone: string, mensagem: string): Promise<void> {
  if (!twilioClient && ENV.isProduction) {
    throw new Error("Serviço de SMS não configurado");
  }

  // Formatar telefone (adicionar código do país se necessário)
  const telefoneFormatado = telefone.replace(/\D/g, "");
  const telefoneCompleto = telefoneFormatado.startsWith("55")
    ? `+${telefoneFormatado}`
    : `+55${telefoneFormatado}`;

  // Em desenvolvimento sem Twilio, apenas logar
  if (!twilioClient) {
    console.log("[SMS] Simulação de envio:", {
      to: telefoneCompleto,
      message: mensagem,
    });
    return;
  }

  try {
    await twilioClient.messages.create({
      body: mensagem,
      from: ENV.twilioPhoneNumber,
      to: telefoneCompleto,
    });
    console.log(`[SMS] SMS enviado para ${telefoneCompleto}`);
  } catch (error: any) {
    console.error("[SMS] Erro ao enviar SMS:", error.message);
    throw new Error(`Erro ao enviar SMS: ${error.message}`);
  }
}

/**
 * Templates de SMS
 */
export const SMS_TEMPLATES = {
  tokenValidacao: (token: string): string =>
    `Sistema ITL: Seu código de verificação é ${token}. Válido por 10 minutos.`,

  confirmacaoAgendamento: (nome: string, data: string, local: string): string =>
    `Olá ${nome}! Seu agendamento foi confirmado para ${data} em ${local}. Sistema de Inspeção ITL.`,

  lembrete24h: (nome: string, data: string): string =>
    `Olá ${nome}! Lembramos que sua inspeção está agendada para amanhã às ${data}. Nos vemos lá! Sistema ITL.`,

  pagamentoAprovado: (nome: string): string =>
    `Olá ${nome}! Seu pagamento foi aprovado. Aguardamos você no agendamento! Sistema ITL.`,

  agendamentoCancelado: (nome: string, motivo?: string): string =>
    `Olá ${nome}! Seu agendamento foi cancelado.${motivo ? ` Motivo: ${motivo}` : ""} Sistema ITL.`,
};

