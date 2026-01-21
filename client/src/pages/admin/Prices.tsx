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
import { Plus, DollarSign, Edit, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Prices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [formData, setFormData] = useState({
    tenantId: 0,
    serviceId: 0,
    preco: "",
    ativo: true,
  });

  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: services } = trpc.services.list.useQuery();
  const { data: prices, isLoading, refetch } = trpc.priceConfigurations.listByTenant.useQuery(
    { tenantId: selectedTenant !== "all" ? parseInt(selectedTenant) : (tenants?.[0]?.id || 1) },
    { enabled: selectedTenant !== "all" && !!tenants?.length }
  );

  const createPrice = trpc.priceConfigurations.create.useMutation({
    onSuccess: () => {
      toast.success("Preço criado com sucesso!");
      setDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar preço: " + error.message);
    },
  });

  const updatePrice = trpc.priceConfigurations.update.useMutation({
    onSuccess: () => {
      toast.success("Preço atualizado com sucesso!");
      setDialogOpen(false);
      setEditingPrice(null);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar preço: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      tenantId: selectedTenant !== "all" ? parseInt(selectedTenant) : (tenants?.[0]?.id || 0),
      serviceId: 0,
      preco: "",
      ativo: true,
    });
  };

  const handleOpenDialog = (price?: typeof prices[0]) => {
    if (price) {
      setEditingPrice(price.id);
      setFormData({
        tenantId: price.tenantId,
        serviceId: price.serviceId,
        preco: (price.preco / 100).toFixed(2).replace(".", ","),
        ativo: price.ativo,
      });
    } else {
      resetForm();
      setEditingPrice(null);
    }
    setDialogOpen(true);
  };

  const formatPrice = (centavos: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(centavos / 100);
  };

  const parsePrice = (value: string): number => {
    // Remove tudo que não é número
    const cleaned = value.replace(/[^\d,]/g, "");
    // Substitui vírgula por ponto e converte para número
    const numeric = cleaned.replace(",", ".");
    return Math.round(parseFloat(numeric || "0") * 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const precoEmCentavos = parsePrice(formData.preco);
    
    if (precoEmCentavos <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }

    if (editingPrice) {
      updatePrice.mutate({
        id: editingPrice,
        preco: precoEmCentavos,
        ativo: formData.ativo,
      });
    } else {
      createPrice.mutate({
        tenantId: formData.tenantId,
        serviceId: formData.serviceId,
        preco: precoEmCentavos,
      });
    }
  };

  const getTenantName = (tenantId: number) => {
    return tenants?.find((t) => t.id === tenantId)?.nome || "-";
  };

  const getServiceName = (serviceId: number) => {
    return services?.find((s) => s.id === serviceId)?.nome || "-";
  };

  // Criar matriz de preços (serviços x tenants)
  const priceMatrix = services?.map((service) => {
    const servicePrices = tenants?.map((tenant) => {
      const price = prices?.find((p) => p.tenantId === tenant.id && p.serviceId === service.id);
      return { tenant, price };
    }) || [];
    return { service, prices: servicePrices };
  }) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Configuração de Preços</h2>
            <p className="text-muted-foreground">Gerencie os preços dos serviços por estabelecimento</p>
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
                  Novo Preço
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPrice ? "Editar Preço" : "Cadastrar Novo Preço"}</DialogTitle>
                  <DialogDescription>
                    {editingPrice ? "Atualize o preço do serviço" : "Configure o preço de um serviço para um estabelecimento"}
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
                    <div className="space-y-2">
                      <Label htmlFor="preco">Preço (R$) *</Label>
                      <Input
                        id="preco"
                        value={formData.preco}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d,]/g, "");
                          // Garantir apenas uma vírgula
                          const parts = value.split(",");
                          if (parts.length > 2) {
                            value = parts[0] + "," + parts.slice(1).join("");
                          }
                          // Limitar a 2 casas decimais
                          if (parts[1] && parts[1].length > 2) {
                            value = parts[0] + "," + parts[1].slice(0, 2);
                          }
                          setFormData({ ...formData, preco: value });
                        }}
                        required
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                      <p className="text-xs text-muted-foreground">
                        Digite o valor em reais (ex: 150,00 para R$ 150,00)
                      </p>
                    </div>
                    {editingPrice && (
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
                    <Button type="submit" disabled={createPrice.isPending || updatePrice.isPending}>
                      {createPrice.isPending || updatePrice.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selectedTenant === "all" ? (
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Preços</CardTitle>
              <CardDescription>Visualize todos os preços configurados em formato de tabela</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      {tenants?.map((tenant) => (
                        <TableHead key={tenant.id} className="text-center">
                          {tenant.nome}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceMatrix.map(({ service, prices }) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.nome}</TableCell>
                        {prices.map(({ tenant, price }) => (
                          <TableCell key={tenant.id} className="text-center">
                            {price ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-medium">{formatPrice(price.preco)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(price)}
                                  className="h-6"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFormData({
                                    tenantId: tenant.id,
                                    serviceId: service.id,
                                    preco: "",
                                    ativo: true,
                                  });
                                  setEditingPrice(null);
                                  setDialogOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar
                              </Button>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Preços do Estabelecimento</CardTitle>
              <CardDescription>Total de {prices?.length || 0} preços configurados</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : prices && prices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prices.map((price) => (
                      <TableRow key={price.id}>
                        <TableCell className="font-medium">{getServiceName(price.serviceId)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatPrice(price.preco)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              price.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {price.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(price)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum preço configurado</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}










