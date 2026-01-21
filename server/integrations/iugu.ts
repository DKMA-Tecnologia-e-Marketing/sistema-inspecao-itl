import axios from "axios";
import { ENV } from "../_core/env";

const IUGU_API_URL = "https://api.iugu.com/v1";

export interface IuguCustomer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  cpf_cnpj?: string;
  zip_code?: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  district?: string;
  external_reference?: string;
}

export interface IuguInvoiceItem {
  description: string;
  quantity: number;
  price_cents: number;
}

export interface IuguSplit {
  recipient_account_id: string;
  cents?: number;
  percent?: number;
  permit_aggregated?: boolean;
}

export interface IuguInvoice {
  id?: string;
  email?: string;
  due_date?: string;
  method?: "pix" | "bank_slip" | "credit_card" | "all";
  payable_with?: string; // "credit_card", "pix", "credit_card,pix", etc.
  items: IuguInvoiceItem[];
  splits?: IuguSplit[];
  payer?: {
    name?: string;
    cpf_cnpj?: string;
    phone?: string;
    email?: string;
    address?: {
      zip_code?: string;
      street?: string;
      number?: string;
      city?: string;
      state?: string;
      district?: string;
    };
  };
  notification_url?: string;
  return_url?: string;
  expired_url?: string;
}

export interface IuguInvoiceResponse {
  id: string;
  account_id: string;
  status: string;
  total_cents: number;
  paid_cents: number;
  due_date: string;
  created_at: string;
  updated_at: string;
  secure_url: string;
  digitable_line?: string;
  barcode_data?: string;
  qr_code?: string;
  qr_code_pix?: string;
  pix_qr_code?: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    price_cents: number;
  }>;
  splits?: Array<{
    id: string;
    recipient_account_id: string;
    cents?: number;
    percent?: number;
    total_cents: number;
    gross_value_cents: number;
    net_value_cents: number;
  }>;
}

/**
 * Obter headers de autenticação para Iugu
 */
export function getAuthHeaders(customToken?: string) {
  const token = customToken || ENV.iuguApiToken;
  if (!token) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }
  return {
    Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

/**
 * Criar ou buscar customer na Iugu
 */
export async function criarOuBuscarCustomer(customer: IuguCustomer): Promise<string> {
  if (!ENV.iuguApiToken) {
    console.warn("[IUGU] API não configurada. Retornando ID simulado.");
    return `simulado-${Date.now()}`;
  }

  try {
    // Primeiro, tentar buscar por CPF/CNPJ se fornecido
    if (customer.cpf_cnpj) {
      const searchResponse = await axios.get(`${IUGU_API_URL}/customers`, {
        params: {
          query: customer.cpf_cnpj.replace(/\D/g, ""),
        },
        headers: getAuthHeaders(),
      });

      if (searchResponse.data?.items && searchResponse.data.items.length > 0) {
        return searchResponse.data.items[0].id;
      }
    }

    // Se não encontrou, criar novo
    // Preparar payload apenas com campos não nulos/undefined
    const payload: any = {
      name: customer.name,
    };
    
    // Adicionar campos opcionais apenas se existirem
    if (customer.email) payload.email = customer.email;
    
    // Formatar telefone para Iugu (separar DDD do número)
    if (customer.phone) {
      const phoneClean = customer.phone.replace(/\D/g, ""); // Remove tudo que não é dígito
      if (phoneClean.length >= 10) {
        // Se tem 10 ou mais dígitos, assume que tem DDD
        const ddd = phoneClean.substring(0, 2);
        const number = phoneClean.substring(2);
        payload.phone_prefix = ddd;
        payload.phone = number;
      } else if (phoneClean.length >= 8) {
        // Se tem 8 ou 9 dígitos, assume que é só o número (sem DDD)
        payload.phone = phoneClean;
      }
    }
    
    if (customer.cpf_cnpj) payload.cpf_cnpj = customer.cpf_cnpj.replace(/\D/g, "");
    if (customer.zip_code) payload.zip_code = customer.zip_code;
    if (customer.street) payload.street = customer.street;
    if (customer.number) payload.number = customer.number;
    if (customer.city) payload.city = customer.city;
    if (customer.state) payload.state = customer.state;
    if (customer.district) payload.district = customer.district;
    if (customer.external_reference) payload.notes = customer.external_reference;
    
    console.log("[IUGU] Payload para criar customer:", JSON.stringify(payload, null, 2));
    
    const response = await axios.post(
      `${IUGU_API_URL}/customers`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

    return response.data.id;
  } catch (error: any) {
    console.error("[IUGU] Erro ao criar/buscar customer:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    // Formatar mensagem de erro de forma mais clara
    let errorMessage = error.message || "Erro desconhecido";
    
    if (error.response?.data) {
      if (error.response.data.errors) {
        // Se errors é um objeto, tentar formatar
        if (typeof error.response.data.errors === "object") {
          if (Array.isArray(error.response.data.errors)) {
            errorMessage = error.response.data.errors.map((e: any) => 
              typeof e === "string" ? e : e.message || JSON.stringify(e)
            ).join(", ");
          } else {
            // Se é um objeto, pegar a primeira mensagem ou serializar
            const errorKeys = Object.keys(error.response.data.errors);
            if (errorKeys.length > 0) {
              const firstError = error.response.data.errors[errorKeys[0]];
              errorMessage = Array.isArray(firstError) 
                ? firstError.join(", ")
                : typeof firstError === "string" 
                  ? firstError 
                  : JSON.stringify(error.response.data.errors);
            } else {
              errorMessage = JSON.stringify(error.response.data.errors);
            }
          }
        } else {
          errorMessage = String(error.response.data.errors);
        }
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === "string") {
        errorMessage = error.response.data;
      } else {
        errorMessage = JSON.stringify(error.response.data);
      }
    }
    
    throw new Error(`Erro ao criar/buscar customer Iugu: ${errorMessage}`);
  }
}

/**
 * Criar fatura na Iugu com split de pagamento
 */
export async function criarFatura(dados: IuguInvoice, subaccountApiToken?: string): Promise<IuguInvoiceResponse> {
  const token = subaccountApiToken || ENV.iuguApiToken;
  
  if (!token) {
    console.warn("[IUGU] API não configurada. Retornando fatura simulada.");
    return {
      id: `simulado-${Date.now()}`,
      account_id: "simulado",
      status: "pending",
      total_cents: dados.items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
      paid_cents: 0,
      due_date: dados.due_date || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      secure_url: "#",
      items: dados.items.map((item, idx) => ({
        id: `item-${idx}`,
        description: item.description,
        quantity: item.quantity,
        price_cents: item.price_cents,
      })),
    };
  }

  try {
    const tokenType = subaccountApiToken ? "subconta" : "principal";
    console.log(`[IUGU] Criando fatura usando token ${tokenType}`);
    
    const payload: any = {
      email: dados.email,
      due_date: dados.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 7 dias
      items: dados.items,
    };

    // Adicionar método de pagamento se especificado
    // IMPORTANTE: Para PIX, a IUGU pode precisar de configuração adicional
    if (dados.method) {
      payload.method = dados.method;
      console.log("[IUGU] Método de pagamento (legado):", dados.method);
      
      // Para PIX, garantir que o método está correto
      if (dados.method === "pix") {
        // A IUGU pode retornar o QR code imediatamente ou pode precisar de uma consulta adicional
        console.log("[IUGU] Criando fatura com método PIX - QR code será gerado pela IUGU");
      }
    }
    
    // Adicionar payable_with se especificado (preferido pela documentação)
    if (dados.payable_with) {
      payload.payable_with = dados.payable_with;
      console.log("[IUGU] Métodos de pagamento aceitos (payable_with):", dados.payable_with);
      
      // NÃO definir status - deixar a Iugu criar em "pending" (padrão) como faz com PIX
      // A fatura em "pending" pode ser paga via /charge diretamente com token
    }

    // Adicionar splits se houver
    if (dados.splits && dados.splits.length > 0) {
      // Validar que a soma dos percentuais não exceda 100%
      const totalPercent = dados.splits.reduce((sum, split) => sum + (split.percent || 0), 0);
      if (totalPercent > 100) {
        console.warn("[IUGU] Soma dos percentuais de split excede 100%:", totalPercent);
      }
      // Formato correto do split para Iugu (sem campos extras que não são suportados)
      payload.splits = dados.splits.map((split: any) => {
        const splitPayload: any = {
          recipient_account_id: split.recipient_account_id,
        };
        // Usar percent OU cents, não ambos
        if (split.percent !== undefined && split.percent !== null) {
          splitPayload.percent = split.percent;
        }
        if (split.cents !== undefined && split.cents !== null) {
          splitPayload.cents = split.cents;
        }
        return splitPayload;
      });
      console.log("[IUGU] Payload com splits:", JSON.stringify(payload.splits, null, 2));
    } else {
      console.log("[IUGU] Criando fatura sem splits");
    }

    // Adicionar dados do pagador se fornecido
    if (dados.payer) {
      payload.payer = dados.payer;
    }

    // Adicionar URLs de callback se fornecidas
    if (dados.notification_url) {
      payload.notification_url = dados.notification_url;
    }
    if (dados.return_url) {
      payload.return_url = dados.return_url;
    }
    if (dados.expired_url) {
      payload.expired_url = dados.expired_url;
    }

    // Log do payload completo antes de enviar
    console.log(`[IUGU] Payload completo sendo enviado para criar fatura:`, JSON.stringify({
      ...payload,
      // Não logar dados sensíveis do pagador
      payer: payload.payer ? { ...payload.payer, cpf_cnpj: payload.payer.cpf_cnpj ? "***" : undefined } : undefined,
    }, null, 2));

    const response = await axios.post(`${IUGU_API_URL}/invoices`, payload, {
      headers: getAuthHeaders(subaccountApiToken),
    });

    console.log(`[IUGU] Fatura criada com sucesso usando token ${tokenType}:`, response.data.id);
    console.log(`[IUGU] Resposta completa da fatura:`, JSON.stringify({
      id: response.data.id,
      status: response.data.status,
      method: response.data.method || dados.method,
      qr_code_pix: response.data.qr_code_pix,
      pix_qr_code: response.data.pix_qr_code,
      qr_code: response.data.qr_code,
      secure_url: response.data.secure_url,
      account_id: response.data.account_id,
    }, null, 2));
    
    // Se for PIX e não tiver QR code na resposta inicial, pode ser que precise consultar novamente
    if (dados.method === "pix" && !response.data.qr_code_pix && !response.data.pix_qr_code && !response.data.qr_code) {
      console.log("[IUGU] QR code PIX não veio na resposta inicial, aguardando processamento...");
      // Aguardar um pouco e consultar novamente (a IUGU pode precisar de tempo para gerar o QR code)
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const consultResponse = await axios.get(`${IUGU_API_URL}/invoices/${response.data.id}`, {
            headers: getAuthHeaders(subaccountApiToken),
          });
          console.log(`[IUGU] Tentativa ${attempt + 1} de consulta - QR code:`, {
            qr_code_pix: consultResponse.data.qr_code_pix,
            pix_qr_code: consultResponse.data.pix_qr_code,
            qr_code: consultResponse.data.qr_code,
          });
          if (consultResponse.data.qr_code_pix || consultResponse.data.pix_qr_code || consultResponse.data.qr_code) {
            console.log("[IUGU] QR code PIX obtido na consulta subsequente");
            response.data.qr_code_pix = consultResponse.data.qr_code_pix || consultResponse.data.pix_qr_code || consultResponse.data.qr_code;
            response.data.pix_qr_code = consultResponse.data.pix_qr_code || consultResponse.data.qr_code_pix || consultResponse.data.qr_code;
            break;
          }
        } catch (consultError: any) {
          console.warn(`[IUGU] Erro ao consultar QR code (tentativa ${attempt + 1}):`, consultError.message);
        }
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error("[IUGU] Erro ao criar fatura:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    // Formatar mensagem de erro de forma mais clara
    let errorMessage = error.message || "Erro desconhecido";
    
    if (error.response?.data) {
      if (error.response.data.errors) {
        // Se errors é um objeto, tentar formatar
        if (typeof error.response.data.errors === "object") {
          if (Array.isArray(error.response.data.errors)) {
            errorMessage = error.response.data.errors.map((e: any) => 
              typeof e === "string" ? e : e.message || JSON.stringify(e)
            ).join(", ");
          } else {
            // Se é um objeto, pegar a primeira mensagem ou serializar
            const errorKeys = Object.keys(error.response.data.errors);
            if (errorKeys.length > 0) {
              const firstError = error.response.data.errors[errorKeys[0]];
              errorMessage = Array.isArray(firstError) 
                ? firstError.join(", ")
                : typeof firstError === "string" 
                  ? firstError 
                  : JSON.stringify(error.response.data.errors);
            } else {
              errorMessage = JSON.stringify(error.response.data.errors);
            }
          }
        } else {
          errorMessage = String(error.response.data.errors);
        }
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === "string") {
        errorMessage = error.response.data;
      } else {
        errorMessage = JSON.stringify(error.response.data);
      }
    }
    
    throw new Error(`Erro ao criar fatura Iugu: ${errorMessage}`);
  }
}

/**
 * Consultar status de fatura na Iugu
 */
export async function consultarFatura(invoiceId: string, subaccountApiToken?: string): Promise<IuguInvoiceResponse> {
  const token = subaccountApiToken || ENV.iuguApiToken;
  if (!token) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }

  try {
    const response = await axios.get(`${IUGU_API_URL}/invoices/${invoiceId}`, {
      headers: getAuthHeaders(subaccountApiToken),
    });

    // Log completo da resposta para debug
    console.log(`[IUGU] Resposta completa da consulta de fatura ${invoiceId}:`, JSON.stringify({
      id: response.data.id,
      status: response.data.status,
      method: response.data.method,
      qr_code_pix: response.data.qr_code_pix,
      pix_qr_code: response.data.pix_qr_code,
      qr_code: response.data.qr_code,
      pix: response.data.pix,
      secure_url: response.data.secure_url,
      // Verificar se há campos aninhados
      pix_data: response.data.pix_data,
      pix_qr_code_base64: response.data.pix_qr_code_base64,
    }, null, 2));

    // Se for PIX e não tiver QR code direto, verificar campos aninhados
    // Verificar se tem objeto pix (mesmo que method não seja "pix")
    const hasPixObject = response.data.pix && typeof response.data.pix === "object";
    const isPixMethod = response.data.method === "pix" || response.data.method === "all";
    
    console.log(`[IUGU] Verificando QR code - method: ${response.data.method}, hasPixObject: ${hasPixObject}, isPixMethod: ${isPixMethod}`);
    
    if (isPixMethod || hasPixObject) {
      // Verificar se o QR code está em um objeto pix
      if (hasPixObject) {
        // Verificar qrcode (sem underscore) - formato atual da IUGU
        // Verificar se não é null ou undefined
        if (response.data.pix.qrcode != null && response.data.pix.qrcode !== "") {
          response.data.qr_code_pix = response.data.pix.qrcode;
          response.data.pix_qr_code = response.data.pix.qrcode;
          response.data.qr_code = response.data.pix.qrcode;
          console.log(`[IUGU] QR code extraído de pix.qrcode: ${response.data.pix.qrcode.substring(0, 50)}...`);
        } else {
          console.log(`[IUGU] pix.qrcode está null ou vazio. Status PIX: ${response.data.pix.status || 'N/A'}`);
        }
        // Verificar outros formatos possíveis
        if (response.data.pix.qr_code_pix && !response.data.qr_code_pix) {
          response.data.qr_code_pix = response.data.pix.qr_code_pix;
          response.data.pix_qr_code = response.data.pix.qr_code_pix;
          response.data.qr_code = response.data.pix.qr_code_pix;
        }
        if (response.data.pix.pix_qr_code && !response.data.pix_qr_code) {
          response.data.pix_qr_code = response.data.pix.pix_qr_code;
          if (!response.data.qr_code_pix) {
            response.data.qr_code_pix = response.data.pix.pix_qr_code;
          }
        }
        if (response.data.pix.qr_code && !response.data.qr_code) {
          response.data.qr_code = response.data.pix.qr_code;
          if (!response.data.qr_code_pix) {
            response.data.qr_code_pix = response.data.pix.qr_code;
          }
        }
        // Verificar qrcode_text (texto do QR code)
        if (response.data.pix.qrcode_text && !response.data.qr_code_pix) {
          // Se não tiver imagem, usar o texto (pode ser convertido para QR code depois)
          console.log(`[IUGU] QR code texto encontrado: ${response.data.pix.qrcode_text.substring(0, 50)}...`);
        }
      }
      
      // Verificar pix_data
      if (response.data.pix_data && typeof response.data.pix_data === "object") {
        if (response.data.pix_data.qr_code_pix) {
          response.data.qr_code_pix = response.data.pix_data.qr_code_pix;
        }
        if (response.data.pix_data.pix_qr_code) {
          response.data.pix_qr_code = response.data.pix_data.pix_qr_code;
        }
        if (response.data.pix_data.qr_code) {
          response.data.qr_code = response.data.pix_data.qr_code;
        }
      }
    }

    return response.data;
  } catch (error: any) {
    console.error("[IUGU] Erro ao consultar fatura:", error.response?.data || error.message);
    throw new Error(
      `Erro ao consultar fatura: ${error.response?.data?.errors || error.message}`
    );
  }
}

/**
 * Cancelar fatura na Iugu
 */
export async function cancelarFatura(invoiceId: string, subaccountApiToken?: string): Promise<IuguInvoiceResponse> {
  const token = subaccountApiToken || ENV.iuguApiToken;
  if (!token) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }

  try {
    const response = await axios.put(
      `${IUGU_API_URL}/invoices/${invoiceId}/cancel`,
      {},
      {
        headers: getAuthHeaders(subaccountApiToken),
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("[IUGU] Erro ao cancelar fatura:", error.response?.data || error.message);
    throw new Error(
      `Erro ao cancelar fatura: ${error.response?.data?.errors || error.message}`
    );
  }
}

/**
 * Reembolsar fatura na Iugu
 */
export async function reembolsarFatura(invoiceId: string, valorCents?: number, subaccountApiToken?: string): Promise<IuguInvoiceResponse> {
  const token = subaccountApiToken || ENV.iuguApiToken;
  if (!token) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }

  try {
    const payload: any = {};
    if (valorCents) {
      payload.total_cents = valorCents;
    }

    const response = await axios.post(
      `${IUGU_API_URL}/invoices/${invoiceId}/refund`,
      payload,
      {
        headers: getAuthHeaders(subaccountApiToken),
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("[IUGU] Erro ao reembolsar fatura:", error.response?.data || error.message);
    throw new Error(
      `Erro ao reembolsar fatura: ${error.response?.data?.errors || error.message}`
    );
  }
}

/**
 * Interface para dados de pagamento com cartão
 * IMPORTANTE: Dados sensíveis (number, cvv, month, year) NÃO devem ser enviados ao backend
 * Apenas o token gerado pelo Iugu JS no frontend deve ser enviado
 */
export interface IuguCardPayment {
  invoice_id: string;
  token: string; // Token do cartão gerado pelo IUGU JS (obrigatório)
  installments?: number; // Número de parcelas (padrão: 1)
  // Dados do cliente para o payload do /charge (opcional - se não fornecido, será buscado da fatura)
  payer?: {
    name: string;
    cpf_cnpj?: string;
  };
  email?: string;
  items?: Array<{
    description: string;
    quantity: number;
    price_cents: number;
  }>;
}

/**
 * Interface para resposta de pagamento com cartão
 */
export interface IuguCardPaymentResponse {
  success: boolean;
  message?: string;
  invoice?: IuguInvoiceResponse;
  errors?: any;
}

/**
 * Processar pagamento com cartão de crédito
 */
export async function processarPagamentoCartao(
  dados: IuguCardPayment,
  subaccountApiToken?: string
): Promise<IuguCardPaymentResponse> {
  const token = subaccountApiToken || ENV.iuguApiToken;
  if (!token) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }
  
  // Log do token sendo usado (mascarado para segurança)
  const tokenPreview = token.substring(0, 8) + "***" + token.substring(token.length - 4);
  const tokenType = subaccountApiToken ? "subconta" : "principal";
  console.log(`[IUGU] Usando token de API: ${tokenPreview} (tipo: ${tokenType})`);

  try {
    const tokenType = subaccountApiToken ? "subconta" : "principal";
    console.log(`[IUGU] Processando pagamento com cartão usando token ${tokenType}`);
    console.log(`[IUGU] Invoice ID: ${dados.invoice_id}`);
    
    // Primeiro, verificar se a fatura existe e está acessível
    let invoiceCheck: any;
    try {
      invoiceCheck = await axios.get(
        `${IUGU_API_URL}/invoices/${dados.invoice_id}`,
        {
          headers: getAuthHeaders(subaccountApiToken),
        }
      );
      console.log(`[IUGU] Fatura encontrada:`, {
        id: invoiceCheck.data.id,
        status: invoiceCheck.data.status,
        method: invoiceCheck.data.method,
        payable_with: invoiceCheck.data.payable_with,
        total_cents: invoiceCheck.data.total_cents,
        account_id: invoiceCheck.data.account_id,
      });
      
      // Verificar se a fatura aceita cartão (verificar tanto payable_with quanto method)
      // payable_with pode ser "credit_card", "all", "credit_card,pix", ou um array
      const payableWith = invoiceCheck.data.payable_with || invoiceCheck.data.method;
      const invoiceMethod = invoiceCheck.data.method;
      const acceptsCard = 
        payableWith === "credit_card" || 
        payableWith === "all" || 
        (typeof payableWith === "string" && payableWith.includes("credit_card")) ||
        (Array.isArray(payableWith) && payableWith.includes("credit_card")) ||
        invoiceMethod === "credit_card" ||
        invoiceMethod === "all";
      
      if (!acceptsCard) {
        console.warn(`[IUGU] ATENÇÃO: Fatura ${invoiceCheck.data.id} não aceita cartão de crédito. method: "${invoiceMethod || 'undefined'}", payable_with: ${JSON.stringify(payableWith)}`);
        // Não lançar erro aqui, apenas avisar - pode ser que a fatura ainda aceite via /charge
      } else {
        console.log(`[IUGU] Fatura ${invoiceCheck.data.id} aceita cartão. method: "${invoiceMethod || 'undefined'}", payable_with: ${JSON.stringify(payableWith)}`);
      }
    } catch (checkError: any) {
      console.error(`[IUGU] Erro ao verificar fatura ${dados.invoice_id}:`, checkError.response?.status, checkError.response?.data);
      throw new Error(`Fatura ${dados.invoice_id} não encontrada ou não acessível: ${checkError.response?.data?.errors || checkError.message}`);
    }
    
    // IMPORTANTE: Apenas token deve ser enviado ao backend (dados sensíveis devem ser tokenizados no frontend)
    // IMPORTANTE: Não enviar 'method' quando usamos 'token' - a Iugu não permite ambos
    if (!dados.token) {
      throw new Error("Token do cartão é obrigatório (dados sensíveis devem ser tokenizados no frontend)");
    }

    // Verificar status da fatura antes de processar
    const invoiceStatus = invoiceCheck?.data?.status;
    console.log(`[IUGU] Status da fatura antes do processamento: ${invoiceStatus}`);
    
    // Verificar se a fatura está em um status que permite processamento
    // Faturas em "paid", "canceled", "refunded" não podem ser processadas
    if (invoiceStatus === "paid") {
      console.error(`[IUGU] Fatura ${dados.invoice_id} já foi paga. Status: ${invoiceStatus}`);
      throw new Error("Esta fatura já foi paga. Não é possível processar um novo pagamento.");
    }
    if (invoiceStatus === "canceled" || invoiceStatus === "refunded") {
      console.error(`[IUGU] Fatura ${dados.invoice_id} está com status inválido: ${invoiceStatus}`);
      throw new Error(`Esta fatura está com status "${invoiceStatus}" e não pode ser processada.`);
    }
    
    // Log completo da fatura antes de processar
    console.log(`[IUGU] Dados completos da fatura antes do processamento:`, {
      id: invoiceCheck.data.id,
      status: invoiceCheck.data.status,
      method: invoiceCheck.data.method,
      payable_with: invoiceCheck.data.payable_with,
      total_cents: invoiceCheck.data.total_cents,
      account_id: invoiceCheck.data.account_id,
      created_at: invoiceCheck.data.created_at,
    });
    
    // Tentar primeiro usar /invoices/{invoice_id}/charge (endpoint específico para faturas)
    // Se falhar, usar /charge direto como fallback
    let response: any;
    let chargeError: any = null;
    
    // Tentativa 1: Usar /invoices/{invoice_id}/charge (endpoint recomendado para faturas existentes)
    try {
      const chargePayload: any = {
        token: dados.token,
        installments: dados.installments || 1,
      };
      
      console.log(`[IUGU] Tentando processar pagamento via /invoices/${dados.invoice_id}/charge`);
      console.log(`[IUGU] Payload:`, JSON.stringify({ ...chargePayload, token: "***" + dados.token.substring(dados.token.length - 4) }, null, 2));
      
      response = await axios.post(
        `${IUGU_API_URL}/invoices/${dados.invoice_id}/charge`,
        chargePayload,
        {
          headers: getAuthHeaders(subaccountApiToken),
        }
      );
      
      console.log(`[IUGU] Resposta do /invoices/${dados.invoice_id}/charge:`, JSON.stringify(response.data, null, 2));
    } catch (firstError: any) {
      chargeError = firstError;
      console.log(`[IUGU] Endpoint /invoices/${dados.invoice_id}/charge falhou, tentando /charge direto:`, {
        status: firstError.response?.status,
        statusText: firstError.response?.statusText,
        message: firstError.message,
      });
      
      // Tentativa 2: Usar /charge direto com invoice_id no payload (fallback)
      // IMPORTANTE: Segundo a documentação da Iugu, quando usamos /charge com invoice_id,
      // ainda precisamos enviar payer, email e items para garantir que a transação seja processada corretamente
      try {
        // Buscar dados do cliente da fatura se não foram fornecidos
        let payerData = dados.payer;
        let emailData = dados.email;
        let itemsData = dados.items;
        
        // Se não foram fornecidos, tentar buscar da fatura
        if (!payerData && invoiceCheck?.data?.payer) {
          payerData = {
            name: invoiceCheck.data.payer.name || '',
            cpf_cnpj: invoiceCheck.data.payer.cpf_cnpj,
          };
        }
        
        if (!emailData && invoiceCheck?.data?.email) {
          emailData = invoiceCheck.data.email;
        }
        
        if (!itemsData && invoiceCheck?.data?.items) {
          itemsData = invoiceCheck.data.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity || 1,
            price_cents: item.price_cents,
          }));
        }
        
        const chargePayload: any = {
          invoice_id: dados.invoice_id,
          token: dados.token,
          installments: dados.installments || 1,
        };
        
        // Adicionar payer se disponível (obrigatório segundo a documentação)
        if (payerData && payerData.name) {
          chargePayload.payer = {
            name: payerData.name,
            cpf_cnpj: payerData.cpf_cnpj,
          };
        }
        
        // Adicionar email se disponível
        if (emailData) {
          chargePayload.email = emailData;
        }
        
        // IMPORTANTE: NÃO adicionar items quando já temos invoice_id
        // A Iugu não permite cobrar items e fatura ao mesmo tempo
        // Quando temos invoice_id, os items já estão na fatura
        // Se tentarmos adicionar items, receberemos o erro: "Não é possivel cobrar itens e fatura ao mesmo tempo"
        // if (itemsData && itemsData.length > 0) {
        //   chargePayload.items = itemsData;
        // }
        
        console.log(`[IUGU] Processando pagamento via /charge com token e invoice_id`);
        console.log(`[IUGU] Payload (mascarado):`, JSON.stringify({ 
          ...chargePayload, 
          token: "***" + dados.token.substring(dados.token.length - 4),
          payer: chargePayload.payer ? { ...chargePayload.payer, cpf_cnpj: chargePayload.payer.cpf_cnpj ? "***" : undefined } : undefined,
        }, null, 2));
        
        response = await axios.post(
          `${IUGU_API_URL}/charge`,
          chargePayload,
          {
            headers: getAuthHeaders(subaccountApiToken),
          }
        );
        
        console.log(`[IUGU] Resposta do /charge:`, JSON.stringify(response.data, null, 2));
        chargeError = null; // Sucesso no fallback
      } catch (secondError: any) {
        chargeError = secondError;
        console.error(`[IUGU] Erro no /charge também:`, {
          status: secondError.response?.status,
          statusText: secondError.response?.statusText,
          data: JSON.stringify(secondError.response?.data, null, 2),
          message: secondError.message,
        });
        
        // Se o erro for relacionado à fatura não aceitar cartão, retornar erro mais claro
        if (secondError.response?.data?.errors) {
          const errorData = secondError.response.data;
          const errorMessage = typeof errorData.errors === 'string' 
            ? errorData.errors 
            : JSON.stringify(errorData.errors);
          
          if (errorMessage.includes('credit_card') || errorMessage.includes('cartão') || errorMessage.includes('card')) {
            throw new Error(`A fatura não aceita pagamento com cartão. Erro: ${errorMessage}`);
          }
        }
        
        throw secondError;
      }
    }

    // Log detalhado da resposta para debug
    console.log(`[IUGU] ========== RESPOSTA COMPLETA DA IUGU ==========`);
    console.log(`[IUGU] Success: ${response.data.success}`);
    console.log(`[IUGU] Status: ${response.data.status}`);
    console.log(`[IUGU] Message: ${response.data.message || 'N/A'}`);
    console.log(`[IUGU] LR: ${response.data.LR || 'N/A'}`);
    console.log(`[IUGU] Errors: ${JSON.stringify(response.data.errors || 'N/A', null, 2)}`);
    console.log(`[IUGU] Invoice ID: ${response.data.invoice_id || response.data.id || 'N/A'}`);
    console.log(`[IUGU] Account ID: ${response.data.account_id || 'N/A'}`);
    console.log(`[IUGU] Brand: ${response.data.brand || 'N/A'}`);
    console.log(`[IUGU] Issuer: ${response.data.issuer || 'N/A'}`);
    console.log(`[IUGU] Last4: ${response.data.last4 || 'N/A'}`);
    console.log(`[IUGU] Resposta completa (JSON):`, JSON.stringify(response.data, null, 2));
    console.log(`[IUGU] ==============================================`);
    
    // Diagnóstico específico para AF02
    if (response.data.LR === "AF02") {
      console.error(`[IUGU] ========== DIAGNÓSTICO AF02 ==========`);
      console.error(`[IUGU] Token usado: ${tokenType} (${tokenPreview})`);
      console.error(`[IUGU] Invoice ID: ${dados.invoice_id}`);
      console.error(`[IUGU] Account ID da fatura: ${invoiceCheck?.data?.account_id || 'N/A'}`);
      console.error(`[IUGU] Status da fatura: ${invoiceCheck?.data?.status || 'N/A'}`);
      console.error(`[IUGU] Payable with: ${JSON.stringify(invoiceCheck?.data?.payable_with || invoiceCheck?.data?.method || 'N/A')}`);
      console.error(`[IUGU] Brand do cartão: ${response.data.brand || 'N/A'}`);
      console.error(`[IUGU] Emissor: ${response.data.issuer || 'N/A'}`);
      console.error(`[IUGU] Últimos 4 dígitos: ${response.data.last4 || 'N/A'}`);
      console.error(`[IUGU] Possíveis causas:`);
      console.error(`[IUGU]   1. Subconta não habilitada para receber pagamentos com cartão na Iugu`);
      console.error(`[IUGU]   2. Configuração de antifraude muito restritiva na subconta`);
      console.error(`[IUGU]   3. Token da subconta incorreto ou expirado`);
      console.error(`[IUGU]   4. Subconta em modo de teste mas usando cartão de produção (ou vice-versa)`);
      console.error(`[IUGU]   5. Subconta não possui permissão para processar cartões de crédito`);
      console.error(`[IUGU] =======================================`);
    }

    // Verificar se há erros (considerando que errors pode ser um objeto vazio)
    const hasErrors = response.data.errors && (
      typeof response.data.errors === 'string' ||
      (typeof response.data.errors === 'object' && Object.keys(response.data.errors).length > 0)
    );
    
    // Verificar se o pagamento foi bem-sucedido
    // A Iugu pode retornar success: true OU status: 'paid' OU status: 'captured'
    const isSuccess = 
      response.data.success === true || 
      response.data.status === 'paid' ||
      response.data.status === 'captured' ||
      (response.data.invoice && (response.data.invoice.status === 'paid' || response.data.invoice.status === 'captured'));
    
    // Verificar se a transação foi negada (LR é um código de retorno da Iugu)
    // LR geralmente indica resultado da transação (ex: "57", "51", etc.)
    const isDenied = response.data.LR || 
                     response.data.status === 'failed' || 
                     response.data.status === 'canceled' ||
                     (response.data.message && (
                       response.data.message.toLowerCase().includes('negada') ||
                       response.data.message.toLowerCase().includes('negado') ||
                       response.data.message.toLowerCase().includes('denied') ||
                       response.data.message.toLowerCase().includes('recusad')
                     ));

    if (hasErrors) {
      // Extrair mensagem de erro de forma mais inteligente
      let errorMessage = "Erro ao processar pagamento";
      if (typeof response.data.errors === 'string') {
        errorMessage = response.data.errors;
      } else if (typeof response.data.errors === 'object') {
        const errorKeys = Object.keys(response.data.errors);
        if (errorKeys.length > 0) {
          const firstError = response.data.errors[errorKeys[0]];
          errorMessage = Array.isArray(firstError) 
            ? firstError.join(", ")
            : typeof firstError === 'string' 
              ? firstError 
              : JSON.stringify(response.data.errors);
        }
      }

      console.log(`[IUGU] Erro detectado na resposta:`, errorMessage);
      return {
        success: false,
        message: errorMessage,
        errors: response.data.errors,
        LR: response.data.LR,
      };
    }

    if (isSuccess) {
      console.log(`[IUGU] Pagamento com cartão processado com sucesso usando token ${tokenType}`);
      console.log(`[IUGU] Status final: ${response.data.status}, Success: ${response.data.success}`);
      
      // Garantir que retornamos a fatura corretamente
      // A resposta pode vir em response.data diretamente ou em response.data.invoice
      const invoiceData = response.data.invoice || response.data;
      
      return {
        success: true,
        invoice: invoiceData,
      };
    }

    // Mapeamento de códigos LR comuns para mensagens mais descritivas
    // Baseado na documentação da Iugu e códigos de retorno comuns
    const lrCodeMessages: Record<string, string> = {
      "AF02": "Cartão não autorizado. Entre em contato com o banco emissor para autorizar a transação.",
      "05": "Transação negada. Cartão não autorizado.",
      "14": "Cartão inválido. Verifique os dados do cartão.",
      "51": "Saldo ou limite insuficiente.",
      "57": "Transação não permitida para este cartão.",
      "61": "Limite de saque excedido.",
      "62": "Cartão restrito. Entre em contato com o banco emissor.",
      "63": "Falha de segurança. Entre em contato com o banco.",
      "65": "Limite de transações excedido.",
      "78": "Cartão não foi desbloqueado pelo portador.",
      "82": "Cartão inválido para esta operação.",
      "91": "Banco emissor temporariamente indisponível. Tente novamente.",
      "96": "Erro no processamento. Tente novamente.",
    };
    
    // Verificar se a mensagem de erro contém informações sobre tentativas mensais excedidas
    const errorMessage = response.data.message || response.data.errors?.message || "";
    const hasMonthlyLimitError = errorMessage.toLowerCase().includes("tentativas mensais") ||
                                  errorMessage.toLowerCase().includes("monthly attempts") ||
                                  errorMessage.toLowerCase().includes("excedido") ||
                                  errorMessage.toLowerCase().includes("exceeded");

    // Se foi negado, retornar mensagem específica
    if (isDenied || hasMonthlyLimitError) {
      let deniedMessage = response.data.message || "Transação negada";
      
      // Tratamento especial para erro de tentativas mensais excedidas
      if (hasMonthlyLimitError) {
        deniedMessage = "O número de tentativas mensais de pagamento deste cartão foi excedido. Este é um limite de segurança da Iugu. Por favor, aguarde ou entre em contato com o suporte da Iugu para mais informações.";
        console.log(`[IUGU] Limite de tentativas mensais excedido para o cartão`);
      } else if (response.data.LR) {
        // Se tiver código LR, tentar usar mensagem específica
        const lrMessage = lrCodeMessages[response.data.LR];
        if (lrMessage) {
          deniedMessage = lrMessage;
        } else {
          // Se não tiver mapeamento, incluir o código LR na mensagem
          deniedMessage = `Transação negada (código: ${response.data.LR}). Entre em contato com o banco emissor ou tente outro cartão.`;
        }
      }
      
      console.log(`[IUGU] Transação negada - LR: ${response.data.LR || 'N/A'}, Status: ${response.data.status}, Mensagem: ${deniedMessage}, Token usado: ${tokenType}`);
      return {
        success: false,
        message: deniedMessage,
        errors: response.data.errors || response.data,
        LR: response.data.LR,
        status: response.data.status,
        infoMessage: response.data.info_message,
      };
    }

    // Se não foi sucesso nem erro explícito, retornar como erro genérico
    const genericMessage = response.data.message || 
                          (response.data.LR ? `Transação não autorizada (LR: ${response.data.LR})` : "Erro ao processar pagamento");
    console.log(`[IUGU] Resposta não classificada como sucesso:`, genericMessage);
    return {
      success: false,
      message: genericMessage,
      errors: response.data.errors || response.data,
      LR: response.data.LR,
      status: response.data.status,
    };
  } catch (error: any) {
    console.error("[IUGU] Erro ao processar pagamento com cartão:", error.response?.data || error.message);
    
    let errorMessage = "Erro ao processar pagamento";
    if (error.response?.data?.errors) {
      if (Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(", ");
      } else if (typeof error.response.data.errors === "string") {
        errorMessage = error.response.data.errors;
      } else if (error.response.data.errors.message) {
        errorMessage = error.response.data.errors.message;
      } else {
        errorMessage = JSON.stringify(error.response.data.errors);
      }
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    console.error(`[IUGU] Erro detalhado ao processar pagamento:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      message: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error.response?.data || error, null, 2),
    });

    return {
      success: false,
      message: errorMessage,
      errors: error.response?.data?.errors || error.message,
      errorDetails: error.response?.data,
      statusCode: error.response?.status,
    };
  }
}

/**
 * Cache de tokens de subconta para evitar múltiplas chamadas
 */
const subaccountTokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Interface para transação de cartão de crédito
 */
export interface IuguCreditCardTransaction {
  id: string;
  invoice_id: string;
  account_id: string;
  status: string;
  authorize_lr: string | null;
  cancel_lr: string | null;
  lr: string | null;
  holder_name: string;
  bin: number;
  last4: string;
  tid: string | null;
  nsu: string | null;
  arp: string | null;
  created_at: string;
  authorized_at: string | null;
  canceled_at: string | null;
  payer_cpf_cnpj: string | null;
  payer_name: string | null;
  email: string;
  test_mode: boolean;
}

/**
 * Interface para resposta de listagem de transações
 */
export interface IuguCreditCardTransactionsResponse {
  items: IuguCreditCardTransaction[];
  totalItems: number;
}

/**
 * Listar transações de cartão de crédito de subcontas
 * Requer o token da conta mestre
 * Documentação: https://dev.iugu.com/changelog/changelog-03out2024-novo-endpoint-listar-transa%C3%A7%C3%B5es-de-cart%C3%A3o-de-cr%C3%A9dito-de-subcontas
 */
export async function listarTransacoesCartao(
  masterApiToken?: string,
  filters?: {
    created_at_from?: string;
    account_id?: string;
    invoice_id?: string;
  }
): Promise<IuguCreditCardTransactionsResponse> {
  const token = masterApiToken || ENV.iuguApiToken;
  if (!token) {
    throw new Error("IUGU_API_TOKEN não configurado (deve ser o token da conta mestre)");
  }

  try {
    const params: any = {};
    if (filters?.created_at_from) {
      params.created_at_from = filters.created_at_from;
    }
    if (filters?.account_id) {
      params.account_id = filters.account_id;
    }
    if (filters?.invoice_id) {
      params.invoice_id = filters.invoice_id;
    }

    const response = await axios.get(`${IUGU_API_URL}/accounts/credit_card_transactions`, {
      headers: getAuthHeaders(token),
      params,
    });

    console.log(`[IUGU] Transações encontradas: ${response.data.totalItems || 0}`);
    
    return {
      items: response.data.items || [],
      totalItems: response.data.totalItems || 0,
    };
  } catch (error: any) {
    console.error("[IUGU] Erro ao listar transações de cartão:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error(
      `Erro ao listar transações: ${error.response?.data?.errors || error.message}`
    );
  }
}
const TOKEN_CACHE_TTL = 60 * 60 * 1000; // 1 hora

/**
 * Obter token da API de uma subconta específica
 */
export async function obterTokenSubconta(accountId: string): Promise<string | null> {
  if (!ENV.iuguApiToken) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }

  // Verificar cache primeiro
  const cached = subaccountTokenCache.get(accountId);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[IUGU] Usando token em cache para subconta ${accountId}`);
    return cached.token;
  }

  try {
    console.log(`[IUGU] Buscando token da API para subconta ${accountId}`);
    
    const response = await axios.get(
      `${IUGU_API_URL}/retrieve_subaccounts_api_token`,
      {
        params: {
          api_token: ENV.iuguApiToken,
        },
        headers: getAuthHeaders(),
      }
    );

    // A resposta pode vir em diferentes formatos
    let subaccountToken: string | null = null;

    // Formato: { referrer_id: "...", accounts: { account_id: { api_token: "..." } } }
    if (response.data?.accounts && typeof response.data.accounts === "object") {
      const accountData = response.data.accounts[accountId];
      if (accountData?.api_token) {
        subaccountToken = accountData.api_token;
      }
    } else if (response.data?.accounts && Array.isArray(response.data.accounts)) {
      // Se for array, buscar pelo account_id
      const account = response.data.accounts.find((acc: any) => acc.account_id === accountId || acc.id === accountId);
      if (account?.api_token) {
        subaccountToken = account.api_token;
      }
    } else if (typeof response.data === "object" && response.data[accountId]) {
      // Formato antigo: { account_id: { api_token: "..." } }
      if (response.data[accountId].api_token) {
        subaccountToken = response.data[accountId].api_token;
      }
    }

    if (subaccountToken) {
      // Cachear token por 1 hora
      subaccountTokenCache.set(accountId, {
        token: subaccountToken,
        expiresAt: Date.now() + TOKEN_CACHE_TTL,
      });
      console.log(`[IUGU] Token da subconta ${accountId} obtido e cacheado com sucesso`);
      return subaccountToken;
    }

    console.warn(`[IUGU] Token da API não encontrado para subconta ${accountId}`);
    return null;
  } catch (error: any) {
    console.error("[IUGU] Erro ao obter token da subconta:", {
      accountId,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return null;
  }
}

/**
 * Invalidar cache de token de subconta
 */
export function invalidarCacheTokenSubconta(accountId?: string) {
  if (accountId) {
    subaccountTokenCache.delete(accountId);
    console.log(`[IUGU] Cache de token invalidado para subconta ${accountId}`);
  } else {
    subaccountTokenCache.clear();
    console.log("[IUGU] Cache de todos os tokens de subconta invalidado");
  }
}

/**
 * Criar subconta (marketplace)
 */
export async function criarSubconta(dados: {
  name: string;
  commission_percent?: number;
  commission_cents?: number;
  auto_withdraw?: boolean;
}): Promise<{ id: string; account_id: string }> {
  if (!ENV.iuguApiToken) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }

  try {
    const response = await axios.post(
      `${IUGU_API_URL}/marketplace/create_account`,
      {
        name: dados.name,
        commission_percent: dados.commission_percent,
        commission_cents: dados.commission_cents,
        auto_withdraw: dados.auto_withdraw,
      },
      {
        headers: getAuthHeaders(),
      }
    );

    return {
      id: response.data.id,
      account_id: response.data.account_id,
    };
  } catch (error: any) {
    console.error("[IUGU] Erro ao criar subconta:", error.response?.data || error.message);
    throw new Error(
      `Erro ao criar subconta: ${error.response?.data?.errors || error.message}`
    );
  }
}

/**
 * Listar subcontas (marketplace)
 */
export interface IuguSubaccount {
  id: string;
  account_id: string;
  name: string;
  cnpj?: string;
  commission_percent?: number;
  commission_cents?: number;
  auto_withdraw?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function listarSubcontas(): Promise<IuguSubaccount[]> {
  if (!ENV.iuguApiToken) {
    throw new Error("IUGU_API_TOKEN não configurado");
  }

  try {
    // A Iugu não tem um endpoint direto para listar subcontas com todas as informações
    // Vamos tentar buscar via retrieve_subaccounts_api_token que retorna os tokens
    const response = await axios.get(
      `${IUGU_API_URL}/retrieve_subaccounts_api_token`,
      {
        params: {
          api_token: ENV.iuguApiToken,
        },
        headers: getAuthHeaders(),
      }
    );

    console.log("[IUGU] Resposta retrieve_subaccounts_api_token:", JSON.stringify(response.data, null, 2));

    // A resposta pode vir em diferentes formatos
    let subcontasData: any[] = [];

    // A Iugu retorna no formato: { referrer_id: "...", accounts: { account_id: {...} } }
    if (response.data?.accounts && typeof response.data.accounts === "object") {
      // As chaves do objeto accounts são os account_ids
      subcontasData = Object.entries(response.data.accounts).map(([accountId, accountData]: [string, any]) => ({
        account_id: accountId,
        ...accountData,
      }));
      console.log(`[IUGU] Parseado ${subcontasData.length} subcontas do objeto accounts`);
    } else if (Array.isArray(response.data)) {
      subcontasData = response.data;
    } else if (response.data?.items && Array.isArray(response.data.items)) {
      subcontasData = response.data.items;
    } else if (response.data?.subaccounts && Array.isArray(response.data.subaccounts)) {
      subcontasData = response.data.subaccounts;
    } else if (typeof response.data === "object" && !response.data.accounts) {
      // Se for um objeto com chaves que são account_ids (formato antigo)
      subcontasData = Object.entries(response.data).map(([key, value]: [string, any]) => ({
        account_id: key,
        ...value,
      }));
    }

    if (subcontasData.length > 0) {
      console.log(`[IUGU] Encontradas ${subcontasData.length} subcontas`);
      
      // Buscar CNPJ dos tenants vinculados (com tratamento de erro caso a coluna não exista)
      let tenants: any[] = [];
      try {
        const { getAllTenants } = await import("../db");
        tenants = await getAllTenants();
        console.log(`[IUGU] Encontrados ${tenants.length} tenants no banco`);
      } catch (dbError: any) {
        console.warn("[IUGU] Erro ao buscar tenants (coluna iuguAccountId pode não existir):", dbError.message);
        // Continuar sem buscar tenants se houver erro
      }
      
      return subcontasData.map((item: any) => {
        const accountId = item.account_id || item.id || "";
        // Buscar tenant vinculado pelo iuguAccountId (se a coluna existir)
        const tenantVinculado = tenants.length > 0 ? tenants.find((t: any) => t.iuguAccountId === accountId) : null;
        
        return {
          id: item.id || accountId,
          account_id: accountId,
          name: item.name || item.nome || tenantVinculado?.nome || `Subconta ${accountId.substring(0, 8)}`,
          cnpj: tenantVinculado?.cnpj || item.cnpj || undefined,
          commission_percent: item.commission_percent,
          commission_cents: item.commission_cents,
          auto_withdraw: item.auto_withdraw,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });
    }

    // Se não encontrar formato esperado, retornar array vazio
    console.warn("[IUGU] Formato de resposta inesperado ao listar subcontas:", response.data);
    console.warn("[IUGU] Tipo da resposta:", typeof response.data);
    console.warn("[IUGU] Chaves do objeto:", response.data ? Object.keys(response.data) : "N/A");
    
    // Tentar buscar tenants mesmo sem subcontas para mostrar no modal
    try {
      const { getAllTenants } = await import("../db");
      const tenants = await getAllTenants();
      console.log(`[IUGU] Encontrados ${tenants.length} tenants no banco`);
    } catch (dbError) {
      console.error("[IUGU] Erro ao buscar tenants:", dbError);
    }
    
    return [];
  } catch (error: any) {
    // Se o endpoint não existir ou retornar erro, logar e retornar array vazio
    console.error("[IUGU] Erro ao listar subcontas:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });
    
    // Tentar buscar tenants mesmo com erro para não quebrar o modal
    try {
      const { getAllTenants } = await import("../db");
      const tenants = await getAllTenants();
      console.log(`[IUGU] Encontrados ${tenants.length} tenants no banco (após erro)`);
    } catch (dbError) {
      console.error("[IUGU] Erro ao buscar tenants após erro:", dbError);
    }
    
    // Não lançar erro, apenas retornar array vazio para não quebrar a interface
    return [];
  }
}