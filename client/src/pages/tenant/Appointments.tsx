import TenantLayout from "@/components/TenantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Search, Eye, Plus, Car, User, CheckCircle, Building2, CreditCard, DollarSign, FileText, Upload, Trash2 } from "lucide-react";
import { useState } from "react";
import { APPOINTMENT_STATUS } from "@shared/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import PaymentCheckout from "@/components/PaymentCheckout";

export default function TenantAppointments() {
  const { data: user } = trpc.auth.me.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [newVehicleDialogOpen, setNewVehicleDialogOpen] = useState(false);
  const [newInspectionDialogOpen, setNewInspectionDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState<{ paymentId?: number; accountId?: string; masterAccountId?: string; invoiceId?: string; totalCents?: number } | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAppointmentForView, setSelectedAppointmentForView] = useState<number | null>(null);
  const [selectedVehicleData, setSelectedVehicleData] = useState<any>(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);
  const [generateLaudoDialogOpen, setGenerateLaudoDialogOpen] = useState(false);
  const [selectedAppointmentForLaudo, setSelectedAppointmentForLaudo] = useState<number | null>(null);
  
  // Form data for new vehicle
  const [vehicleData, setVehicleData] = useState({
    placa: "",
    renavam: "",
    chassi: "",
    marca: "",
    modelo: "",
    ano: undefined as number | undefined,
    cor: "",
  });
  const [customerData, setCustomerData] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  });

  // Form data for new inspection
  const [selectedInspectionType, setSelectedInspectionType] = useState<number | null>(null);
  const [selectedInspectionLine, setSelectedInspectionLine] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const { data: appointments, isLoading, refetch: refetchAppointments } = trpc.appointments.listByTenant.useQuery(
    { tenantId: user?.tenantId! },
    { enabled: !!user?.tenantId }
  );

  const { data: inspectionTypePricing } = trpc.inspectionTypePricing.listByTenant.useQuery(
    { tenantId: user?.tenantId },
    { enabled: !!user?.tenantId }
  );
  const { data: inspectionLines } = trpc.inspectionLines.listByTenant.useQuery(
    { tenantId: user?.tenantId },
    { enabled: !!user?.tenantId }
  );
  const { data: companies } = trpc.companies.listByTenant.useQuery(
    { tenantId: user?.tenantId || 0 },
    { enabled: !!user?.tenantId }
  );

  const consultarInfosimples = trpc.vehicles.consultarInfosimples.useMutation();
  const createCustomer = trpc.customers.create.useMutation();
  const createVehicle = trpc.vehicles.create.useMutation();
  const createAppointment = trpc.appointments.create.useMutation();
  const createPayment = trpc.payments.createCharge.useMutation();
  const deleteAppointment = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Inspeção deletada com sucesso!");
      refetchAppointments();
    },
    onError: (error) => {
      toast.error("Erro ao deletar inspeção: " + error.message);
    },
  });
  const utils = trpc.useUtils();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { variant: "secondary" as const, label: APPOINTMENT_STATUS.pendente },
      confirmado: { variant: "default" as const, label: APPOINTMENT_STATUS.confirmado },
      realizado: { variant: "outline" as const, label: APPOINTMENT_STATUS.realizado },
      cancelado: { variant: "destructive" as const, label: APPOINTMENT_STATUS.cancelado },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAppointments = (appointments || []).filter((appointment) => {
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      appointment.id.toString().includes(searchTerm) ||
      appointment.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Função para verificar se a inspeção foi paga
  const isAppointmentPaid = (appointment: any): boolean => {
    return appointment.payment?.status === "aprovado";
  };

  // Função para obter o preço da inspeção
  const getAppointmentPrice = (appointmentId: number): number => {
    const appointment = appointments?.find((a) => a.id === appointmentId);
    if (!appointment || !appointment.inspectionTypeId) {
      console.log("[Appointments] Appointment não encontrado ou sem inspectionTypeId:", { appointmentId, appointment });
      return 0;
    }

    // inspectionTypePricing retorna formato: { type, pricing, faixa, precoAtual }
    const pricingData = inspectionTypePricing?.find(
      (p) => p.type.id === appointment.inspectionTypeId
    );
    
    if (!pricingData) {
      console.log("[Appointments] Preço não encontrado para inspectionTypeId:", appointment.inspectionTypeId, "Tenant:", user?.tenantId);
      console.log("[Appointments] Pricing disponível:", inspectionTypePricing?.map(p => ({ id: p.type.id, nome: p.type.nome, preco: p.precoAtual })));
      return 0;
    }

    // Usar precoAtual (que já considera pricing.preco ou type.precoBase)
    const preco = pricingData.precoAtual || pricingData.pricing?.preco || 0;
    console.log("[Appointments] Preço encontrado:", { appointmentId, inspectionTypeId: appointment.inspectionTypeId, preco });
    return preco;
  };

  // Função para abrir dialog de pagamento e criar pagamento automaticamente
  const handleOpenPaymentDialog = async (appointmentId: number) => {
    setSelectedAppointmentForPayment(appointmentId);
    setPaymentDialogOpen(true);
    setPaymentData(null);
    setIsCreatingPayment(true);

    const price = getAppointmentPrice(appointmentId);
    if (price === 0) {
      toast.error("Não foi possível determinar o preço da inspeção");
      setIsCreatingPayment(false);
      setPaymentDialogOpen(false);
      return;
    }

    try {
      // Criar pagamento sem método específico para permitir escolha no checkout
      const result = await createPayment.mutateAsync({
        appointmentId: appointmentId,
        valorTotal: price,
        // Não passar metodoPagamento para criar fatura com método "all" (permite PIX e cartão)
      });

      const masterAccountIdValue = (result as any).masterAccountId || undefined;
      console.log("[Appointments] createCharge result:", {
        paymentId: result.id,
        accountId: result.accountId,
        masterAccountId: masterAccountIdValue ? masterAccountIdValue.substring(0, 8) + "***" : "undefined",
        invoiceId: result.invoiceId || result.iuguPaymentId,
      });
      
      setPaymentData({
        paymentId: result.id,
        accountId: result.accountId || undefined,
        masterAccountId: masterAccountIdValue,
        invoiceId: result.invoiceId || result.iuguPaymentId || undefined,
        totalCents: result.totalCents || result.valorTotal || price,
      });
      
      // Aguardar um pouco para garantir que o payment foi salvo no banco
      setTimeout(() => {
        refetchAppointments();
      }, 500);

      utils.appointments.listByTenant.invalidate();
    } catch (error: any) {
      toast.error("Erro ao criar pagamento: " + error.message);
      setPaymentDialogOpen(false);
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleConsultVehicle = async () => {
    if (!vehicleData.placa || !vehicleData.renavam) {
      toast.error("Preencha a placa e o Renavam");
      return;
    }

    try {
      const dados = await consultarInfosimples.mutateAsync({
        placa: vehicleData.placa,
        renavam: vehicleData.renavam,
      });

      if (dados.dados) {
        setVehicleData({
          ...vehicleData,
          marca: dados.dados.marca || vehicleData.marca,
          modelo: dados.dados.modelo || vehicleData.modelo,
          ano: dados.dados.ano || dados.dados.anoModelo || vehicleData.ano,
          cor: dados.dados.cor || vehicleData.cor,
          chassi: dados.dados.chassi || vehicleData.chassi,
        });
        toast.success("Dados do veículo consultados com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao consultar Infosimples:", error);
      toast.error("Erro ao consultar dados do veículo");
    }
  };

  const handleSubmitNewVehicle = async () => {
    if (!user?.tenantId) {
      toast.error("Erro ao identificar o estabelecimento.");
      return;
    }

    // Validar campos obrigatórios
    if (!vehicleData.placa || !vehicleData.renavam) {
      toast.error("Preencha a placa e o Renavam do veículo");
      return;
    }

    if (!customerData.nome || !customerData.cpf || !customerData.email || !customerData.telefone) {
      toast.error("Preencha todos os dados do cliente");
      return;
    }

    try {
      // Criar cliente
      const customer = await createCustomer.mutateAsync({
        nome: customerData.nome,
        cpf: customerData.cpf,
        email: customerData.email,
        telefone: customerData.telefone,
      });
      if (!customer || !customer.id) {
        throw new Error("Erro ao criar cliente");
      }

      // Criar veículo
      const vehicle = await createVehicle.mutateAsync({
        placa: vehicleData.placa.toUpperCase(),
        renavam: vehicleData.renavam,
        chassi: vehicleData.chassi.toUpperCase() || undefined,
        marca: vehicleData.marca || undefined,
        modelo: vehicleData.modelo || undefined,
        ano: vehicleData.ano || undefined,
        cor: vehicleData.cor || undefined,
        customerId: customer.id,
      });
      if (!vehicle || !vehicle.id) {
        throw new Error("Erro ao criar veículo");
      }

      // Invalidar cache para atualizar listagens
      await utils.vehicles.getByCustomer.invalidate({ customerId: customer.id });
      await utils.customers.list.invalidate();
      await utils.vehicles.list.invalidate();
      
      toast.success("Veículo cadastrado com sucesso!");

      // Limpar formulário
      setVehicleData({
        placa: "",
        renavam: "",
        chassi: "",
        marca: "",
        modelo: "",
        ano: undefined,
        cor: "",
      });
      setCustomerData({
        nome: "",
        cpf: "",
        email: "",
        telefone: "",
      });
      setNewVehicleDialogOpen(false);

      // Abrir modal de inspeção com o veículo selecionado
      setSelectedVehicleId(vehicle.id);
      setNewInspectionDialogOpen(true);
    } catch (error: any) {
      toast.error("Erro ao cadastrar veículo: " + error.message);
    }
  };

  const handleSubmitNewInspection = async () => {
    if (!user?.tenantId) {
      toast.error("Erro ao identificar o estabelecimento.");
      return;
    }

    if (!selectedVehicleId) {
      toast.error("Selecione um veículo");
      return;
    }

    if (!selectedInspectionType) {
      toast.error("Selecione um tipo de inspeção");
      return;
    }

    if (!selectedInspectionLine) {
      toast.error("Selecione uma linha de inspeção");
      return;
    }

    try {
      // Buscar o escopo de inspeção baseado no tipo de inspeção
      // Primeiro, buscar o tipo de inspeção para pegar o scope relacionado
      const inspectionType = inspectionTypePricing?.find((p) => p.type.id === selectedInspectionType);
      if (!inspectionType) {
        throw new Error("Tipo de inspeção não encontrado");
      }

      // Buscar scope - usar o primeiro scope ativo disponível
      // TODO: Implementar lógica mais específica se necessário
      let scopes;
      try {
        scopes = await utils.inspectionScopes.list.fetch();
        console.log("[Appointments] Escopos encontrados:", scopes?.length || 0);
        if (scopes && scopes.length > 0) {
          console.log("[Appointments] Escopos:", scopes.map(s => ({ id: s.id, nome: s.nome, ativo: s.ativo })));
        }
      } catch (error: any) {
        console.error("[Appointments] Erro ao buscar escopos:", error);
        console.error("[Appointments] Erro detalhado:", error?.message, error?.stack);
        throw new Error("Erro ao buscar escopos de inspeção: " + (error?.message || "Erro desconhecido"));
      }
      
      if (!scopes || scopes.length === 0) {
        console.error("[Appointments] Nenhum escopo encontrado no banco de dados");
        throw new Error("Nenhum escopo de inspeção cadastrado no sistema. Por favor, cadastre um escopo no painel administrativo antes de criar inspeções.");
      }
      
      // Tentar encontrar um escopo ativo primeiro, senão usar qualquer um
      const activeScope = scopes.find((s) => s.ativo === true);
      const scope = activeScope || scopes[0];
      
      if (!scope) {
        console.error("[Appointments] Nenhum escopo válido encontrado");
        throw new Error("Nenhum escopo de inspeção disponível");
      }
      
      console.log("[Appointments] Escopo selecionado:", { id: scope.id, nome: scope.nome, ativo: scope.ativo });

      // Criar inspeção com data/hora atual
      const dataHora = new Date();

      // Buscar customerId do veículo
      let vehicle;
      try {
        vehicle = await utils.vehicles.getById.fetch({ id: selectedVehicleId });
      } catch (error) {
        console.error("Erro ao buscar veículo:", error);
        throw new Error("Erro ao buscar dados do veículo");
      }
      
      if (!vehicle) {
        throw new Error("Veículo não encontrado");
      }

      // Criar agendamento
      const appointment = await createAppointment.mutateAsync({
        tenantId: user.tenantId,
        customerId: vehicle.customerId,
        vehicleId: selectedVehicleId,
        inspectionTypeId: selectedInspectionType || undefined,
        inspectionScopeId: scope.id,
        companyId: selectedCompanyId || undefined, // Vincular empresa se selecionada
        dataAgendamento: dataHora,
        observacoes: observacoes || undefined,
      });
      if (!appointment || !appointment.id) {
        throw new Error("Erro ao criar inspeção");
      }

      toast.success("Inspeção criada com sucesso!");
      setNewInspectionDialogOpen(false);

      // Limpar formulário
      setSelectedVehicleId(null);
      setSelectedVehicleData(null);
      setSelectedCustomerData(null);
      setVehicleData({ placa: "", renavam: "", chassi: "", marca: "", modelo: "", ano: undefined, cor: "" });
      setSelectedInspectionType(null);
      setSelectedInspectionLine(null);
      setObservacoes("");
      setSelectedCompanyId(null);

      // Atualizar lista
      refetchAppointments();
    } catch (error: any) {
      toast.error("Erro ao criar inspeção: " + error.message);
    }
  };

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Inspeções</h2>
            <p className="text-muted-foreground">Gerencie as inspeções do seu estabelecimento</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={newVehicleDialogOpen} onOpenChange={setNewVehicleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Car className="mr-2 h-4 w-4" />
                  Cadastrar Veículo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Veículo</DialogTitle>
                  <DialogDescription>Cadastre um novo veículo e cliente</DialogDescription>
                </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Dados do Veículo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Dados do Veículo</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="placa">Placa *</Label>
                      <Input
                        id="placa"
                        placeholder="ABC-1234"
                        value={vehicleData.placa}
                        onChange={(e) => setVehicleData({ ...vehicleData, placa: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="renavam">Renavam *</Label>
                      <Input
                        id="renavam"
                        placeholder="00000000000"
                        value={vehicleData.renavam}
                        onChange={(e) => setVehicleData({ ...vehicleData, renavam: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chassi">Chassi</Label>
                      <Input
                        id="chassi"
                        placeholder="9BWZZZ377VT004251"
                        value={vehicleData.chassi}
                        onChange={(e) => setVehicleData({ ...vehicleData, chassi: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca</Label>
                      <Input
                        id="marca"
                        value={vehicleData.marca}
                        onChange={(e) => setVehicleData({ ...vehicleData, marca: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input
                        id="modelo"
                        value={vehicleData.modelo}
                        onChange={(e) => setVehicleData({ ...vehicleData, modelo: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ano">Ano</Label>
                        <Input
                          id="ano"
                          type="number"
                          value={vehicleData.ano || ""}
                          onChange={(e) =>
                            setVehicleData({ ...vehicleData, ano: e.target.value ? parseInt(e.target.value) : undefined })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cor">Cor</Label>
                        <Input
                          id="cor"
                          value={vehicleData.cor}
                          onChange={(e) => setVehicleData({ ...vehicleData, cor: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={handleConsultVehicle} disabled={consultarInfosimples.isPending}>
                    {consultarInfosimples.isPending ? "Consultando..." : "Consultar Dados do Veículo"}
                  </Button>
                </div>

                {/* Dados do Cliente */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Dados do Cliente</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        value={customerData.nome}
                        onChange={(e) => setCustomerData({ ...customerData, nome: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={customerData.cpf}
                        onChange={(e) => setCustomerData({ ...customerData, cpf: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerData.email}
                        onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input
                        id="telefone"
                        placeholder="(00) 00000-0000"
                        value={customerData.telefone}
                        onChange={(e) => setCustomerData({ ...customerData, telefone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewVehicleDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitNewVehicle}
                  disabled={createCustomer.isPending || createVehicle.isPending}
                >
                  {createVehicle.isPending ? "Cadastrando..." : "Cadastrar Veículo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog 
            open={newInspectionDialogOpen} 
            onOpenChange={(open) => {
              setNewInspectionDialogOpen(open);
              if (!open) {
                // Limpar TODOS os dados quando fechar o modal
                setSelectedVehicleId(null);
                setSelectedVehicleData(null);
                setSelectedCustomerData(null);
                setVehicleData({ placa: "", renavam: "", chassi: "", marca: "", modelo: "", ano: undefined, cor: "" });
                setSelectedInspectionType(null);
                setSelectedInspectionLine(null);
                setObservacoes("");
                setSelectedCompanyId(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Inspeção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Inspeção</DialogTitle>
                <DialogDescription>Crie uma nova inspeção para um veículo cadastrado</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Seleção de Veículo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Veículo</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Placa do Veículo *</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          id="vehicle"
                          placeholder="Digite a placa (ex: ABC1234 ou ABC-1234)"
                          value={vehicleData.placa}
                          onChange={(e) => {
                            let placa = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            // Limitar a 7 caracteres
                            if (placa.length > 7) {
                              placa = placa.slice(0, 7);
                            }
                            setVehicleData({ ...vehicleData, placa });
                            setSelectedVehicleId(null); // Limpar seleção quando digitar
                          }}
                          onBlur={() => {
                            // Buscar quando sair do campo e tiver 7 caracteres
                            if (vehicleData.placa && vehicleData.placa.length === 7) {
                              const placaNormalizada = vehicleData.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
                              console.log("[Appointments] Buscando veículo:", { original: vehicleData.placa, normalized: placaNormalizada });
                              
                              // Usar refetch do query em vez de fetch direto
                              utils.vehicles.getByPlaca.fetch({ placa: placaNormalizada })
                                .then(async (vehicle) => {
                                  console.log("[Appointments] Resultado da busca:", vehicle);
                                  if (vehicle) {
                                    setSelectedVehicleId(vehicle.id);
                                    setSelectedVehicleData(vehicle);
                                    
                                    // Buscar dados do cliente
                                    if (vehicle.customerId) {
                                      try {
                                        const customer = await utils.customers.getById.fetch({ id: vehicle.customerId });
                                        if (customer) {
                                          setSelectedCustomerData(customer);
                                          console.log("[Appointments] Cliente encontrado:", customer);
                                        }
                                      } catch (error) {
                                        console.error("[Appointments] Erro ao buscar cliente:", error);
                                      }
                                    }
                                    
                                    toast.success(`Veículo encontrado: ${vehicle.placa}`);
                                  } else {
                                    setSelectedVehicleId(null);
                                    setSelectedVehicleData(null);
                                    setSelectedCustomerData(null);
                                    toast.error(`Veículo não encontrado: ${placaNormalizada}`);
                                  }
                                })
                                .catch((error) => {
                                  console.error("Erro ao buscar veículo:", error);
                                  toast.error("Erro ao buscar veículo. Tente novamente.");
                                  setSelectedVehicleId(null);
                                });
                            }
                          }}
                          onKeyDown={(e) => {
                            // Buscar ao pressionar Enter
                            if (e.key === "Enter" && vehicleData.placa.length === 7) {
                              e.preventDefault();
                              const placaNormalizada = vehicleData.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
                              console.log("[Appointments] Buscando veículo (Enter):", { original: vehicleData.placa, normalized: placaNormalizada });
                              
                              // Usar refetch do query em vez de fetch direto
                              utils.vehicles.getByPlaca.fetch({ placa: placaNormalizada })
                                .then(async (vehicle) => {
                                  console.log("[Appointments] Resultado da busca (Enter):", vehicle);
                                  if (vehicle) {
                                    setSelectedVehicleId(vehicle.id);
                                    setSelectedVehicleData(vehicle);
                                    
                                    // Buscar dados do cliente
                                    if (vehicle.customerId) {
                                      try {
                                        const customer = await utils.customers.getById.fetch({ id: vehicle.customerId });
                                        if (customer) {
                                          setSelectedCustomerData(customer);
                                          console.log("[Appointments] Cliente encontrado:", customer);
                                        }
                                      } catch (error) {
                                        console.error("[Appointments] Erro ao buscar cliente:", error);
                                      }
                                    }
                                    
                                    toast.success(`Veículo encontrado: ${vehicle.placa}`);
                                  } else {
                                    setSelectedVehicleId(null);
                                    setSelectedVehicleData(null);
                                    setSelectedCustomerData(null);
                                    toast.error(`Veículo não encontrado: ${placaNormalizada}. Cadastre um novo veículo.`);
                                  }
                                })
                                .catch((error) => {
                                  console.error("Erro ao buscar veículo:", error);
                                  toast.error("Erro ao buscar veículo. Tente novamente.");
                                  setSelectedVehicleId(null);
                                });
                            }
                          }}
                          className="flex-1"
                          maxLength={7}
                        />
                        {vehicleData.placa && vehicleData.placa.length > 0 && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {selectedVehicleId ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : vehicleData.placa.length === 7 ? (
                              <span className="text-yellow-600 text-xs">?</span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewVehicleDialogOpen(true);
                          setNewInspectionDialogOpen(false);
                        }}
                      >
                        Novo Veículo
                      </Button>
                    </div>
                    {selectedVehicleId && selectedVehicleData ? (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md space-y-2">
                        <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                          ✓ Veículo encontrado e selecionado
                        </p>
                        {selectedCustomerData && (
                          <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">Dados do Cliente:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-300">
                              <div><span className="font-medium">Nome:</span> {selectedCustomerData.nome || "-"}</div>
                              <div><span className="font-medium">CPF:</span> {selectedCustomerData.cpf || "-"}</div>
                              <div><span className="font-medium">Email:</span> {selectedCustomerData.email || "-"}</div>
                              <div><span className="font-medium">Telefone:</span> {selectedCustomerData.telefone || "-"}</div>
                            </div>
                            {selectedVehicleData && (
                              <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                                <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">Dados do Veículo:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-300">
                                  <div><span className="font-medium">Placa:</span> {selectedVehicleData.placa}</div>
                                  <div><span className="font-medium">Renavam:</span> {selectedVehicleData.renavam || "-"}</div>
                                  {selectedVehicleData.marca && <div><span className="font-medium">Marca:</span> {selectedVehicleData.marca}</div>}
                                  {selectedVehicleData.modelo && <div><span className="font-medium">Modelo:</span> {selectedVehicleData.modelo}</div>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : vehicleData.placa && vehicleData.placa.length === 7 ? (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          Veículo não encontrado. Clique em "Novo Veículo" para cadastrar.
                        </p>
                      </div>
                    ) : vehicleData.placa && vehicleData.placa.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Digite {7 - vehicleData.placa.length} caractere(s) para buscar automaticamente
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Digite a placa (7 caracteres) e ela será buscada automaticamente, ou clique em "Novo Veículo" para cadastrar
                      </p>
                    )}
                  </div>
                </div>

                {/* Tipo de Inspeção e Linha */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Inspeção</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inspectionType">Tipo de Inspeção *</Label>
                      <Select
                        value={selectedInspectionType ? selectedInspectionType.toString() : undefined}
                        onValueChange={(value) => setSelectedInspectionType(value ? parseInt(value) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectionTypePricing?.filter((pricing) => pricing.type.id != null).map((pricing) => (
                            <SelectItem key={pricing.type.id} value={pricing.type.id.toString()}>
                              {pricing.type.nome} - R$ {(pricing.precoAtual / 100).toFixed(2).replace(".", ",")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedInspectionType && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                          {(() => {
                            const selectedPricing = inspectionTypePricing?.find((p) => p.type.id === selectedInspectionType);
                            return selectedPricing ? (
                              <div className="text-sm">
                                <span className="font-medium text-blue-800 dark:text-blue-200">Valor da Inspeção: </span>
                                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                  R$ {(selectedPricing.precoAtual / 100).toFixed(2).replace(".", ",")}
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inspectionLine">Linha de Inspeção *</Label>
                      <Select
                        value={selectedInspectionLine ? selectedInspectionLine.toString() : undefined}
                        onValueChange={(value) => setSelectedInspectionLine(value ? parseInt(value) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectionLines?.filter((line) => line.id != null).map((line) => (
                            <SelectItem key={line.id} value={line.id.toString()}>
                              {line.nome || `Linha ${line.id}`} - {line.tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <textarea
                      id="observacoes"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais..."
                    />
                  </div>
                </div>

                {/* Faturamento */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Faturamento</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa para Faturamento (Opcional)</Label>
                    <Select
                      value={selectedCompanyId ? selectedCompanyId.toString() : undefined}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setSelectedCompanyId(null);
                        } else {
                          setSelectedCompanyId(value ? parseInt(value) : null);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {companies?.filter((company) => company.id != null).map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCompanyId && (
                      <p className="text-xs text-muted-foreground">
                        Esta inspeção será vinculada à empresa selecionada. A fatura será criada posteriormente na tela de Financial.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewInspectionDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitNewInspection}
                  disabled={createAppointment.isPending}
                >
                  {createAppointment.isPending ? "Criando..." : "Criar Inspeção"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID ou observações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(APPOINTMENT_STATUS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inspeções</CardTitle>
            <CardDescription>{filteredAppointments.length} agendamento(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">#{appointment.id}</TableCell>
                        <TableCell>
                          {new Date(appointment.dataAgendamento).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          {appointment.customer ? (
                            <div>
                              <p className="font-medium">{appointment.customer.nome || "-"}</p>
                              {appointment.customer.cpf && (
                                <p className="text-xs text-muted-foreground">CPF: {appointment.customer.cpf}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {appointment.vehicle ? (
                            <div>
                              <p className="font-medium">{appointment.vehicle.placa || "-"}</p>
                              {appointment.vehicle.modelo && (
                                <p className="text-xs text-muted-foreground">{appointment.vehicle.marca} {appointment.vehicle.modelo}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(appointment.status)}
                            {appointment.companyId && (
                              <div className="flex items-center gap-1">
                                <Badge 
                                  variant={appointment.invoiceInfo?.boletoUrl ? "default" : "secondary"} 
                                  className="px-2 py-0.5 text-xs"
                                >
                                  {appointment.invoiceInfo?.boletoUrl ? "FATURADO" : "A FATURAR"}
                                </Badge>
                                {appointment.invoiceInfo?.createdAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(appointment.invoiceInfo.createdAt), "dd/MM/yy", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointmentForView(appointment.id);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            {appointment.status === "realizado" && !appointment.inspectionReport ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointmentForLaudo(appointment.id);
                                  setGenerateLaudoDialogOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Gerar Laudo
                              </Button>
                            ) : appointment.inspectionReport?.pdfPath ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  // Remover o prefixo /storage se existir, pois o endpoint /api/storage já adiciona isso
                                  let pdfPath = appointment.inspectionReport.pdfPath;
                                  if (pdfPath.startsWith("/storage/")) {
                                    pdfPath = pdfPath.replace("/storage/", "/");
                                  }
                                  const pdfUrl = `/api/storage${pdfPath}`;
                                  window.open(pdfUrl, "_blank");
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Ver Laudo
                              </Button>
                            ) : appointment.companyId || appointment.invoiceInfo?.boletoUrl ? null : appointment.status !== "realizado" && getAppointmentPrice(appointment.id) > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPaymentDialog(appointment.id)}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            ) : null}
                            {!isAppointmentPaid(appointment) && 
                             !appointment.inspectionReport && 
                             !appointment.invoiceInfo?.boletoUrl && 
                             !appointment.companyId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm(`Tem certeza que deseja deletar a inspeção #${appointment.id}?`)) {
                                    await deleteAppointment.mutateAsync({ id: appointment.id });
                                  }
                                }}
                                disabled={deleteAppointment.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Deletar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Pagamento */}
        <Dialog 
          open={paymentDialogOpen} 
          onOpenChange={(open) => {
            if (!open) {
              setPaymentDialogOpen(false);
              setSelectedAppointmentForPayment(null);
              setPaymentData(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Processar Pagamento</DialogTitle>
              <DialogDescription>
                {selectedAppointmentForPayment && (
                  <>Inspeção #{selectedAppointmentForPayment} - Valor: R$ {(getAppointmentPrice(selectedAppointmentForPayment) / 100).toFixed(2)}</>
                )}
              </DialogDescription>
            </DialogHeader>

            {isCreatingPayment ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Criando pagamento...</p>
                </div>
              </div>
            ) : paymentData?.paymentId ? (
              <div className="py-4">
                <PaymentCheckout
                  paymentId={paymentData.paymentId}
                  amount={paymentData.totalCents || getAppointmentPrice(selectedAppointmentForPayment) || 0}
                  accountId={paymentData.accountId}
                  masterAccountId={paymentData.masterAccountId}
                  onSuccess={() => {
                    setPaymentData(null);
                    setPaymentDialogOpen(false);
                    setSelectedAppointmentForPayment(null);
                    refetchAppointments();
                    toast.success("Pagamento processado com sucesso!");
                  }}
                  onCancel={() => {
                    setPaymentData(null);
                    setPaymentDialogOpen(false);
                    setSelectedAppointmentForPayment(null);
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Erro ao criar pagamento. Tente novamente.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Visualização de Detalhes */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Inspeção</DialogTitle>
              <DialogDescription>
                {selectedAppointmentForView && `Inspeção #${selectedAppointmentForView}`}
              </DialogDescription>
            </DialogHeader>

            {selectedAppointmentForView && (
              <div className="space-y-4 py-4">
                {(() => {
                  const appointment = appointments?.find((a) => a.id === selectedAppointmentForView);
                  if (!appointment) return <div>Carregando...</div>;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">ID</Label>
                          <p className="text-sm font-medium">#{appointment.id}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <div className="mt-1">{getStatusBadge(appointment.status)}</div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Data/Hora</Label>
                          <p className="text-sm">
                            {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Valor</Label>
                          <p className="text-sm font-medium">
                            R$ {(getAppointmentPrice(appointment.id) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {appointment.observacoes && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Observações</Label>
                          <p className="text-sm mt-1">{appointment.observacoes}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                        <p className="text-sm">
                          {format(new Date(appointment.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <DialogFooter>
              {(() => {
                const appointment = appointments?.find((a) => a.id === selectedAppointmentForView);
                if (!appointment) return null;
                
                // Verificar se pode gerar laudo: status realizado, pagamento aprovado, e não tem laudo ainda
                // O orgao pode ser selecionado no dialog mesmo se não estiver configurado no tipo de inspeção
                // Se não tem payment, também permite (caso de pagamento externo ou manual)
                const hasPaymentApproved = appointment.payment?.status === "aprovado";
                const hasNoPayment = !appointment.payment;
                const canGenerateLaudo = 
                  appointment.status === "realizado" && 
                  (hasPaymentApproved || hasNoPayment) &&
                  !appointment.inspectionReport;
                
                // Debug: log para verificar os dados
                if (appointment.status === "realizado" && !appointment.inspectionReport) {
                  console.log("[Gerar Laudo] Verificação:", {
                    appointmentId: appointment.id,
                    status: appointment.status,
                    paymentStatus: appointment.payment?.status,
                    hasPayment: !!appointment.payment,
                    hasPaymentApproved,
                    hasNoPayment,
                    hasReport: !!appointment.inspectionReport,
                    canGenerate: canGenerateLaudo,
                  });
                }
                
                if (canGenerateLaudo) {
                  return (
                    <>
                      <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                        Fechar
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedAppointmentForLaudo(appointment.id);
                          setGenerateLaudoDialogOpen(true);
                          setViewDialogOpen(false);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar Laudo
                      </Button>
                    </>
                  );
                }
                
                return <Button onClick={() => setViewDialogOpen(false)}>Fechar</Button>;
              })()}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Geração de Laudo */}
        <Dialog open={generateLaudoDialogOpen} onOpenChange={setGenerateLaudoDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Laudo de Inspeção</DialogTitle>
              <DialogDescription>
                Preencha os dados e anexe as 4 fotos obrigatórias para gerar o laudo
              </DialogDescription>
            </DialogHeader>

            {selectedAppointmentForLaudo && (
              <GenerateLaudoDialogContent
                appointmentId={selectedAppointmentForLaudo}
                appointments={appointments}
                onClose={() => {
                  setGenerateLaudoDialogOpen(false);
                  setSelectedAppointmentForLaudo(null);
                  refetchAppointments();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </TenantLayout>
  );
}

// Componente para o conteúdo do dialog de geração de laudo
function GenerateLaudoDialogContent({
  appointmentId,
  appointments,
  onClose,
}: {
  appointmentId: number;
  appointments: any;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<Record<string, { file: File | null; preview: string | null }>>({
    traseira: { file: null, preview: null },
    dianteira: { file: null, preview: null },
    placa: { file: null, preview: null },
    panoramica: { file: null, preview: null },
  });
  const [form, setForm] = useState({
    numeroLaudo: "",
    responsavelTecnico: "",
    cft: "",
    crea: "",
    dataValidade: "",
  });

  const appointment = appointments?.find((a: any) => a.id === appointmentId);
  // Buscar órgãos ativos (endpoint disponível para tenants)
  const { data: orgaos } = trpc.orgaos.listActive.useQuery();
  const createReportMutation = trpc.inspectionReports.create.useMutation();
  const uploadPhotosMutation = trpc.inspectionReports.uploadPhotos.useMutation();
  const generatePdfMutation = trpc.inspectionReports.generatePdf.useMutation();
  const [selectedOrgaoId, setSelectedOrgaoId] = useState<number | null>(null);

  // Encontrar o órgão do tipo de inspeção (se configurado)
  const orgaoFromType = appointment?.inspectionType?.orgao && orgaos
    ? orgaos.find((o) => o.nome === appointment.inspectionType.orgao || o.sigla === appointment.inspectionType.orgao)
    : null;
  
  // Usar o órgão do tipo de inspeção ou o selecionado
  const orgao = orgaoFromType || (selectedOrgaoId && orgaos ? orgaos.find((o) => o.id === selectedOrgaoId) : null);
  
  // Se não encontrou órgão automático e não há seleção, inicializar com o primeiro disponível
  if (!orgao && orgaos && orgaos.length > 0 && !selectedOrgaoId) {
    // Não setar automaticamente, deixar usuário escolher
  }

  const handlePhotoChange = (tipo: string, file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotos((prev) => ({
          ...prev,
          [tipo]: { file, preview: e.target?.result as string },
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setPhotos((prev) => ({
        ...prev,
        [tipo]: { file: null, preview: null },
      }));
    }
  };

  const handleGenerate = async () => {
    // Validar que todas as fotos foram enviadas
    const missingPhotos = Object.entries(photos)
      .filter(([_, data]) => !data.file)
      .map(([tipo]) => tipo);

    if (missingPhotos.length > 0) {
      toast.error(`Fotos obrigatórias faltando: ${missingPhotos.join(", ")}`);
      return;
    }

    if (!orgao) {
      if (!orgaoFromType && (!selectedOrgaoId || !orgaos || orgaos.length === 0)) {
        toast.error("É necessário selecionar um órgão para gerar o laudo. Este tipo de inspeção não possui órgão vinculado.");
      } else {
        toast.error("Órgão não encontrado para este tipo de inspeção");
      }
      return;
    }

    try {
      // 1. Criar o laudo
      const report = await createReportMutation.mutateAsync({
        appointmentId,
        orgaoId: orgao.id,
        numeroLaudo: form.numeroLaudo || undefined,
        responsavelTecnico: form.responsavelTecnico || undefined,
        cft: form.cft || undefined,
        crea: form.crea || undefined,
        dataValidade: form.dataValidade && form.dataValidade.trim() !== "" ? new Date(form.dataValidade) : undefined,
      });

      // 2. Upload das fotos
      const photosData = Object.entries(photos).map(([tipo, data]) => {
        if (!data.file) throw new Error(`Foto ${tipo} não encontrada`);
        const reader = new FileReader();
        return new Promise<{ tipo: string; fileData: string; fileName: string }>((resolve, reject) => {
          reader.onload = (e) => {
            const base64 = (e.target?.result as string).split(",")[1];
            resolve({
              tipo: tipo as "traseira" | "dianteira" | "placa" | "panoramica",
              fileData: base64,
              fileName: data.file!.name,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(data.file!);
        });
      });

      const photosArray = await Promise.all(photosData);
      await uploadPhotosMutation.mutateAsync({
        reportId: report.id,
        photos: photosArray,
      });

      // 3. Gerar PDF
      await generatePdfMutation.mutateAsync({ reportId: report.id });

      toast.success("Laudo gerado com sucesso!");
      onClose();
      // Recarregar a página após um pequeno delay para garantir que o laudo foi salvo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar laudo");
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numeroLaudo">Número do Laudo</Label>
          <Input
            id="numeroLaudo"
            value={form.numeroLaudo}
            onChange={(e) => setForm((prev) => ({ ...prev, numeroLaudo: e.target.value }))}
            placeholder="Ex: 001/2024"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsavelTecnico">Responsável Técnico</Label>
          <Input
            id="responsavelTecnico"
            value={form.responsavelTecnico}
            onChange={(e) => setForm((prev) => ({ ...prev, responsavelTecnico: e.target.value }))}
            placeholder="Nome do responsável"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cft">CFT</Label>
          <Input
            id="cft"
            value={form.cft}
            onChange={(e) => setForm((prev) => ({ ...prev, cft: e.target.value }))}
            placeholder="Número do CFT"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crea">CREA</Label>
          <Input
            id="crea"
            value={form.crea}
            onChange={(e) => setForm((prev) => ({ ...prev, crea: e.target.value }))}
            placeholder="Número do CREA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataValidade">Data de Validade</Label>
          <Input
            id="dataValidade"
            type="date"
            value={form.dataValidade}
            onChange={(e) => setForm((prev) => ({ ...prev, dataValidade: e.target.value }))}
          />
        </div>
        {!orgaoFromType && orgaos && orgaos.length > 0 && (
          <div className="space-y-2 col-span-2">
            <Label htmlFor="orgao">Órgão *</Label>
            <Select
              value={selectedOrgaoId?.toString() || ""}
              onValueChange={(value) => setSelectedOrgaoId(value ? parseInt(value) : null)}
            >
              <SelectTrigger id="orgao">
                <SelectValue placeholder="Selecione o órgão" />
              </SelectTrigger>
              <SelectContent>
                {orgaos
                  .filter((o) => o.ativo !== false)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id.toString()}>
                      {o.nome} {o.sigla ? `(${o.sigla})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {!orgaoFromType && (!orgaos || orgaos.length === 0) && (
          <div className="col-span-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Este tipo de inspeção não possui órgão vinculado e não há órgãos disponíveis no sistema. 
              Entre em contato com o administrador para configurar um órgão.
            </p>
          </div>
        )}
      </div>

      <div>
        <Label className="text-base font-semibold mb-4 block">Fotos Obrigatórias</Label>
        <div className="grid grid-cols-2 gap-4">
          {(["traseira", "dianteira", "placa", "panoramica"] as const).map((tipo) => (
            <div key={tipo} className="space-y-2">
              <Label htmlFor={`photo-${tipo}`} className="capitalize">
                {tipo === "panoramica" ? "Panorâmica" : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {photos[tipo].preview ? (
                  <div className="space-y-2">
                    <img src={photos[tipo].preview!} alt={tipo} className="w-full h-32 object-cover rounded" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePhotoChange(tipo, null)}
                      className="w-full"
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label htmlFor={`photo-${tipo}`} className="cursor-pointer">
                    <div className="flex flex-col items-center justify-center py-4">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para fazer upload</span>
                    </div>
                    <Input
                      id={`photo-${tipo}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoChange(tipo, file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={createReportMutation.isPending || uploadPhotosMutation.isPending || generatePdfMutation.isPending}
        >
          {createReportMutation.isPending || uploadPhotosMutation.isPending || generatePdfMutation.isPending
            ? "Gerando..."
            : "Gerar Laudo"}
        </Button>
      </DialogFooter>
    </div>
  );
}


