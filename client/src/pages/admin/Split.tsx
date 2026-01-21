import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Plus, PieChart, Edit, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Split() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [formData, setFormData] = useState({
    tenantId: 0,
    serviceId: 0,
    percentualTenant: "",
    percentualPlataforma: "",
    ativo: true,
  });

  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: services } = trpc.services.list.useQuery();
  const { data: splits, isLoading, refetch } = trpc.splitConfigurations.listByTenant.useQuery(
    { tenantId: selectedTenant !== "all" ? parseInt(selectedTenant) : (tenants?.[0]?.id || 1) },
    { enabled: selectedTenant !== "all" && !!tenants?.length }
  );

  const createSplit = trpc.splitConfigurations.create.useMutation({
    onSuccess: () => {
      toast.success("Configuração de split criada com sucesso!");
      setDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar split: " + error.message);
    },
  });

  const updateSplit = trpc.splitConfigurations.update.useMutation({
    onSuccess: () => {
      toast.success("Configuração de split atualizada com sucesso!");
      setDialogOpen(false);
      setEditingSplit(null);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar split: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      tenantId: selectedTenant !== "all" ? parseInt(selectedTenant) : (tenants?.[0]?.id || 0),
      serviceId: 0,
      percentualTenant: "",
      percentualPlataforma: "",
      ativo: true,
    });
  };

  const handleOpenDialog = (split?: typeof splits[0]) => {
    if (split) {
      setEditingSplit(split.id);
      setFormData({
        tenantId: split.tenantId,
        serviceId: split.serviceId,
        percentualTenant: (split.percentualTenant / 100).toFixed(2),
        percentualPlataforma: (split.percentualPlataforma / 100).toFixed(2),
        ativo: split.ativo,
      });
    } else {
      resetForm();
      setEditingSplit(null);
    }
    setDialogOpen(true);
  };

  const formatPercentual = (centesimos: number) => {
    return `${(centesimos / 100).toFixed(2)}%`;
  };

  const parsePercentual = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, "");
    const numeric = cleaned.replace(",", ".");
    return Math.round(parseFloat(numeric || "0") * 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const percentualTenant = parsePercentual(formData.percentualTenant);
    const percentualPlataforma = parsePercentual(formData.percentualPlataforma);
    const total = percentualTenant + percentualPlataforma;

    if (percentualTenant <= 0 || percentualPlataforma <= 0) {
      toast.error("Os percentuais devem ser maiores que zero");
      return;
    }

    if (total !== 10000) {
      toast.error(`A soma dos percentuais deve ser 100%. Atual: ${(total / 100).toFixed(2)}%`);
      return;
    }

    if (editingSplit) {
      updateSplit.mutate({
        id: editingSplit,
        percentualTenant,
        percentualPlataforma,
        ativo: formData.ativo,
      });
    } else {
      createSplit.mutate({
        tenantId: formData.tenantId,
        serviceId: formData.serviceId,
        percentualTenant,
        percentualPlataforma,
      });
    }
  };

  const getTenantName = (tenantId: number) => {
    return tenants?.find((t) => t.id === tenantId)?.nome || "-";
  };

  const getServiceName = (serviceId: number) => {
    return services?.find((s) => s.id === serviceId)?.nome || "-";
  };

  const handlePercentualChange = (field: "percentualTenant" | "percentualPlataforma", value: string) => {
    let cleaned = value.replace(/[^\d,]/g, "");
    const parts = cleaned.split(",");
    if (parts.length > 2) {
      cleaned = parts[0] + "," + parts.slice(1).join("");
    }
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + "," + parts[1].slice(0, 2);
    }

    setFormData({ ...formData, [field]: cleaned });

    // Calcular automaticamente o outro percentual se estiver criando
    if (!editingSplit) {
      const current = parseFloat(cleaned.replace(",", ".") || "0");
      const other = 100 - current;
      const otherField = field === "percentualTenant" ? "percentualPlataforma" : "percentualTenant";
      setFormData((prev) => ({
        ...prev,
        [field]: cleaned,
        [otherField]: other.toFixed(2),
      }));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Configuração de Split</h2>
            <p className="text-muted-foreground">Gerencie a divisão de pagamentos entre estabelecimentos e plataforma</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um estabelecimento" />
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} disabled={selectedTenant === "all"}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Configuração
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSplit ? "Editar Split" : "Cadastrar Nova Configuração de Split"}</DialogTitle>
                  <DialogDescription>
                    {editingSplit
                      ? "Atualize a divisão de pagamentos"
                      : "Configure como o pagamento será dividido entre estabelecimento e plataforma"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenantId">Estabelecimento *</Label>
                      <Select
                        value={formData.tenantId.toString()}
                        onValueChange={(value) => setFormData({ ...formData, tenantId: parseInt(value) })}
                        required
                        disabled={selectedTenant !== "all"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um estabelecimento" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants?.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              {tenant.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceId">Serviço *</Label>
                      <Select
                        value={formData.serviceId.toString()}
                        onValueChange={(value) => setFormData({ ...formData, serviceId: parseInt(value) })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services?.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="percentualTenant">% Estabelecimento *</Label>
                        <Input
                          id="percentualTenant"
                          value={formData.percentualTenant}
                          onChange={(e) => handlePercentualChange("percentualTenant", e.target.value)}
                          required
                          placeholder="85,00"
                          inputMode="decimal"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="percentualPlataforma">% Plataforma *</Label>
                        <Input
                          id="percentualPlataforma"
                          value={formData.percentualPlataforma}
                          onChange={(e) => handlePercentualChange("percentualPlataforma", e.target.value)}
                          required
                          placeholder="15,00"
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium">Total: {(
                        parseFloat(formData.percentualTenant.replace(",", ".") || "0") +
                        parseFloat(formData.percentualPlataforma.replace(",", ".") || "0")
                      ).toFixed(2)}%</p>
                      {parseFloat(formData.percentualTenant.replace(",", ".") || "0") +
                        parseFloat(formData.percentualPlataforma.replace(",", ".") || "0") !==
                      100 && (
                        <p className="text-xs text-destructive mt-1">
                          A soma deve ser exatamente 100%
                        </p>
                      )}
                    </div>
                    {editingSplit && (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ativo">Status</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="ativo"
                            checked={formData.ativo}
                            onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                          />
                          <span className="text-sm">{formData.ativo ? "Ativo" : "Inativo"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createSplit.isPending || updateSplit.isPending}>
                      {createSplit.isPending || updateSplit.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Split</CardTitle>
            <CardDescription>
              {selectedTenant === "all"
                ? "Visualize todas as configurações de split"
                : `Total de ${splits?.length || 0} configurações para este estabelecimento`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : splits && splits.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedTenant === "all" && <TableHead>Estabelecimento</TableHead>}
                    <TableHead>Serviço</TableHead>
                    <TableHead>% Estabelecimento</TableHead>
                    <TableHead>% Plataforma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {splits.map((split) => (
                    <TableRow key={split.id}>
                      {selectedTenant === "all" && (
                        <TableCell className="font-medium">{getTenantName(split.tenantId)}</TableCell>
                      )}
                      <TableCell>{getServiceName(split.serviceId)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatPercentual(split.percentualTenant)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatPercentual(split.percentualPlataforma)}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            split.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {split.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(split)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma configuração de split encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}










