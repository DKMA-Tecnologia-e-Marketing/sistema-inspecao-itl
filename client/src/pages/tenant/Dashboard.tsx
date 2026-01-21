import TenantLayout from "@/components/TenantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Calendar, Users, DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TenantDashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: tenant } = trpc.tenants.getById.useQuery(
    { id: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  // Estatísticas do estabelecimento
  const { data: appointments } = trpc.appointments.listByTenant.useQuery(
    { tenantId: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  const appointmentsStats = {
    total: appointments?.length || 0,
    confirmados: appointments?.filter((a) => a.status === "confirmado").length || 0,
    realizados: appointments?.filter((a) => a.status === "realizado").length || 0,
    cancelados: appointments?.filter((a) => a.status === "cancelado").length || 0,
    pendentes: appointments?.filter((a) => a.status === "pendente").length || 0,
  };

  // Próximos agendamentos
  const upcomingAppointments = appointments
    ?.filter((a) => a.status !== "cancelado" && a.status !== "realizado")
    .sort((a, b) => new Date(a.dataAgendamento).getTime() - new Date(b.dataAgendamento).getTime())
    .slice(0, 5) || [];

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {tenant?.nome ? `Bem-vindo ao ${tenant.nome}` : "Visão geral do seu estabelecimento"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointmentsStats.total}</div>
              <p className="text-xs text-muted-foreground">Inspeções</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{appointmentsStats.confirmados}</div>
              <p className="text-xs text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Realizados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{appointmentsStats.realizados}</div>
              <p className="text-xs text-muted-foreground">Realizados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{appointmentsStats.pendentes}</div>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{appointmentsStats.cancelados}</div>
              <p className="text-xs text-muted-foreground">Cancelados</p>
            </CardContent>
          </Card>
        </div>

        {/* Informações do Estabelecimento */}
        {tenant && (
          <Card>
            <CardHeader>
              <CardTitle>Informações do Estabelecimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{tenant.nome}</p>
                </div>
                {tenant.cnpj && (
                  <div>
                    <p className="text-sm text-muted-foreground">CNPJ</p>
                    <p className="font-medium">{tenant.cnpj}</p>
                  </div>
                )}
                {tenant.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{tenant.email}</p>
                  </div>
                )}
                {tenant.telefone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{tenant.telefone}</p>
                  </div>
                )}
                {tenant.endereco && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">
                      {tenant.endereco}, {tenant.cidade} - {tenant.estado} {tenant.cep}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Próximas Inspeções */}
        <Card>
          <CardHeader>
              <CardTitle>Próximas Inspeções</CardTitle>
              <CardDescription>Inspeções pendentes e confirmadas</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum agendamento próximo</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Agendamento #{appointment.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          appointment.status === "confirmado"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {appointment.status === "confirmado" ? "Confirmado" : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TenantLayout>
  );
}

