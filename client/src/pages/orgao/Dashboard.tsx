import OrgaoLayout from "@/components/OrgaoLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, CheckCircle, Clock } from "lucide-react";

export default function OrgaoDashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: userOrgaos } = trpc.orgaos.getMyOrgaos.useQuery(undefined, {
    enabled: !!user && user.role === "orgao",
  });
  
  const orgaoId = userOrgaos?.[0]?.orgaoId;
  const { data: reports } = trpc.inspectionReports.listByOrgao.useQuery(
    { orgaoId: orgaoId || 0 },
    { enabled: !!orgaoId }
  );

  const totalReports = reports?.length || 0;
  const generatedReports = reports?.filter((r) => r.status === "gerado").length || 0;
  const draftReports = reports?.filter((r) => r.status === "rascunho").length || 0;

  return (
    <OrgaoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos laudos do órgão</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Laudos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReports}</div>
              <p className="text-xs text-muted-foreground">Todos os laudos cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laudos Gerados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{generatedReports}</div>
              <p className="text-xs text-muted-foreground">PDFs gerados e disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftReports}</div>
              <p className="text-xs text-muted-foreground">Laudos em elaboração</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Laudos Recentes</CardTitle>
            <CardDescription>Últimos laudos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {reports && reports.length > 0 ? (
              <div className="space-y-4">
                {reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <p className="font-medium">Certificado: {report.numeroCertificado || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">
                        Laudo: {report.numeroLaudo || "N/A"} | Emissão:{" "}
                        {new Date(report.dataEmissao).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          report.status === "gerado"
                            ? "bg-green-100 text-green-800"
                            : report.status === "assinado"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {report.status === "gerado"
                          ? "Gerado"
                          : report.status === "assinado"
                          ? "Assinado"
                          : "Rascunho"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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

