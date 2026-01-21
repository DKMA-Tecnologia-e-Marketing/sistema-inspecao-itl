import TenantLayout from "@/components/TenantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TenantSettings() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: tenant, refetch } = trpc.tenants.getById.useQuery(
    { id: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  const [editData, setEditData] = useState({
    nome: tenant?.nome || "",
    telefone: tenant?.telefone || "",
    email: tenant?.email || "",
    endereco: tenant?.endereco || "",
    cidade: tenant?.cidade || "",
    estado: tenant?.estado || "",
    cep: tenant?.cep || "",
  });

  const updateTenant = trpc.tenants.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const handleSave = () => {
    if (!user?.tenantId) return;
    updateTenant.mutate({
      id: user.tenantId,
      ...editData,
    });
  };

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
            <p className="text-muted-foreground">Gerencie as configurações do seu estabelecimento</p>
          </div>
          <Button onClick={handleSave} disabled={updateTenant.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Estabelecimento</CardTitle>
            <CardDescription>Atualize as informações básicas do estabelecimento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={editData.nome}
                  onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                  placeholder="Nome do estabelecimento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={tenant?.cnpj || ""}
                  disabled
                  placeholder="CNPJ (não editável)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={editData.telefone}
                  onChange={(e) => setEditData({ ...editData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={editData.endereco}
                  onChange={(e) => setEditData({ ...editData, endereco: e.target.value })}
                  placeholder="Rua, número, complemento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={editData.cidade}
                  onChange={(e) => setEditData({ ...editData, cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={editData.estado}
                  onChange={(e) => setEditData({ ...editData, estado: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={editData.cep}
                  onChange={(e) => setEditData({ ...editData, cep: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TenantLayout>
  );
}

