import TenantLayout from "@/components/TenantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Search, User, Car, Eye, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import React from "react";
import { toast } from "sonner";
import { DialogFooter } from "@/components/ui/dialog";

// Componente para linha da tabela que busca veículos individualmente
function CustomerRow({ 
  customer, 
  onViewDetails 
}: { 
  customer: { id: number; nome: string | null; cpf: string | null; email: string | null; telefone: string | null };
  onViewDetails: (id: number) => void;
}) {
  const { data: vehicles, isLoading } = trpc.vehicles.getByCustomer.useQuery(
    { customerId: customer.id },
    { 
      enabled: !!customer.id,
      staleTime: 0, // Sempre buscar dados atualizados
      refetchOnWindowFocus: true,
    }
  );

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.nome}</TableCell>
      <TableCell>{customer.cpf}</TableCell>
      <TableCell>{customer.email || "-"}</TableCell>
      <TableCell>{customer.telefone || "-"}</TableCell>
      <TableCell>
        {isLoading ? (
          <span className="text-muted-foreground text-sm">Carregando...</span>
        ) : vehicles && vehicles.length > 0 ? (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <Car className="h-3 w-3" />
            {vehicles.length}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Nenhum</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(customer.id)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalhes
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function TenantCustomers() {
  const { data: user } = trpc.auth.me.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);
  const [editVehicleDialogOpen, setEditVehicleDialogOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);

  // Buscar clientes do tenant diretamente
  const { data: customers, isLoading, refetch: refetchCustomers } = trpc.customers.list.useQuery(
    undefined,
    { enabled: !!user?.tenantId }
  );

  // Buscar veículos do cliente selecionado para o dialog
  const { data: selectedCustomerVehicles, refetch: refetchSelectedVehicles } = trpc.vehicles.getByCustomer.useQuery(
    { customerId: selectedCustomerId || 0 },
    { enabled: !!selectedCustomerId }
  );
  
  // Mutations
  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      setEditCustomerDialogOpen(false);
      refetchCustomers();
      if (selectedCustomerId) {
        // Refetch customer details
        const utils = trpc.useUtils();
        utils.customers.list.invalidate();
      }
    },
    onError: (error) => toast.error("Erro ao atualizar cliente: " + error.message),
  });

  const deleteCustomer = trpc.customers.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente deletado com sucesso!");
      setDeleteConfirmDialogOpen(false);
      setSelectedCustomerId(null);
      refetchCustomers();
    },
    onError: (error) => toast.error("Erro ao deletar cliente: " + error.message),
  });

  const updateVehicle = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso!");
      setEditVehicleDialogOpen(false);
      setEditingVehicleId(null);
      refetchSelectedVehicles();
    },
    onError: (error) => toast.error("Erro ao atualizar veículo: " + error.message),
  });
  
  // Refetch quando o dialog abrir
  const utils = trpc.useUtils();
  const handleOpenDialog = (customerId: number) => {
    setSelectedCustomerId(customerId);
    // Invalidar cache e refetch
    utils.vehicles.getByCustomer.invalidate({ customerId });
  };

  const filteredCustomers = (customers || []).filter((customer) => {
    return (
      !searchTerm ||
      customer.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.cpf?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
            <p className="text-muted-foreground">Gerencie os clientes do seu estabelecimento</p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>{filteredCustomers.length} cliente(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando clientes...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Os clientes cadastrados aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Veículos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <CustomerRow 
                        key={customer.id} 
                        customer={customer}
                        onViewDetails={handleOpenDialog}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Detalhes do Cliente */}
        <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
              <DialogDescription>
                Informações completas do cliente e seus veículos
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Informações do Cliente */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Dados do Cliente
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditCustomerDialogOpen(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Nome</Label>
                        <p className="font-medium">{selectedCustomer.nome}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">CPF</Label>
                        <p className="font-medium">{selectedCustomer.cpf}</p>
                      </div>
                      {selectedCustomer.email && (
                        <div>
                          <Label className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            E-mail
                          </Label>
                          <p className="font-medium">{selectedCustomer.email}</p>
                        </div>
                      )}
                      {selectedCustomer.telefone && (
                        <div>
                          <Label className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Telefone
                          </Label>
                          <p className="font-medium">{selectedCustomer.telefone}</p>
                        </div>
                      )}
                      {selectedCustomer.endereco && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground">Endereço</Label>
                          <p className="font-medium">{selectedCustomer.endereco}</p>
                          {(selectedCustomer.cidade || selectedCustomer.estado || selectedCustomer.cep) && (
                            <p className="text-sm text-muted-foreground">
                              {[selectedCustomer.cidade, selectedCustomer.estado, selectedCustomer.cep]
                                .filter(Boolean)
                                .join(" - ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Veículos do Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Veículos ({selectedCustomerVehicles?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedCustomerVehicles || selectedCustomerVehicles.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum veículo cadastrado para este cliente</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedCustomerVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="flex items-center justify-between border rounded-lg p-4"
                          >
                            <div className="flex items-center gap-4">
                              <Car className="h-8 w-8 text-muted-foreground" />
                              <div>
                                <p className="font-semibold text-lg">{vehicle.placa}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {vehicle.marca && (
                                    <Badge variant="outline">{vehicle.marca}</Badge>
                                  )}
                                  {vehicle.modelo && (
                                    <Badge variant="outline">{vehicle.modelo}</Badge>
                                  )}
                                  {vehicle.ano && (
                                    <Badge variant="outline">{vehicle.ano}</Badge>
                                  )}
                                  {vehicle.cor && (
                                    <Badge variant="outline">{vehicle.cor}</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                  {vehicle.renavam && <span>RENAVAM: {vehicle.renavam}</span>}
                                  {vehicle.chassi && <span>Chassi: {vehicle.chassi}</span>}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingVehicleId(vehicle.id);
                                setEditVehicleDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Editar Cliente */}
        <EditCustomerDialog
          open={editCustomerDialogOpen}
          onOpenChange={setEditCustomerDialogOpen}
          customer={selectedCustomer}
          onSuccess={() => {
            setEditCustomerDialogOpen(false);
            refetchCustomers();
            if (selectedCustomerId) {
              utils.customers.list.invalidate();
            }
          }}
        />

        {/* Dialog de Editar Veículo */}
        <EditVehicleDialog
          open={editVehicleDialogOpen}
          onOpenChange={setEditVehicleDialogOpen}
          vehicleId={editingVehicleId}
          vehicles={selectedCustomerVehicles || []}
          onSuccess={() => {
            setEditVehicleDialogOpen(false);
            setEditingVehicleId(null);
            refetchSelectedVehicles();
          }}
        />

        {/* Dialog de Confirmar Exclusão */}
        <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja deletar o cliente "{selectedCustomer?.nome}"? 
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedCustomerId) {
                    deleteCustomer.mutate({ id: selectedCustomerId });
                  }
                }}
                disabled={deleteCustomer.isPending}
              >
                {deleteCustomer.isPending ? "Deletando..." : "Deletar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}

// Componente para dialog de editar cliente
function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    nome: customer?.nome || "",
    email: customer?.email || "",
    telefone: customer?.telefone || "",
    endereco: customer?.endereco || "",
    cep: customer?.cep || "",
    cidade: customer?.cidade || "",
    estado: customer?.estado || "",
  });

  React.useEffect(() => {
    if (customer) {
      setFormData({
        nome: customer.nome || "",
        email: customer.email || "",
        telefone: customer.telefone || "",
        endereco: customer.endereco || "",
        cep: customer.cep || "",
        cidade: customer.cidade || "",
        estado: customer.estado || "",
      });
    }
  }, [customer]);

  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      onSuccess();
    },
    onError: (error) => toast.error("Erro ao atualizar cliente: " + error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    updateCustomer.mutate({
      id: customer.id,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>Atualize os dados do cliente</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={customer?.cpf || ""} disabled />
                <p className="text-xs text-muted-foreground">CPF não pode ser alterado</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente para dialog de editar veículo
function EditVehicleDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicles,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: number | null;
  vehicles: any[];
  onSuccess: () => void;
}) {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const [formData, setFormData] = useState({
    placa: vehicle?.placa || "",
    renavam: vehicle?.renavam || "",
    chassi: vehicle?.chassi || "",
    marca: vehicle?.marca || "",
    modelo: vehicle?.modelo || "",
    ano: vehicle?.ano || undefined as number | undefined,
    cor: vehicle?.cor || "",
  });

  React.useEffect(() => {
    if (vehicle) {
      setFormData({
        placa: vehicle.placa || "",
        renavam: vehicle.renavam || "",
        chassi: vehicle.chassi || "",
        marca: vehicle.marca || "",
        modelo: vehicle.modelo || "",
        ano: vehicle.ano || undefined,
        cor: vehicle.cor || "",
      });
    }
  }, [vehicle]);

  const updateVehicle = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso!");
      onSuccess();
    },
    onError: (error) => toast.error("Erro ao atualizar veículo: " + error.message),
  });  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    updateVehicle.mutate({
      id: vehicleId,
      ...formData,
      ano: formData.ano || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Veículo</DialogTitle>
          <DialogDescription>Atualize os dados do veículo</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renavam">RENAVAM</Label>
                <Input
                  id="renavam"
                  value={formData.renavam}
                  onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chassi">Chassi</Label>
                <Input
                  id="chassi"
                  value={formData.chassi}
                  onChange={(e) => setFormData({ ...formData, chassi: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Input
                  id="ano"
                  type="number"
                  value={formData.ano || ""}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor">Cor</Label>
                <Input
                  id="cor"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateVehicle.isPending}>
              {updateVehicle.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
