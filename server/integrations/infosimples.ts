import axios from "axios";
import { ENV } from "../_core/env";

const INFOSIMPLES_API_URL = "https://api.infosimples.com/api/v2/consultas/veiculos";

export interface InfosimplesResponse {
  dados?: {
    placa?: string;
    renavam?: string;
    chassi?: string;
    marca?: string;
    modelo?: string;
    ano?: number;
    anoModelo?: number;
    cor?: string;
    combustivel?: string;
    categoria?: string;
    tipo?: string;
    especie?: string;
    municipio?: string;
    uf?: string;
    restricao?: string;
    multas?: Array<{
      data: string;
      descricao: string;
      valor: number;
    }>;
    ipva?: {
      ano: number;
      valor: number;
    };
  };
  erro?: string;
}

/**
 * Consulta dados do veículo na API Infosimples por placa
 */
export async function consultarVeiculoPorPlaca(placa: string): Promise<InfosimplesResponse> {
  if (!ENV.infosimplesApiKey) {
    console.warn("[Infosimples] API não configurada. Retornando dados simulados.");
    // Retornar dados simulados em desenvolvimento
    return {
      dados: {
        placa: placa.replace(/[^A-Z0-9]/g, "").toUpperCase(),
        marca: "Simulado",
        modelo: "Modelo Simulado",
        ano: 2020,
      },
    };
  }

  try {
    const response = await axios.post(
      `${INFOSIMPLES_API_URL}/placa`,
      {
        placa: placa.replace(/[^A-Z0-9]/g, "").toUpperCase(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.infosimplesApiKey}`,
        },
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("[Infosimples] Erro ao consultar veículo:", error.response?.data || error.message);
    throw new Error(`Erro ao consultar veículo: ${error.response?.data?.erro || error.message}`);
  }
}

/**
 * Consulta dados do veículo na API Infosimples por Renavam
 */
export async function consultarVeiculoPorRenavam(renavam: string): Promise<InfosimplesResponse> {
  if (!ENV.infosimplesApiKey) {
    console.warn("[Infosimples] API não configurada. Retornando dados simulados.");
    return {
      dados: {
        renavam: renavam.replace(/\D/g, ""),
        marca: "Simulado",
        modelo: "Modelo Simulado",
        ano: 2020,
      },
    };
  }

  try {
    const response = await axios.post(
      `${INFOSIMPLES_API_URL}/renavam`,
      {
        renavam: renavam.replace(/\D/g, ""),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.infosimplesApiKey}`,
        },
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("[Infosimples] Erro ao consultar veículo:", error.response?.data || error.message);
    throw new Error(`Erro ao consultar veículo: ${error.response?.data?.erro || error.message}`);
  }
}

/**
 * Consulta dados do veículo na API Infosimples por placa e renavam
 */
export async function consultarVeiculo(
  placa: string,
  renavam?: string
): Promise<InfosimplesResponse> {
  // Tentar por placa primeiro (mais comum)
  try {
    return await consultarVeiculoPorPlaca(placa);
  } catch (error) {
    // Se falhar e tiver renavam, tentar por renavam
    if (renavam) {
      try {
        return await consultarVeiculoPorRenavam(renavam);
      } catch (renavamError) {
        throw new Error("Não foi possível consultar o veículo nem por placa nem por renavam");
      }
    }
    throw error;
  }
}

