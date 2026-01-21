import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Edit, X, Save, Clock, CheckCircle, User, Car, Building2, DollarSign, Mail, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { APPOINTMENT_STATUS } from "@shared/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function AppointmentDetail() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const appointmentId = parseInt(params.get("id") || "0");

  const utils = trpc.useUtils();
  const { data: appointment, isLoading, refetch } = trpc.appointments.getById.useQuery(
    { id: appointmentId },
    { enabled: !!appointmentId }
  );
  const { data: customer } = trpc.customers.getById.useQuery(
    { id: appointment?.customerId || 0 },
    { enabled: !!appointment?.customerId }
  );
  const { data: vehicle } = trpc.vehicles.getById.useQuery(
    { id: appointment?.vehicleId || 0 },
    { enabled: !!appointment?.vehicleId }
  );
  const { data: tenant } = trpc.tenants.getById.useQuery(
    { id: appointment?.tenantId || 0 },
    { enabled: !!appointment?.tenantId }
  );
  const { data: scope } = trpc.inspectionScopes.getById.useQuery(
    { id: appointment?.inspectionScopeId || 0 },
    { enabled: !!appointment?.inspectionScopeId }
  );
  const { data: payment } = trpc.payments.getByAppointment.useQuery(
    { appointmentId: appointmentId },
    { enabled: !!appointmentId }
  );

  const updateAppointment = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Inspeção atualizada com sucesso!");
      refetch();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      utils.customers.getById.invalidate({ id: appointment?.customerId || 0 });
      refetch();
      setEditCustomerDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar cliente: " + error.message);
    },
  });

  const updateVehicle = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso!");
      utils.vehicles.getById.invalidate({ id: appointment?.vehicleId || 0 });
      refetch();
      setEditVehicleDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar veículo: " + error.message);
    },
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);
  const [editVehicleDialogOpen, setEditVehicleDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    dataAgendamento: "",
    status: "",
    observacoes: "",
  });
  const [editCustomerData, setEditCustomerData] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  });
  const [editVehicleData, setEditVehicleData] = useState({
    placa: "",
    renavam: "",
    chassi: "",
    marca: "",
    modelo: "",
    ano: undefined as number | undefined,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { variant: "secondary" as const, icon: Clock, label: APPOINTMENT_STATUS.pendente },
      confirmado: { variant: "default" as const, icon: CheckCircle, label: APPOINTMENT_STATUS.confirmado },
      realizado: { variant: "outline" as const, icon: CheckCircle, label: APPOINTMENT_STATUS.realizado },
      cancelado: { variant: "destructive" as const, icon: X, label: APPOINTMENT_STATUS.cancelado },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleEdit = () => {
    if (!appointment) return;
    setEditData({
      dataAgendamento: format(new Date(appointment.dataAgendamento), "yyyy-MM-dd'T'HH:mm"),
      status: appointment.status,
      observacoes: appointment.observacoes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!appointment) return;
    updateAppointment.mutate({
      id: appointment.id,
      dataAgendamento: new Date(editData.dataAgendamento),
      status: editData.status as any,
      observacoes: editData.observacoes,
    });
  };

  const handleCancel = () => {
    if (!appointment) return;
    updateAppointment.mutate({
      id: appointment.id,
      status: "cancelado",
    });
    setCancelDialogOpen(false);
  };

  const handleEditCustomer = () => {
    if (!customer) return;
    setEditCustomerData({
      nome: customer.nome || "",
      cpf: customer.cpf || "",
      email: customer.email || "",
      telefone: customer.telefone || "",
    });
    setEditCustomerDialogOpen(true);
  };

  const handleSaveCustomer = () => {
    if (!customer) return;
    updateCustomer.mutate({
      id: customer.id,
      ...editCustomerData,
    });
  };

  const handleEditVehicle = () => {
    if (!vehicle) return;
    setEditVehicleData({
      placa: vehicle.placa || "",
      renavam: vehicle.renavam || "",
      chassi: vehicle.chassi || "",
      marca: vehicle.marca || "",
      modelo: vehicle.modelo || "",
      ano: vehicle.ano || undefined,
    });
    setEditVehicleDialogOpen(true);
  };

  const handleSaveVehicle = () => {
    if (!vehicle) return;
    updateVehicle.mutate({
      id: vehicle.id,
      ...editVehicleData,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!appointment) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Inspeção não encontrada</p>
          <Button onClick={() => setLocation("/admin/appointments")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/appointments")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Detalhes da Inspeção</h2>
              <p className="text-muted-foreground">Inspeção #{appointment.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {appointment.status !== "cancelado" && appointment.status !== "realizado" && (
              <>
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Inspeção</DialogTitle>
                      <DialogDescription>Atualize as informações da inspeção</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Data e Hora</Label>
                        <Input
                          type="datetime-local"
                          value={editData.dataAgendamento}
                          onChange={(e) => setEditData({ ...editData, dataAgendamento: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(APPOINTMENT_STATUS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={editData.observacoes}
                          onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })}
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveEdit} disabled={updateAppointment.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <X className="h-4 w-4 mr-2" />
                      Cancelar Inspeção
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancelar Inspeção</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja cancelar esta inspeção? Esta ação não pode ser desfeita.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                        Não
                      </Button>
                      <Button variant="destructive" onClick={handleCancel} disabled={updateAppointment.isPending}>
                        Sim, Cancelar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informações da Inspeção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(appointment.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data e Hora</span>
                <span className="font-medium">
                  {format(new Date(appointment.dataAgendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estabelecimento</span>
                <span className="font-medium">{tenant?.nome || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Escopo de Vistoria</span>
                <span className="font-medium">{scope?.nome || "-"}</span>
              </div>
              {appointment.observacoes && (
                <div className="pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Observações</span>
                  <p className="mt-2 text-sm">{appointment.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Cliente
                </CardTitle>
                {customer && (
                  <Button variant="outline" size="sm" onClick={handleEditCustomer}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nome</span>
                <span className="font-medium">{customer?.nome || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CPF</span>
                <span className="font-medium">{customer?.cpf || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer?.email || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer?.telefone || "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Dialog open={editCustomerDialogOpen} onOpenChange={setEditCustomerDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
                <DialogDescription>Atualize as informações do cliente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={editCustomerData.nome}
                    onChange={(e) => setEditCustomerData({ ...editCustomerData, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input
                    value={editCustomerData.cpf}
                    onChange={(e) => setEditCustomerData({ ...editCustomerData, cpf: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={editCustomerData.email}
                    onChange={(e) => setEditCustomerData({ ...editCustomerData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editCustomerData.telefone}
                    onChange={(e) => setEditCustomerData({ ...editCustomerData, telefone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditCustomerDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveCustomer} disabled={updateCustomer.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Dados do Veículo
                </CardTitle>
                {vehicle && (
                  <Button variant="outline" size="sm" onClick={handleEditVehicle}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Placa</span>
                <span className="font-medium">{vehicle?.placa || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Renavam</span>
                <span className="font-medium">{vehicle?.renavam || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chassi</span>
                <span className="font-medium">{vehicle?.chassi || "-"}</span>
              </div>
              {vehicle?.marca && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Marca/Modelo</span>
                  <span className="font-medium">
                    {vehicle.marca} {vehicle.modelo}
                  </span>
                </div>
              )}
              {vehicle?.ano && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ano</span>
                  <span className="font-medium">{vehicle.ano}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={editVehicleDialogOpen} onOpenChange={setEditVehicleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Veículo</DialogTitle>
                <DialogDescription>Atualize as informações do veículo</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input
                    value={editVehicleData.placa}
                    onChange={(e) => setEditVehicleData({ ...editVehicleData, placa: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Renavam</Label>
                  <Input
                    value={editVehicleData.renavam}
                    onChange={(e) => setEditVehicleData({ ...editVehicleData, renavam: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input
                    value={editVehicleData.chassi}
                    onChange={(e) => setEditVehicleData({ ...editVehicleData, chassi: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input
                      value={editVehicleData.marca}
                      onChange={(e) => setEditVehicleData({ ...editVehicleData, marca: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input
                      value={editVehicleData.modelo}
                      onChange={(e) => setEditVehicleData({ ...editVehicleData, modelo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={editVehicleData.ano || ""}
                    onChange={(e) => setEditVehicleData({ ...editVehicleData, ano: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditVehicleDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveVehicle} disabled={updateVehicle.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {payment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Informações de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <span className="font-bold text-lg">
                    R$ {(payment.valorTotal / 100).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={payment.status === "aprovado" ? "default" : "secondary"}>
                    {payment.status}
                  </Badge>
                </div>
                {payment.metodoPagamento && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Método</span>
                    <span className="font-medium">{payment.metodoPagamento}</span>
                  </div>
                )}
                {payment.dataPagamento && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Data do Pagamento</span>
                    <span className="font-medium">
                      {format(new Date(payment.dataPagamento), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}










