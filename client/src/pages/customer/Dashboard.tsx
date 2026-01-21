import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Car, DollarSign, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { APPOINTMENT_STATUS } from "@shared/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Para desenvolvimento: usar um customerId fixo ou buscar por CPF/email
// Em produção, isso viria de uma sessão autenticada
export default function CustomerDashboard() {
  // TODO: Obter customerId da sessão/autenticação do cliente
  // Por enquanto, usando query param ou localStorage para desenvolvimento
  const searchParams = new URLSearchParams(window.location.search);
  const customerIdParam = searchParams.get("customerId");
  const [customerId, setCustomerId] = useState<number | null>(
    customerIdParam ? parseInt(customerIdParam) : null
  );

  // Salvar customerId no localStorage para persistir entre páginas
  useEffect(() => {
    if (customerId) {
      localStorage.setItem("customerId", customerId.toString());
    } else {
      const savedId = localStorage.getItem("customerId");
      if (savedId) {
        setCustomerId(parseInt(savedId));
      }
    }
  }, [customerId]);

  // Se não tiver customerId, mostrar formulário para buscar por CPF/email
  if (!customerId) {
    return <CustomerLoginForm onCustomerFound={(id) => setCustomerId(id)} />;
  }

  const { data: customer, isLoading: loadingCustomer } = trpc.customers.getById.useQuery(
    { id: customerId },
    { enabled: !!customerId }
  );
  const { data: appointments, isLoading: loadingAppointments } = trpc.appointments.listByCustomer.useQuery(
    { customerId },
    { enabled: !!customerId }
  );
  const { data: vehicles } = trpc.vehicles.getByCustomer.useQuery(
    { customerId },
    { enabled: !!customerId }
  );
  const { data: payments } = trpc.payments.getByAppointment.useQuery(
    { appointmentId: appointments?.[0]?.id || 0 },
    { enabled: !!appointments?.[0]?.id }
  );

  const upcomingAppointments = appointments?.filter(
    (apt) => apt.status === "pendente" || apt.status === "confirmado"
  ) || [];
  const pastAppointments = appointments?.filter(
    (apt) => apt.status === "realizado" || apt.status === "cancelado"
  ) || [];

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
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loadingCustomer || loadingAppointments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard do Cliente</h1>
            <p className="text-muted-foreground">Bem-vindo, {customer?.nome}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/customer/history">
              <Button variant="outline">Ver Histórico</Button>
            </Link>
            <Link href="/agendar">
              <Button>Novo Agendamento</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Ativos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Pendentes ou confirmados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Todos os agendamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Veículos Cadastrados</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Total de veículos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments?.filter((apt) => apt.status === "realizado").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Inspeções realizadas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Agendamentos</CardTitle>
              <CardDescription>Agendamentos pendentes ou confirmados</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingAppointments.slice(0, 5).map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell>
                          <Link href={`/customer/appointments/${appointment.id}`}>
                            <Button variant="ghost" size="sm">
                              Ver detalhes
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum agendamento próximo</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Veículos Cadastrados</CardTitle>
              <CardDescription>Seus veículos no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicles && vehicles.length > 0 ? (
                <div className="space-y-4">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-3">
                        <Car className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{vehicle.placa}</p>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.marca} {vehicle.modelo} {vehicle.ano}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum veículo cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Agendamentos</CardTitle>
            <CardDescription>Últimos agendamentos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            {pastAppointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAppointments.slice(0, 10).map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {appointment.observacoes || "-"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/customer/appointments/${appointment.id}`}>
                          <Button variant="ghost" size="sm">
                            Ver detalhes
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento no histórico</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Componente para buscar cliente por CPF/Email
function CustomerLoginForm({ onCustomerFound }: { onCustomerFound: (customerId: number) => void }) {
  const [searchType, setSearchType] = useState<"cpf" | "email">("cpf");
  const [searchValue, setSearchValue] = useState("");

  const utils = trpc.useUtils();

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error(`Por favor, informe um ${searchType === "cpf" ? "CPF" : "e-mail"} válido`);
      return;
    }

    try {
      let customer;
      if (searchType === "cpf") {
        customer = await utils.customers.getByCpf.fetch({ cpf: searchValue });
      } else {
        customer = await utils.customers.getByEmail.fetch({ email: searchValue });
      }

      if (customer) {
        onCustomerFound(customer.id);
        toast.success("Cliente encontrado!");
      } else {
        toast.error(`Cliente não encontrado com este ${searchType === "cpf" ? "CPF" : "e-mail"}`);
      }
    } catch (error) {
      toast.error("Erro ao buscar cliente");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acessar Dashboard</CardTitle>
          <CardDescription>Informe seu CPF ou e-mail para acessar seus agendamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar por</Label>
            <Select value={searchType} onValueChange={(v) => setSearchType(v as "cpf" | "email")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{searchType === "cpf" ? "CPF" : "E-mail"}</Label>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchType === "cpf" ? "000.000.000-00" : "email@exemplo.com"}
            />
          </div>
          <Button onClick={handleSearch} className="w-full">
            Acessar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

