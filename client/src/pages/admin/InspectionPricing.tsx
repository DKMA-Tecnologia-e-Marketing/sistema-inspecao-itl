import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Building2, RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PricingRow = {
  type: {
    id: number;
    nome: string;
    categoria?: string | null;
    descricao?: string | null;
    precoBase: number;
    variacaoMaxima: number;
  };
  pricing?: {
    id: number;
    tenantId: number;
    inspectionTypeId: number;
    preco: number;
    observacoes?: string | null;
  } | null;
  faixa: {
    minimo: number;
    maximo: number;
  };
  precoAtual: number;
};

const formatCurrency = (value: number) => `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;

export default function InspectionPricing() {
  const [selectedTenant, setSelectedTenant] = useState<number | "">("");
  const [editingValues, setEditingValues] = useState<Record<number, { preco: string; observacoes: string }>>({});

  const utils = trpc.useUtils();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const pricingQuery = trpc.inspectionTypePricing.listByTenant.useQuery(
    { tenantId: selectedTenant ? Number(selectedTenant) : undefined },
    { enabled: !!selectedTenant }
  );

  const setPriceMutation = trpc.inspectionTypePricing.setPrice.useMutation({
    onSuccess: () => {
      toast.success("Preço atualizado com sucesso!");
      pricingQuery.refetch();
    },
    onError: (error) => toast.error("Erro ao atualizar preço: " + error.message),
  });

  const tenantOptions = tenants ?? [];
  const pricingData: PricingRow[] = pricingQuery.data ?? [];

  const handleChangeValue = (typeId: number, field: "preco" | "observacoes", value: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [typeId]: {
        preco:
          field === "preco"
            ? value
            : prev[typeId]?.preco ?? ((pricingData.find((row) => row.type.id === typeId)?.precoAtual || 0) / 100).toFixed(2),
        observacoes: field === "observacoes" ? value : prev[typeId]?.observacoes ?? "",
      },
    }));
  };

  const handleResetValue = (typeId: number) => {
    setEditingValues((prev) => {
      const updated = { ...prev };
      delete updated[typeId];
      return updated;
    });
  };

  const handleSave = (row: PricingRow) => {
    if (!selectedTenant) {
      toast.error("Selecione um estabelecimento.");
      return;
    }

    const edited = editingValues[row.type.id];
    const valueToSave = edited?.preco ?? (row.precoAtual / 100).toFixed(2);
    const numericValue = Math.round(parseFloat(valueToSave.replace(",", ".")) * 100);

    if (Number.isNaN(numericValue)) {
      toast.error("Informe um valor válido.");
      return;
    }

    if (numericValue < row.faixa.minimo || numericValue > row.faixa.maximo) {
      toast.error(
        `Valor fora da faixa permitida (${formatCurrency(row.faixa.minimo)} - ${formatCurrency(row.faixa.maximo)}).`
      );
      return;
    }

    setPriceMutation.mutate({
      tenantId: Number(selectedTenant),
      inspectionTypeId: row.type.id,
      preco: numericValue,
      observacoes: editingValues[row.type.id]?.observacoes,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Precificação de Inspeções</h2>
            <p className="text-muted-foreground">
              Ajuste os valores praticados por cada ITL respeitando as faixas definidas pelo administrador.
            </p>
          </div>
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
            <Button variant="outline" size="icon" onClick={() => pricingQuery.refetch()} disabled={!selectedTenant || pricingQuery.isFetching}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tabela de preços por tipo de inspeção</CardTitle>
            <CardDescription>
              Informe o valor desejado dentro da faixa permitida. Lembre-se: o valor base é definido pela plataforma e as ITLs
              podem variar dentro do limite estipulado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTenant ? (
              <p className="py-12 text-center text-muted-foreground">Selecione uma ITL para visualizar os preços configurados.</p>
            ) : pricingQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : pricingData.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                Nenhum tipo de inspeção configurado. Cadastre tipos na seção correspondente.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de inspeção</TableHead>
                      <TableHead>Faixa permitida</TableHead>
                      <TableHead>Valor atual</TableHead>
                      <TableHead>Novo valor</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingData.map((row) => {
                      const edited = editingValues[row.type.id];
                      const displayedValue = edited?.preco ?? (row.precoAtual / 100).toFixed(2);
                      const displayedObservacoes = edited?.observacoes ?? row.pricing?.observacoes ?? "";
                      return (
                        <TableRow key={row.type.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{row.type.nome}</span>
                              {row.type.descricao && <span className="text-sm text-muted-foreground">{row.type.descricao}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span>Mínimo: {formatCurrency(row.faixa.minimo)}</span>
                              <span>Máximo: {formatCurrency(row.faixa.maximo)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(row.precoAtual)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Label className="sr-only" htmlFor={`preco-${row.type.id}`}>
                                Novo valor
                              </Label>
                              <Input
                                id={`preco-${row.type.id}`}
                                type="number"
                                step="0.01"
                                min={(row.faixa.minimo / 100).toFixed(2)}
                                max={(row.faixa.maximo / 100).toFixed(2)}
                                value={displayedValue}
                                onChange={(e) => handleChangeValue(row.type.id, "preco", e.target.value)}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={displayedObservacoes}
                              onChange={(e) => handleChangeValue(row.type.id, "observacoes", e.target.value)}
                              placeholder="Comentários internos"
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetValue(row.type.id)}
                              disabled={!editingValues[row.type.id]}
                            >
                              Resetar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(row)}
                              disabled={setPriceMutation.isPending && setPriceMutation.variables?.inspectionTypeId === row.type.id}
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Salvar
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
      </div>
    </AdminLayout>
  );
}




