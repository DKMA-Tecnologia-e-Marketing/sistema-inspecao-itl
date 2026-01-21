import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Search, Filter, Download, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { APPOINTMENT_STATUS } from "@shared/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function Appointments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: appointments, isLoading, refetch: refetchAppointments } = trpc.appointments.listAll.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const syncPayments = trpc.payments.sincronizarStatus.useMutation({
    onSuccess: (data) => {
      const mensagem = `Sincronização concluída! Total: ${data.total}, Atualizados: ${data.atualizados}, Erros: ${data.erros}${data.inspecoesCorrigidas ? `, Inspeções corrigidas: ${data.inspecoesCorrigidas}` : ""}`;
      toast.success(mensagem);
      refetchAppointments();
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { variant: "secondary" as const, icon: Clock, label: APPOINTMENT_STATUS.pendente },
      confirmado: { variant: "default" as const, icon: CheckCircle, label: APPOINTMENT_STATUS.confirmado },
      realizado: { variant: "outline" as const, icon: CheckCircle, label: APPOINTMENT_STATUS.realizado },
      cancelado: { variant: "destructive" as const, icon: XCircle, label: APPOINTMENT_STATUS.cancelado },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredAppointments = appointments?.filter((apt) => {
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    const matchesTenant = tenantFilter === "all" || apt.tenantId?.toString() === tenantFilter;
    const matchesSearch =
      !searchTerm ||
      apt.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      format(new Date(apt.dataAgendamento), "dd/MM/yyyy", { locale: ptBR })
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesStatus && matchesTenant && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Inspeções</h2>
            <p className="text-muted-foreground">Gerencie todas as inspeções do sistema</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                syncPayments.mutate();
              }}
              disabled={syncPayments.isPending}
            >
              {syncPayments.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Sincronizando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sincronizar Pagamentos
                </>
              )}
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Inspeções</CardTitle>
                <CardDescription>
                  {filteredAppointments?.length || 0} inspeção(ões) encontrada(s)
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="w-64">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar inspeções..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(APPOINTMENT_STATUS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estabelecimentos</SelectItem>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id.toString()}>
                        {tenant.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredAppointments && filteredAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Inspeção Realizada</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(appointment.dataAgendamento), "HH:mm", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {appointment.customerId ? `Cliente #${appointment.customerId}` : "-"}
                        </TableCell>
                        <TableCell>
                          {appointment.vehicleId ? `Veículo #${appointment.vehicleId}` : "-"}
                        </TableCell>
                        <TableCell>
                          {tenants?.find((t) => t.id === appointment.tenantId)?.nome || "-"}
                        </TableCell>
                        <TableCell>
                          {appointment.payment ? (
                            <Badge
                              variant={
                                appointment.payment.status === "aprovado"
                                  ? "default"
                                  : appointment.payment.status === "pendente"
                                  ? "secondary"
                                  : appointment.payment.status === "recusado" || appointment.payment.status === "estornado"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="flex items-center gap-1 w-fit"
                            >
                              {appointment.payment.status === "aprovado" && <CheckCircle className="h-3 w-3" />}
                              {appointment.payment.status === "pendente" && <Clock className="h-3 w-3" />}
                              {(appointment.payment.status === "recusado" || appointment.payment.status === "estornado") && <XCircle className="h-3 w-3" />}
                              {appointment.payment.status === "aprovado"
                                ? "Pago"
                                : appointment.payment.status === "pendente"
                                ? "Pendente"
                                : appointment.payment.status === "recusado"
                                ? "Recusado"
                                : appointment.payment.status === "estornado"
                                ? "Estornado"
                                : appointment.payment.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Não pago
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {appointment.status === "realizado" ? (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Não
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/appointments/detail?id=${appointment.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma inspeção encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

