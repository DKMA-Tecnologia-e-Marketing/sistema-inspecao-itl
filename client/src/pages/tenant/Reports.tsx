import TenantLayout from "@/components/TenantLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Calendar, CheckCircle, XCircle, AlertTriangle, Upload, Download, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TenantReports() {
  const { data: user } = trpc.auth.me.useQuery();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<{
    placa: string;
    renavam?: string;
    dataInspecao: string;
    tipoInspecao?: string;
    numeroProtocolo?: string;
  }[]>([]);

  const { data: appointments, refetch: refetchAppointments } = trpc.reports.getDailyAppointments.useQuery(
    {
      tenantId: user?.tenantId || 0,
      date: selectedDate,
    },
    { enabled: !!user?.tenantId }
  );

  const { data: reconciliations } = trpc.reconciliations.listByTenant.useQuery(
    { tenantId: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  const createReconciliation = trpc.reconciliations.create.useMutation({
    onSuccess: (data) => {
      toast.success("Conciliação realizada com sucesso!");
      setReconciliationDialogOpen(false);
      setReconciliationData([]);
      // Mostrar resumo
      toast.info(
        `Conciliação: ${data.inspecoesConciliadas} conciliadas, ${data.inspecoesDivergentes} divergentes, ${data.inspecoesForaSistema} fora do sistema`
      );
    },
    onError: (error) => toast.error("Erro ao realizar conciliação: " + error.message),
  });

  const handleAddReconciliationRow = () => {
    setReconciliationData([
      ...reconciliationData,
      {
        placa: "",
        dataInspecao: selectedDate,
      },
    ]);
  };

  const handleRemoveReconciliationRow = (index: number) => {
    setReconciliationData(reconciliationData.filter((_, i) => i !== index));
  };

  const handleReconciliationDataChange = (index: number, field: string, value: string) => {
    const newData = [...reconciliationData];
    newData[index] = { ...newData[index], [field]: value };
    setReconciliationData(newData);
  };

  const handleSubmitReconciliation = () => {
    if (!user?.tenantId) {
      toast.error("Erro ao identificar o estabelecimento.");
      return;
    }

    if (reconciliationData.length === 0) {
      toast.error("Adicione pelo menos uma inspeção do governo.");
      return;
    }

    // Validar dados obrigatórios
    for (const item of reconciliationData) {
      if (!item.placa || !item.dataInspecao) {
        toast.error("Preencha placa e data de inspeção para todas as linhas.");
        return;
      }
    }

    createReconciliation.mutate({
      tenantId: user.tenantId,
      dataReferencia: selectedDate,
      inspecoesGoverno: reconciliationData,
    });
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const placaIndex = headers.findIndex((h) => h.includes("placa"));
      const renavamIndex = headers.findIndex((h) => h.includes("renavam"));
      const dataIndex = headers.findIndex((h) => h.includes("data") || h.includes("date"));
      const tipoIndex = headers.findIndex((h) => h.includes("tipo"));
      const protocoloIndex = headers.findIndex((h) => h.includes("protocolo") || h.includes("numero"));

      if (placaIndex === -1 || dataIndex === -1) {
        toast.error("CSV deve conter colunas 'placa' e 'data'.");
        return;
      }

      const importedData = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          placa: values[placaIndex] || "",
          renavam: renavamIndex >= 0 ? values[renavamIndex] : undefined,
          dataInspecao: values[dataIndex] || selectedDate,
          tipoInspecao: tipoIndex >= 0 ? values[tipoIndex] : undefined,
          numeroProtocolo: protocoloIndex >= 0 ? values[protocoloIndex] : undefined,
        };
      });

      setReconciliationData([...reconciliationData, ...importedData]);
      toast.success(`${importedData.length} inspeções importadas do CSV.`);
    };
    reader.readAsText(file);
  };

  const totalInspecoes = appointments?.length || 0;

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
            <p className="text-muted-foreground">Visualize inspeções do dia e realize conciliações</p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}>
                  Hoje
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo do Dia */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inspeções do Dia</CardTitle>
                <CardDescription>
                  {new Date(selectedDate).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg">
                  {totalInspecoes} inspeções
                </Badge>
                <Button onClick={() => setReconciliationDialogOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Conciliação
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!appointments || appointments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhuma inspeção encontrada para esta data.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Tipo de Inspeção</TableHead>
                      <TableHead>Linha</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Método de Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((ap: any) => {
                      // Determinar método de pagamento
                      let metodoPagamento = "-";
                      if (ap.payment) {
                        if (ap.payment.metodoPagamento) {
                          // Usar o método salvo no banco
                          metodoPagamento = ap.payment.metodoPagamento === "credit_card" ? "Cartão" : 
                                          ap.payment.metodoPagamento === "pix" ? "PIX" : 
                                          ap.payment.metodoPagamento;
                        } else if (ap.payment.iuguPaymentId) {
                          // Se não tem método salvo mas tem iuguPaymentId, verificar pela fatura
                          // Por padrão, se tem QR code PIX, é PIX, senão pode ser cartão
                          metodoPagamento = "Verificar";
                        }
                      }
                      
                      return (
                        <TableRow key={ap.id}>
                          <TableCell className="font-medium">#{ap.id}</TableCell>
                          <TableCell>
                            {ap.vehicle ? (
                              <span className="text-sm font-medium">{ap.vehicle.placa}</span>
                            ) : ap.vehicleId ? (
                              <span className="text-sm text-muted-foreground">Veículo #{ap.vehicleId}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {ap.inspectionType ? (
                              <span className="text-sm">{ap.inspectionType.nome}</span>
                            ) : ap.inspectionTypeId ? (
                              <span className="text-sm text-muted-foreground">Tipo #{ap.inspectionTypeId}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {ap.inspectionLine ? (
                              <span className="text-sm">{ap.inspectionLine.nome || `Linha ${ap.inspectionLine.id}`}</span>
                            ) : ap.inspectionLineId ? (
                              <span className="text-sm text-muted-foreground">Linha #{ap.inspectionLineId}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(ap.createdAt).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                ap.status === "concluido"
                                  ? "default"
                                  : ap.status === "cancelado"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {ap.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {metodoPagamento !== "-" ? (
                              <Badge variant={metodoPagamento === "PIX" ? "default" : "outline"}>
                                {metodoPagamento}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Conciliações */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Conciliações</CardTitle>
            <CardDescription>Últimas conciliações realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {!reconciliations || reconciliations.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhuma conciliação realizada ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Referência</TableHead>
                      <TableHead>Data Conciliação</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Governo</TableHead>
                      <TableHead>Conciliadas</TableHead>
                      <TableHead>Divergentes</TableHead>
                      <TableHead>Fora Sistema</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliations.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          {new Date(rec.dataReferencia).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {new Date(rec.dataConciliacao).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>{rec.totalInspecoesPlataforma}</TableCell>
                        <TableCell>{rec.totalInspecoesGoverno}</TableCell>
                        <TableCell>
                          <Badge variant="default">{rec.inspecoesConciliadas}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning">{rec.inspecoesDivergentes}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{rec.inspecoesForaSistema}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              rec.status === "concluida"
                                ? "default"
                                : rec.status === "erro"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {rec.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Conciliação */}
        <Dialog open={reconciliationDialogOpen} onOpenChange={setReconciliationDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Conciliação de Inspeções</DialogTitle>
              <DialogDescription>
                Compare as inspeções do governo com as da plataforma para detectar inspeções feitas fora do sistema.
                Data de referência: {new Date(selectedDate).toLocaleDateString("pt-BR")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label>Inspeções do Governo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("csv-import")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Importar CSV
                  </Button>
                  <input
                    id="csv-import"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportCSV}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddReconciliationRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Linha
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                {reconciliationData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Adicione inspeções do governo ou importe um arquivo CSV.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Placa *</TableHead>
                        <TableHead>Renavam</TableHead>
                        <TableHead>Data Inspeção *</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={item.placa}
                              onChange={(e) =>
                                handleReconciliationDataChange(
                                  index,
                                  "placa",
                                  e.target.value.toUpperCase()
                                )
                              }
                              placeholder="ABC-1234"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.renavam || ""}
                              onChange={(e) =>
                                handleReconciliationDataChange(index, "renavam", e.target.value)
                              }
                              placeholder="00000000000"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={item.dataInspecao}
                              onChange={(e) =>
                                handleReconciliationDataChange(index, "dataInspecao", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.tipoInspecao || ""}
                              onChange={(e) =>
                                handleReconciliationDataChange(index, "tipoInspecao", e.target.value)
                              }
                              placeholder="Tipo de inspeção"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.numeroProtocolo || ""}
                              onChange={(e) =>
                                handleReconciliationDataChange(index, "numeroProtocolo", e.target.value)
                              }
                              placeholder="Nº Protocolo"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveReconciliationRow(index)}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Instruções:</strong> Adicione manualmente as inspeções do governo ou importe um arquivo CSV
                  com as colunas: placa, renavam (opcional), data, tipo (opcional), protocolo (opcional).
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReconciliationDialogOpen(false);
                  setReconciliationData([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitReconciliation}
                disabled={createReconciliation.isPending || reconciliationData.length === 0}
              >
                {createReconciliation.isPending ? "Processando..." : "Realizar Conciliação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}

