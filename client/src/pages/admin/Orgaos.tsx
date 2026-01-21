import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Orgaos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [managingUsersFor, setManagingUsersFor] = useState<number | null>(null);
  const [form, setForm] = useState({
    nome: "",
    sigla: "",
    descricao: "",
    ativo: true,
  });

  const { data: orgaos, refetch } = trpc.orgaos.list.useQuery({ includeInactive: true });
  const { data: orgaoUsers, refetch: refetchOrgaoUsers } = trpc.orgaos.getUsers.useQuery(
    { orgaoId: managingUsersFor || 0 },
    { enabled: !!managingUsersFor && usersDialogOpen }
  );
  const { data: allUsers } = trpc.users.list.useQuery();
  const createMutation = trpc.orgaos.create.useMutation();
  const updateMutation = trpc.orgaos.update.useMutation();
  const deleteMutation = trpc.orgaos.delete.useMutation();
  const linkUserMutation = trpc.orgaos.linkUser.useMutation();
  const unlinkUserMutation = trpc.orgaos.unlinkUser.useMutation();

  const handleOpenDialog = (orgao?: (typeof orgaos)[0]) => {
    if (orgao) {
      setEditingId(orgao.id);
      setForm({
        nome: orgao.nome || "",
        sigla: orgao.sigla || "",
        descricao: orgao.descricao || "",
        ativo: orgao.ativo ?? true,
      });
    } else {
      setEditingId(null);
      setForm({
        nome: "",
        sigla: "",
        descricao: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({
      nome: "",
      sigla: "",
      descricao: "",
      ativo: true,
    });
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...form,
        });
        toast.success("Órgão atualizado com sucesso");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Órgão criado com sucesso");
      }
      handleCloseDialog();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar órgão");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteMutation.mutateAsync({ id: deletingId });
      toast.success("Órgão deletado com sucesso");
      setDeleteDialogOpen(false);
      setDeletingId(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar órgão");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Órgãos</h1>
            <p className="text-muted-foreground">Gerencie os órgãos responsáveis pelas inspeções</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Órgão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Órgão" : "Novo Órgão"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Atualize as informações do órgão" : "Preencha os dados para criar um novo órgão"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Prefeitura Municipal de São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sigla">Sigla</Label>
                  <Input
                    id="sigla"
                    value={form.sigla}
                    onChange={(e) => setForm((prev) => ({ ...prev, sigla: e.target.value }))}
                    placeholder="Ex: PMSP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={form.descricao}
                    onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição do órgão"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={form.ativo}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ativo: checked }))}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Órgãos</CardTitle>
            <CardDescription>Órgãos cadastrados no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {orgaos && orgaos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgaos.map((orgao) => (
                    <TableRow key={orgao.id}>
                      <TableCell>{orgao.id}</TableCell>
                      <TableCell className="font-medium">{orgao.nome}</TableCell>
                      <TableCell>{orgao.sigla || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={orgao.ativo ? "default" : "secondary"}>
                          {orgao.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(orgao)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setManagingUsersFor(orgao.id);
                              setUsersDialogOpen(true);
                            }}
                            title="Gerenciar Usuários"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingId(orgao.id);
                              setDeleteDialogOpen(true);
                            }}
                            title="Excluir"
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
                <p>Nenhum órgão cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este órgão? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Gerenciamento de Usuários */}
        <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerenciar Usuários do Órgão</DialogTitle>
              <DialogDescription>
                Vincule ou desvincule usuários a este órgão
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {managingUsersFor && (
                <>
                  <div>
                    <Label>Usuários Vinculados</Label>
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {orgaoUsers && orgaoUsers.length > 0 ? (
                        orgaoUsers.map((uo) => (
                          <div key={uo.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{uo.user.name || uo.user.email}</p>
                              <p className="text-sm text-muted-foreground">{uo.user.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await unlinkUserMutation.mutateAsync({
                                    userId: uo.userId,
                                    orgaoId: managingUsersFor,
                                  });
                                  toast.success("Usuário desvinculado com sucesso");
                                  refetchOrgaoUsers();
                                } catch (error: any) {
                                  toast.error(error.message || "Erro ao desvincular usuário");
                                }
                              }}
                            >
                              Remover
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum usuário vinculado</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Adicionar Usuário</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Selecione um usuário para vincular ao órgão
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allUsers
                        ?.filter(
                          (user) =>
                            !orgaoUsers?.some((uo) => uo.userId === user.id) &&
                            (user.role === "orgao" || user.role === "admin")
                        )
                        .map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{user.name || user.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.email} - {user.role}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await linkUserMutation.mutateAsync({
                                    userId: user.id,
                                    orgaoId: managingUsersFor,
                                  });
                                  toast.success("Usuário vinculado com sucesso");
                                  refetchOrgaoUsers();
                                } catch (error: any) {
                                  toast.error(error.message || "Erro ao vincular usuário");
                                }
                              }}
                            >
                              Adicionar
                            </Button>
                          </div>
                        ))}
                      {!allUsers?.some(
                        (user) =>
                          !orgaoUsers?.some((uo) => uo.userId === user.id) &&
                          (user.role === "orgao" || user.role === "admin")
                      ) && (
                        <p className="text-sm text-muted-foreground">Nenhum usuário disponível</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUsersDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

