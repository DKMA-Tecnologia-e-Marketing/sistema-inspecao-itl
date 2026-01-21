import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Calendar, Search, Download, Clock, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { APPOINTMENT_STATUS } from "@shared/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

export default function CustomerHistory() {
  const searchParams = new URLSearchParams(window.location.search);
  const customerIdParam = searchParams.get("customerId");
  const savedCustomerId = localStorage.getItem("customerId");
  const customerId = customerIdParam ? parseInt(customerIdParam) : (savedCustomerId ? parseInt(savedCustomerId) : null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: appointments, isLoading } = trpc.appointments.listByCustomer.useQuery(
    { customerId: customerId || 1 },
    { enabled: !!customerId }
  );

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
    const matchesSearch =
      !searchTerm ||
      format(new Date(apt.dataAgendamento), "dd/MM/yyyy", { locale: ptBR })
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      apt.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (!customerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>É necessário informar o ID do cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/customer/dashboard">
              <Button>Voltar ao Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Agendamentos</h1>
            <p className="text-muted-foreground">Visualize todos os seus agendamentos</p>
          </div>
          <Link href="/customer/dashboard">
            <Button variant="outline">Voltar ao Dashboard</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agendamentos</CardTitle>
                <CardDescription>
                  Total de {filteredAppointments?.length || 0} agendamentos encontrados
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="w-64">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por data ou observações..."
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredAppointments && filteredAppointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data e Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
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
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {appointment.observacoes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/customer/appointments/${appointment.id}`}>
                            <Button variant="ghost" size="sm">
                              Ver detalhes
                            </Button>
                          </Link>
                          {appointment.status === "realizado" && (
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Comprovante
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

