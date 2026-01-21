import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Users, Edit, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { USER_ROLES } from "@shared/constants";

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    newPassword: "",
    role: "user" as "admin" | "operator" | "user",
    tenantId: 0,
  });

  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: allUsers, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: usersByTenant, isLoading: isLoadingByTenant } = trpc.users.listByTenant.useQuery(
    { tenantId: parseInt(selectedTenant) },
    { enabled: selectedTenant !== "all" && selectedTenant !== "" }
  );

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      setDialogOpen(false);
      setEditingUser(null);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar usuário: " + error.message);
    },
  });

  const users = selectedTenant === "all" ? allUsers : usersByTenant;
  const isLoadingUsers = selectedTenant === "all" ? isLoading : isLoadingByTenant;

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      newPassword: "",
      role: "user",
      tenantId: 0,
      comissaoPercentual: undefined,
      aptoParaAtender: true,
    });
  };

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha resetada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao resetar senha: " + error.message);
    },
  });

  const handleOpenDialog = (user?: typeof users[0]) => {
    if (user) {
      setEditingUser(user.id);
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        newPassword: "",
        role: user.role,
        tenantId: user.tenantId || 0,
        comissaoPercentual: user.comissaoPercentual ? parseFloat(user.comissaoPercentual.toString()) : undefined,
        aptoParaAtender: user.aptoParaAtender !== undefined ? user.aptoParaAtender : true,
      });
    } else {
      resetForm();
      setEditingUser(null);
    }
    setDialogOpen(true);
  };

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setDialogOpen(false);
      setEditingUser(null);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar usuário: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) {
      // Criar novo usuário
      if (!formData.email || !formData.name || !formData.password) {
        toast.error("Preencha nome, e-mail e senha");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      // Validar que operadores devem ter tenantId
      if (formData.role === "operator" && !formData.tenantId) {
        toast.error("Operadores devem estar associados a um estabelecimento");
        return;
      }
      createUser.mutate({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        tenantId: formData.tenantId || undefined,
        comissaoPercentual: formData.comissaoPercentual,
        aptoParaAtender: formData.aptoParaAtender,
      });
      return;
    }
    // Atualizar usuário existente
    const { password, newPassword, ...updateData } = formData;
    // Validar que operadores devem ter tenantId
    if (updateData.role === "operator" && !updateData.tenantId) {
      toast.error("Operadores devem estar associados a um estabelecimento");
      return;
    }
    
    // Se houver nova senha, resetar primeiro
    if (newPassword && newPassword.length >= 6) {
      resetPasswordMutation.mutate(
        {
          userId: editingUser,
          password: newPassword,
        },
        {
          onSuccess: () => {
            // Após resetar senha, atualizar os outros dados
            updateUser.mutate({
              id: editingUser,
              ...updateData,
              tenantId: formData.tenantId || undefined,
              comissaoPercentual: formData.comissaoPercentual,
              aptoParaAtender: formData.aptoParaAtender,
            });
          },
        }
      );
    } else if (newPassword && newPassword.length > 0 && newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    } else {
      // Sem nova senha, apenas atualizar dados
    updateUser.mutate({
      id: editingUser,
        ...updateData,
      tenantId: formData.tenantId || undefined,
    });
    }
  };

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.openId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getTenantName = (tenantId: number | null) => {
    if (!tenantId) return "-";
    return tenants?.find((t) => t.id === tenantId)?.nome || "-";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h2>
            <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Users className="h-4 w-4 mr-2" />
            Criar Usuário
          </Button>
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por estabelecimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {tenants?.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id.toString()}>
                  {tenant.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>Total de {filteredUsers?.length || 0} usuários cadastrados</CardDescription>
              </div>
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {user.name || "Sem nome"}
                          </div>
                        </TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : user.role === "operator"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {USER_ROLES[user.role]}
                          </span>
                        </TableCell>
                        <TableCell>{getTenantName(user.tenantId)}</TableCell>
                        <TableCell>
                          {user.lastSignedIn
                            ? new Date(user.lastSignedIn).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingUser ? "Editar Usuário" : "Criar Usuário"}</DialogTitle>
                      <DialogDescription>
                        {editingUser
                          ? "Atualize as informações e permissões do usuário"
                          : "Crie um novo usuário. O login será feito via OAuth usando o e-mail cadastrado."}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome do usuário"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@exemplo.com"
                            required
                          />
                        </div>
                        {!editingUser ? (
                          <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                              id="password"
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Mínimo 6 caracteres"
                              required
                              minLength={6}
                            />
                            <p className="text-xs text-muted-foreground">A senha deve ter pelo menos 6 caracteres</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">Nova Senha (deixe em branco para não alterar)</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={formData.newPassword}
                              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                              placeholder="Mínimo 6 caracteres"
                              minLength={6}
                            />
                            <p className="text-xs text-muted-foreground">Digite uma nova senha para resetar a senha do usuário</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="role">Role *</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value as typeof formData.role })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o role" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(USER_ROLES).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tenantId">Estabelecimento</Label>
                          <Select
                            value={formData.tenantId.toString()}
                            onValueChange={(value) =>
                              setFormData({ ...formData, tenantId: value === "0" ? 0 : parseInt(value) })
                            }
                            required={formData.role === "operator"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={formData.role === "operator" ? "Selecione um estabelecimento (obrigatório)" : "Selecione um estabelecimento (opcional)"} />
                            </SelectTrigger>
                            <SelectContent>
                              {formData.role !== "operator" && <SelectItem value="0">Nenhum (Admin)</SelectItem>}
                              {tenants?.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                  {tenant.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {formData.role === "operator" 
                              ? "Operadores devem estar associados a um estabelecimento" 
                              : "Operadores devem estar associados a um estabelecimento"}
                          </p>
                        </div>
                        {formData.role === "operator" && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="comissaoPercentual">Comissão Percentual (%)</Label>
                              <Input
                                id="comissaoPercentual"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.comissaoPercentual ?? ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    comissaoPercentual: e.target.value ? parseFloat(e.target.value) : undefined,
                                  })
                                }
                                placeholder="Ex: 50"
                              />
                              <p className="text-xs text-muted-foreground">
                                Se não informar, será definido 50% automaticamente e o profissional ficará inapto para atender
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="aptoParaAtender"
                                checked={formData.aptoParaAtender}
                                onChange={(e) => setFormData({ ...formData, aptoParaAtender: e.target.checked })}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor="aptoParaAtender" className="text-sm font-normal cursor-pointer">
                                Profissional apto para atender
                              </Label>
                            </div>
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={editingUser ? updateUser.isPending : createUser.isPending}>
                          {editingUser
                            ? updateUser.isPending
                              ? "Salvando..."
                              : "Salvar"
                            : createUser.isPending
                              ? "Criando..."
                              : "Criar"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}











