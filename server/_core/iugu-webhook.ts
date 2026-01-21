import type { Express, Request, Response } from "express";
import * as db from "../db";
import { enviarSMS, SMS_TEMPLATES } from "../integrations/sms";
import { enviarEmail, EMAIL_TEMPLATES } from "../integrations/email";

export function registerIuguWebhook(app: Express) {
  app.post("/api/webhooks/iugu", async (req: Request, res: Response) => {
    try {
      const event = req.body;

      // Validar assinatura do webhook (TODO: implementar validação real)
      // A Iugu envia um header 'X-Iugu-Signature' com a assinatura
      // const signature = req.headers["x-iugu-signature"];
      // if (!validarAssinatura(event, signature)) {
      //   return res.status(401).json({ error: "Invalid signature" });
      // }

      console.log("[IUGU Webhook] Evento recebido:", event.event, event.id);

      switch (event.event) {
        case "invoice.created":
        case "invoice.status_changed":
        case "invoice.payment":
        case "invoice.refund":
        case "invoice.canceled":
        case "invoice.payment_failed":
          await processarFatura(event);
          break;
        default:
          console.log(`[IUGU Webhook] Evento desconhecido: ${event.event}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("[IUGU Webhook] Erro ao processar webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

async function processarFatura(event: any) {
  // A IUGU pode enviar o evento em diferentes formatos:
  // 1. event.data.invoice (formato antigo)
  // 2. event.invoice (formato alternativo)
  // 3. event.data contém diretamente os dados da fatura (formato atual)
  let invoice = event.data?.invoice || event.invoice;
  
  // Se event.data não tem invoice, mas tem id, então event.data é a própria fatura
  if (!invoice && event.data?.id) {
    invoice = event.data;
  }
  
  if (!invoice?.id) {
    console.error("[IUGU Webhook] Invoice ID não encontrado no evento");
    console.error("[IUGU Webhook] Evento completo:", JSON.stringify(event, null, 2));
    return;
  }

  console.log(`[IUGU Webhook] Processando fatura ${invoice.id}, status: ${invoice.status}, evento: ${event.event}`);

  // Buscar payment pelo iuguPaymentId
  const payments = await db.getPaymentsByIuguId(invoice.id);
  if (!payments || payments.length === 0) {
    console.warn(`[IUGU Webhook] Payment não encontrado no banco: ${invoice.id}`);
    return;
  }

  console.log(`[IUGU Webhook] Encontrados ${payments.length} payment(s) para invoice ${invoice.id}`);

  // Mapear status da Iugu para nosso sistema
  const statusMap: Record<string, "pendente" | "processando" | "aprovado" | "recusado" | "estornado"> = {
    pending: "pendente",
    processing: "processando",
    paid: "aprovado",
    canceled: "recusado",
    refunded: "estornado",
    expired: "recusado",
  };

  const novoStatus = statusMap[invoice.status] || "pendente";
  console.log(`[IUGU Webhook] Mapeando status "${invoice.status}" para "${novoStatus}"`);

  // Atualizar todos os payments com este iuguPaymentId
  for (const dbPayment of payments) {
    console.log(`[IUGU Webhook] Atualizando payment ${dbPayment.id} de "${dbPayment.status}" para "${novoStatus}"`);
    
    await db.updatePayment(dbPayment.id, {
      status: novoStatus,
      dataPagamento: invoice.paid_at 
        ? new Date(invoice.paid_at) 
        : invoice.paidAt 
          ? new Date(invoice.paidAt)
          : invoice.paid_cents && invoice.paid_cents > 0
            ? new Date() // Se foi pago mas não tem data, usar data atual
            : undefined,
    });

    console.log(`[IUGU Webhook] Payment ${dbPayment.id} atualizado com sucesso`);

    // Se foi confirmado/aprovado, marcar inspeção como realizada
    if (invoice.status === "paid" && novoStatus === "aprovado") {
      // Atualizar appointment para "realizado" se ainda não estiver
      if (dbPayment.appointmentId) {
        const appointment = await db.getAppointmentById(dbPayment.appointmentId);
        if (appointment && appointment.status !== "realizado") {
          await db.updateAppointment(dbPayment.appointmentId, {
            status: "realizado",
          });
          console.log(`[IUGU Webhook] Inspeção ${dbPayment.appointmentId} marcada como realizada`);
        }
      }
      // Enviar notificações de confirmação
      await enviarNotificacaoPagamento(dbPayment, "aprovado");
      console.log(`[IUGU Webhook] Pagamento ${dbPayment.id} confirmado - notificação enviada`);
    }
    
    // Se foi negado/falhou, enviar notificação
    if (invoice.status === "unauthorized" || invoice.status === "failed" || novoStatus === "recusado") {
      await enviarNotificacaoPagamento(dbPayment, "recusado", invoice);
      console.log(`[IUGU Webhook] Pagamento ${dbPayment.id} negado - notificação enviada`);
    }
  }
}

/**
 * Enviar notificação de pagamento (SMS e/ou Email)
 */
async function enviarNotificacaoPagamento(
  payment: any,
  status: "aprovado" | "recusado",
  invoice?: any
) {
  try {
    // Buscar dados do agendamento e cliente
    if (!payment.appointmentId) {
      console.log(`[IUGU Webhook] Payment ${payment.id} não tem appointmentId, pulando notificação`);
      return;
    }

    const appointment = await db.getAppointmentById(payment.appointmentId);
    if (!appointment) {
      console.log(`[IUGU Webhook] Appointment ${payment.appointmentId} não encontrado`);
      return;
    }

    const customer = await db.getCustomerById(appointment.customerId);
    if (!customer) {
      console.log(`[IUGU Webhook] Customer ${appointment.customerId} não encontrado`);
      return;
    }

    const tenant = await db.getTenantById(appointment.tenantId);
    const tenantName = tenant?.nome || "ITL";

    // Preparar mensagens
    const nomeCliente = customer.nome || "Cliente";
    const telefone = customer.telefone;
    const email = customer.email;

    if (status === "aprovado") {
      // Pagamento aprovado
      if (telefone) {
        try {
          await enviarSMS(telefone, SMS_TEMPLATES.pagamentoAprovado(nomeCliente));
          console.log(`[IUGU Webhook] SMS de pagamento aprovado enviado para ${telefone}`);
        } catch (error: any) {
          console.error(`[IUGU Webhook] Erro ao enviar SMS:`, error.message);
        }
      }

      if (email) {
        try {
          const valorFormatado = (payment.valorTotal / 100).toFixed(2).replace(".", ",");
          await enviarEmail({
            to: email,
            subject: `Pagamento Aprovado - ${tenantName}`,
            html: `
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
                    <h1>Pagamento Aprovado</h1>
                  </div>
                  <div class="content">
                    <p>Olá <strong>${nomeCliente}</strong>,</p>
                    <p>Seu pagamento foi aprovado com sucesso!</p>
                    <div class="info-box">
                      <p><strong>Valor:</strong> R$ ${valorFormatado}</p>
                    </div>
                    <p>Aguardamos você no agendamento!</p>
                  </div>
                  <div class="footer">
                    <p>${tenantName}</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`[IUGU Webhook] Email de pagamento aprovado enviado para ${email}`);
        } catch (error: any) {
          console.error(`[IUGU Webhook] Erro ao enviar email:`, error.message);
        }
      }
    } else if (status === "recusado") {
      // Pagamento recusado
      const motivo = invoice?.LR 
        ? `Código: ${invoice.LR}. Entre em contato com o banco emissor.`
        : invoice?.message || "Transação negada pelo banco emissor.";

      if (telefone) {
        try {
          const mensagem = `Olá ${nomeCliente}! Seu pagamento foi negado. ${motivo} Tente novamente ou entre em contato conosco. ${tenantName}.`;
          await enviarSMS(telefone, mensagem);
          console.log(`[IUGU Webhook] SMS de pagamento negado enviado para ${telefone}`);
        } catch (error: any) {
          console.error(`[IUGU Webhook] Erro ao enviar SMS:`, error.message);
        }
      }

      if (email) {
        try {
          await enviarEmail({
            to: email,
            subject: `Pagamento Negado - ${tenantName}`,
            html: `
              <h2>Pagamento Negado</h2>
              <p>Olá ${nomeCliente},</p>
              <p>Infelizmente seu pagamento foi negado.</p>
              <p><strong>Motivo:</strong> ${motivo}</p>
              <p>Por favor, tente novamente ou entre em contato conosco.</p>
              <p>Atenciosamente,<br>${tenantName}</p>
            `,
          });
          console.log(`[IUGU Webhook] Email de pagamento negado enviado para ${email}`);
        } catch (error: any) {
          console.error(`[IUGU Webhook] Erro ao enviar email:`, error.message);
        }
      }
    }
  } catch (error: any) {
    console.error(`[IUGU Webhook] Erro ao enviar notificação:`, error.message);
  }
}

