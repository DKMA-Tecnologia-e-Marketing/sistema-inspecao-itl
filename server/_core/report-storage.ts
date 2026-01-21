import { promises as fs } from "fs";
import path from "path";

const STORAGE_BASE_PATH = process.env.STORAGE_PATH || "/var/www/inspecionasp/storage";
const REPORTS_PATH = path.join(STORAGE_BASE_PATH, "reports");

/**
 * Garantir que o diretório existe
 */
async function ensureDirectory(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Salvar foto do laudo no servidor
 */
export async function saveReportPhoto(
  reportId: number,
  tipo: "traseira" | "dianteira" | "placa" | "panoramica",
  fileData: string, // Base64
  fileName: string
): Promise<string> {
  const reportDir = path.join(REPORTS_PATH, reportId.toString(), "photos");
  await ensureDirectory(reportDir);

  // Decodificar base64
  const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
  const buffer = Buffer.from(base64Data, "base64");

  // Determinar extensão do arquivo
  const ext = path.extname(fileName) || ".jpg";
  const filePath = path.join(reportDir, `${tipo}${ext}`);

  // Salvar arquivo
  await fs.writeFile(filePath, buffer);

  // Retornar caminho relativo para armazenar no banco
  return `/storage/reports/${reportId}/photos/${tipo}${ext}`;
}

/**
 * Obter caminho absoluto do arquivo
 */
export function getReportPhotoPath(relativePath: string): string {
  if (relativePath.startsWith("/storage/")) {
    return path.join(STORAGE_BASE_PATH, relativePath.replace("/storage/", ""));
  }
  return path.join(STORAGE_BASE_PATH, relativePath);
}

/**
 * Obter caminho absoluto do PDF
 */
export function getReportPdfPath(relativePath: string): string {
  if (relativePath.startsWith("/storage/")) {
    return path.join(STORAGE_BASE_PATH, relativePath.replace("/storage/", ""));
  }
  return path.join(STORAGE_BASE_PATH, relativePath);
}

/**
 * Salvar PDF do laudo
 */
export async function saveReportPdf(reportId: number, pdfBuffer: Buffer, numeroCertificado: string): Promise<string> {
  const reportDir = path.join(REPORTS_PATH, reportId.toString(), "pdf");
  await ensureDirectory(reportDir);

  const fileName = `laudo-${numeroCertificado}.pdf`;
  const filePath = path.join(reportDir, fileName);

  await fs.writeFile(filePath, pdfBuffer);

  return `/storage/reports/${reportId}/pdf/${fileName}`;
}

/**
 * Ler foto do laudo
 */
export async function readReportPhoto(relativePath: string): Promise<Buffer> {
  const absolutePath = getReportPhotoPath(relativePath);
  return await fs.readFile(absolutePath);
}

/**
 * Ler PDF do laudo
 */
export async function readReportPdf(relativePath: string): Promise<Buffer> {
  const absolutePath = getReportPdfPath(relativePath);
  return await fs.readFile(absolutePath);
}

