import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type LineForm = {
  tenantId: number;
  nome: string;
  tipo: "leve" | "mista" | "pesado" | "motocicleta" | "outra";
  descricao: string;
  quantidade: number;
  ativo: boolean;
};

type CapabilityForm = {
  inspectionLineId: number;
  inspectionTypeId: number;
  capacidade: number;
  observacoes: string;
};

const lineTypes = [
  { value: "leve", label: "Linha de inspeção leve" },
  { value: "mista", label: "Linha de inspeção mista" },
  { value: "pesado", label: "Linha de inspeção pesado" },
  { value: "motocicleta", label: "Linha de inspeção motocicleta" },
  { value: "outra", label: "Outra" },
] as const;

const defaultLineForm: LineForm = {
  tenantId: 0,
  nome: "",
  tipo: "leve",
  descricao: "",
  quantidade: 1,
  ativo: true,
};

const defaultCapabilityForm: CapabilityForm = {
  inspectionLineId: 0,
  inspectionTypeId: 0,
  capacidade: 0,
  observacoes: "",
};

export default function InspectionLines() {
  const [selectedTenant, setSelectedTenant] = useState<number | "">("");
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [capDialogOpen, setCapDialogOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [lineForm, setLineForm] = useState<LineForm>(defaultLineForm);
  const [capForm, setCapForm] = useState<CapabilityForm>(defaultCapabilityForm);

  const utils = trpc.useUtils();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: inspectionTypes } = trpc.inspectionTypes.list.useQuery();

  const {
    data: lines,
    isLoading,
    refetch: refetchLines,
  } = trpc.inspectionLines.listByTenant.useQuery(
    { tenantId: selectedTenant ? Number(selectedTenant) : undefined, withCapabilities: true },
    { enabled: !!selectedTenant }
  );

  const createLine = trpc.inspectionLines.create.useMutation({
    onSuccess: () => {
      toast.success("Linha de inspeção criada!");
      handleCloseLineDialog();
      refetchLines();
    },
    onError: (error) => toast.error("Erro ao criar linha: " + error.message),
  });

  const updateLine = trpc.inspectionLines.update.useMutation({
    onSuccess: () => {
      toast.success("Linha de inspeção atualizada!");
      handleCloseLineDialog();
      refetchLines();
    },
    onError: (error) => toast.error("Erro ao atualizar linha: " + error.message),
  });

  const createCapability = trpc.inspectionLineCapabilities.create.useMutation({
    onSuccess: () => {
      toast.success("Capacidade adicionada à linha!");
      handleCloseCapDialog();
      refetchLines();
    },
    onError: (error) => toast.error("Erro ao adicionar capacidade: " + error.message),
  });

  const updateCapability = trpc.inspectionLineCapabilities.update.useMutation({
    onSuccess: () => {
      toast.success("Capacidade atualizada!");
      handleCloseCapDialog();
      refetchLines();
    },
    onError: (error) => toast.error("Erro ao atualizar capacidade: " + error.message),
  });

  const tenantOptions = useMemo(() => tenants ?? [], [tenants]);

  const handleOpenLineDialog = (line?: (typeof lines)[number]) => {
    if (line) {
      setEditingLineId(line.id);
      setLineForm({
        tenantId: line.tenantId,
        nome: line.nome || "",
        tipo: line.tipo,
        descricao: line.descricao || "",
        quantidade: line.quantidade,
        ativo: line.ativo,
      });
    } else {
      if (!selectedTenant) {
        toast.error("Selecione um estabelecimento antes de criar uma linha.");
        return;
      }
      setEditingLineId(null);
      setLineForm({
        ...defaultLineForm,
        tenantId: Number(selectedTenant),
      });
    }
    setLineDialogOpen(true);
  };

  const handleCloseLineDialog = () => {
    setLineDialogOpen(false);
    setEditingLineId(null);
    setLineForm(defaultLineForm);
  };

  const handleLineSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lineForm.tenantId) {
      toast.error("Selecione um estabelecimento válido.");
      return;
    }
    if (lineForm.quantidade < 1) {
      toast.error("Quantidade de linhas deve ser pelo menos 1.");
      return;
    }

    const payload = {
      tenantId: lineForm.tenantId,
      nome: lineForm.nome.trim() || undefined,
      tipo: lineForm.tipo,
      descricao: lineForm.descricao.trim() || undefined,
      quantidade: lineForm.quantidade,
      ativo: lineForm.ativo,
    };

    if (editingLineId) {
      updateLine.mutate({
        id: editingLineId,
        ...payload,
      });
    } else {
      createLine.mutate(payload);
    }
  };

  const handleOpenCapDialog = (lineId: number, capability?: { id: number; inspectionTypeId: number; capacidade: number; observacoes: string }) => {
    if (!inspectionTypes || inspectionTypes.length === 0) {
      toast.error("Cadastre pelo menos um tipo de inspeção antes de configurar as capacidades.");
      return;
    }
    if (capability) {
      setCapForm({
        inspectionLineId: lineId,
        inspectionTypeId: capability.inspectionTypeId,
        capacidade: capability.capacidade,
        observacoes: capability.observacoes || "",
      });
      setEditingLineId(capability.id);
    } else {
      setCapForm({
        ...defaultCapabilityForm,
        inspectionLineId: lineId,
        inspectionTypeId: inspectionTypes[0].id,
      });
      setEditingLineId(null);
    }
    setCapDialogOpen(true);
  };

  const handleCloseCapDialog = () => {
    setCapDialogOpen(false);
    setEditingLineId(null);
    setCapForm(defaultCapabilityForm);
  };

  const handleCapSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!capForm.inspectionLineId || !capForm.inspectionTypeId) {
      toast.error("Selecione a linha e o tipo de inspeção.");
      return;
    }

    const payload = {
      inspectionLineId: capForm.inspectionLineId,
      inspectionTypeId: capForm.inspectionTypeId,
      capacidade: Number(capForm.capacidade) || 0,
      observacoes: capForm.observacoes.trim() || undefined,
      ativo: true,
    };

    if (editingLineId) {
      updateCapability.mutate({
        id: editingLineId,
        capacidade: payload.capacidade,
        observacoes: payload.observacoes,
      });
    } else {
      createCapability.mutate(payload);
    }
  };

  const resolveTypeName = (typeId: number) => inspectionTypes?.find((type) => type.id === typeId)?.nome || `Tipo #${typeId}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Linhas de Inspeção</h2>
            <p className="text-muted-foreground">
              Cadastre e organize as linhas de inspeção de cada ITL e defina as capacidades por tipo de inspeção.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedTenant?.toString()} onValueChange={(value) => setSelectedTenant(value ? Number(value) : "")}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Selecionar ITL" />
                </SelectTrigger>
                <SelectContent>
                  {tenantOptions.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                      {tenant.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenLineDialog()} disabled={!selectedTenant}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Linha
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Linhas do estabelecimento</CardTitle>
            <CardDescription>
              Selecione uma ITL para visualizar e gerenciar as linhas configuradas. É possível definir diferentes capacidades
              para cada tipo de inspeção.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTenant ? (
              <p className="py-12 text-center text-muted-foreground">Selecione um estabelecimento para visualizar as linhas.</p>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : lines && lines.length > 0 ? (
              <div className="space-y-4">
                {lines.map((line) => (
                  <Card key={line.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{line.nome || `Linha ${line.id}`}</CardTitle>
                        <CardDescription>
                          {line.descricao || "Sem descrição"} • Tipo:{" "}
                          <span className="font-medium">
                            {lineTypes.find((t) => t.value === line.tipo)?.label ?? line.tipo}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={line.ativo ? "default" : "outline"}>{line.ativo ? "Ativa" : "Inativa"}</Badge>
                        <Button variant="outline" size="sm" onClick={() => handleOpenLineDialog(line)}>
                          <Wrench className="mr-2 h-4 w-4" />
                          Editar linha
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-sm text-muted-foreground">
                          Quantidade de linhas disponíveis: <span className="font-semibold text-foreground">{line.quantidade}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Capacidades por tipo de inspeção</h4>
                        <Button size="sm" variant="outline" onClick={() => handleOpenCapDialog(line.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar capacidade
                        </Button>
                      </div>

                      {line.capabilities && line.capabilities.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo de inspeção</TableHead>
                                <TableHead>Capacidade</TableHead>
                                <TableHead>Observações</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {line.capabilities.map((capability) => (
                                <TableRow key={capability.id}>
                                  <TableCell>{resolveTypeName(capability.inspectionTypeId)}</TableCell>
                                  <TableCell>{capability.capacidade}</TableCell>
                                  <TableCell>{capability.observacoes || "-"}</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenCapDialog(line.id, capability)}>
                                      Editar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma capacidade configurada para esta linha. Adicione acima para informar quais inspeções podem ser realizadas.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">Nenhuma linha configurada para este estabelecimento ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de linha */}
      <Dialog open={lineDialogOpen} onOpenChange={(open) => (!open ? handleCloseLineDialog() : setLineDialogOpen(true))}>
        <DialogContent>
          <form onSubmit={handleLineSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingLineId ? "Editar Linha de Inspeção" : "Nova Linha de Inspeção"}</DialogTitle>
              <DialogDescription>
                Informe os detalhes da linha de inspeção e defina sua disponibilidade.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Estabelecimento *</Label>
                <Select
                  value={lineForm.tenantId ? lineForm.tenantId.toString() : ""}
                  onValueChange={(value) => setLineForm((prev) => ({ ...prev, tenantId: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantOptions.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id.toString()}>
                        {tenant.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeLinha">Nome</Label>
                <Input
                  id="nomeLinha"
                  value={lineForm.nome}
                  onChange={(e) => setLineForm((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex.: Linha Leve 02"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={lineForm.tipo}
                  onValueChange={(value: LineForm["tipo"]) => setLineForm((prev) => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lineTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricaoLinha">Descrição</Label>
                <Input
                  id="descricaoLinha"
                  value={lineForm.descricao}
                  onChange={(e) => setLineForm((prev) => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Informações adicionais sobre a linha"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantidadeLinha">Quantidade</Label>
                  <Input
                    id="quantidadeLinha"
                    type="number"
                    min={1}
                    value={lineForm.quantidade}
                    onChange={(e) => setLineForm((prev) => ({ ...prev, quantidade: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-base">Ativa</Label>
                    <p className="text-sm text-muted-foreground">
                      Linhas inativas não ficam disponíveis para agendamentos.
                    </p>
                  </div>
                  <Switch checked={lineForm.ativo} onCheckedChange={(checked) => setLineForm((prev) => ({ ...prev, ativo: checked }))} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCloseLineDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createLine.isPending || updateLine.isPending}>
                {editingLineId ? "Salvar alterações" : "Criar linha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de capacidade */}
      <Dialog open={capDialogOpen} onOpenChange={(open) => (!open ? handleCloseCapDialog() : setCapDialogOpen(true))}>
        <DialogContent>
          <form onSubmit={handleCapSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Configurar capacidade</DialogTitle>
              <DialogDescription>
                Defina quais tipos de inspeção podem ser realizados na linha e suas respectivas capacidades.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Tipo de inspeção *</Label>
                <Select
                  value={capForm.inspectionTypeId ? capForm.inspectionTypeId.toString() : ""}
                  onValueChange={(value) => setCapForm((prev) => ({ ...prev, inspectionTypeId: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacidadeLinha">Capacidade</Label>
                <Input
                  id="capacidadeLinha"
                  type="number"
                  min={0}
                  value={capForm.capacidade}
                  onChange={(e) => setCapForm((prev) => ({ ...prev, capacidade: Number(e.target.value) }))}
                  placeholder="Quantidade de inspeções suportadas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoesCapacidade">Observações</Label>
                <Input
                  id="observacoesCapacidade"
                  value={capForm.observacoes}
                  onChange={(e) => setCapForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Horários específicos, restrições, etc."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseCapDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCapability.isPending || updateCapability.isPending}>
                {editingLineId ? "Salvar alterações" : "Adicionar capacidade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}




