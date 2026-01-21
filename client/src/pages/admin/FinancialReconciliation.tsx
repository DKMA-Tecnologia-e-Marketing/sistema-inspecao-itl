import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { DollarSign, Download, RefreshCw, Search, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinancialReconciliation() {
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("month");

  const { data: tenants } = trpc.tenants.list.useQuery();
  // TODO: Implementar router para conciliação financeira
  // const { data: reconciliations } = trpc.financialReconciliations.list.useQuery({
  //   tenantId: tenantFilter !== "all" ? parseInt(tenantFilter) : undefined,
  //   status: statusFilter !== "all" ? statusFilter : undefined,
  // });

  // Dados mockados para demonstração
  const reconciliations = [
    {
      id: 1,
      tenantId: 1,
      tenantName: "ITL Centro - São Paulo",
      periodo: "Novembro 2024",
      totalReceita: 8350000,
      totalPlataforma: 1252500,
      totalTenant: 7097500,
      status: "concilado",
      dataConciliacao: new Date("2024-11-01"),
      pagamentosCount: 45,
    },
    {
      id: 2,
      tenantId: 2,
      tenantName: "ITL Zona Norte - São Paulo",
      periodo: "Novembro 2024",
      totalReceita: 6500000,
      totalPlataforma: 975000,
      totalTenant: 5525000,
      status: "pendente",
      dataConciliacao: null,
      pagamentosCount: 32,
    },
    {
      id: 3,
      tenantId: 3,
      tenantName: "ITL Guarulhos",
      periodo: "Novembro 2024",
      totalReceita: 3700000,
      totalPlataforma: 555000,
      totalTenant: 3145000,
      status: "pendente",
      dataConciliacao: null,
      pagamentosCount: 18,
    },
  ];

  const filteredReconciliations = reconciliations.filter((rec) => {
    const matchesTenant = tenantFilter === "all" || rec.tenantId.toString() === tenantFilter;
    const matchesStatus = statusFilter === "all" || rec.status === statusFilter;
    return matchesTenant && matchesStatus;
  });

  const totalReceita = filteredReconciliations.reduce((sum, rec) => sum + rec.totalReceita, 0);
  const totalPlataforma = filteredReconciliations.reduce((sum, rec) => sum + rec.totalPlataforma, 0);
  const totalTenant = filteredReconciliations.reduce((sum, rec) => sum + rec.totalTenant, 0);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      conciliado: { variant: "default" as const, icon: CheckCircle, label: "Concilado" },
      pendente: { variant: "secondary" as const, icon: AlertCircle, label: "Pendente" },
      divergente: { variant: "destructive" as const, icon: XCircle, label: "Divergente" },
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Conciliação Financeira</h2>
            <p className="text-muted-foreground">Gerencie a conciliação de pagamentos e splits</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconciliar
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {(totalReceita / 100).toFixed(2).replace(".", ",")}</div>
              <p className="text-xs text-muted-foreground">Período selecionado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plataforma</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {(totalPlataforma / 100).toFixed(2).replace(".", ",")}</div>
              <p className="text-xs text-muted-foreground">{(totalPlataforma / totalReceita) * 100 || 0}% da receita</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {(totalTenant / 100).toFixed(2).replace(".", ",")}</div>
              <p className="text-xs text-muted-foreground">{(totalTenant / totalReceita) * 100 || 0}% da receita</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conciliações</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredReconciliations.filter((r) => r.status === "concilado").length}/
                {filteredReconciliations.length}
              </div>
              <p className="text-xs text-muted-foreground">Conciliações concluídas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estabelecimento</label>
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id.toString()}>
                        {tenant.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="concilado">Concilado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="divergente">Divergente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Table */}
        <Card>
          <CardHeader>
            <CardTitle>Conciliações</CardTitle>
            <CardDescription>{filteredReconciliations.length} conciliação(ões) encontrada(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead>Receita Total</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Pagamentos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Conciliação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReconciliations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.periodo}</TableCell>
                    <TableCell>{rec.tenantName}</TableCell>
                    <TableCell>R$ {(rec.totalReceita / 100).toFixed(2).replace(".", ",")}</TableCell>
                    <TableCell>R$ {(rec.totalPlataforma / 100).toFixed(2).replace(".", ",")}</TableCell>
                    <TableCell>R$ {(rec.totalTenant / 100).toFixed(2).replace(".", ",")}</TableCell>
                    <TableCell>{rec.pagamentosCount} pagamento(s)</TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell>
                      {rec.dataConciliacao
                        ? format(new Date(rec.dataConciliacao), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}










