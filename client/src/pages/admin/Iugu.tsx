import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, CheckCircle, XCircle, Settings, Plus, Edit, TestTube, Building2, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Iugu() {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [createSubaccountDialogOpen, setCreateSubaccountDialogOpen] = useState(false);
  const [editTenantDialogOpen, setEditTenantDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [subaccountForm, setSubaccountForm] = useState({
    name: "",
    commission_percent: 0,
    commission_cents: 0,
    auto_withdraw: false,
  });
  const [tenantIuguAccountId, setTenantIuguAccountId] = useState("");
  const [tenantIuguSubaccountToken, setTenantIuguSubaccountToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [linkSubaccountDialogOpen, setLinkSubaccountDialogOpen] = useState(false);
  const [selectedSubaccountForLink, setSelectedSubaccountForLink] = useState<string>("");
  const [selectedTenantForLink, setSelectedTenantForLink] = useState<number | null>(null);
  const [editTokenDialogOpen, setEditTokenDialogOpen] = useState(false);
  const [selectedSubaccountForToken, setSelectedSubaccountForToken] = useState<string>("");
  const [subaccountToken, setSubaccountToken] = useState("");
  const [globalSplitDialogOpen, setGlobalSplitDialogOpen] = useState(false);
  const [globalSplitPercent, setGlobalSplitPercent] = useState<number>(12);
  const [masterAccountId, setMasterAccountId] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: tenants, isLoading: tenantsLoading, refetch: refetchTenants, error: tenantsError } = trpc.tenants.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: apiStatus, refetch: refetchStatus } = trpc.iugu.checkApiStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: subcontas, isLoading: subcontasLoading, refetch: refetchSubcontas } = trpc.iugu.listSubaccounts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: globalSplitConfig, isLoading: isLoadingSplitConfig, refetch: refetchGlobalSplitConfig, error: splitConfigError } = trpc.iugu.getGlobalSplitConfig.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error) => {
      // Ignorar erros de autenticação - o AdminLayout já trata isso
      if (error.data?.code === "UNAUTHORIZED") {
        return;
      }
      console.error("[Iugu] Erro ao carregar configuração de split global:", error);
    },
  });
  const { data: masterAccountInfo, refetch: refetchMasterAccountInfo } = trpc.iugu.getMasterAccountInfo.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: false, // Não carregar automaticamente
  });
  
  const updateGlobalSplitConfig = trpc.iugu.updateGlobalSplitConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração de split global atualizada com sucesso!");
      setGlobalSplitDialogOpen(false);
      refetchGlobalSplitConfig();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configuração: " + error.message);
    },
  });

  const createSystemConfigTable = trpc.iugu.createSystemConfigTable.useMutation({
    onSuccess: () => {
      toast.success("Tabela systemConfig criada com sucesso!");
      refetchGlobalSplitConfig();
    },
    onError: (error) => {
      toast.error("Erro ao criar tabela: " + error.message);
    },
  });

  const testConnection = trpc.iugu.testConnection.useMutation({
    onSuccess: (data) => {
      toast.success("Conexão com Iugu testada com sucesso!");
      refetchStatus();
    },
    onError: (error) => {
      toast.error("Erro ao testar conexão: " + error.message);
    },
  });

  const createSubaccount = trpc.iugu.createSubaccount.useMutation({
    onSuccess: (data) => {
      toast.success("Subconta criada com sucesso!");
      setCreateSubaccountDialogOpen(false);
      setSubaccountForm({ name: "", commission_percent: 0, commission_cents: 0, auto_withdraw: false });
      refetchStatus();
      refetchSubcontas();
    },
    onError: (error) => {
      toast.error("Erro ao criar subconta: " + error.message);
    },
  });

  const testSubaccountConnection = trpc.iugu.testSubaccountConnection.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Conexão testada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao testar conexão: " + error.message);
    },
  });

  const updateTenantIuguAccount = trpc.tenants.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações Iugu atualizadas com sucesso!");
      setEditTenantDialogOpen(false);
      setLinkSubaccountDialogOpen(false);
      setEditTokenDialogOpen(false);
      setSelectedTenant(null);
      setSelectedTenantForLink(null);
      setSelectedSubaccountForLink("");
      setSelectedSubaccountForToken("");
      setTenantIuguAccountId("");
      setTenantIuguSubaccountToken("");
      setSubaccountToken("");
      setShowToken(false);
      utils.tenants.list.invalidate();
      refetchSubcontas();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const handleEditTenant = (tenant: (typeof tenants)[number]) => {
    setSelectedTenant(tenant.id);
    setTenantIuguAccountId(tenant.iuguAccountId || "");
    setTenantIuguSubaccountToken((tenant as any).iuguSubaccountToken || "");
    setEditTenantDialogOpen(true);
    setShowToken(false);
  };

  // Query para verificar token salvo no banco
  const { data: tokenInfo, refetch: refetchTokenInfo } = trpc.tenants.getTokenInfo.useQuery(
    { tenantId: selectedTenant! },
    { enabled: false } // Não carregar automaticamente
  );

  const handleSaveTenantIuguAccount = () => {
    if (!selectedTenant) return;
    updateTenantIuguAccount.mutate({
      id: selectedTenant,
      iuguAccountId: tenantIuguAccountId || undefined,
      iuguSubaccountToken: tenantIuguSubaccountToken || undefined,
    });
  };

  const handleLinkSubaccountToTenant = () => {
    if (!selectedTenantForLink || !selectedSubaccountForLink) {
      toast.error("Selecione um estabelecimento");
      return;
    }
    updateTenantIuguAccount.mutate({
      id: selectedTenantForLink,
      iuguAccountId: selectedSubaccountForLink,
    });
  };

  const handleCreateSubaccount = () => {
    createSubaccount.mutate({
      name: subaccountForm.name,
      commission_percent: subaccountForm.commission_percent > 0 ? subaccountForm.commission_percent : undefined,
      commission_cents: subaccountForm.commission_cents > 0 ? subaccountForm.commission_cents : undefined,
      auto_withdraw: subaccountForm.auto_withdraw,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integração Iugu</h2>
          <p className="text-muted-foreground">Gerencie a integração com o gateway de pagamento Iugu</p>
        </div>

        {/* Card de Configuração de Split Global */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Split Global
            </CardTitle>
            <CardDescription>
              Configure o percentual de split global para a conta master. Este valor será aplicado automaticamente em todos os pagamentos das ITLs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSplitConfig ? (
              <div className="text-muted-foreground">Carregando configuração...</div>
            ) : splitConfigError && splitConfigError.data?.code !== "UNAUTHORIZED" ? (
              <div className="space-y-2">
                <Alert>
                  <AlertDescription>
                    {splitConfigError.message?.includes("systemConfig") || splitConfigError.message?.includes("Table") 
                      ? "A tabela systemConfig não foi encontrada. Clique no botão abaixo para criá-la."
                      : `Erro ao carregar configuração: ${splitConfigError.message}`}
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={() => createSystemConfigTable.mutate()} 
                  disabled={createSystemConfigTable.isPending}
                >
                  {createSystemConfigTable.isPending ? "Criando tabela..." : "Criar Tabela systemConfig"}
                </Button>
              </div>
            ) : globalSplitConfig ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <p className="text-sm font-medium">Percentual de Split</p>
                    <p className="text-2xl font-bold">{globalSplitConfig.splitPercent}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Conta Master</p>
                    <code className="text-xs bg-background px-2 py-1 rounded block mt-1">{globalSplitConfig.masterAccountId || "Não configurado"}</code>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    setGlobalSplitPercent(globalSplitConfig.splitPercent);
                    setMasterAccountId(globalSplitConfig.masterAccountId);
                    setGlobalSplitDialogOpen(true);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Configuração
                  </Button>
                  <Button variant="outline" onClick={() => refetchMasterAccountInfo()}>
                    <Settings className="h-4 w-4 mr-2" />
                    Ver Token da Conta Master
                  </Button>
                </div>
                {masterAccountInfo && (
                  <Alert>
                    <AlertDescription className="space-y-2">
                      <div>
                        <p className="font-medium">Account ID:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">{masterAccountInfo.accountId}</code>
                      </div>
                      <div>
                        <p className="font-medium">Nome da Conta:</p>
                        <p className="text-sm">{masterAccountInfo.name}</p>
                      </div>
                      <div>
                        <p className="font-medium">Token (preview):</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">{masterAccountInfo.token}</code>
                      </div>
                      <div>
                        <p className="font-medium">Token Completo:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background px-2 py-1 rounded flex-1 break-all">{masterAccountInfo.fullToken}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(masterAccountInfo.fullToken);
                              toast.success("Token copiado!");
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Alert>
                  <AlertDescription>
                    Configure o split global para aplicar automaticamente em todos os pagamentos das ITLs.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    setGlobalSplitPercent(12);
                    setMasterAccountId("");
                    setGlobalSplitDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Configurar Split Global
                  </Button>
                  <Button variant="outline" onClick={() => refetchMasterAccountInfo()}>
                    <Settings className="h-4 w-4 mr-2" />
                    Ver Token da Conta Master
                  </Button>
                </div>
                {masterAccountInfo && (
                  <Alert>
                    <AlertDescription className="space-y-2">
                      <div>
                        <p className="font-medium">Account ID:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">{masterAccountInfo.accountId}</code>
                      </div>
                      <div>
                        <p className="font-medium">Nome da Conta:</p>
                        <p className="text-sm">{masterAccountInfo.name}</p>
                      </div>
                      <div>
                        <p className="font-medium">Token Completo:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background px-2 py-1 rounded flex-1 break-all">{masterAccountInfo.fullToken}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(masterAccountInfo.fullToken);
                              toast.success("Token copiado!");
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status da API */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status da API</CardTitle>
                <CardDescription>Verifique o status da conexão com a Iugu</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchStatus()}>
                  Atualizar
                </Button>
                <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar Conexão
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Testar Conexão com Iugu</DialogTitle>
                      <DialogDescription>
                        Isso irá verificar se o token da API está configurado corretamente.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => testConnection.mutate()} disabled={testConnection.isPending}>
                        {testConnection.isPending ? "Testando..." : "Testar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {apiStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {apiStatus.connected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Conectado</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Ativo
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Desconectado</span>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Inativo
                      </Badge>
                    </>
                  )}
                </div>
                {apiStatus.message && (
                  <Alert>
                    <AlertDescription>{apiStatus.message}</AlertDescription>
                  </Alert>
                )}
                {apiStatus.tokenConfigured && (
                  <div className="text-sm text-muted-foreground">
                    Token configurado: {apiStatus.tokenPreview}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">Carregando status...</div>
            )}
          </CardContent>
        </Card>

        {/* Listar Subcontas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subcontas Cadastradas</CardTitle>
                <CardDescription>Lista de subcontas criadas na Iugu</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchSubcontas()}>
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {subcontasLoading ? (
              <div className="text-muted-foreground">Carregando subcontas...</div>
            ) : subcontas === undefined || subcontas === null ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Erro ao carregar subcontas</p>
                <p className="text-sm mt-2">Verifique se o token da Iugu está configurado corretamente</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetchSubcontas()}>
                  Tentar novamente
                </Button>
              </div>
            ) : subcontas && subcontas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Saque Automático</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcontas.map((subconta) => {
                    const tenantVinculado = tenants?.find((t) => t.iuguAccountId === subconta.account_id);
                    return (
                      <TableRow key={subconta.id || subconta.account_id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{subconta.name || "Sem nome"}</span>
                            {tenantVinculado && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-fit">
                                <Building2 className="h-3 w-3 mr-1" />
                                Vinculado: {tenantVinculado.nome}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {subconta.cnpj ? (
                            <span className="font-mono text-sm">{subconta.cnpj}</span>
                          ) : tenantVinculado?.cnpj ? (
                            <span className="font-mono text-sm">{tenantVinculado.cnpj}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{subconta.account_id}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(subconta.account_id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tenantVinculado && (tenantVinculado as any).iuguSubaccountToken ? (
                              <Badge variant="default" className="text-xs">
                                ✓ Configurado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                {tenantVinculado ? "Sem token" : "Sem tenant"}
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSubaccountForToken(subconta.account_id);
                                setSubaccountToken(tenantVinculado ? ((tenantVinculado as any).iuguSubaccountToken || "") : "");
                                setEditTokenDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const tenant = tenants?.find((t) => t.iuguAccountId === subconta.account_id);
                                const token = tenant ? ((tenant as any).iuguSubaccountToken || null) : null;
                                if (!token) {
                                  toast.error("Configure o token primeiro antes de testar");
                                  return;
                                }
                                try {
                                  const result = await testSubaccountConnection.mutateAsync({
                                    accountId: subconta.account_id,
                                    token: token,
                                  });
                                  toast.success(result.message || "Conexão testada com sucesso!");
                                } catch (error: any) {
                                  toast.error("Erro ao testar conexão: " + error.message);
                                }
                              }}
                              disabled={testSubaccountConnection.isPending}
                            >
                              <TestTube className="h-4 w-4 mr-2" />
                              {testSubaccountConnection.isPending ? "Testando..." : "Testar"}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {subconta.commission_percent ? (
                            <span>{subconta.commission_percent}%</span>
                          ) : subconta.commission_cents ? (
                            <span>R$ {(subconta.commission_cents / 100).toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subconta.auto_withdraw ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              Não
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                copyToClipboard(subconta.account_id);
                                toast.info("Account ID copiado!");
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Abrir dialog para vincular a um tenant
                                setSelectedSubaccountForLink(subconta.account_id);
                                setLinkSubaccountDialogOpen(true);
                              }}
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Vincular
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma subconta encontrada</p>
                <p className="text-sm mt-2">Crie uma subconta para começar a usar split de pagamento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Criar Subconta */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Criar Nova Subconta</CardTitle>
                <CardDescription>Crie subcontas para configurar split de pagamento</CardDescription>
              </div>
              <Dialog open={createSubaccountDialogOpen} onOpenChange={setCreateSubaccountDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Subconta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Subconta na Iugu</DialogTitle>
                    <DialogDescription>
                      Crie uma nova subconta para receber split de pagamento
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome da Subconta</Label>
                      <Input
                        value={subaccountForm.name}
                        onChange={(e) => setSubaccountForm({ ...subaccountForm, name: e.target.value })}
                        placeholder="Ex: ITL Centro - São Paulo"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Comissão Percentual (%)</Label>
                        <Input
                          type="number"
                          value={subaccountForm.commission_percent}
                          onChange={(e) =>
                            setSubaccountForm({ ...subaccountForm, commission_percent: Number(e.target.value) })
                          }
                          placeholder="0"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Comissão Fixa (centavos)</Label>
                        <Input
                          type="number"
                          value={subaccountForm.commission_cents}
                          onChange={(e) =>
                            setSubaccountForm({ ...subaccountForm, commission_cents: Number(e.target.value) })
                          }
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto_withdraw"
                        checked={subaccountForm.auto_withdraw}
                        onChange={(e) =>
                          setSubaccountForm({ ...subaccountForm, auto_withdraw: e.target.checked })
                        }
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="auto_withdraw" className="cursor-pointer">
                        Saque automático
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateSubaccountDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateSubaccount} disabled={!subaccountForm.name || createSubaccount.isPending}>
                      {createSubaccount.isPending ? "Criando..." : "Criar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As subcontas são criadas na Iugu e recebem um ID único (account_id) que deve ser configurado nos
              estabelecimentos para habilitar o split de pagamento.
            </p>
          </CardContent>
        </Card>

        {/* Configurar Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Configurar Estabelecimentos</CardTitle>
            <CardDescription>Configure o iuguAccountId para cada estabelecimento</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <div className="text-muted-foreground">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>iuguAccountId</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants?.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.nome}</TableCell>
                      <TableCell>{tenant.cnpj}</TableCell>
                      <TableCell>
                        {tenant.iuguAccountId ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{tenant.iuguAccountId}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(tenant.iuguAccountId || "")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Não configurado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEditTenant(tenant)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog para editar iuguAccountId do tenant */}
        <Dialog open={editTenantDialogOpen} onOpenChange={setEditTenantDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Iugu</DialogTitle>
              <DialogDescription>
                Configure o ID da subconta e o token da API da subconta Iugu para este estabelecimento.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedTenant) {
                    refetchTokenInfo();
                  } else {
                    toast.error("Selecione um tenant primeiro");
                  }
                }}
                disabled={!selectedTenant}
              >
                Verificar Token no Banco
              </Button>
            </div>
            {tokenInfo && (
              <Alert className="mb-4">
                <AlertDescription className="space-y-2">
                  <div>
                    <p className="font-medium">Token salvo no banco:</p>
                    <code className="text-xs bg-background px-2 py-1 rounded">{tokenInfo.tokenPreview}</code>
                  </div>
                  <div>
                    <p className="font-medium">Token completo (primeiros 12 e últimos 4):</p>
                    <code className="text-xs bg-background px-2 py-1 rounded">{tokenInfo.tokenFirst12}</code>
                  </div>
                  <div>
                    <p className="font-medium">Comprimento:</p>
                    <code className="text-xs bg-background px-2 py-1 rounded">{tokenInfo.tokenLength} caracteres</code>
                  </div>
                  {tokenInfo.iuguSubaccountToken !== "NÃO CONFIGURADO" && (
                    <div>
                      <p className="font-medium">Token completo:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded flex-1 break-all">
                          {showToken ? tokenInfo.iuguSubaccountToken : "••••••••••••••••••••••••••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowToken(!showToken)}
                        >
                          {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (tokenInfo.iuguSubaccountToken !== "NÃO CONFIGURADO") {
                              navigator.clipboard.writeText(tokenInfo.iuguSubaccountToken);
                              toast.success("Token copiado!");
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>iuguAccountId</Label>
                <Input
                  value={tenantIuguAccountId}
                  onChange={(e) => setTenantIuguAccountId(e.target.value)}
                  placeholder="Cole o account_id da subconta criada na Iugu"
                />
                <p className="text-xs text-muted-foreground">
                  Este ID é obtido ao criar uma subconta na Iugu. Deixe vazio para remover a configuração.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Token da Subconta (iuguSubaccountToken)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={tenantIuguSubaccountToken}
                    onChange={(e) => setTenantIuguSubaccountToken(e.target.value)}
                    placeholder="Cole o token da API da subconta (ex: CE59DDB8D5C84D0D95C288DB8781D6BD)"
                    className="flex-1 font-mono text-sm"
                  />
                  {tenantIuguSubaccountToken && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Token da API da subconta obtido no painel da Iugu. Se preenchido, será usado diretamente ao invés de buscar via API.
                  <br />
                  <strong>Importante:</strong> Use o mesmo token que funciona para PIX. Exemplo: CE59DDB8D5C84D0D95C288DB8781D6BD
                </p>
                {tenantIuguSubaccountToken && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <strong>Token configurado:</strong> {tenantIuguSubaccountToken.substring(0, 8)}***{tenantIuguSubaccountToken.substring(tenantIuguSubaccountToken.length - 4)}
                    <br />
                    <strong>Comprimento:</strong> {tenantIuguSubaccountToken.length} caracteres
                    {tenantIuguSubaccountToken.length === 32 && (
                      <span className="text-green-600 ml-2">✓ Tamanho correto</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTenantDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTenantIuguAccount} disabled={updateTenantIuguAccount.isPending}>
                {updateTenantIuguAccount.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para vincular subconta a tenant */}
        <Dialog 
          open={linkSubaccountDialogOpen} 
          onOpenChange={(open) => {
            setLinkSubaccountDialogOpen(open);
            if (open) {
              // Refetch tenants quando o dialog abre
              refetchTenants();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Subconta a Estabelecimento</DialogTitle>
              <DialogDescription>
                Selecione o estabelecimento para vincular a subconta: <code className="text-xs bg-muted px-1 py-0.5 rounded">{selectedSubaccountForLink}</code>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Estabelecimento</Label>
                {tenantsError ? (
                  <div className="space-y-2">
                    <div className="text-sm text-destructive">Erro ao carregar estabelecimentos: {tenantsError.message}</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchTenants()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : tenantsLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando estabelecimentos...</div>
                ) : !tenants || tenants.length === 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Nenhum estabelecimento cadastrado</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchTenants()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedTenantForLink?.toString() || ""}
                      onValueChange={(value) => setSelectedTenantForLink(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um estabelecimento" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id.toString()}>
                            {tenant.nome} {tenant.iuguAccountId && `(já tem: ${tenant.iuguAccountId})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedTenantForLink && tenants?.find((t) => t.id === selectedTenantForLink)?.iuguAccountId && (
                        <span className="text-orange-600">
                          ⚠️ Este estabelecimento já possui uma subconta vinculada. A vinculação será substituída.
                        </span>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkSubaccountDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleLinkSubaccountToTenant}
                disabled={!selectedTenantForLink || updateTenantIuguAccount.isPending}
              >
                {updateTenantIuguAccount.isPending ? "Vinculando..." : "Vincular"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar token da subconta */}
        <Dialog open={editTokenDialogOpen} onOpenChange={setEditTokenDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Token da Subconta</DialogTitle>
              <DialogDescription>
                Configure o token da API da subconta. Este token será usado para gerar pagamentos pela subconta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Token da Subconta (iuguSubaccountToken)</Label>
                <Input
                  type="password"
                  value={subaccountToken}
                  onChange={(e) => setSubaccountToken(e.target.value)}
                  placeholder="Cole o token da API da subconta"
                />
                <p className="text-xs text-muted-foreground">
                  Token da API da subconta obtido no painel da Iugu. Se preenchido, será usado diretamente ao gerar pagamentos.
                </p>
              </div>
              {selectedSubaccountForToken && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <div>
                    <p className="text-xs font-medium mb-1">Subconta:</p>
                    <code className="text-xs">{selectedSubaccountForToken}</code>
                  </div>
                  {(() => {
                    const tenant = tenants?.find((t) => t.iuguAccountId === selectedSubaccountForToken);
                    return tenant ? (
                      <div>
                        <p className="text-xs font-medium mb-1">Tenant vinculado:</p>
                        <p className="text-xs">{tenant.nome}</p>
                      </div>
                    ) : (
                      <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          ⚠️ Nenhum tenant vinculado a esta subconta. Vincule primeiro na seção "Vincular" antes de configurar o token.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
              {subaccountToken && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!selectedSubaccountForToken || !subaccountToken) {
                        toast.error("Preencha o token primeiro");
                        return;
                      }
                      try {
                        const result = await testSubaccountConnection.mutateAsync({
                          accountId: selectedSubaccountForToken,
                          token: subaccountToken,
                        });
                        toast.success(result.message || "Conexão testada com sucesso!");
                      } catch (error: any) {
                        toast.error("Erro ao testar conexão: " + error.message);
                      }
                    }}
                    disabled={testSubaccountConnection.isPending || !subaccountToken || !selectedSubaccountForToken}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testSubaccountConnection.isPending ? "Testando..." : "Testar Conexão"}
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTokenDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!selectedSubaccountForToken) {
                    toast.error("Selecione uma subconta");
                    return;
                  }
                  const tenant = tenants?.find((t) => t.iuguAccountId === selectedSubaccountForToken);
                  if (!tenant) {
                    toast.error("Nenhum tenant vinculado a esta subconta. Vincule primeiro na seção 'Vincular'.");
                    return;
                  }
                  updateTenantIuguAccount.mutate({
                    id: tenant.id,
                    iuguSubaccountToken: subaccountToken || undefined,
                  });
                }}
                disabled={updateTenantIuguAccount.isPending || !selectedSubaccountForToken}
              >
                {updateTenantIuguAccount.isPending ? "Salvando..." : "Salvar Token"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Webhook URL</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                  https://api.inspecionasp.com.br/api/webhooks/iugu
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard("https://api.inspecionasp.com.br/api/webhooks/iugu")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Configure esta URL no painel da Iugu para receber notificações de pagamento.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Eventos do Webhook</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>invoice.created</li>
                <li>invoice.status_changed</li>
                <li>invoice.payment</li>
                <li>invoice.refund</li>
                <li>invoice.canceled</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Dialog para configurar Split Global */}
        <Dialog open={globalSplitDialogOpen} onOpenChange={setGlobalSplitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Split Global</DialogTitle>
              <DialogDescription>
                Configure o percentual de split que será aplicado automaticamente em todos os pagamentos das ITLs para a conta master.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="splitPercent">Percentual de Split (%)</Label>
                <Input
                  id="splitPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={globalSplitPercent}
                  onChange={(e) => setGlobalSplitPercent(parseFloat(e.target.value) || 0)}
                  placeholder="12"
                />
                <p className="text-xs text-muted-foreground">
                  Percentual que será repassado para a conta master (0-100%)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="masterAccountId">Account ID da Conta Master</Label>
                <Input
                  id="masterAccountId"
                  value={masterAccountId}
                  onChange={(e) => setMasterAccountId(e.target.value)}
                  placeholder="AB322336DF564D5D80AD8101356AE0EA"
                />
                <p className="text-xs text-muted-foreground">
                  ID da conta master na IUGU que receberá o split
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGlobalSplitDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (globalSplitPercent < 0 || globalSplitPercent > 100) {
                    toast.error("Percentual deve estar entre 0 e 100");
                    return;
                  }
                  if (!masterAccountId.trim()) {
                    toast.error("Account ID da conta master é obrigatório");
                    return;
                  }
                  updateGlobalSplitConfig.mutate({
                    splitPercent: globalSplitPercent,
                    masterAccountId: masterAccountId.trim(),
                  });
                }}
                disabled={updateGlobalSplitConfig.isPending}
              >
                {updateGlobalSplitConfig.isPending ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

