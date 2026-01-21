import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Download, Calendar, TrendingUp, DollarSign, Users, Building2 } from "lucide-react";
import { useState } from "react";

export default function Reports() {
  const [reportType, setReportType] = useState<string>("appointments");
  const [dateRange, setDateRange] = useState<string>("month");
  const [selectedTenant, setSelectedTenant] = useState<string>("all");

  const reportTypes = [
    { value: "appointments", label: "Agendamentos", icon: Calendar },
    { value: "revenue", label: "Receita", icon: DollarSign },
    { value: "customers", label: "Clientes", icon: Users },
    { value: "tenants", label: "Estabelecimentos", icon: Building2 },
  ];

  const stats = [
    { label: "Total de Agendamentos", value: "1.234", change: "+12%" },
    { label: "Receita Total", value: "R$ 185.450", change: "+8%" },
    { label: "Novos Clientes", value: "156", change: "+15%" },
    { label: "Taxa de Comparecimento", value: "87%", change: "+3%" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
            <p className="text-muted-foreground">Análises e estatísticas do sistema</p>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className="text-green-600">{stat.change}</span>
                  <span>vs mês anterior</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Relatório</CardTitle>
            <CardDescription>Configure os parâmetros do relatório</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Relatório</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
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
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estabelecimento</label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">ITL Centro - São Paulo</SelectItem>
                    <SelectItem value="2">ITL Zona Norte - São Paulo</SelectItem>
                    <SelectItem value="3">ITL Guarulhos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dateRange === "custom" && (
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Início</label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Fim</label>
                  <Input type="date" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Preview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos por Status</CardTitle>
              <CardDescription>Distribuição de agendamentos no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Confirmados</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: "65%" }}></div>
                    </div>
                    <span className="text-sm font-medium">65%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pendentes</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: "20%" }}></div>
                    </div>
                    <span className="text-sm font-medium">20%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Realizados</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: "12%" }}></div>
                    </div>
                    <span className="text-sm font-medium">12%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cancelados</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: "3%" }}></div>
                    </div>
                    <span className="text-sm font-medium">3%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receita por Estabelecimento</CardTitle>
              <CardDescription>Distribuição de receita no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">ITL Centro - SP</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "45%" }}></div>
                    </div>
                    <span className="text-sm font-medium">R$ 83.450</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">ITL Zona Norte - SP</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "35%" }}></div>
                    </div>
                    <span className="text-sm font-medium">R$ 65.000</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">ITL Guarulhos</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "20%" }}></div>
                    </div>
                    <span className="text-sm font-medium">R$ 37.000</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gráfico de Tendências</CardTitle>
            <CardDescription>Evolução ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Gráficos interativos serão exibidos aqui</p>
              <p className="text-xs mt-2">Integração com biblioteca de gráficos em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}










