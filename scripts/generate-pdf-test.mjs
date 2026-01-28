import { generateReportPdf } from "../server/integrations/pdf-generator.ts";
import * as db from "../server/db.ts";

const reportId = Number(process.argv[2] || "1");
const report = await db.getInspectionReportById(reportId);
if (!report) {
  console.error("Report não encontrado:", reportId);
  process.exit(1);
}

const photos = await db.getInspectionReportPhotosByReport(reportId);
if (!photos?.length) {
  console.error("Nenhuma foto encontrada para o report:", reportId);
  process.exit(1);
}

const pdfPath = await generateReportPdf(report, photos);
console.log("PDF gerado em:", pdfPath);




