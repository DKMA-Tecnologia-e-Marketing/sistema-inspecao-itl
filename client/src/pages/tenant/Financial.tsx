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
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, DollarSign, FileText, Receipt, ChevronRight, ArrowLeft, Pencil, Trash2, Power, ExternalLink, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRoute, useLocation } from "wouter";

const formatCurrency = (value: number) => `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;

export default function Financial() {
  const [match, params] = useRoute<{ companyId?: string }>("/tenant/financial/:companyId");
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
  const [faturarDialogOpen, setFaturarDialogOpen] = useState(false);

  // Se há companyId na URL, usar ele
  useEffect(() => {
    if (match && params?.companyId) {
      const companyId = parseInt(params.companyId);
      if (!isNaN(companyId)) {
        setSelectedCompanyId(companyId);
      }
    } else {
      setSelectedCompanyId(null);
    }
  }, [match, params?.companyId]);

  const [companyForm, setCompanyForm] = useState({
    nome: "",
    cnpj: "",
    razaoSocial: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  // Queries
  const { data: companies, refetch: refetchCompanies } = trpc.companies.listByTenant.useQuery(
    { tenantId: user?.tenantId || 0, includeInactive: true },
    { enabled: !!user?.tenantId }
  );

  const { data: uninvoicedByCompany, refetch: refetchUninvoiced } = trpc.invoices.getUninvoicedByCompany.useQuery(
    { tenantId: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  const { data: invoices, refetch: refetchInvoices } = trpc.invoices.listByTenant.useQuery(
    { tenantId: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  // Buscar dados da empresa quando há companyId na URL
  const { data: selectedCompany } = trpc.companies.getById.useQuery(
    { id: selectedCompanyId || 0 },
    { enabled: !!selectedCompanyId && !!user?.tenantId }
  );

  // Mutations
  const createCompany = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("Empresa cadastrada com sucesso!");
      setCompanyDialogOpen(false);
      setEditingCompanyId(null);
      setCompanyForm({
        nome: "",
        cnpj: "",
        razaoSocial: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
      });
      refetchCompanies();
    },
    onError: (error) => toast.error("Erro ao cadastrar empresa: " + error.message),
  });

  const updateCompany = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso!");
      setCompanyDialogOpen(false);
      setEditingCompanyId(null);
      setCompanyForm({
        nome: "",
        cnpj: "",
        razaoSocial: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
      });
      refetchCompanies();
    },
    onError: (error) => toast.error("Erro ao atualizar empresa: " + error.message),
  });

  const toggleCompanyStatus = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Status da empresa atualizado com sucesso!");
      refetchCompanies();
    },
    onError: (error) => toast.error("Erro ao atualizar status: " + error.message),
  });

  const generateBoleto = trpc.invoices.generateBoleto.useMutation({
    onSuccess: (invoice) => {
      toast.success("Boleto gerado com sucesso!");
      setFaturarDialogOpen(false);
      setSelectedCompanyId(null);
      setSelectedAppointments([]);
      refetchUninvoiced();
      if (invoice.boletoUrl) {
        // Abrir boleto em nova aba
        window.open(invoice.boletoUrl, "_blank");
      }
    },
    onError: (error) => toast.error("Erro ao gerar boleto: " + error.message),
  });

  const handleEditCompany = (companyId: number) => {
    const company = companies?.find((c) => c.id === companyId);
    if (!company) return;
    
    setEditingCompanyId(companyId);
    setCompanyForm({
      nome: company.nome || "",
      cnpj: company.cnpj || "",
      razaoSocial: company.razaoSocial || "",
      email: company.email || "",
      telefone: company.telefone || "",
      endereco: company.endereco || "",
      cidade: company.cidade || "",
      estado: company.estado || "",
      cep: company.cep || "",
    });
    setCompanyDialogOpen(true);
  };

  const handleToggleCompanyActive = (companyId: number, currentStatus: boolean) => {
    toggleCompanyStatus.mutate({
      id: companyId,
      ativo: !currentStatus,
    });
  };

  const handleDeleteCompany = () => {
    if (!companyToDelete) return;
    handleToggleCompanyActive(companyToDelete, true);
    setDeleteConfirmOpen(false);
    setCompanyToDelete(null);
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) {
      toast.error("Erro ao identificar o estabelecimento.");
      return;
    }
    if (!companyForm.nome) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    if (editingCompanyId) {
      // Editar empresa existente
      updateCompany.mutate({
        id: editingCompanyId,
        ...companyForm,
      });
    } else {
      // Criar nova empresa
    createCompany.mutate({
      tenantId: user.tenantId,
      ...companyForm,
    });
    }
  };

  const handleFaturar = () => {
    if (!selectedCompanyId) {
      toast.error("Selecione uma empresa.");
      return;
    }
    if (selectedAppointments.length === 0) {
      toast.error("Selecione pelo menos uma inspeção.");
      return;
    }

    generateBoleto.mutate({
      companyId: selectedCompanyId,
      appointmentIds: selectedAppointments,
    });
  };

  const handleSelectAll = (companyId: number) => {
    const companyData = uninvoicedByCompany?.find((g) => g.companyId === companyId);
    if (!companyData || !companyData.appointments || companyData.appointments.length === 0) return;

    const allIds = companyData.appointments.map((ap) => ap.id);
    if (selectedAppointments.length === allIds.length && allIds.every((id) => selectedAppointments.includes(id))) {
      // Desmarcar todas
      setSelectedAppointments([]);
    } else {
      // Marcar todas
      setSelectedAppointments(allIds);
    }
  };

  const handleToggleAppointment = (appointmentId: number) => {
    if (selectedAppointments.includes(appointmentId)) {
      setSelectedAppointments(selectedAppointments.filter((id) => id !== appointmentId));
    } else {
      setSelectedAppointments([...selectedAppointments, appointmentId]);
    }
  };

  const handleViewCompany = (companyId: number) => {
    setLocation(`/tenant/financial/${companyId}`);
  };

  const handleBackToList = () => {
    setLocation("/tenant/financial");
    setSelectedAppointments([]);
  };

  // Calcular total das inspeções selecionadas
  const selectedTotal = selectedAppointments.reduce((sum, appointmentId) => {
    const companyData = uninvoicedByCompany?.find((g) => g.appointments.some((ap) => ap.id === appointmentId));
    if (!companyData) return sum;
    const appointment = companyData.appointments.find((ap) => ap.id === appointmentId);
    return sum + (appointment?.preco || 0);
  }, 0);

  const selectedCompanyData = uninvoicedByCompany?.find((g) => g.companyId === selectedCompanyId);

  // Se há companyId na URL, mostrar tela de detalhes
  if (match && params?.companyId && selectedCompanyId && selectedCompany) {
    return (
      <TenantLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {selectedCompany.nome || "Empresa"}
                </h2>
                <p className="text-muted-foreground">
                  {selectedCompanyData?.count || 0} inspeção(ões) em aberto • Total: {formatCurrency(selectedCompanyData?.total || 0)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedCompanyData?.appointments && selectedCompanyData.appointments.length > 0) {
                    setSelectedAppointments(selectedCompanyData.appointments.map((ap) => ap.id));
                  }
                  setFaturarDialogOpen(true);
                }}
                disabled={!selectedCompanyData || !selectedCompanyData.appointments || selectedCompanyData.appointments.length === 0}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Faturar Todas
              </Button>
              <Button
                onClick={() => {
                  setFaturarDialogOpen(true);
                }}
                disabled={!selectedCompanyData || !selectedCompanyData.appointments || selectedAppointments.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                Faturar Selecionadas ({selectedAppointments.length})
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {selectedCompanyData && selectedCompanyData.appointments && selectedCompanyData.appointments.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            selectedCompanyData.appointments.length > 0 &&
                            selectedCompanyData.appointments.every((ap) => selectedAppointments.includes(ap.id))
                          }
                          onCheckedChange={() => handleSelectAll(selectedCompanyId)}
                        />
                        <Label className="cursor-pointer">
                          Selecionar todas ({selectedCompanyData.appointments.length})
                        </Label>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  selectedCompanyData.appointments.length > 0 &&
                                  selectedCompanyData.appointments.every((ap) => selectedAppointments.includes(ap.id))
                                }
                                onCheckedChange={() => handleSelectAll(selectedCompanyId)}
                              />
                            </TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Veículo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCompanyData.appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedAppointments.includes(appointment.id)}
                              onCheckedChange={() => handleToggleAppointment(appointment.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">#{appointment.id}</TableCell>
                          <TableCell>
                            {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {appointment.customer?.nome || "-"}
                            {appointment.customer?.cpf && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({appointment.customer.cpf})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {appointment.vehicle?.placa || "-"}
                            {appointment.vehicle && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {appointment.vehicle.marca} {appointment.vehicle.modelo}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(appointment.preco || 0)}
                          </TableCell>
                        </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {selectedAppointments.length > 0 && (
                      <div className="rounded-lg border p-4 bg-muted/40">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {selectedAppointments.length} inspeção(ões) selecionada(s)
                          </span>
                          <span className="text-lg font-bold">{formatCurrency(selectedTotal)}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>Nenhuma inspeção em aberto para esta empresa.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dialog para Faturar */}
          <Dialog open={faturarDialogOpen} onOpenChange={setFaturarDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Faturar Inspeções</DialogTitle>
                <DialogDescription>
                  Selecione as inspeções que serão faturadas via boleto para{" "}
                  {selectedCompany?.nome}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!selectedCompanyData || !selectedCompanyData.appointments || selectedCompanyData.appointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma inspeção disponível para esta empresa.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            selectedCompanyData.appointments.length > 0 &&
                            selectedCompanyData.appointments.every((ap) => selectedAppointments.includes(ap.id))
                          }
                          onCheckedChange={() => handleSelectAll(selectedCompanyId)}
                        />
                        <Label className="cursor-pointer">
                          Selecionar todas ({selectedCompanyData.appointments.length})
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAppointments(selectedCompanyData.appointments.map((ap) => ap.id))}
                      >
                        Selecionar Todas
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                      {selectedCompanyData.appointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent"
                        >
                          <Checkbox
                            id={`appointment-${appointment.id}`}
                            checked={selectedAppointments.includes(appointment.id)}
                            onCheckedChange={() => handleToggleAppointment(appointment.id)}
                          />
                          <label
                            htmlFor={`appointment-${appointment.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold">Inspeção #{appointment.id}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy HH:mm", {
                                    locale: ptBR,
                                  })}
                                  {appointment.vehicle?.placa && ` • ${appointment.vehicle.placa}`}
                                  {appointment.customer?.nome && ` • ${appointment.customer.nome}`}
                                </div>
                              </div>
                              <span className="text-sm font-medium ml-4">
                                {formatCurrency(appointment.preco || 0)}
                              </span>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedAppointments.length > 0 && (
                      <div className="rounded-lg border p-4 bg-muted/40">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {selectedAppointments.length} inspeção(ões) selecionada(s)
                          </span>
                          <span className="text-lg font-bold">{formatCurrency(selectedTotal)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Um boleto será gerado na Iugu com o valor total acima
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFaturarDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleFaturar}
                  disabled={selectedAppointments.length === 0 || generateBoleto.isPending}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  {generateBoleto.isPending ? "Gerando Boleto..." : "Gerar Boleto"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TenantLayout>
    );
  }

  // Tela principal com lista de empresas
  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
            <p className="text-muted-foreground">Gerencie empresas e fature inspeções via boleto</p>
          </div>
          <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateCompany}>
                <DialogHeader>
                  <DialogTitle>Cadastrar Empresa</DialogTitle>
                  <DialogDescription>Cadastre uma nova empresa para faturamento</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Fantasia *</Label>
                    <Input
                      id="nome"
                      value={companyForm.nome}
                      onChange={(e) => setCompanyForm({ ...companyForm, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="razaoSocial">Razão Social</Label>
                    <Input
                      id="razaoSocial"
                      value={companyForm.razaoSocial}
                      onChange={(e) => setCompanyForm({ ...companyForm, razaoSocial: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={companyForm.cnpj}
                      onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={companyForm.telefone}
                        onChange={(e) => setCompanyForm({ ...companyForm, telefone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={companyForm.endereco}
                      onChange={(e) => setCompanyForm({ ...companyForm, endereco: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={companyForm.cidade}
                        onChange={(e) => setCompanyForm({ ...companyForm, cidade: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={companyForm.estado}
                        onChange={(e) => setCompanyForm({ ...companyForm, estado: e.target.value })}
                        maxLength={2}
                        placeholder="SP"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={companyForm.cep}
                        onChange={(e) => setCompanyForm({ ...companyForm, cep: e.target.value })}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCompanyDialogOpen(false);
                      setEditingCompanyId(null);
                      setCompanyForm({
                        nome: "",
                        cnpj: "",
                        razaoSocial: "",
                        email: "",
                        telefone: "",
                        endereco: "",
                        cidade: "",
                        estado: "",
                        cep: "",
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending}>
                    {createCompany.isPending || updateCompany.isPending
                      ? "Salvando..."
                      : editingCompanyId
                      ? "Salvar Alterações"
                      : "Cadastrar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog de confirmação para desativar */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Desativar Empresa</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja desativar esta empresa? Ela não aparecerá mais na lista, mas os dados serão preservados.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeleteCompany}>
                  Desativar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grid de Empresas com Resumo */}
        {!companies || companies.length === 0 ? (
        <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Nenhuma empresa cadastrada. Clique em "Nova Empresa" para cadastrar.
              </p>
          </CardContent>
        </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => {
              // Buscar dados de inspeções não faturadas para esta empresa
              const uninvoicedData = uninvoicedByCompany?.find((g) => g.companyId === company.id);
              const count = uninvoicedData?.count || 0;
              const total = uninvoicedData?.total || 0;
              
              return (
                <Card
                  key={company.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewCompany(company.id!)}
                >
          <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <Building2 className="h-5 w-5 text-primary" />
                            {company.nome || "Empresa sem nome"}
                          {!company.ativo && (
                            <Badge variant="secondary" className="ml-2">Inativa</Badge>
                          )}
                          </CardTitle>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{count} inspeção(ões) em aberto</span>
                          </div>
                          </CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between pt-4 border-t mb-4">
                      <span className="text-sm text-muted-foreground">Total em aberto:</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCompany(company.id!);
                        }}
                      >
                        <ChevronRight className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCompany(company.id!);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (company.ativo) {
                            setCompanyToDelete(company.id!);
                            setDeleteConfirmOpen(true);
                          } else {
                            handleToggleCompanyActive(company.id!, false);
                          }
                        }}
                        title={company.ativo ? "Desativar" : "Ativar"}
                      >
                        {company.ativo ? (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        ) : (
                          <Power className="h-4 w-4 text-green-600" />
                        )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
              );
            })}
              </div>
            )}

        {/* Seção de Faturas Geradas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Faturas Geradas
              </h2>
              <p className="text-muted-foreground">Visualize todas as faturas geradas no sistema</p>
            </div>
          </div>

          {!invoices || invoices.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Nenhuma fatura gerada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Número</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Valor Total</TableHead>
                              <TableHead>Status</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                    {invoices.map((invoice) => {
                      const company = companies?.find((c) => c.id === invoice.companyId);
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case "pendente":
                            return <Badge variant="outline">Pendente</Badge>;
                          case "pago":
                            return <Badge variant="default" className="bg-green-600">Pago</Badge>;
                          case "cancelado":
                            return <Badge variant="destructive">Cancelado</Badge>;
                          default:
                            return <Badge variant="secondary">{status}</Badge>;
                        }
                      };

                      const getFormaPagamentoBadge = (forma: string | null) => {
                        if (!forma) return <Badge variant="secondary">-</Badge>;
                        switch (forma) {
                          case "pix":
                            return <Badge variant="default" className="bg-blue-600">PIX</Badge>;
                          case "boleto":
                            return <Badge variant="default" className="bg-orange-600">Boleto</Badge>;
                          default:
                            return <Badge variant="secondary">{forma}</Badge>;
                        }
                      };

                      return (
                              <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.numero}</TableCell>
                          <TableCell>{company?.nome || "N/A"}</TableCell>
                          <TableCell>{formatCurrency(invoice.valorTotal || 0)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status || "pendente")}</TableCell>
                          <TableCell>{getFormaPagamentoBadge(invoice.formaPagamento)}</TableCell>
                          <TableCell>
                            {invoice.dataVencimento
                              ? format(new Date(invoice.dataVencimento), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                                <TableCell>
                            {invoice.dataPagamento
                              ? format(new Date(invoice.dataPagamento), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                                </TableCell>
                                <TableCell>
                            <div className="flex gap-2">
                              {invoice.boletoUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(invoice.boletoUrl!, "_blank")}
                                  title="Ver boleto"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              {invoice.qrCode && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Mostrar QR Code em um modal ou nova janela
                                    const qrCodeWindow = window.open("", "_blank");
                                    if (qrCodeWindow) {
                                      qrCodeWindow.document.write(`
                                        <html>
                                          <head><title>QR Code PIX - ${invoice.numero}</title></head>
                                          <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                                            <img src="${invoice.qrCode}" alt="QR Code PIX" style="max-width: 100%; height: auto;" />
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                  title="Ver QR Code PIX"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                                </TableCell>
                              </TableRow>
                      );
                    })}
                          </TableBody>
                        </Table>
                    </CardContent>
                  </Card>
          )}
              </div>

        {/* Dialog para Faturar */}
        <Dialog open={faturarDialogOpen} onOpenChange={setFaturarDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Faturar Inspeções</DialogTitle>
              <DialogDescription>
                Selecione as inspeções que serão faturadas via boleto para{" "}
                {companies?.find((c) => c.id === selectedCompanyId)?.nome}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedCompanyId && selectedCompanyData && (
                <>
                  {selectedCompanyData.appointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                      Nenhuma inspeção disponível para esta empresa.
                </p>
              ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <Checkbox
                            checked={
                              selectedCompanyData.appointments.length > 0 &&
                              selectedCompanyData.appointments.every((ap) => selectedAppointments.includes(ap.id))
                            }
                            onCheckedChange={() => handleSelectAll(selectedCompanyId)}
                          />
                          <Label className="cursor-pointer">
                            Selecionar todas ({selectedCompanyData.appointments.length})
                          </Label>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAppointments(selectedCompanyData.appointments.map((ap) => ap.id))}
                        >
                          Selecionar Todas
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                        {selectedCompanyData.appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                            className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent"
                    >
                      <Checkbox
                        id={`appointment-${appointment.id}`}
                        checked={selectedAppointments.includes(appointment.id)}
                              onCheckedChange={() => handleToggleAppointment(appointment.id)}
                      />
                      <label
                        htmlFor={`appointment-${appointment.id}`}
                              className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold">Inspeção #{appointment.id}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy HH:mm", {
                                      locale: ptBR,
                                    })}
                                    {appointment.vehicle?.placa && ` • ${appointment.vehicle.placa}`}
                                    {appointment.customer?.nome && ` • ${appointment.customer.nome}`}
                                  </div>
                                </div>
                                <span className="text-sm font-medium ml-4">
                                  {formatCurrency(appointment.preco || 0)}
                            </span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              {selectedAppointments.length > 0 && (
                <div className="rounded-lg border p-4 bg-muted/40">
                  <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {selectedAppointments.length} inspeção(ões) selecionada(s)
                    </span>
                            <span className="text-lg font-bold">{formatCurrency(selectedTotal)}</span>
              </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Um boleto será gerado na Iugu com o valor total acima
                  </p>
                </div>
              )}
                    </>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFaturarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleFaturar}
                disabled={selectedAppointments.length === 0 || generateBoleto.isPending}
              >
                <Receipt className="mr-2 h-4 w-4" />
                {generateBoleto.isPending ? "Gerando Boleto..." : "Gerar Boleto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
