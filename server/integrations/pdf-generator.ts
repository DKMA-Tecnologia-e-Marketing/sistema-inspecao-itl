import PDFDocument from "pdfkit";
import type { InspectionReport, InspectionReportPhoto, Appointment, Vehicle, Customer, InspectionType, Orgao } from "../../drizzle/schema";
import { readReportPhoto } from "../_core/report-storage";
import { saveReportPdf } from "../_core/report-storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Gerar número de certificado no formato: 000000006-04
 */
export async function generateCertificadoNumber(orgaoId: number): Promise<string> {
  const { getInspectionReportsByOrgao } = await import("../db");
  const reports = await getInspectionReportsByOrgao(orgaoId);
  
  let maxNumber = 0;
  for (const report of reports) {
    if (report.numeroCertificado) {
      const match = report.numeroCertificado.match(/^(\d+)-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  const nextNumber = maxNumber + 1;
  const formattedNumber = String(nextNumber).padStart(9, "0");
  const suffix = String(orgaoId).padStart(2, "0");

  return `${formattedNumber}-${suffix}`;
}

/**
 * Gerar número de laudo no formato: 001/2024
 */
export async function generateLaudoNumber(orgaoId: number, tenantId?: number): Promise<string> {
  const { getInspectionReportsByOrgao } = await import("../db");
  const reports = await getInspectionReportsByOrgao(orgaoId);
  
  const currentYear = new Date().getFullYear();
  
  let maxNumber = 0;
  for (const report of reports) {
    if (report.numeroLaudo) {
      const match = report.numeroLaudo.match(/^(\d+)\/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const year = parseInt(match[2], 10);
        if (year === currentYear && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  const nextNumber = maxNumber + 1;
  const formattedNumber = String(nextNumber).padStart(3, "0");

  return `${formattedNumber}/${currentYear}`;
}

/**
 * Gerar PDF do laudo - RECRIADO DO ZERO baseado EXCLUSIVAMENTE no PDF de referência
 * Layout oficial de laudo com blocos delimitados e posicionamento absoluto fixo
 */
export async function generateReportPdf(
  report: InspectionReport,
  photos: InspectionReportPhoto[]
): Promise<string> {
  const { getAppointmentById } = await import("../db");
  const { getVehicleById } = await import("../db");
  const { getCustomerById } = await import("../db");
  const { getInspectionTypeById } = await import("../db");
  const { getOrgaoById } = await import("../db");
  const { getTenantById } = await import("../db");
  const { getAllTecnicos } = await import("../db");

  const appointment = await getAppointmentById(report.appointmentId);
  if (!appointment) {
    throw new Error("Appointment não encontrado");
  }

  const vehicle = await getVehicleById(appointment.vehicleId);
  if (!vehicle) {
    throw new Error("Vehicle não encontrado");
  }

  const customer = await getCustomerById(appointment.customerId);
  if (!customer) {
    throw new Error("Customer não encontrado");
  }

  const inspectionType = appointment.inspectionTypeId ? await getInspectionTypeById(appointment.inspectionTypeId) : null;
  const orgao = await getOrgaoById(report.orgaoId);
  if (!orgao) {
    throw new Error("Órgão não encontrado");
  }

  const tenant = await getTenantById(appointment.tenantId);
  if (!tenant) {
    throw new Error("Tenant não encontrado");
  }

  const allTecnicos = await getAllTecnicos();
  
  const inspetorTecnico = report.cft 
    ? allTecnicos.find(t => t.tipo === "inspetor" && t.cft === report.cft)
    : null;
  
  const responsavelTecnico = report.crea
    ? allTecnicos.find(t => t.tipo === "responsavel" && (t.crea === report.crea || t.nomeCompleto === report.responsavelTecnico))
    : report.responsavelTecnico
      ? allTecnicos.find(t => t.tipo === "responsavel" && t.nomeCompleto === report.responsavelTecnico)
      : null;

  const vehicleData = vehicle.dadosInfosimples as any || {};
  const especie = vehicleData.especie || vehicleData.tipo || "N/A";
  const tipo = vehicleData.tipo || vehicleData.especie || "N/A";
  const carroceria = vehicleData.carroceria || vehicleData.carrocaria || "";
  const versao = vehicleData.versao || "";
  const potencia = vehicleData.potencia || vehicleData.potenciaCV || "";
  const cilindrada = vehicleData.cilindrada || vehicleData.cilindradaCC || "";
  const tara = vehicleData.tara || vehicleData.taraT || "";
  const pbt = vehicleData.pbt || vehicleData.pbtT || "";
  const cmt = vehicleData.cmt || vehicleData.cmtT || "";
  const lotacao = vehicleData.lotacao || vehicleData.lotacaoP || "";
  const combustivel = vehicleData.combustivel || "GASOLINA";
  const uf = vehicleData.uf || vehicleData.estado || "";
  const cpfCnpjVeiculo = vehicleData.cpfCnpj || vehicleData.cnpj || customer.cpf || "N/A";

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  
  const photoBuffers: Record<string, Buffer> = {};
  for (const photo of photos) {
    try {
      photoBuffers[photo.tipo] = await readReportPhoto(photo.filePath);
    } catch (error) {
      console.error(`Erro ao carregar foto ${photo.tipo}:`, error);
    }
  }
  
  await new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);

    try {
      // Configurações gerais
      const pageWidth = 595;
      const pageHeight = 841;
      const margin = 8;
      const contentWidth = pageWidth - (margin * 2);

      // Fundo branco
      doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");

      // Cores e estilos
      doc.strokeColor("#000000");
      doc.fillColor("#000000");
      doc.lineWidth(0.5);

      let y = margin;

      // ========== PRIMEIRA SEÇÃO - DADOS DA EMPRESA ==========
      // Nome da empresa (negrito, maior, centralizado)
      doc.fontSize(12)
         .font("Helvetica-Bold")
         .text(tenant.nome || "CENTRO DE INSPECAO AUTOMOTIVA", margin, y, { width: contentWidth, align: "center" });
      y += 15;

      // CNPJ (centralizado)
      if (tenant.cnpj) {
        doc.fontSize(9)
           .font("Helvetica")
           .text(`CNPJ: ${tenant.cnpj}`, margin, y, { width: contentWidth, align: "center" });
        y += 12;
      }

      // Endereço completo: Rua, Número e CEP
      const enderecoLinha1 = tenant.endereco || "";
      if (enderecoLinha1) {
        doc.fontSize(9)
           .font("Helvetica")
           .text(enderecoLinha1, margin, y, { width: contentWidth, align: "center" });
        y += 12;
      }

      // CEP / Cidade - Estado (UF)
      const enderecoLinha2 = tenant.cep && tenant.cidade && tenant.estado
        ? `CEP: ${tenant.cep} / ${tenant.cidade} - ${tenant.estado}`
        : tenant.cep && tenant.cidade
        ? `CEP: ${tenant.cep} / ${tenant.cidade}`
        : tenant.cidade && tenant.estado
        ? `${tenant.cidade} - ${tenant.estado}`
        : tenant.cep
        ? `CEP: ${tenant.cep}`
        : "";
      if (enderecoLinha2) {
        doc.fontSize(9)
           .font("Helvetica")
           .text(enderecoLinha2, margin, y, { width: contentWidth, align: "center" });
        y += 12;
      }

      // Telefone (centralizado)
      if (tenant.telefone) {
        doc.fontSize(9)
           .font("Helvetica")
           .text(`TEL: ${tenant.telefone}`, margin, y, { width: contentWidth, align: "center" });
        y += 15;
      } else {
        y += 10;
      }

      // ========== SEGUNDA SEÇÃO - CERTIFICADO E STATUS (CENTRALIZADOS) ==========
      y += 5; // Espaçamento entre seções
      
      // Número do Certificado (centralizado)
      const numeroCertificado = report.numeroCertificado || report.numeroLaudo || "N/A";
      doc.fontSize(10)
         .font("Helvetica-Bold")
         .text(`NÚMERO DO CERTIFICADO: ${numeroCertificado}`, margin, y, { width: contentWidth, align: "center" });
      y += 20;

      // Título "VEICULO APROVADO" (centralizado)
      doc.fontSize(14)
         .font("Helvetica-Bold")
         .text("VEICULO APROVADO", margin, y, { width: contentWidth, align: "center" });
      y += 20;

      // Linha separadora
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
      y += 10;

      // ========== DADOS DO PROPRIETÁRIO - LAYOUT REORGANIZADO ==========
      const proprietarioStartY = y;
      const colWidth = (contentWidth - 20) / 2; // Duas colunas lado a lado
      const col2X = margin + colWidth + 20; // Posição da segunda coluna
      const campoHeight = 35; // Altura padrão para cada campo

      // 01. PROPRIETÁRIO (esquerda) - com borda
      doc.rect(margin, y, colWidth, campoHeight).stroke();
      doc.fontSize(9)
         .font("Helvetica")
         .text("01. PROPRIETÁRIO", margin + 5, y + 5, { width: colWidth - 10, align: "left" });
      const nomeProprietario = customer.nome || "N/A";
      doc.fontSize(10)
         .font("Helvetica")
         .text(nomeProprietario, margin + 5, y + 17, { width: colWidth - 10, align: "left" });
      const linha1FinalY = y + campoHeight + 5;

      // 02. CPF / CNPJ (direita, na frente da 01) - com borda
      doc.rect(col2X, proprietarioStartY, colWidth, campoHeight).stroke();
      doc.fontSize(9)
         .font("Helvetica")
         .text("02. CPF / CNPJ", col2X + 5, proprietarioStartY + 5, { width: colWidth - 10, align: "left" });
      const cpfCnpj = customer.cpf || cpfCnpjVeiculo || "N/A";
      doc.fontSize(10)
         .font("Helvetica")
         .text(cpfCnpj, col2X + 5, proprietarioStartY + 17, { width: colWidth - 10, align: "left" });

      // 03. ENDEREÇO / CEP (embaixo da 01, largura total) - com borda
      const enderecoHeight = 50;
      doc.rect(margin, linha1FinalY, contentWidth, enderecoHeight).stroke();
      doc.fontSize(9)
         .font("Helvetica")
         .text("03. ENDEREÇO / CEP", margin + 5, linha1FinalY + 5, { width: contentWidth - 10, align: "left" });
      const enderecoCliente = customer.endereco 
        ? `${customer.endereco}${customer.cep ? ` / ${customer.cep}` : ""}`
        : customer.cep || "N/A";
      doc.fontSize(10)
         .font("Helvetica")
         .text(enderecoCliente, margin + 5, linha1FinalY + 17, { width: contentWidth - 10, align: "left" });
      doc.fontSize(8)
         .font("Helvetica")
         .text("CONFORME RESOLUÇÃO DO CONTRAN NÚMERO 310 DE 2009", margin + 5, linha1FinalY + 32, { width: contentWidth - 10, align: "left" });
      y = linha1FinalY + enderecoHeight + 5;

      // ========== CARACTERÍSTICAS ATUAIS DO VEÍCULO ==========
      doc.fontSize(10)
         .font("Helvetica-Bold")
         .text("CARACTERÍSTICAS ATUAIS DO VEÍCULO (DADOS DO CRLV)", margin, y, { width: contentWidth, align: "center" });
      y += 15;

      let charY = y;
      const spacing = 10; // Espaçamento entre colunas
      const lineHeight = 15; // Altura entre linhas

      // Função auxiliar para calcular posição X de uma coluna
      const getColX = (colIndex: number, totalCols: number) => {
        const colWidth = (contentWidth - (spacing * (totalCols - 1))) / totalCols;
        return margin + (colIndex * (colWidth + spacing));
      };

      const getColWidth = (totalCols: number) => {
        return (contentWidth - (spacing * (totalCols - 1))) / totalCols;
      };

      // LINHA 1: 04 e 05 (um na frente do outro) - com bordas
      const linha1Cols = 2;
      const linha1ColWidth = getColWidth(linha1Cols);
      const campoCharHeight = 25;
      
      // Campo 04
      doc.rect(getColX(0, linha1Cols), charY, linha1ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("04. ESPÉCIE / TIPO", getColX(0, linha1Cols) + 3, charY + 3, { width: linha1ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(`${especie} / ${tipo}`, getColX(0, linha1Cols) + 3, charY + 13, { width: linha1ColWidth - 6 });
      
      // Campo 05
      doc.rect(getColX(1, linha1Cols), charY, linha1ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("05. CARROÇARIA", getColX(1, linha1Cols) + 3, charY + 3, { width: linha1ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(carroceria || "N/A", getColX(1, linha1Cols) + 3, charY + 13, { width: linha1ColWidth - 6 });
      charY += campoCharHeight + 5;

      // LINHA 2: 06, 07 e 08 (um na frente do outro) - com bordas
      const linha2Cols = 3;
      const linha2ColWidth = getColWidth(linha2Cols);
      
      const marcaModelo = (vehicleData.marca && vehicleData.modelo)
        ? `${vehicleData.marca}/${vehicleData.modelo}${versao ? ` ${versao}` : ""}`
        : (vehicle.marca && vehicle.modelo)
        ? `${vehicle.marca}/${vehicle.modelo}${versao ? ` ${versao}` : ""}`
        : vehicle.placa || "N/A";
      const anoModelo = vehicleData.anoFabricacao && vehicleData.anoModelo
        ? `${vehicleData.anoFabricacao}/${vehicleData.anoModelo}`
        : vehicleData.anoFabricacao || vehicleData.anoModelo || vehicle.ano || "N/A";
      
      // Campo 06
      doc.rect(getColX(0, linha2Cols), charY, linha2ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("06. MARCA / MODELO / VERSÃO", getColX(0, linha2Cols) + 3, charY + 3, { width: linha2ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(marcaModelo, getColX(0, linha2Cols) + 3, charY + 13, { width: linha2ColWidth - 6 });
      
      // Campo 07
      doc.rect(getColX(1, linha2Cols), charY, linha2ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("07. COR", getColX(1, linha2Cols) + 3, charY + 3, { width: linha2ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(vehicleData.cor || vehicle.cor || "N/A", getColX(1, linha2Cols) + 3, charY + 13, { width: linha2ColWidth - 6 });
      
      // Campo 08
      doc.rect(getColX(2, linha2Cols), charY, linha2ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("08. ANO DE FABRICAÇÃO / MODELO", getColX(2, linha2Cols) + 3, charY + 3, { width: linha2ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(anoModelo, getColX(2, linha2Cols) + 3, charY + 13, { width: linha2ColWidth - 6 });
      charY += campoCharHeight + 5;

      // LINHA 3: 09, 10, 11, 12 e 13 (um na frente do outro) - com bordas
      const linha3Cols = 5;
      const linha3ColWidth = getColWidth(linha3Cols);
      
      // Campo 09
      doc.rect(getColX(0, linha3Cols), charY, linha3ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("09. PLACA / Nº", getColX(0, linha3Cols) + 3, charY + 3, { width: linha3ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(vehicle.placa || "N/A", getColX(0, linha3Cols) + 3, charY + 13, { width: linha3ColWidth - 6 });
      
      // Campo 10
      doc.rect(getColX(1, linha3Cols), charY, linha3ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("10. NÚMERO DO CHASSI", getColX(1, linha3Cols) + 3, charY + 3, { width: linha3ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(vehicleData.chassi || vehicle.chassi || "N/A", getColX(1, linha3Cols) + 3, charY + 13, { width: linha3ColWidth - 6 });
      
      // Campo 11
      doc.rect(getColX(2, linha3Cols), charY, linha3ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("11. COMBUSTÍVEL", getColX(2, linha3Cols) + 3, charY + 3, { width: linha3ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(combustivel, getColX(2, linha3Cols) + 3, charY + 13, { width: linha3ColWidth - 6 });
      
      // Campo 12
      doc.rect(getColX(3, linha3Cols), charY, linha3ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("12. POTÊNCIA (CV)", getColX(3, linha3Cols) + 3, charY + 3, { width: linha3ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(potencia || "N/A", getColX(3, linha3Cols) + 3, charY + 13, { width: linha3ColWidth - 6 });
      
      // Campo 13
      doc.rect(getColX(4, linha3Cols), charY, linha3ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("13. CILINDRADA (CC)", getColX(4, linha3Cols) + 3, charY + 3, { width: linha3ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(cilindrada || "N/A", getColX(4, linha3Cols) + 3, charY + 13, { width: linha3ColWidth - 6 });
      charY += campoCharHeight + 5;

      // LINHA 4: 14, 15, 16, 17 e 18 (um na frente do outro) - com bordas
      const linha4Cols = 5;
      const linha4ColWidth = getColWidth(linha4Cols);
      
      // Campo 14
      doc.rect(getColX(0, linha4Cols), charY, linha4ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("14. TARA(T)", getColX(0, linha4Cols) + 3, charY + 3, { width: linha4ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(tara || "N/A", getColX(0, linha4Cols) + 3, charY + 13, { width: linha4ColWidth - 6 });
      
      // Campo 15
      doc.rect(getColX(1, linha4Cols), charY, linha4ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("15. PBT (T)", getColX(1, linha4Cols) + 3, charY + 3, { width: linha4ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(pbt || "N/A", getColX(1, linha4Cols) + 3, charY + 13, { width: linha4ColWidth - 6 });
      
      // Campo 16
      doc.rect(getColX(2, linha4Cols), charY, linha4ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("16. CMT (T)", getColX(2, linha4Cols) + 3, charY + 3, { width: linha4ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(cmt || "N/A", getColX(2, linha4Cols) + 3, charY + 13, { width: linha4ColWidth - 6 });
      
      // Campo 17
      doc.rect(getColX(3, linha4Cols), charY, linha4ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("17. LOTAÇÃO (P)", getColX(3, linha4Cols) + 3, charY + 3, { width: linha4ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(lotacao || "N/A", getColX(3, linha4Cols) + 3, charY + 13, { width: linha4ColWidth - 6 });
      
      // Campo 18
      doc.rect(getColX(4, linha4Cols), charY, linha4ColWidth, campoCharHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("18. RENAVAM", getColX(4, linha4Cols) + 3, charY + 3, { width: linha4ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(vehicle.renavam || "N/A", getColX(4, linha4Cols) + 3, charY + 13, { width: linha4ColWidth - 6 });
      charY += campoCharHeight + 5;

      // LINHA 5: 19. OBSERVAÇÕES (largura total) - com borda
      const obsHeight = 30;
      doc.rect(margin, charY, contentWidth, obsHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("19. OBSERVAÇÕES", margin + 5, charY + 3, { width: contentWidth - 10 });
      const observacoes = appointment.observacoes || "N/A";
      doc.fontSize(9).font("Helvetica").text(observacoes, margin + 5, charY + 13, { width: contentWidth - 10 });
      charY += obsHeight + 5;

      // ========== FOTOS DO VEICULO ==========
      doc.fontSize(10)
         .font("Helvetica-Bold")
         .text("FOTOS DO VEICULO", margin, charY, { width: contentWidth, align: "center" });
      charY += 15;

      // Grid de fotos (2 colunas) - Tamanho padrão: 271 x 170
      const fotoWidth = 271;
      const fotoHeight = 170;
      const fotoY = charY;
      const fotoSpacing = (contentWidth - (fotoWidth * 2)) / 3; // Espaçamento entre fotos e margens
      const fotoCol1X = margin + fotoSpacing;
      const fotoCol2X = fotoCol1X + fotoWidth + fotoSpacing;

      // Foto Traseira (esquerda)
      doc.fontSize(8).font("Helvetica").text("TRASEIRA", fotoCol1X, fotoY, { width: fotoWidth, align: "center" });
      if (photoBuffers["traseira"]) {
        try {
          doc.image(photoBuffers["traseira"], fotoCol1X, fotoY + 10, { 
            width: fotoWidth, 
            height: fotoHeight,
            fit: [fotoWidth, fotoHeight]
          });
        } catch (error) {
          console.error("Erro ao inserir foto traseira:", error);
        }
      }

      // Foto Dianteira (direita)
      doc.fontSize(8).font("Helvetica").text("DIANTEIRA", fotoCol2X, fotoY, { width: fotoWidth, align: "center" });
      if (photoBuffers["dianteira"]) {
        try {
          doc.image(photoBuffers["dianteira"], fotoCol2X, fotoY + 10, { 
            width: fotoWidth, 
            height: fotoHeight,
            fit: [fotoWidth, fotoHeight]
          });
        } catch (error) {
          console.error("Erro ao inserir foto dianteira:", error);
        }
      }

      charY = fotoY + fotoHeight + 20;

      // ========== INFORMAÇÕES FINAIS ==========
      const infoSpacing = 10;
      const infoLineHeight = 15;

      // Função auxiliar para calcular posição X de uma coluna (reutilizando)
      const getInfoColX = (colIndex: number, totalCols: number) => {
        const colWidth = (contentWidth - (infoSpacing * (totalCols - 1))) / totalCols;
        return margin + (colIndex * (colWidth + infoSpacing));
      };

      const getInfoColWidth = (totalCols: number) => {
        return (contentWidth - (infoSpacing * (totalCols - 1))) / totalCols;
      };

      // LINHA 1: 21, 22, 23 e 24 (um na frente do outro) - com bordas
      const infoLinha1Cols = 4;
      const infoLinha1ColWidth = getInfoColWidth(infoLinha1Cols);
      let infoY = charY;
      const infoCampoHeight = 25;
      
      const dataInspecao = appointment.dataAgendamento ? format(new Date(appointment.dataAgendamento), "dd/MM/yyyy", { locale: ptBR }) : "N/A";
      const dataEmissao = report.createdAt ? format(new Date(report.createdAt), "dd/MM/yyyy", { locale: ptBR }) : format(new Date(), "dd/MM/yyyy", { locale: ptBR });
      const dataValidade = report.dataValidade ? format(new Date(report.dataValidade), "dd/MM/yyyy", { locale: ptBR }) : "N/A";
      
      // Campo 21
      doc.rect(getInfoColX(0, infoLinha1Cols), infoY, infoLinha1ColWidth, infoCampoHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("21. NUMERO DA ORDEM DE SERVIÇO", getInfoColX(0, infoLinha1Cols) + 3, infoY + 3, { width: infoLinha1ColWidth - 6 });
      
      // Campo 22
      doc.rect(getInfoColX(1, infoLinha1Cols), infoY, infoLinha1ColWidth, infoCampoHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("22. DATA DE INSPEÇÃO", getInfoColX(1, infoLinha1Cols) + 3, infoY + 3, { width: infoLinha1ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(dataInspecao, getInfoColX(1, infoLinha1Cols) + 3, infoY + 13, { width: infoLinha1ColWidth - 6 });
      
      // Campo 23
      doc.rect(getInfoColX(2, infoLinha1Cols), infoY, infoLinha1ColWidth, infoCampoHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("23. DATA DA EMISSÃO", getInfoColX(2, infoLinha1Cols) + 3, infoY + 3, { width: infoLinha1ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(dataEmissao, getInfoColX(2, infoLinha1Cols) + 3, infoY + 13, { width: infoLinha1ColWidth - 6 });
      
      // Campo 24
      doc.rect(getInfoColX(3, infoLinha1Cols), infoY, infoLinha1ColWidth, infoCampoHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("24. DATA DE VALIDADE", getInfoColX(3, infoLinha1Cols) + 3, infoY + 3, { width: infoLinha1ColWidth - 6 });
      doc.fontSize(9).font("Helvetica").text(dataValidade, getInfoColX(3, infoLinha1Cols) + 3, infoY + 13, { width: infoLinha1ColWidth - 6 });
      
      infoY += infoCampoHeight + 5;

      // LINHA 2: 25 e 26 (um na frente do outro) - com bordas
      const infoLinha2Cols = 2;
      const infoLinha2ColWidth = getInfoColWidth(infoLinha2Cols);
      const infoCampo25Height = inspetorTecnico && report.cft ? 40 : 30;
      const infoCampo26Height = responsavelTecnico && report.crea ? 40 : 30;
      const infoCampoMaxHeight = Math.max(infoCampo25Height, infoCampo26Height);
      
      // Campo 25 - Inspetor Técnico (coluna esquerda)
      doc.rect(getInfoColX(0, infoLinha2Cols), infoY, infoLinha2ColWidth, infoCampoMaxHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("25. INSPETOR TÉCNICO", getInfoColX(0, infoLinha2Cols) + 3, infoY + 3, { width: infoLinha2ColWidth - 6 });
      
      const infoYContent = infoY + 13;
      if (inspetorTecnico) {
        const inspetorText = `${inspetorTecnico.nomeCompleto}${inspetorTecnico.cpf ? ` - ${inspetorTecnico.cpf}` : ""}`;
        doc.fontSize(9).font("Helvetica").text(inspetorText, getInfoColX(0, infoLinha2Cols) + 3, infoYContent, { width: infoLinha2ColWidth - 6 });
        if (report.cft) {
          doc.fontSize(9).font("Helvetica").text(`CFT: ${report.cft}`, getInfoColX(0, infoLinha2Cols) + 3, infoYContent + 12, { width: infoLinha2ColWidth - 6 });
        }
      } else if (report.cft) {
        doc.fontSize(9).font("Helvetica").text(`CFT: ${report.cft}`, getInfoColX(0, infoLinha2Cols) + 3, infoYContent, { width: infoLinha2ColWidth - 6 });
      }

      // Campo 26 - Responsável Técnico (coluna direita)
      doc.rect(getInfoColX(1, infoLinha2Cols), infoY, infoLinha2ColWidth, infoCampoMaxHeight).stroke();
      doc.fontSize(8).font("Helvetica").text("26. RESPONSÁVEL TÉCNICO", getInfoColX(1, infoLinha2Cols) + 3, infoY + 3, { width: infoLinha2ColWidth - 6 });
      
      if (responsavelTecnico) {
        const responsavelText = `${responsavelTecnico.nomeCompleto}${responsavelTecnico.cpf ? ` - ${responsavelTecnico.cpf}` : ""}`;
        doc.fontSize(9).font("Helvetica").text(responsavelText, getInfoColX(1, infoLinha2Cols) + 3, infoYContent, { width: infoLinha2ColWidth - 6 });
        if (report.crea) {
          doc.fontSize(9).font("Helvetica").text(`Crea: ${report.crea}`, getInfoColX(1, infoLinha2Cols) + 3, infoYContent + 12, { width: infoLinha2ColWidth - 6 });
        }
      } else if (report.responsavelTecnico) {
        doc.fontSize(9).font("Helvetica").text(report.responsavelTecnico, getInfoColX(1, infoLinha2Cols) + 3, infoYContent, { width: infoLinha2ColWidth - 6 });
        if (report.crea) {
          doc.fontSize(9).font("Helvetica").text(`Crea: ${report.crea}`, getInfoColX(1, infoLinha2Cols) + 3, infoYContent + 12, { width: infoLinha2ColWidth - 6 });
        }
      }

      // Rodapé
      const rodapeY = pageHeight - 50;
      doc.fontSize(7).font("Helvetica").text(
        `CERTIFICADO ${orgao.sigla || orgao.nome || ""} - ${numeroCertificado}`,
        margin,
        rodapeY,
        { width: contentWidth, align: "center" }
      );

      const rodapeY2 = rodapeY + 10;
      const dataHora = format(new Date(), "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR });
      doc.fontSize(7).font("Helvetica").text(
        `Arquivo criado em ${dataHora} - Otimiza TI - SISLIT`,
        margin,
        rodapeY2,
        { width: contentWidth, align: "center" }
      );

      const rodapeY3 = rodapeY2 + 10;
      doc.fontSize(7).font("Helvetica").text(
        "Este certificado poderá ser validado através do Sistema SISLIT",
        margin,
        rodapeY3,
        { width: contentWidth, align: "center" }
      );

      const rodapeY4 = rodapeY3 + 10;
      doc.fontSize(7).font("Helvetica").text(
        "Pagina 1 de 1",
        margin,
        rodapeY4,
        { width: contentWidth, align: "center" }
      );

      const rodapeY5 = rodapeY4 + 8;
      doc.fontSize(6).font("Helvetica").text(
        "FORM-CER-PMSP - SMT - DTP- REVISÃO 01 31/05/2021",
        margin,
        rodapeY5,
        { width: contentWidth, align: "center" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

  const pdfBuffer = Buffer.concat(chunks);

  const fileNameNumber = report.numeroLaudo 
    ? report.numeroLaudo.replace(/\//g, "-") 
    : (report.numeroCertificado || "N-A");

  const pdfPath = await saveReportPdf(report.id, pdfBuffer, fileNameNumber);

  return pdfPath;
}
