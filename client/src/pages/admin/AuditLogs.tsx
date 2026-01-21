import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Search, Download, User, Calendar } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logsData, isLoading } = trpc.auditLogs.list.useQuery({
    action: actionFilter !== "all" ? (actionFilter as any) : undefined,
    userId: userFilter !== "all" ? parseInt(userFilter) : undefined,
    tenantId: tenantFilter === "none" ? null : tenantFilter !== "all" ? parseInt(tenantFilter) : undefined,
    limit: 100,
  });

  // Dados mockados para demonstração (se não houver dados reais)
  const logs = logsData || [
    {
      id: 1,
      userId: 1,
      userName: "Administrador Local",
      tenantId: 1,
      tenantName: "ITL Centro - São Paulo",
      action: "create",
      entityType: "appointment",
      entityId: 123,
      description: "Criou novo agendamento #123",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0...",
      createdAt: new Date("2024-11-03T10:30:00"),
    },
    {
      id: 2,
      userId: 1,
      userName: "Administrador Local",
      tenantId: null,
      tenantName: null,
      action: "update",
      entityType: "tenant",
      entityId: 1,
      description: "Atualizou estabelecimento ITL Centro",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0...",
      createdAt: new Date("2024-11-03T09:15:00"),
    },
    {
      id: 3,
      userId: 2,
      userName: "Operador ITL",
      tenantId: 2,
      tenantName: "ITL Zona Norte",
      action: "delete",
      entityType: "appointment",
      entityId: 120,
      description: "Cancelou agendamento #120",
      ipAddress: "192.168.1.105",
      userAgent: "Mozilla/5.0...",
      createdAt: new Date("2024-11-03T08:45:00"),
    },
    {
      id: 4,
      userId: 1,
      userName: "Administrador Local",
      tenantId: null,
      tenantName: null,
      action: "update",
      entityType: "price",
      entityId: 5,
      description: "Atualizou preço do serviço #5",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0...",
      createdAt: new Date("2024-11-02T16:20:00"),
    },
  ];

  const actions = ["create", "update", "delete", "login", "logout"];

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesUser = userFilter === "all" || log.userId.toString() === userFilter;
    const matchesTenant =
      tenantFilter === "all" ||
      (tenantFilter === "none" && log.tenantId === null) ||
      log.tenantId?.toString() === tenantFilter;
    const matchesSearch =
      !searchTerm ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesUser && matchesTenant && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    const actionConfig = {
      create: { variant: "default" as const, label: "Criar" },
      update: { variant: "secondary" as const, label: "Atualizar" },
      delete: { variant: "destructive" as const, label: "Excluir" },
      login: { variant: "outline" as const, label: "Login" },
      logout: { variant: "outline" as const, label: "Logout" },
    };
    const config = actionConfig[action as keyof typeof actionConfig] || actionConfig.update;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h2>
            <p className="text-muted-foreground">Rastreamento de todas as ações no sistema</p>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descrição ou usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ação</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Usuário</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">Administrador Local</SelectItem>
                    <SelectItem value="2">Operador ITL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estabelecimento</label>
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="none">Nenhum (Admin)</SelectItem>
                    <SelectItem value="1">ITL Centro - São Paulo</SelectItem>
                    <SelectItem value="2">ITL Zona Norte - São Paulo</SelectItem>
                    <SelectItem value="3">ITL Guarulhos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registros de Auditoria</CardTitle>
            <CardDescription>{filteredLogs.length} registro(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(log.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(log.createdAt), "HH:mm:ss", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{log.userName || `Usuário #${log.userId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>{log.tenantName || "-"}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="max-w-md truncate">{log.description || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

