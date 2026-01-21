import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Building2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type FormState = {
  nome: string;
  categoria: string;
  descricao: string;
  orgao: string;
  precoBase: string;
  variacaoMaxima: string;
  ativo: boolean;
};

const defaultForm: FormState = {
  nome: "",
  categoria: "",
  descricao: "",
  orgao: "",
  precoBase: "0",
  variacaoMaxima: "0",
  ativo: true,
};

const formatCurrency = (value: number) => `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;

// Componente de Importação
function ImportDialogContent({
  file,
  onFileChange,
  fieldMapping,
  onFieldMappingChange,
  excelHeaders,
  onExcelHeadersChange,
  onSuccess,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  fieldMapping: {
    nome: string;
    categoria: string;
    descricao: string;
    orgao: string;
    precoBase: string;
    variacaoMaxima: string;
    ativo: string;
  };
  onFieldMappingChange: (mapping: typeof fieldMapping) => void;
  excelHeaders: string[];
  onExcelHeadersChange: (headers: string[]) => void;
  onSuccess: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: Array<{ row: number; error: string }>;
    total: number;
  } | null>(null);

  const importMutation = trpc.inspectionTypes.importBulk.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setIsProcessing(false);
      if (result.errors.length === 0) {
        toast.success(`Importação concluída! ${result.success} tipos importados com sucesso.`);
        onSuccess();
      } else {
        toast.warning(`Importação parcial: ${result.success} sucessos, ${result.errors.length} erros.`);
      }
    },
    onError: (error) => {
      toast.error("Erro ao importar: " + error.message);
      setIsProcessing(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    onFileChange(selectedFile);

    // Ler headers do Excel
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
          onExcelHeadersChange(headers || []);

          // Tentar mapeamento automático
          const autoMapping: typeof fieldMapping = {
            nome: "",
            categoria: "",
            descricao: "",
            orgao: "",
            precoBase: "",
            variacaoMaxima: "",
            ativo: "",
          };

          headers.forEach((header) => {
            const headerLower = header?.toLowerCase().trim() || "";
            if (headerLower.includes("nome") || headerLower.includes("tipo") || headerLower.includes("serviço")) {
              if (!autoMapping.nome) autoMapping.nome = header;
            }
            if (headerLower.includes("categoria") || headerLower.includes("categ")) {
              if (!autoMapping.categoria) autoMapping.categoria = header;
            }
            if (headerLower.includes("descrição") || headerLower.includes("descricao") || headerLower.includes("desc")) {
              if (!autoMapping.descricao) autoMapping.descricao = header;
            }
            if (headerLower.includes("órgão") || headerLower.includes("orgao") || headerLower.includes("orgão")) {
              if (!autoMapping.orgao) autoMapping.orgao = header;
            }
            if (headerLower.includes("preço") || headerLower.includes("preco") || headerLower.includes("valor") || headerLower.includes("price")) {
              if (!autoMapping.precoBase) autoMapping.precoBase = header;
            }
            if (headerLower.includes("variação") || headerLower.includes("variacao") || headerLower.includes("varia")) {
              if (!autoMapping.variacaoMaxima) autoMapping.variacaoMaxima = header;
            }
            if (headerLower.includes("ativo") || headerLower.includes("status") || headerLower.includes("ativo")) {
              if (!autoMapping.ativo) autoMapping.ativo = header;
            }
          });

          onFieldMappingChange(autoMapping);
        } catch (error) {
          console.error("Erro ao ler headers:", error);
          toast.error("Erro ao ler arquivo Excel");
        }
      };
      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo Excel");
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    if (!fieldMapping.nome) {
      toast.error("O campo 'Nome' é obrigatório no mapeamento");
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        importMutation.mutate({
          fileData: base64,
          fileName: file.name,
          fieldMapping,
          skipFirstRow: true,
        });
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error("Erro ao processar arquivo: " + error.message);
      setIsProcessing(false);
    }
  };

  const fieldLabels: Record<keyof typeof fieldMapping, { label: string; required?: boolean; description?: string }> = {
    nome: { label: "Nome", required: true, description: "Nome do tipo de inspeção" },
    categoria: { label: "Categoria", description: "Categoria do serviço" },
    descricao: { label: "Descrição", description: "Descrição detalhada" },
    orgao: { label: "Órgão", description: "Órgão responsável (ex: INMETRO, DETRAN)" },
    precoBase: { label: "Preço Base", description: "Valor base em reais" },
    variacaoMaxima: { label: "Variação Máxima", description: "Variação permitida em reais" },
    ativo: { label: "Ativo", description: "Status ativo/inativo" },
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="excel-file">Arquivo Excel (.xlsx)</Label>
        <Input
          id="excel-file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />
        {file && (
          <p className="text-sm text-muted-foreground">
            Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {excelHeaders.length > 0 && (
        <div className="space-y-4">
          <div>
            <Label>Mapeamento de Campos</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione qual coluna do Excel corresponde a cada campo do sistema
            </p>
          </div>
          <div className="grid gap-4">
            {Object.entries(fieldLabels).map(([key, info]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`mapping-${key}`}>
                  {info.label} {info.required && <span className="text-red-500">*</span>}
                </Label>
                {info.description && (
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                )}
                <Select
                  value={
                    (() => {
                      const currentValue = fieldMapping[key as keyof typeof fieldMapping];
                      if (!currentValue || currentValue === "") return "__unmapped__";
                      // Verificar se o valor ainda existe nos headers
                      if (excelHeaders.includes(currentValue)) return currentValue;
                      return "__unmapped__";
                    })()
                  }
                  onValueChange={(value) =>
                    onFieldMappingChange({ ...fieldMapping, [key]: value === "__unmapped__" ? "" : value })
                  }
                  disabled={isProcessing}
                >
                  <SelectTrigger id={`mapping-${key}`}>
                    <SelectValue placeholder="Selecione a coluna do Excel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unmapped__">-- Não mapear --</SelectItem>
                    {excelHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {importResult && (
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-semibold">Resultado da Importação</h4>
          <p className="text-sm">
            Total: {importResult.total} | Sucessos: <span className="text-green-600">{importResult.success}</span> | Erros:{" "}
            <span className="text-red-600">{importResult.errors.length}</span>
          </p>
          {importResult.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Erros encontrados:</p>
              <ul className="text-xs space-y-1">
                {importResult.errors.map((error, idx) => (
                  <li key={idx} className="text-red-600">
                    Linha {error.row}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onFileChange(null)} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button onClick={handleImport} disabled={isProcessing || !file || !fieldMapping.nome}>
          {isProcessing ? "Importando..." : "Importar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function InspectionTypes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tenantsDialogOpen, setTenantsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [managingTenantsFor, setManagingTenantsFor] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fieldMapping, setFieldMapping] = useState({
    nome: "",
    categoria: "",
    descricao: "",
    orgao: "",
    precoBase: "",
    variacaoMaxima: "",
    ativo: "",
  });
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);

  const utils = trpc.useUtils();
  const { data: inspectionTypes, isLoading } = trpc.inspectionTypes.list.useQuery({ includeInactive: true });
  const { data: tenants } = trpc.tenants.list.useQuery();
  
  const { data: linkedTenants, refetch: refetchLinkedTenants } = trpc.inspectionTypes.getTenants.useQuery(
    { id: managingTenantsFor || 0 },
    { enabled: !!managingTenantsFor }
  );

  const linkTenantMutation = trpc.inspectionTypes.linkTenant.useMutation({
    onSuccess: () => {
      toast.success("ITL vinculada com sucesso!");
      refetchLinkedTenants();
    },
    onError: (error) => toast.error("Erro ao vincular ITL: " + error.message),
  });

  const unlinkTenantMutation = trpc.inspectionTypes.unlinkTenant.useMutation({
    onSuccess: () => {
      toast.success("ITL desvinculada com sucesso!");
      refetchLinkedTenants();
    },
    onError: (error) => toast.error("Erro ao desvincular ITL: " + error.message),
  });

  const createType = trpc.inspectionTypes.create.useMutation({
    onSuccess: () => {
      toast.success("Tipo de inspeção criado com sucesso!");
      utils.inspectionTypes.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error("Erro ao criar tipo: " + error.message),
  });

  const updateType = trpc.inspectionTypes.update.useMutation({
    onSuccess: () => {
      toast.success("Tipo de inspeção atualizado!");
      utils.inspectionTypes.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error("Erro ao atualizar tipo: " + error.message),
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleEdit = (typeId: number) => {
    const type = inspectionTypes?.find((t) => t.id === typeId);
    if (!type) return;

    setEditingId(typeId);
    setForm({
      nome: type.nome,
      categoria: type.categoria || "",
      descricao: type.descricao || "",
      orgao: type.orgao || "",
      precoBase: (type.precoBase / 100).toFixed(2),
      variacaoMaxima: (type.variacaoMaxima / 100).toFixed(2),
      ativo: type.ativo,
    });
    setDialogOpen(true);
  };

  const handleManageTenants = (typeId: number) => {
    setManagingTenantsFor(typeId);
    setTenantsDialogOpen(true);
  };

  const handleCloseTenantsDialog = () => {
    setTenantsDialogOpen(false);
    setManagingTenantsFor(null);
  };

  const toggleTenantLink = (tenantId: number, isLinked: boolean) => {
    if (!managingTenantsFor) return;

    if (isLinked) {
      unlinkTenantMutation.mutate({
        inspectionTypeId: managingTenantsFor,
        tenantId,
      });
    } else {
      linkTenantMutation.mutate({
        inspectionTypeId: managingTenantsFor,
        tenantId,
      });
    }
  };

  const handleSelectAll = () => {
    if (!managingTenantsFor || !tenants) return;
    
    // Vincular todos os tenants que ainda não estão vinculados
    const unlinkedTenants = tenants.filter(
      (tenant) => !linkedTenants?.some((lt) => lt.tenantId === tenant.id)
    );
    
    unlinkedTenants.forEach((tenant) => {
      linkTenantMutation.mutate({
        inspectionTypeId: managingTenantsFor,
        tenantId: tenant.id,
      });
    });
  };

  const handleDeselectAll = () => {
    if (!managingTenantsFor || !linkedTenants) return;
    
    // Desvincular todos os tenants vinculados
    linkedTenants.forEach((linkedTenant) => {
      unlinkTenantMutation.mutate({
        inspectionTypeId: managingTenantsFor,
        tenantId: linkedTenant.tenantId,
      });
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria.trim() || undefined,
      descricao: form.descricao.trim() || undefined,
      orgao: form.orgao.trim() || undefined,
      precoBase: Math.round(parseFloat(form.precoBase.replace(",", ".")) * 100) || 0,
      variacaoMaxima: Math.round(parseFloat(form.variacaoMaxima.replace(",", ".")) * 100) || 0,
      ativo: form.ativo,
    };

    if (!payload.nome) {
      toast.error("Informe um nome para o tipo de inspeção");
      return;
    }

    if (payload.precoBase < 0 || payload.variacaoMaxima < 0) {
      toast.error("Preços e variações devem ser valores positivos");
      return;
    }

    if (editingId) {
      updateType.mutate({
        id: editingId,
        ...payload,
      });
    } else {
      createType.mutate(payload);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tipos de Inspeção</h2>
            <p className="text-muted-foreground">
              Configure os tipos de inspeção disponíveis, valores base e variações permitidas
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar em Massa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar Tipos de Inspeção</DialogTitle>
                  <DialogDescription>
                    Faça upload de um arquivo Excel (.xlsx) e mapeie os campos para importar em massa
                  </DialogDescription>
                </DialogHeader>
                <ImportDialogContent
                  file={importFile}
                  onFileChange={setImportFile}
                  fieldMapping={fieldMapping}
                  onFieldMappingChange={setFieldMapping}
                  excelHeaders={excelHeaders}
                  onExcelHeadersChange={setExcelHeaders}
                  onSuccess={() => {
                    setImportDialogOpen(false);
                    utils.inspectionTypes.list.invalidate();
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? handleCloseDialog() : setDialogOpen(true))}>
              <DialogTrigger asChild>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Tipo de Inspeção" : "Novo Tipo de Inspeção"}</DialogTitle>
                  <DialogDescription>
                    Defina as informações do tipo e a faixa de preço permitida para as ITLs.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={form.nome}
                      onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex.: GNV - Inclusão"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      value={form.categoria}
                      onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
                      placeholder="Segurança Veicular, GNV..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={form.descricao}
                      onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Detalhes adicionais sobre o tipo de inspeção"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgao">Órgão</Label>
                    <Input
                      id="orgao"
                      value={form.orgao}
                      onChange={(e) => setForm((prev) => ({ ...prev, orgao: e.target.value }))}
                      placeholder="Ex.: INMETRO, DETRAN..."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="precoBase">Preço Base (R$)</Label>
                      <Input
                        id="precoBase"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.precoBase}
                        onChange={(e) => setForm((prev) => ({ ...prev, precoBase: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variacaoMaxima">Variação Máxima (R$)</Label>
                      <Input
                        id="variacaoMaxima"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.variacaoMaxima}
                        onChange={(e) => setForm((prev) => ({ ...prev, variacaoMaxima: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="text-base">Ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Tipos inativos ficam ocultos para as ITLs.
                      </p>
                    </div>
                    <Switch checked={form.ativo} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ativo: checked }))} />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createType.isPending || updateType.isPending}>
                    {editingId ? "Salvar alterações" : "Criar tipo"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tipos cadastrados</CardTitle>
            <CardDescription>Visualize e ajuste os valores base e variações permitidas.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : inspectionTypes && inspectionTypes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead>Preço Base</TableHead>
                      <TableHead>Variação Permitida</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ITLs Vinculadas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspectionTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{type.nome}</span>
                            {type.descricao && <span className="text-sm text-muted-foreground">{type.descricao}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{type.categoria || "-"}</TableCell>
                        <TableCell>{type.orgao || "-"}</TableCell>
                        <TableCell>{formatCurrency(type.precoBase)}</TableCell>
                        <TableCell>± {formatCurrency(type.variacaoMaxima)}</TableCell>
                        <TableCell>
                          {type.ativo ? (
                            <Badge variant="default">Ativo</Badge>
                          ) : (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageTenants(type.id)}
                          >
                            <Building2 className="mr-2 h-4 w-4" />
                            Gerenciar ITLs
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(type.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">Nenhum tipo de inspeção cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>

        {/* Dialog para gerenciar ITLs vinculadas */}
        <Dialog open={tenantsDialogOpen} onOpenChange={(open) => (!open ? handleCloseTenantsDialog() : setTenantsDialogOpen(true))}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerenciar ITLs para este Tipo de Inspeção</DialogTitle>
              <DialogDescription>
                Selecione as ITLs que podem oferecer este tipo de inspeção. A variação de preço será respeitada.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <span className="text-sm text-muted-foreground">
                {linkedTenants?.length || 0} de {tenants?.length || 0} ITLs selecionadas
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={linkTenantMutation.isPending || unlinkTenantMutation.isPending || !tenants || tenants.length === 0}
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={linkTenantMutation.isPending || unlinkTenantMutation.isPending || !linkedTenants || linkedTenants.length === 0}
                >
                  Desselecionar Todos
                </Button>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
              {tenants?.map((tenant) => {
                const isLinked = linkedTenants?.some((lt) => lt.tenantId === tenant.id) ?? false;
                return (
                  <div
                    key={tenant.id}
                    className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent"
                  >
                    <Checkbox
                      id={`tenant-${tenant.id}`}
                      checked={isLinked}
                      onCheckedChange={() => toggleTenantLink(tenant.id, isLinked)}
                      disabled={linkTenantMutation.isPending || unlinkTenantMutation.isPending}
                    />
                    <label
                      htmlFor={`tenant-${tenant.id}`}
                      className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {tenant.nome}
                      {tenant.cnpj && <span className="ml-2 text-xs text-muted-foreground">({tenant.cnpj})</span>}
                    </label>
                  </div>
                );
              })}
              {(!tenants || tenants.length === 0) && (
                <p className="py-8 text-center text-muted-foreground">Nenhuma ITL cadastrada.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseTenantsDialog}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

