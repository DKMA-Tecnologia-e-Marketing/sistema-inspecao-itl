import TenantLayout from "@/components/TenantLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Plus, Edit, Trash2, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Componente para linha da tabela de grupos (permite usar hooks)
function GroupRow({
  group,
  onEdit,
  onDelete,
}: {
  group: { id: number; nome: string; descricao: string | null };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: groupData } = trpc.userGroups.getById.useQuery({ id: group.id });
  const menuPaths = groupData?.menuPaths || [];

  return (
    <TableRow>
      <TableCell className="font-medium">{group.nome}</TableCell>
      <TableCell>{group.descricao || "-"}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {menuPaths.length > 0 ? (
            menuPaths.map((path) => {
              const menu = tenantMenus.find((m) => m.path === path);
              return (
                <Badge key={path} variant="secondary" className="text-xs">
                  {menu?.label || path}
                </Badge>
              );
            })
          ) : (
            <span className="text-muted-foreground text-sm">Nenhum menu</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// Lista de menus disponíveis no tenant
const tenantMenus = [
  { path: "/tenant", label: "Dashboard" },
  { path: "/tenant/appointments", label: "Inspeções" },
  { path: "/tenant/customers", label: "Clientes" },
  { path: "/tenant/pricing", label: "Precificação" },
  { path: "/tenant/financial", label: "Faturamento" },
  { path: "/tenant/reports", label: "Relatórios" },
  { path: "/tenant/settings", label: "Configurações" },
];

export default function TenantUsers() {
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    groupId: undefined as number | undefined,
  });

  const [groupForm, setGroupForm] = useState({
    nome: "",
    descricao: "",
    menuPaths: [] as string[],
  });

  const { data: users, refetch: refetchUsers } = trpc.tenantUsers.listByTenant.useQuery(
    { tenantId: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  const { data: groups, refetch: refetchGroups } = trpc.userGroups.listByTenant.useQuery(
    { tenantId: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  const createUser = trpc.tenantUsers.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setUserDialogOpen(false);
      setUserForm({ name: "", email: "", password: "", groupId: undefined });
      refetchUsers();
    },
    onError: (error) => toast.error("Erro ao criar usuário: " + error.message),
  });

  const updateUser = trpc.tenantUsers.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      setUserDialogOpen(false);
      setEditingUserId(null);
      setUserForm({ name: "", email: "", password: "", groupId: undefined });
      refetchUsers();
    },
    onError: (error) => toast.error("Erro ao atualizar usuário: " + error.message),
  });

  const deleteUser = trpc.tenantUsers.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido com sucesso!");
      refetchUsers();
    },
    onError: (error) => toast.error("Erro ao remover usuário: " + error.message),
  });

  const createGroup = trpc.userGroups.create.useMutation({
    onSuccess: () => {
      toast.success("Grupo criado com sucesso!");
      setGroupDialogOpen(false);
      setGroupForm({ nome: "", descricao: "", menuPaths: [] });
      refetchGroups();
    },
    onError: (error) => {
      console.error("[Users] Erro ao criar grupo:", error);
      toast.error("Erro ao criar grupo: " + error.message);
    },
  });

  const updateGroup = trpc.userGroups.update.useMutation({
    onSuccess: () => {
      toast.success("Grupo atualizado com sucesso!");
      setGroupDialogOpen(false);
      setEditingGroupId(null);
      setGroupForm({ nome: "", descricao: "", menuPaths: [] });
      refetchGroups();
    },
    onError: (error) => toast.error("Erro ao atualizar grupo: " + error.message),
  });

  const deleteGroup = trpc.userGroups.delete.useMutation({
    onSuccess: () => {
      toast.success("Grupo removido com sucesso!");
      refetchGroups();
    },
    onError: (error) => toast.error("Erro ao remover grupo: " + error.message),
  });

  const handleOpenUserDialog = (userId?: number) => {
    if (userId) {
      const userToEdit = users?.find((u) => u.id === userId);
      if (userToEdit) {
        setEditingUserId(userId);
        setUserForm({
          name: userToEdit.name || "",
          email: userToEdit.email || "",
          password: "",
          groupId: userToEdit.groupId || undefined,
        });
      }
    } else {
      setEditingUserId(null);
      setUserForm({ name: "", email: "", password: "", groupId: undefined });
    }
    setUserDialogOpen(true);
  };

  const handleOpenGroupDialog = async (groupId?: number) => {
    if (groupId) {
      try {
        const groupData = await utils.client.userGroups.getById.fetch({ id: groupId });
        if (groupData) {
          setEditingGroupId(groupId);
          setGroupForm({
            nome: groupData.nome,
            descricao: groupData.descricao || "",
            menuPaths: groupData.menuPaths || [],
          });
        }
      } catch (error) {
        toast.error("Erro ao carregar dados do grupo");
      }
    } else {
      setEditingGroupId(null);
      setGroupForm({ nome: "", descricao: "", menuPaths: [] });
    }
    setGroupDialogOpen(true);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) {
      toast.error("Erro ao identificar o estabelecimento.");
      return;
    }

    if (!userForm.name || !userForm.email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }

    if (!editingUserId && !userForm.password) {
      toast.error("Informe uma senha para o novo usuário.");
      return;
    }

    if (editingUserId) {
      updateUser.mutate({
        id: editingUserId,
        name: userForm.name,
        email: userForm.email,
        password: userForm.password || undefined,
        groupId: userForm.groupId || null,
      });
    } else {
      createUser.mutate({
        tenantId: user.tenantId,
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        groupId: userForm.groupId,
      });
    }
  };

  const handleSubmitGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) {
      toast.error("Erro ao identificar o estabelecimento.");
      return;
    }

    if (!groupForm.nome) {
      toast.error("Informe o nome do grupo.");
      return;
    }

    if (groupForm.menuPaths.length === 0) {
      toast.error("Selecione pelo menos um menu para o grupo.");
      return;
    }

    if (editingGroupId) {
      updateGroup.mutate({
        id: editingGroupId,
        nome: groupForm.nome,
        descricao: groupForm.descricao || undefined,
        menuPaths: groupForm.menuPaths,
      });
    } else {
      createGroup.mutate({
        tenantId: user.tenantId,
        nome: groupForm.nome,
        descricao: groupForm.descricao,
        menuPaths: groupForm.menuPaths,
      });
    }
  };

  const handleToggleMenu = (menuPath: string) => {
    setGroupForm((prev) => ({
      ...prev,
      menuPaths: prev.menuPaths.includes(menuPath)
        ? prev.menuPaths.filter((p) => p !== menuPath)
        : [...prev.menuPaths, menuPath],
    }));
  };

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Usuários e Grupos</h2>
            <p className="text-muted-foreground">Gerencie usuários e grupos de acesso do seu estabelecimento</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Shield className="mr-2 h-4 w-4" />
              Grupos
            </TabsTrigger>
          </TabsList>

          {/* Aba de Usuários */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Usuários</CardTitle>
                    <CardDescription>Gerencie os usuários do seu estabelecimento</CardDescription>
                  </div>
                  <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleOpenUserDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleSubmitUser}>
                        <DialogHeader>
                          <DialogTitle>{editingUserId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
                          <DialogDescription>
                            {editingUserId ? "Atualize as informações do usuário" : "Crie um novo usuário para o estabelecimento"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                              id="name"
                              value={userForm.name}
                              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">E-mail *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={userForm.email}
                              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="password">
                              Senha {!editingUserId && "*"}
                            </Label>
                            <Input
                              id="password"
                              type="password"
                              value={userForm.password}
                              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                              required={!editingUserId}
                              placeholder={editingUserId ? "Deixe em branco para não alterar" : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="groupId">Grupo</Label>
                            <Select
                              value={userForm.groupId?.toString() || "none"}
                              onValueChange={(value) =>
                                setUserForm({ ...userForm, groupId: value === "none" ? undefined : parseInt(value) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um grupo (opcional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum grupo</SelectItem>
                                {groups?.map((group) => (
                                  <SelectItem key={group.id} value={group.id.toString()}>
                                    {group.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                            {editingUserId ? "Atualizar" : "Criar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!users || users.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Nenhum usuário cadastrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Grupo</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => {
                          const userGroup = groups?.find((g) => g.id === u.groupId);
                          return (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.name || "-"}</TableCell>
                              <TableCell>{u.email || "-"}</TableCell>
                              <TableCell>
                                {userGroup ? (
                                  <Badge variant="outline">{userGroup.nome}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Sem grupo</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenUserDialog(u.id)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Tem certeza que deseja remover este usuário?")) {
                                      deleteUser.mutate({ id: u.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Grupos */}
          <TabsContent value="groups" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Grupos de Acesso</CardTitle>
                    <CardDescription>Crie grupos e defina quais menus cada grupo pode acessar</CardDescription>
                  </div>
                  <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleOpenGroupDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Grupo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <form onSubmit={handleSubmitGroup}>
                        <DialogHeader>
                          <DialogTitle>{editingGroupId ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
                          <DialogDescription>
                            {editingGroupId
                              ? "Atualize as informações do grupo e suas permissões"
                              : "Crie um novo grupo e defina quais menus ele pode acessar"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="groupName">Nome do Grupo *</Label>
                            <Input
                              id="groupName"
                              value={groupForm.nome}
                              onChange={(e) => setGroupForm({ ...groupForm, nome: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="groupDescription">Descrição</Label>
                            <textarea
                              id="groupDescription"
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={groupForm.descricao}
                              onChange={(e) => setGroupForm({ ...groupForm, descricao: e.target.value })}
                              placeholder="Descrição do grupo..."
                            />
                          </div>
                          <div className="space-y-4">
                            <Label>Menus Permitidos *</Label>
                            <div className="space-y-2 rounded-lg border p-4">
                              {tenantMenus.map((menu) => (
                                <div key={menu.path} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`menu-${menu.path}`}
                                    checked={groupForm.menuPaths.includes(menu.path)}
                                    onCheckedChange={() => handleToggleMenu(menu.path)}
                                  />
                                  <Label htmlFor={`menu-${menu.path}`} className="cursor-pointer flex-1">
                                    {menu.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {groupForm.menuPaths.length} menu(s) selecionado(s)
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={createGroup.isPending || updateGroup.isPending}>
                            {editingGroupId ? "Atualizar" : "Criar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!groups || groups.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Nenhum grupo cadastrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Menus Permitidos</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groups.map((group) => (
                          <GroupRow
                            key={group.id}
                            group={group}
                            onEdit={() => handleOpenGroupDialog(group.id)}
                            onDelete={() => {
                              if (confirm("Tem certeza que deseja remover este grupo?")) {
                                deleteGroup.mutate({ id: group.id });
                              }
                            }}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TenantLayout>
  );
}

