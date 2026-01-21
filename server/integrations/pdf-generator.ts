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
  // Buscar último número de certificado do órgão
  const { getInspectionReportsByOrgao } = await import("../db");
  const reports = await getInspectionReportsByOrgao(orgaoId);
  
  // Encontrar o maior número sequencial
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

  // Próximo número
  const nextNumber = maxNumber + 1;
  const formattedNumber = String(nextNumber).padStart(9, "0");
  const suffix = String(orgaoId).padStart(2, "0");

  return `${formattedNumber}-${suffix}`;
}

/**
 * Gerar PDF do laudo seguindo template PMSP
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

  // Buscar dados relacionados
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

  // Criar documento PDF
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  // Buffer para armazenar o PDF
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  
  // Carregar fotos antes de gerar o PDF
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
      // Cabeçalho - Logo e informações da Prefeitura
      doc.rect(0, 0, 595, 842).fill("#FFFFFF"); // Fundo branco

      // Logo da Prefeitura (esquerda)
      doc.fontSize(10)
        .fillColor("#000000")
        .text("PREFEITURA DE SÃO PAULO", 50, 30, { align: "left" })
        .text("MOBILIDADE E TRANSPORTES", 50, 45, { align: "left" });

      // Informações da Secretaria (direita)
      doc.fontSize(9)
        .text("SECRETARIA MUNICIPAL DE MOBILIDADE E TRANSPORTES", 300, 30, { align: "right", width: 245 })
        .text("Departamento de Transportes Públicos", 300, 45, { align: "right", width: 245 });

      // Título do documento
      doc.fontSize(12)
        .font("Helvetica-Bold")
        .text("TERMO DE COOPERAÇÃO Nº 001/2021. SMT.DTP.", 50, 70, { align: "center", width: 495 })
        .fontSize(10)
        .font("Helvetica")
        .text("ANEXO II", 50, 85, { align: "center", width: 495 });

      // Informações do certificado
      doc.fontSize(10)
        .font("Helvetica-Bold")
        .text("OIA - Organismo de Inspeção Acreditado - INMETRO", 50, 110)
        .text("ITE - Instituição Técnica de Engenharia - DENATRAN", 50, 125)
        .text("PMSP - SMT - DTP", 50, 140)
        .font("Helvetica")
        .text(`NÚMERO DO CERTIFICADO: ${report.numeroCertificado || "N/A"}`, 50, 160)
        .font("Helvetica-Bold")
        .text("VEICULO APROVADO", 50, 180, { align: "center", width: 495 });

      // Seção: Características do Veículo
      doc.fontSize(11)
        .font("Helvetica-Bold")
        .text("CARACTERÍSTICAS ATUAIS DO VEÍCULO (DADOS DO CRLV)", 50, 220);

      // Dados do veículo em duas colunas
      const leftColX = 50;
      const rightColX = 320;
      let currentY = 245;

      doc.fontSize(9)
        .font("Helvetica")
        .text(`Tipo: ${vehicle.marca || "N/A"}`, leftColX, currentY)
        .text(`Marca/Modelo: ${vehicle.marca || "N/A"} / ${vehicle.modelo || "N/A"}`, leftColX, currentY + 15)
        .text(`Placa: ${vehicle.placa}`, leftColX, currentY + 30)
        .text(`Chassi: ${vehicle.chassi || "N/A"}`, leftColX, currentY + 45)
        .text(`Renavam: ${vehicle.renavam || "N/A"}`, leftColX, currentY + 60);

      doc.text(`Carroçaria: ${vehicle.modelo || "N/A"}`, rightColX, currentY)
        .text(`Cor: ${vehicle.cor || "N/A"}`, rightColX, currentY + 15)
        .text(`Combustível: GASOLINA`, rightColX, currentY + 30)
        .text(`Ano de Fabricação/Modelo: ${vehicle.ano || "N/A"}/${vehicle.ano || "N/A"}`, rightColX, currentY + 45)
        .text(`Lotação: 6`, rightColX, currentY + 60);

      // Seção: Fotos do Veículo
      const photosY = currentY + 90;
      doc.fontSize(11)
        .font("Helvetica-Bold")
        .text("FOTOS DO VEÍCULO", 50, photosY);

      // Posicionar as 4 fotos
      const photoSize = 100;
      const photoSpacing = 20;
      const photosStartY = photosY + 25;

      // Fotos em grid 2x2
      const photoPositions = [
        { x: 50, y: photosStartY, label: "TRASEIRA" },
        { x: 270, y: photosStartY, label: "DIANTEIRA" },
        { x: 50, y: photosStartY + photoSize + photoSpacing, label: "PLACA" },
        { x: 270, y: photosStartY + photoSize + photoSpacing, label: "PANORAMICA" },
      ];

      for (let i = 0; i < photoPositions.length; i++) {
        const pos = photoPositions[i];
        const photo = photos.find((p) => {
          const labels: Record<string, string> = {
            traseira: "TRASEIRA",
            dianteira: "DIANTEIRA",
            placa: "PLACA",
            panoramica: "PANORAMICA",
          };
          return labels[p.tipo] === pos.label;
        });

        if (photo && photoBuffers[photo.tipo]) {
          try {
            doc.image(photoBuffers[photo.tipo], pos.x, pos.y, { width: photoSize, height: photoSize, fit: [photoSize, photoSize] });
          } catch (error) {
            console.error(`Erro ao carregar foto ${photo.tipo}:`, error);
            // Desenhar retângulo vazio se foto não carregar
            doc.rect(pos.x, pos.y, photoSize, photoSize).stroke();
          }
        } else {
          // Desenhar retângulo vazio se não houver foto
          doc.rect(pos.x, pos.y, photoSize, photoSize).stroke();
        }

        // Label da foto
        doc.fontSize(8)
          .text(pos.label, pos.x, pos.y + photoSize + 5);
      }

      // Informações de data e responsável técnico
      const infoY = photosStartY + photoSize * 2 + photoSpacing + 40;
      doc.fontSize(9)
        .text(`Nº Laudo de Serviço: ${report.numeroLaudo || "0"}`, leftColX, infoY)
        .text(`Data de Emissão: ${format(new Date(report.dataEmissao), "dd/MM/yyyy", { locale: ptBR })}`, leftColX, infoY + 15)
        .text(`Responsável Técnico: ${report.responsavelTecnico || "N/A"} - CFT: ${report.cft || "N/A"}`, leftColX, infoY + 30);

      doc.text(`Data de Emissão: ${format(new Date(report.dataEmissao), "dd/MM/yyyy", { locale: ptBR })}`, rightColX, infoY)
        .text(`Data de Validade: ${report.dataValidade ? format(new Date(report.dataValidade), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}`, rightColX, infoY + 15)
        .text(`Responsável Técnico: ${report.responsavelTecnico || "N/A"} - ${report.crea || "N/A"} Crea: ${report.crea || "N/A"}`, rightColX, infoY + 30);

      // Rodapé
      const footerY = 800;
      doc.fontSize(8)
        .text(`CERTIFICADO PMSP - SMT - DTP ${report.numeroCertificado || ""}`, 50, footerY, { align: "center", width: 495 })
        .text(`Documento criado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`, 50, footerY + 15, { align: "center", width: 495 })
        .text("Este certificado poderá ser validado através do Sistema SIBUT", 50, footerY + 30, { align: "center", width: 495 })
        .text("Página 1 de 1", 50, footerY + 45, { align: "right", width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

  // Juntar chunks em um único buffer
  const pdfBuffer = Buffer.concat(chunks);

  // Salvar PDF
  const pdfPath = await saveReportPdf(report.id, pdfBuffer, report.numeroCertificado || "N/A");

  return pdfPath;
}

