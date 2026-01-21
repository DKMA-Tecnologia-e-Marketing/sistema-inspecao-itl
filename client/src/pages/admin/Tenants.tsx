import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Search, Edit, MapPin, Trash2, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [deleteTenantId, setDeleteTenantId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    iuguAccountId: "",
    ativo: true,
  });

  const utils = trpc.useUtils();
  const { data: tenants, isLoading, refetch } = trpc.tenants.list.useQuery();
  const { data: subcontas } = trpc.iugu.listSubaccounts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const createTenant = trpc.tenants.create.useMutation({
    onSuccess: () => {
      toast.success("Estabelecimento criado com sucesso!");
      setDialogOpen(false);
      refetch();
      setFormData({
        nome: "",
        cnpj: "",
        telefone: "",
        email: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        ativo: true,
      });
      setEditingTenantId(null);
    },
    onError: (error) => {
      toast.error("Erro ao criar estabelecimento: " + error.message);
    },
  });

  const updateTenant = trpc.tenants.update.useMutation({
    onSuccess: () => {
      toast.success("Estabelecimento atualizado com sucesso!");
      setDialogOpen(false);
      setEditingTenantId(null);
      refetch();
      setFormData({
        nome: "",
        cnpj: "",
        telefone: "",
        email: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        ativo: true,
      });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar estabelecimento: " + error.message);
    },
  });

  const deleteTenant = trpc.tenants.delete.useMutation({
    onSuccess: () => {
      toast.success("Estabelecimento removido com sucesso!");
      setDeleteDialogOpen(false);
      setDeleteTenantId(null);
      utils.tenants.list.invalidate();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover estabelecimento: " + error.message);
    },
  });

  const handleOpenDialog = (tenant?: (typeof tenants)[number]) => {
    if (tenant) {
      setEditingTenantId(tenant.id);
      setFormData({
        nome: tenant.nome,
        cnpj: tenant.cnpj,
        telefone: tenant.telefone || "",
        email: tenant.email || "",
        endereco: tenant.endereco || "",
        cidade: tenant.cidade || "",
        estado: tenant.estado || "",
        cep: tenant.cep || "",
        iuguAccountId: tenant.iuguAccountId || "",
        ativo: tenant.ativo,
      });
    } else {
      setEditingTenantId(null);
      setFormData({
        nome: "",
        cnpj: "",
        telefone: "",
        email: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTenantId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenantId) {
      const { ativo, iuguAccountId, ...payload } = formData;
      updateTenant.mutate({
        id: editingTenantId,
        ...payload,
        iuguAccountId: iuguAccountId || undefined,
        ativo,
      });
    } else {
      const { ativo, iuguAccountId, ...payload } = formData;
      createTenant.mutate({
        ...payload,
        iuguAccountId: iuguAccountId || undefined,
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTenantId) return;
    deleteTenant.mutate({ id: deleteTenantId });
  };

  const filteredTenants = tenants?.filter(
    (tenant) =>
      !searchTerm ||
      tenant.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.cnpj.includes(searchTerm) ||
      tenant.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.iuguAccountId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Estabelecimentos</h2>
            <p className="text-muted-foreground">Gerencie os estabelecimentos ITL cadastrados no sistema</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Estabelecimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Estabelecimento</DialogTitle>
                <DialogDescription>Preencha os dados do estabelecimento ITL</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        required
                        disabled={!!editingTenantId}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iuguAccountId">iuguAccountId (Opcional)</Label>
                    <Input
                      id="iuguAccountId"
                      value={formData.iuguAccountId}
                      onChange={(e) => setFormData({ ...formData, iuguAccountId: e.target.value })}
                      placeholder="ID da subconta Iugu para split de pagamento"
                    />
                    <p className="text-xs text-muted-foreground">
                      Configure o ID da subconta Iugu para habilitar split de pagamento. Você pode criar e vincular subcontas em "Integrações → Iugu".
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="text-base">Estabelecimento ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Estabelecimentos inativos não aparecem para os clientes.
                      </p>
                    </div>
                    <Switch checked={formData.ativo} onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createTenant.isPending || updateTenant.isPending}>
                    {editingTenantId ? (updateTenant.isPending ? "Atualizando..." : "Salvar alterações") : createTenant.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Estabelecimentos</CardTitle>
                <CardDescription>Total de {tenants?.length || 0} estabelecimentos cadastrados</CardDescription>
              </div>
              <div className="w-72">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredTenants && filteredTenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>iuguAccountId</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {tenant.nome}
                        </div>
                      </TableCell>
                      <TableCell>{tenant.cnpj}</TableCell>
                      <TableCell>
                        {tenant.cidade && tenant.estado ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {tenant.cidade}/{tenant.estado}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{tenant.telefone || "-"}</TableCell>
                      <TableCell>
                        {tenant.iuguAccountId ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Vinculado
                              </Badge>
                              <code className="text-xs bg-muted px-2 py-1 rounded">{tenant.iuguAccountId}</code>
                            </div>
                            {subcontas?.find((s) => s.account_id === tenant.iuguAccountId) && (
                              <span className="text-xs text-muted-foreground">
                                {subcontas.find((s) => s.account_id === tenant.iuguAccountId)?.name || "Subconta Iugu"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Não vinculado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            tenant.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {tenant.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(tenant)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTenantId(tenant.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum estabelecimento encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover estabelecimento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o estabelecimento selecionado. Certifique-se de que não existem inspeções ou registros associados antes de prosseguir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTenantId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
