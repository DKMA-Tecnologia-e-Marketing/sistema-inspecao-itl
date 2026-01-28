import TenantLayout from "@/components/TenantLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Wrench, Edit, Search, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TecnicosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<number | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<"inspetor" | "responsavel">("inspetor");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    tipo: "inspetor" as "inspetor" | "responsavel",
    nomeCompleto: "",
    cpf: "",
    cft: "",
    crea: "",
    tenantId: 0,
    ativo: true,
  });

  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const { data: inspetores, isLoading: loadingInspetores } = trpc.tecnicos.listByTipo.useQuery(
    { tipo: "inspetor" },
    { enabled: !!tenantId }
  );
  const { data: responsaveis, isLoading: loadingResponsaveis } = trpc.tecnicos.listByTipo.useQuery(
    { tipo: "responsavel" },
    { enabled: !!tenantId }
  );

  const isLoading = loadingInspetores || loadingResponsaveis;

  // Filtrar apenas técnicos do tenant atual e aplicar busca
  const filteredInspetores = inspetores?.filter((tecnico) => {
    const matchesTenant = !tenantId || tecnico.tenantId === tenantId;
    const matchesSearch =
      !searchTerm ||
      tecnico.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tecnico.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tecnico.cft?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTenant && matchesSearch;
  }) || [];

  const filteredResponsaveis = responsaveis?.filter((tecnico) => {
    const matchesTenant = !tenantId || tecnico.tenantId === tenantId;
    const matchesSearch =
      !searchTerm ||
      tecnico.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tecnico.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tecnico.crea?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTenant && matchesSearch;
  }) || [];

  const utils = trpc.useUtils();

  const createTecnico = trpc.tecnicos.create.useMutation({
    onSuccess: () => {
      toast.success("Técnico criado com sucesso!");
      setDialogOpen(false);
      setEditingTecnico(null);
      utils.tecnicos.listByTipo.invalidate({ tipo: "inspetor" });
      utils.tecnicos.listByTipo.invalidate({ tipo: "responsavel" });
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar técnico: " + error.message);
    },
  });

  const updateTecnico = trpc.tecnicos.update.useMutation({
    onSuccess: () => {
      toast.success("Técnico atualizado com sucesso!");
      setDialogOpen(false);
      setEditingTecnico(null);
      utils.tecnicos.listByTipo.invalidate({ tipo: "inspetor" });
      utils.tecnicos.listByTipo.invalidate({ tipo: "responsavel" });
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar técnico: " + error.message);
    },
  });

  const deleteTecnico = trpc.tecnicos.delete.useMutation({
    onSuccess: () => {
      toast.success("Técnico excluído com sucesso!");
      utils.tecnicos.listByTipo.invalidate({ tipo: "inspetor" });
      utils.tecnicos.listByTipo.invalidate({ tipo: "responsavel" });
    },
    onError: (error) => {
      toast.error("Erro ao excluir técnico: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      tipo: tipoSelecionado,
      nomeCompleto: "",
      cpf: "",
      cft: "",
      crea: "",
      tenantId: tenantId || 0,
      ativo: true,
    });
  };

  const handleOpenDialog = (tecnico?: (typeof filteredInspetores)[0] | (typeof filteredResponsaveis)[0]) => {
    if (tecnico) {
      setEditingTecnico(tecnico.id);
      setFormData({
        tipo: tecnico.tipo,
        nomeCompleto: tecnico.nomeCompleto || "",
        cpf: tecnico.cpf || "",
        cft: tecnico.cft || "",
        crea: tecnico.crea || "",
        tenantId: tecnico.tenantId || tenantId || 0,
        ativo: tecnico.ativo ?? true,
      });
      setTipoSelecionado(tecnico.tipo);
    } else {
      resetForm();
      setFormData((prev) => ({ ...prev, tipo: "inspetor", tenantId: tenantId || 0 }));
      setTipoSelecionado("inspetor");
      setEditingTecnico(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.nomeCompleto.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }
    if (!formData.cpf.trim()) {
      toast.error("CPF é obrigatório");
      return;
    }
    if (formData.tipo === "inspetor" && !formData.cft.trim()) {
      toast.error("CFT é obrigatório para Inspetor Técnico");
      return;
    }
    if (formData.tipo === "responsavel" && !formData.crea.trim()) {
      toast.error("CREA é obrigatório para Responsável Técnico");
      return;
    }

    if (!editingTecnico) {
      createTecnico.mutate({
        tipo: formData.tipo,
        nomeCompleto: formData.nomeCompleto,
        cpf: formData.cpf,
        cft: formData.tipo === "inspetor" ? formData.cft : undefined,
        crea: formData.tipo === "responsavel" ? formData.crea : undefined,
        tenantId: tenantId || undefined,
        ativo: formData.ativo,
      });
    } else {
      updateTecnico.mutate({
        id: editingTecnico,
        tipo: formData.tipo,
        nomeCompleto: formData.nomeCompleto,
        cpf: formData.cpf,
        cft: formData.tipo === "inspetor" ? formData.cft : undefined,
        crea: formData.tipo === "responsavel" ? formData.crea : undefined,
        tenantId: tenantId || undefined,
        ativo: formData.ativo,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este técnico?")) {
      deleteTecnico.mutate({ id });
    }
  };

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Técnicos</h2>
            <p className="text-muted-foreground">Gerencie Inspetores Técnicos e Responsáveis Técnicos</p>
          </div>
          <Button onClick={() => handleOpenDialog(undefined)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Técnico
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Técnicos</CardTitle>
                <CardDescription>
                  Total: {filteredInspetores?.length || 0} Inspetores, {filteredResponsaveis?.length || 0} Responsáveis
                </CardDescription>
              </div>
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <Tabs defaultValue="inspetor" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inspetor">Inspetores Técnicos ({filteredInspetores?.length || 0})</TabsTrigger>
                  <TabsTrigger value="responsavel">Responsáveis Técnicos ({filteredResponsaveis?.length || 0})</TabsTrigger>
                </TabsList>
                <TabsContent value="inspetor" className="mt-4">
                  {filteredInspetores && filteredInspetores.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome Completo</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>CFT</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInspetores.map((tecnico) => (
                          <TableRow key={tecnico.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                {tecnico.nomeCompleto || "Sem nome"}
                              </div>
                            </TableCell>
                            <TableCell>{tecnico.cpf || "-"}</TableCell>
                            <TableCell>{tecnico.cft || "-"}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  tecnico.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {tecnico.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(tecnico)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(tecnico.id)}
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
                      <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum inspetor técnico encontrado</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="responsavel" className="mt-4">
                  {filteredResponsaveis && filteredResponsaveis.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome Completo</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>CREA</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResponsaveis.map((tecnico) => (
                          <TableRow key={tecnico.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                {tecnico.nomeCompleto || "Sem nome"}
                              </div>
                            </TableCell>
                            <TableCell>{tecnico.cpf || "-"}</TableCell>
                            <TableCell>{tecnico.crea || "-"}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  tecnico.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {tecnico.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(tecnico)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(tecnico.id)}
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
                      <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum responsável técnico encontrado</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTecnico
                      ? `Editar ${formData.tipo === "inspetor" ? "Inspetor" : "Responsável"} Técnico`
                      : "Adicionar Técnico"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTecnico
                      ? "Atualize as informações do técnico"
                      : "Selecione o tipo de técnico e preencha os dados. Campos obrigatórios: Nome Completo, CPF e CFT (para Inspetor) ou CREA (para Responsável)."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Técnico *</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) => {
                          setFormData({
                            ...formData,
                            tipo: value as "inspetor" | "responsavel",
                            cft: value === "inspetor" ? formData.cft : "",
                            crea: value === "responsavel" ? formData.crea : "",
                          });
                          setTipoSelecionado(value as "inspetor" | "responsavel");
                        }}
                        disabled={!!editingTecnico}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de técnico" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inspetor">Inspetor Técnico</SelectItem>
                          <SelectItem value="responsavel">Responsável Técnico</SelectItem>
                        </SelectContent>
                      </Select>
                      {!editingTecnico && (
                        <p className="text-xs text-muted-foreground">
                          Selecione o tipo de técnico que deseja cadastrar
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                      <Input
                        id="nomeCompleto"
                        value={formData.nomeCompleto}
                        onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                        placeholder="Nome completo do técnico"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                    {formData.tipo === "inspetor" ? (
                      <div className="space-y-2">
                        <Label htmlFor="cft">CFT *</Label>
                        <Input
                          id="cft"
                          value={formData.cft}
                          onChange={(e) => setFormData({ ...formData, cft: e.target.value })}
                          placeholder="Número do CFT"
                          required
                        />
                        <p className="text-xs text-muted-foreground">CFT é obrigatório para Inspetor Técnico</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="crea">CREA *</Label>
                        <Input
                          id="crea"
                          value={formData.crea}
                          onChange={(e) => setFormData({ ...formData, crea: e.target.value })}
                          placeholder="Número do CREA"
                          required
                        />
                        <p className="text-xs text-muted-foreground">CREA é obrigatório para Responsável Técnico</p>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="ativo"
                        checked={formData.ativo}
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="ativo" className="text-sm font-normal cursor-pointer">
                        Técnico ativo
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createTecnico.isPending || updateTecnico.isPending}>
                      {editingTecnico
                        ? updateTecnico.isPending
                          ? "Salvando..."
                          : "Salvar"
                        : createTecnico.isPending
                          ? "Criando..."
                          : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </TenantLayout>
  );
}

