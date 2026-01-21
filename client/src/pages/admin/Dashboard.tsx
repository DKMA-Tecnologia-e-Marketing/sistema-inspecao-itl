import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, DollarSign, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  const statsData = [
    {
      title: "Estabelecimentos",
      value: stats?.totalTenants?.toString() || "0",
      description: "Total de ITLs cadastradas",
      icon: Building2,
    },
    {
      title: "Inspeções",
      value: stats?.totalAppointmentsThisMonth?.toString() || "0",
      description: "Este mês",
      icon: Calendar,
    },
    {
      title: "Usuários",
      value: stats?.totalActiveUsers?.toString() || "0",
      description: "Ativos no sistema",
      icon: Users,
    },
    {
      title: "Receita",
      value: stats?.revenueThisMonth 
        ? `R$ ${(stats.revenueThisMonth / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "R$ 0,00",
      description: "Este mês",
      icon: DollarSign,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do sistema de inspeções</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsData.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-2xl font-bold animate-pulse">...</div>
                  ) : (
                    <div className="text-2xl font-bold">{stat.value}</div>
                  )}
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Inspeções Recentes</CardTitle>
              <CardDescription>Últimas inspeções realizadas no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Carregando...</p>
                </div>
              ) : stats?.recentAppointments && stats.recentAppointments.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentAppointments.map((apt: any) => (
                    <div key={apt.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">
                          {apt.customer?.nome || "Cliente não encontrado"} - {apt.vehicle?.placa || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {apt.tenant?.nome || "ITL não encontrada"} • {formatDate(apt.dataAgendamento)}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {apt.status === "pendente" && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Pendente</span>}
                        {apt.status === "confirmado" && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Confirmado</span>}
                        {apt.status === "realizado" && <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Realizado</span>}
                        {apt.status === "cancelado" && <span className="px-2 py-1 bg-red-100 text-red-800 rounded">Cancelado</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma inspeção recente</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimas ações no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma atividade recente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
