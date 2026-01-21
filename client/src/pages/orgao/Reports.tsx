import OrgaoLayout from "@/components/OrgaoLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileText, Download, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function OrgaoReports() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: userOrgaos } = trpc.orgaos.getMyOrgaos.useQuery(undefined, {
    enabled: !!user && user.role === "orgao",
  });
  
  const orgaoId = userOrgaos?.[0]?.orgaoId;
  const [searchTerm, setSearchTerm] = useState("");
  const { data: reports, isLoading } = trpc.inspectionReports.listByOrgao.useQuery(
    { orgaoId: orgaoId || 0 },
    { enabled: !!orgaoId }
  );

  const filteredReports = reports?.filter((report) => {
    const search = searchTerm.toLowerCase();
    return (
      report.numeroCertificado?.toLowerCase().includes(search) ||
      report.numeroLaudo?.toLowerCase().includes(search) ||
      report.responsavelTecnico?.toLowerCase().includes(search)
    );
  });

  const handleDownloadPdf = async (reportId: number) => {
    try {
      const { pdfPath } = await trpc.inspectionReports.downloadPdf.query({ reportId });
      // Criar URL para download do PDF
      const pdfUrl = `/api/storage${pdfPath}`;
      window.open(pdfUrl, "_blank");
    } catch (error: any) {
      toast.error(error.message || "Erro ao baixar PDF");
    }
  };

  return (
    <OrgaoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Laudos</h1>
            <p className="text-muted-foreground">Visualize e baixe os laudos de inspeção</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Laudos</CardTitle>
            <CardDescription>Todos os laudos do órgão</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de certificado, laudo ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredReports && filteredReports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Certificado</TableHead>
                    <TableHead>Nº Laudo</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Responsável Técnico</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.numeroCertificado || "-"}</TableCell>
                      <TableCell>{report.numeroLaudo || "-"}</TableCell>
                      <TableCell>
                        {format(new Date(report.dataEmissao), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{report.responsavelTecnico || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            report.status === "gerado"
                              ? "default"
                              : report.status === "assinado"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {report.status === "gerado"
                            ? "Gerado"
                            : report.status === "assinado"
                            ? "Assinado"
                            : "Rascunho"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {report.status === "gerado" && report.pdfPath ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPdf(report.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">PDF não disponível</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum laudo encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OrgaoLayout>
  );
}

