import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Plus, ClipboardList, Edit, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { INSPECTION_SCOPE_TYPES } from "@shared/constants";

export default function Scopes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "inmetro" as "inmetro" | "prefeitura_sp" | "prefeitura_guarulhos" | "mercosul" | "tecnica",
    descricao: "",
    requerAutorizacaoDetran: false,
    ativo: true,
  });

  const { data: scopes, isLoading, refetch } = trpc.inspectionScopes.list.useQuery();

  const createScope = trpc.inspectionScopes.create.useMutation({
    onSuccess: () => {
      toast.success("Escopo criado com sucesso!");
      setDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar escopo: " + error.message);
    },
  });

  const updateScope = trpc.inspectionScopes.update.useMutation({
    onSuccess: () => {
      toast.success("Escopo atualizado com sucesso!");
      setDialogOpen(false);
      setEditingScope(null);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar escopo: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "inmetro",
      descricao: "",
      requerAutorizacaoDetran: false,
      ativo: true,
    });
  };

  const handleOpenDialog = (scope?: typeof scopes[0]) => {
    if (scope) {
      setEditingScope(scope.id);
      setFormData({
        nome: scope.nome,
        tipo: scope.tipo,
        descricao: scope.descricao || "",
        requerAutorizacaoDetran: scope.requerAutorizacaoDetran || false,
        ativo: scope.ativo,
      });
    } else {
      resetForm();
      setEditingScope(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingScope) {
      updateScope.mutate({
        id: editingScope,
        ...formData,
      });
    } else {
      createScope.mutate({
        nome: formData.nome,
        tipo: formData.tipo,
        descricao: formData.descricao,
        requerAutorizacaoDetran: formData.requerAutorizacaoDetran,
      });
    }
  };

  const filteredScopes = scopes?.filter((scope) => {
    const matchesSearch = scope.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scope.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || scope.tipo === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Escopos de Vistoria</h2>
            <p className="text-muted-foreground">Gerencie os escopos de vistoria disponíveis</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Escopo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingScope ? "Editar Escopo" : "Cadastrar Novo Escopo"}</DialogTitle>
                <DialogDescription>
                  {editingScope ? "Atualize os dados do escopo" : "Preencha os dados do novo escopo"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      placeholder="Ex: Escopo Inmetro Básico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({ ...formData, tipo: value as typeof formData.tipo })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INSPECTION_SCOPE_TYPES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva o escopo..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requerAutorizacaoDetran"
                      checked={formData.requerAutorizacaoDetran}
                      onCheckedChange={(checked) => setFormData({ ...formData, requerAutorizacaoDetran: checked as boolean })}
                    />
                    <Label htmlFor="requerAutorizacaoDetran" className="cursor-pointer">
                      Requer autorização Detran
                    </Label>
                  </div>
                  {editingScope && (
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
                  <Button type="submit" disabled={createScope.isPending || updateScope.isPending}>
                    {createScope.isPending || updateScope.isPending ? "Salvando..." : "Salvar"}
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
                <CardTitle>Lista de Escopos</CardTitle>
                <CardDescription>Total de {filteredScopes?.length || 0} escopos cadastrados</CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="w-64">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
                  </div>
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {Object.entries(INSPECTION_SCOPE_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredScopes && filteredScopes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Detran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScopes.map((scope) => (
                    <TableRow key={scope.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          {scope.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {INSPECTION_SCOPE_TYPES[scope.tipo]}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{scope.descricao || "-"}</TableCell>
                      <TableCell>
                        {scope.requerAutorizacaoDetran ? (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700">
                            Sim
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Não</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            scope.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {scope.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(scope)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum escopo encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}










