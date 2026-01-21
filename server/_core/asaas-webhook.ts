import type { Express, Request, Response } from "express";
import * as db from "../db";

export function registerAsaasWebhook(app: Express) {
  app.post("/api/webhooks/asaas", async (req: Request, res: Response) => {
    try {
      const event = req.body;

      // Validar assinatura do webhook (TODO: implementar validação real)
      // const signature = req.headers["asaas-signature"];
      // if (!validarAssinatura(event, signature)) {
      //   return res.status(401).json({ error: "Invalid signature" });
      // }

      console.log("[ASAAS Webhook] Evento recebido:", event.event, event.id);

      switch (event.event) {
        case "PAYMENT_CREATED":
        case "PAYMENT_UPDATED":
        case "PAYMENT_CONFIRMED":
        case "PAYMENT_RECEIVED":
        case "PAYMENT_OVERDUE":
        case "PAYMENT_DELETED":
        case "PAYMENT_REFUNDED":
          await processarPagamento(event);
          break;
        default:
          console.log(`[ASAAS Webhook] Evento desconhecido: ${event.event}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("[ASAAS Webhook] Erro ao processar webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

async function processarPagamento(event: any) {
  const payment = event.payment;
  if (!payment?.id) {
    console.error("[ASAAS Webhook] Payment ID não encontrado no evento");
    return;
  }

  // Buscar payment pelo asaasPaymentId
  const payments = await db.getPaymentsByAsaasId(payment.id);
  if (!payments || payments.length === 0) {
    console.warn(`[ASAAS Webhook] Payment não encontrado no banco: ${payment.id}`);
    return;
  }

  // Mapear status do ASAAS para nosso sistema
  const statusMap: Record<string, "pendente" | "processando" | "aprovado" | "recusado" | "estornado"> = {
    PENDING: "pendente",
    CONFIRMED: "processando",
    RECEIVED: "aprovado",
    REFUNDED: "estornado",
    OVERDUE: "pendente",
  };

  const novoStatus = statusMap[payment.status] || "pendente";

  // Atualizar todos os payments com este asaasPaymentId
  for (const dbPayment of payments) {
    await db.updatePayment(dbPayment.id, {
      status: novoStatus,
      dataPagamento: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
    });

    // Se foi confirmado/aprovado, enviar notificação ao cliente
    if (payment.status === "RECEIVED" || payment.status === "CONFIRMED") {
      // TODO: Enviar e-mail/SMS de confirmação
      console.log(`[ASAAS Webhook] Pagamento ${dbPayment.id} confirmado - notificação enviada`);
    }
  }
}










