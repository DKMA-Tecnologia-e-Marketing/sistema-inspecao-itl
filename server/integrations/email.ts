import { ENV } from "../_core/env";

// Para desenvolvimento, usar console.log
// Em produção, usar nodemailer ou SendGrid
let transporter: any = null;

async function initializeEmail() {
  if (ENV.smtpHost && ENV.smtpUser && ENV.smtpPass) {
    // Carregar nodemailer apenas se configurado
    try {
      const nodemailer = await import("nodemailer");
      transporter = nodemailer.default.createTransport({
        host: ENV.smtpHost,
        port: ENV.smtpPort,
        secure: ENV.smtpPort === 465,
        auth: {
          user: ENV.smtpUser,
          pass: ENV.smtpPass,
        },
      });
    } catch (error) {
      console.warn("[Email] nodemailer não disponível. Use 'pnpm add nodemailer' para habilitar envio de e-mails.");
    }
  }
}

// Inicializar ao carregar o módulo
initializeEmail();

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Enviar e-mail
 */
export async function enviarEmail(options: EmailOptions): Promise<void> {
  if (!transporter && ENV.isProduction) {
    throw new Error("Serviço de e-mail não configurado");
  }

  // Em desenvolvimento sem SMTP, apenas logar
  if (!transporter) {
    console.log("[Email] Simulação de envio:", {
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: ENV.smtpFrom || ENV.smtpUser,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`[Email] E-mail enviado para ${options.to}`);
  } catch (error: any) {
    console.error("[Email] Erro ao enviar e-mail:", error.message);
    throw new Error(`Erro ao enviar e-mail: ${error.message}`);
  }
}

/**
 * Templates de e-mail
 */
export const EMAIL_TEMPLATES = {
  tokenValidacao: (token: string): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .token { background: #1f2937; color: #fbbf24; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Validação de E-mail</h1>
        </div>
        <div class="content">
          <p>Olá,</p>
          <p>Seu código de verificação de e-mail é:</p>
          <div class="token">${token}</div>
          <p>Este código é válido por 10 minutos.</p>
          <p>Se você não solicitou esta verificação, pode ignorar este e-mail.</p>
        </div>
        <div class="footer">
          <p>Sistema de Inspeção ITL</p>
        </div>
      </div>
    </body>
    </html>
  `,

  confirmacaoAgendamento: (dados: {
    nome: string;
    data: string;
    local: string;
    placa: string;
    valor?: number;
  }): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #10b981; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Agendamento Confirmado</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${dados.nome}</strong>,</p>
          <p>Seu agendamento foi confirmado com sucesso!</p>
          
          <div class="info-box">
            <p><strong>Data e Hora:</strong> ${dados.data}</p>
            <p><strong>Local:</strong> ${dados.local}</p>
            <p><strong>Veículo:</strong> ${dados.placa}</p>
            ${dados.valor ? `<p><strong>Valor:</strong> R$ ${(dados.valor / 100).toFixed(2).replace(".", ",")}</p>` : ""}
          </div>
          
          <p>Compareça no local e horário agendados. Em caso de dúvidas, entre em contato conosco.</p>
        </div>
        <div class="footer">
          <p>Sistema de Inspeção ITL</p>
        </div>
      </div>
    </body>
    </html>
  `,

  lembreteAgendamento: (dados: { nome: string; data: string; local: string }): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lembrete de Agendamento</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${dados.nome}</strong>,</p>
          <p>Lembramos que você tem um agendamento amanhã!</p>
          
          <div class="info-box">
            <p><strong>Data e Hora:</strong> ${dados.data}</p>
            <p><strong>Local:</strong> ${dados.local}</p>
          </div>
          
          <p>Nos vemos amanhã!</p>
        </div>
        <div class="footer">
          <p>Sistema de Inspeção ITL</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

