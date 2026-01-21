import axios from "axios";
import { ENV } from "../_core/env";

const ASAAS_API_URL = "https://www.asaas.com/api/v3";

export interface AsaasCustomer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id?: string;
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  billingType: "BOLETO" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX";
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
    totalValue?: number;
  }>;
}

export interface AsaasPaymentResponse {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  originalValue: number;
  interestValue: number;
  description: string;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  nossoNumero?: string;
}

export interface AsaasSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
  totalValue?: number;
  grossValue?: number;
  netValue?: number;
  description?: string;
}

/**
 * Criar ou buscar customer no ASAAS
 */
export async function criarOuBuscarCustomer(customer: AsaasCustomer): Promise<string> {
  if (!ENV.asaasApiKey) {
    console.warn("[ASAAS] API não configurada. Retornando ID simulado.");
    return `simulado-${Date.now()}`;
  }

  try {
    // Primeiro, tentar buscar por CPF/CNPJ se fornecido
    if (customer.cpfCnpj) {
      const searchResponse = await axios.get(`${ASAAS_API_URL}/customers`, {
        params: {
          cpfCnpj: customer.cpfCnpj.replace(/\D/g, ""),
        },
        headers: {
          access_token: ENV.asaasApiKey,
        },
      });

      if (searchResponse.data?.data && searchResponse.data.data.length > 0) {
        return searchResponse.data.data[0].id;
      }
    }

    // Se não encontrou, criar novo
    const response = await axios.post(
      `${ASAAS_API_URL}/customers`,
      {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cpfCnpj: customer.cpfCnpj?.replace(/\D/g, ""),
        externalReference: customer.externalReference,
      },
      {
        headers: {
          "Content-Type": "application/json",
          access_token: ENV.asaasApiKey,
        },
      }
    );

    return response.data.id;
  } catch (error: any) {
    console.error("[ASAAS] Erro ao criar/buscar customer:", error.response?.data || error.message);
    throw new Error(`Erro ao criar/buscar customer ASAAS: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
}

/**
 * Criar cobrança no ASAAS
 */
export async function criarCobranca(dados: AsaasPayment): Promise<AsaasPaymentResponse> {
  if (!ENV.asaasApiKey) {
    console.warn("[ASAAS] API não configurada. Retornando cobrança simulada.");
    return {
      id: `simulado-${Date.now()}`,
      customer: dados.customer,
      value: dados.value,
      netValue: dados.value,
      originalValue: dados.value,
      interestValue: 0,
      description: dados.description,
      billingType: dados.billingType,
      status: "PENDING",
      dueDate: dados.dueDate,
      invoiceUrl: "#",
      bankSlipUrl: "#",
    };
  }

  try {
    const payload: any = {
      customer: dados.customer,
      value: dados.value,
      dueDate: dados.dueDate,
      description: dados.description,
      billingType: dados.billingType,
    };

    const response = await axios.post(`${ASAAS_API_URL}/payments`, payload, {
      headers: {
        "Content-Type": "application/json",
        access_token: ENV.asaasApiKey,
      },
    });

    // Se houver split, configurar após criar a cobrança
    if (dados.split && dados.split.length > 0) {
      await configurarSplit(response.data.id, dados.split);
    }

    return response.data;
  } catch (error: any) {
    console.error("[ASAAS] Erro ao criar cobrança:", error.response?.data || error.message);
    throw new Error(`Erro ao criar cobrança: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
}

/**
 * Configurar split de pagamento no ASAAS
 */
export async function configurarSplit(
  paymentId: string,
  splits: AsaasSplit[]
): Promise<void> {
  if (!ENV.asaasApiKey) {
    console.warn("[ASAAS] API não configurada. Split simulado.");
    return;
  }

  try {
    await axios.post(
      `${ASAAS_API_URL}/payments/${paymentId}/split`,
      { splits },
      {
        headers: {
          "Content-Type": "application/json",
          access_token: ENV.asaasApiKey,
        },
      }
    );
  } catch (error: any) {
    console.error("[ASAAS] Erro ao configurar split:", error.response?.data || error.message);
    throw new Error(`Erro ao configurar split: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
}

/**
 * Consultar status de pagamento no ASAAS
 */
export async function consultarPagamento(paymentId: string): Promise<AsaasPaymentResponse> {
  if (!ENV.asaasApiKey) {
    throw new Error("ASAAS API não configurada");
  }

  try {
    const response = await axios.get(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: {
        access_token: ENV.asaasApiKey,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("[ASAAS] Erro ao consultar pagamento:", error.response?.data || error.message);
    throw new Error(`Erro ao consultar pagamento: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
}

/**
 * Estornar pagamento no ASAAS
 */
export async function estornarPagamento(paymentId: string, valor?: number): Promise<void> {
  if (!ENV.asaasApiKey) {
    throw new Error("ASAAS API não configurada");
  }

  try {
    const payload: any = {
      value: valor,
    };

    await axios.post(`${ASAAS_API_URL}/payments/${paymentId}/refund`, payload, {
      headers: {
        "Content-Type": "application/json",
        access_token: ENV.asaasApiKey,
      },
    });
  } catch (error: any) {
    console.error("[ASAAS] Erro ao estornar pagamento:", error.response?.data || error.message);
    throw new Error(`Erro ao estornar pagamento: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
}










