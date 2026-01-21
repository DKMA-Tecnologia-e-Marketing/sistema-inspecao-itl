import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { INSPECTION_SCOPE_TYPES } from "@shared/constants";
import { ArrowLeft, Calendar, Car, CheckCircle, CreditCard, MapPin, User } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type BookingStep = "location" | "vehicle" | "customer" | "scope" | "payment" | "confirmation";

const DEMO_PIX_PAYLOAD =
  "00020126400014BR.GOV.BCB.PIX0114+55819999999990208DEMONSTRATION520400005303986540598.905802BR5920ITL DEMO LTDA6009SAO PAULO62070503***6304ABCD";

export default function Booking() {
  const [currentStep, setCurrentStep] = useState<BookingStep>("location");
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
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
  const [emailVerification, setEmailVerification] = useState({
    code: "",
    sent: false,
    verified: false,
  });
  const [phoneVerification, setPhoneVerification] = useState({
    code: "",
    sent: false,
    verified: false,
  });
  const [selectedScope, setSelectedScope] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);

  const { data: tenants } = trpc.tenants.listActive.useQuery();
  const { data: scopes } = trpc.inspectionScopes.list.useQuery();

  const sendEmailVerification = trpc.customers.sendEmailVerification.useMutation();
  const sendSmsVerification = trpc.customers.sendSmsVerification.useMutation();
  const verifyEmailToken = trpc.customers.verifyToken.useMutation();
  const verifySmsToken = trpc.customers.verifyToken.useMutation();
  const createCustomer = trpc.customers.create.useMutation();

  const steps = [
    { id: "location", label: "Localização", icon: MapPin },
    { id: "vehicle", label: "Veículo", icon: Car },
    { id: "customer", label: "Dados", icon: User },
    { id: "scope", label: "Escopo", icon: CheckCircle },
    { id: "payment", label: "Pagamento", icon: CreditCard },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleLocationSubmit = () => {
    if (!selectedTenant) {
      toast.error("Selecione um estabelecimento");
      return;
    }
    setCurrentStep("vehicle");
  };

  const consultarInfosimples = trpc.vehicles.consultarInfosimples.useMutation();

  const handleVehicleSubmit = async () => {
    if (!vehicleData.placa || !vehicleData.renavam) {
      toast.error("Preencha a placa e o Renavam");
      return;
    }
    
    // Consultar API Infosimples
    try {
      const dados = await consultarInfosimples.mutateAsync({
        placa: vehicleData.placa,
        renavam: vehicleData.renavam,
      });
      
      if (dados.dados) {
        // Preencher dados do veículo automaticamente
        setVehicleData({
          ...vehicleData,
          marca: dados.dados.marca || vehicleData.placa,
          modelo: dados.dados.modelo || "",
          ano: dados.dados.ano || dados.dados.anoModelo || undefined,
          cor: dados.dados.cor || "",
          chassi: dados.dados.chassi || vehicleData.chassi,
        });
        toast.success("Dados do veículo consultados com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao consultar Infosimples:", error);
      // Continuar mesmo se falhar
    }
    
    setCurrentStep("customer");
  };

  const handleSendEmailCode = async () => {
    if (!customerData.email || !customerData.nome || !customerData.cpf) {
      toast.error("Preencha nome, CPF e e-mail antes de enviar o código");
      return;
    }
    try {
      // Criar cliente se ainda não existe
      let id = customerId;
      if (!id) {
        const newCustomer = await createCustomer.mutateAsync({
          nome: customerData.nome,
          cpf: customerData.cpf,
          email: customerData.email,
          telefone: customerData.telefone,
        });
        id = newCustomer.id;
        setCustomerId(id);
      }

      const result = await sendEmailVerification.mutateAsync({
        email: customerData.email,
        customerId: id,
      });
      setEmailVerification({ ...emailVerification, sent: true });
      toast.success(result.message);
      if (result.token) {
        toast.info(`Código de desenvolvimento: ${result.token}`);
      }
    } catch (error: any) {
      toast.error("Erro ao enviar código: " + error.message);
    }
  };

  const handleSendSmsCode = async () => {
    if (!customerData.telefone || !customerData.nome || !customerData.cpf) {
      toast.error("Preencha nome, CPF e telefone antes de enviar o código");
      return;
    }
    try {
      // Criar cliente se ainda não existe
      let id = customerId;
      if (!id) {
        const newCustomer = await createCustomer.mutateAsync({
          nome: customerData.nome,
          cpf: customerData.cpf,
          email: customerData.email,
          telefone: customerData.telefone,
        });
        id = newCustomer.id;
        setCustomerId(id);
      }

      const result = await sendSmsVerification.mutateAsync({
        telefone: customerData.telefone,
        customerId: id,
      });
      setPhoneVerification({ ...phoneVerification, sent: true });
      toast.success(result.message);
      if (result.token) {
        toast.info(`Código de desenvolvimento: ${result.token}`);
      }
    } catch (error: any) {
      toast.error("Erro ao enviar código: " + error.message);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailVerification.code || !customerId) {
      toast.error("Informe o código de verificação e crie o cliente primeiro");
      return;
    }
    try {
      await verifyEmailToken.mutateAsync({
        customerId,
        token: emailVerification.code,
        type: "email",
      });
      setEmailVerification({ ...emailVerification, verified: true });
      toast.success("E-mail verificado com sucesso!");
    } catch (error: any) {
      toast.error("Código inválido: " + error.message);
    }
  };

  const handleVerifySms = async () => {
    if (!phoneVerification.code || !customerId) {
      toast.error("Informe o código de verificação e crie o cliente primeiro");
      return;
    }
    try {
      await verifySmsToken.mutateAsync({
        customerId,
        token: phoneVerification.code,
        type: "sms",
      });
      setPhoneVerification({ ...phoneVerification, verified: true });
      toast.success("Telefone verificado com sucesso!");
    } catch (error: any) {
      toast.error("Código inválido: " + error.message);
    }
  };

  const handleCustomerSubmit = async () => {
    if (!customerData.nome || !customerData.cpf || !customerData.email || !customerData.telefone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Criar ou atualizar cliente primeiro
    try {
      let id = customerId;
      if (!id) {
        const newCustomer = await createCustomer.mutateAsync({
          nome: customerData.nome,
          cpf: customerData.cpf,
          email: customerData.email,
          telefone: customerData.telefone,
        });
        id = newCustomer.id;
        setCustomerId(id);
      }

      // Em desenvolvimento, permitir continuar sem verificação obrigatória
      // Em produção, exigir verificação
      const isDevelopment = import.meta.env.DEV;
      if (!isDevelopment) {
        if (!emailVerification.verified) {
          toast.error("Por favor, verifique seu e-mail antes de continuar");
          return;
        }
        if (!phoneVerification.verified) {
          toast.error("Por favor, verifique seu telefone antes de continuar");
          return;
        }
      }

    setCurrentStep("scope");
    } catch (error: any) {
      toast.error("Erro ao salvar dados: " + error.message);
    }
  };

  const handleScopeSubmit = () => {
    if (!selectedScope) {
      toast.error("Selecione um escopo de vistoria");
      return;
    }
    setCurrentStep("payment");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <div className="container py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCompleted
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-muted bg-background text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs mt-2 text-center">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {currentStep === "location" && (
            <Card>
              <CardHeader>
                <CardTitle>Selecione o Estabelecimento</CardTitle>
                <CardDescription>Escolha o estabelecimento ITL mais próximo de você</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Estabelecimento *</Label>
                  <Select value={selectedTenant?.toString()} onValueChange={(value) => setSelectedTenant(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id.toString()}>
                          {tenant.nome} - {tenant.cidade}/{tenant.estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleLocationSubmit} className="w-full">
                  Continuar
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === "vehicle" && (
            <Card>
              <CardHeader>
                <CardTitle>Dados do Veículo</CardTitle>
                <CardDescription>Informe os dados do veículo para inspeção</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label htmlFor="chassi">Chassi (opcional)</Label>
                  <Input
                    id="chassi"
                    placeholder="9BWZZZ377VT004251"
                    value={vehicleData.chassi}
                    onChange={(e) => setVehicleData({ ...vehicleData, chassi: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep("location")} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleVehicleSubmit} className="flex-1">
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "customer" && (
            <Card>
              <CardHeader>
                <CardTitle>Seus Dados</CardTitle>
                <CardDescription>Preencha suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      className="flex-1"
                  />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendEmailCode}
                      disabled={!customerData.email || sendEmailVerification.isPending}
                    >
                      {sendEmailVerification.isPending ? "Enviando..." : emailVerification.verified ? "✓ Verificado" : "Enviar código"}
                    </Button>
                  </div>
                  {emailVerification.sent && !emailVerification.verified && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Código de verificação"
                        value={emailVerification.code}
                        onChange={(e) => setEmailVerification({ ...emailVerification, code: e.target.value })}
                        className="flex-1"
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleVerifyEmail}
                        disabled={!emailVerification.code || verifyEmailToken.isPending}
                      >
                        {verifyEmailToken.isPending ? "Verificando..." : "Verificar"}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <div className="flex gap-2">
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={customerData.telefone}
                    onChange={(e) => setCustomerData({ ...customerData, telefone: e.target.value })}
                      className="flex-1"
                  />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendSmsCode}
                      disabled={!customerData.telefone || sendSmsVerification.isPending}
                    >
                      {sendSmsVerification.isPending ? "Enviando..." : phoneVerification.verified ? "✓ Verificado" : "Enviar código"}
                    </Button>
                  </div>
                  {phoneVerification.sent && !phoneVerification.verified && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Código de verificação"
                        value={phoneVerification.code}
                        onChange={(e) => setPhoneVerification({ ...phoneVerification, code: e.target.value })}
                        className="flex-1"
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleVerifySms}
                        disabled={!phoneVerification.code || verifySmsToken.isPending}
                      >
                        {verifySmsToken.isPending ? "Verificando..." : "Verificar"}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep("vehicle")} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleCustomerSubmit} className="flex-1">
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "scope" && (
            <Card>
              <CardHeader>
                <CardTitle>Escopo de Vistoria</CardTitle>
                <CardDescription>Selecione o tipo de inspeção necessária</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Vistoria *</Label>
                  <Select value={selectedScope?.toString()} onValueChange={(value) => setSelectedScope(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scopes?.map((scope) => (
                        <SelectItem key={scope.id} value={scope.id.toString()}>
                          {scope.nome} - {INSPECTION_SCOPE_TYPES[scope.tipo as keyof typeof INSPECTION_SCOPE_TYPES]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep("customer")} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleScopeSubmit} className="flex-1">
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "payment" && (
            <Card>
              <CardHeader>
                <CardTitle>Pagamento</CardTitle>
                <CardDescription>Visualização demonstrativa de pagamento via PIX</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center rounded-2xl border bg-muted p-4">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(DEMO_PIX_PAYLOAD)}`}
                        alt="QR Code PIX Demo"
                        className="h-56 w-56"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      QR Code fictício apenas para demonstração. A integração real será feita com o provedor ASAAS.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 bg-muted/40">
                      <h4 className="text-lg font-semibold mb-2">Copie e cole o código PIX</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Este payload segue o padrão EMV para pagamentos PIX. Use-o apenas como exemplo.
                      </p>
                      <div className="rounded-md bg-background border px-3 py-2 text-sm font-mono break-all">
                        {DEMO_PIX_PAYLOAD}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          navigator.clipboard.writeText(DEMO_PIX_PAYLOAD);
                          toast.success("Payload PIX copiado (demo).");
                        }}
                      >
                        Copiar código
                      </Button>
                    </div>
                    <div className="rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">Valor:</span> R$ 98,90 (exemplo)
                      </p>
                      <p>
                        <span className="font-semibold">Beneficiário:</span> ITL Demo Ltda.
                      </p>
                      <p>
                        <span className="font-semibold">Descrição:</span> Inspeção veicular (demonstração)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep("scope")} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={() => toast.success("Agendamento realizado com sucesso!")} className="flex-1">
                    Finalizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
