import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Save, Key, Mail, Phone, CreditCard, Bell, Shield, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
            <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
          </div>
          <Button onClick={handleSave} disabled={saved}>
            <Save className="h-4 w-4 mr-2" />
            {saved ? "Salvo!" : "Salvar Alterações"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Key className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="reconciliation">
              <CheckCircle className="h-4 w-4 mr-2" />
              Conciliação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Sistema</CardTitle>
                <CardDescription>Configurações gerais da aplicação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Nome da Aplicação</Label>
                  <Input id="app-name" defaultValue="Sistema de Inspeção ITL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-description">Descrição</Label>
                  <Textarea
                    id="app-description"
                    defaultValue="Sistema de gestão e agendamento de inspeções veiculares"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Input id="timezone" defaultValue="America/Sao_Paulo" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Manutenção</Label>
                    <p className="text-sm text-muted-foreground">
                      Coloca o sistema em modo de manutenção
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  ASAAS (Pagamentos)
                </CardTitle>
                <CardDescription>Configurações da integração de pagamentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asaas-key">API Key</Label>
                  <Input id="asaas-key" type="password" placeholder="sk_..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asaas-webhook">Webhook URL</Label>
                  <Input
                    id="asaas-webhook"
                    defaultValue="https://seusite.com/api/webhooks/asaas"
                    readOnly
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativar Split Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Divide pagamentos automaticamente entre tenant e plataforma
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  E-mail (SMTP)
                </CardTitle>
                <CardDescription>Configurações do servidor de e-mail</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">Host SMTP</Label>
                    <Input id="smtp-host" placeholder="smtp.exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Porta</Label>
                    <Input id="smtp-port" type="number" defaultValue="587" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuário</Label>
                  <Input id="smtp-user" placeholder="seu-email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">Senha</Label>
                  <Input id="smtp-pass" type="password" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  SMS (Twilio)
                </CardTitle>
                <CardDescription>Configurações do serviço de SMS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="twilio-sid">Account SID</Label>
                    <Input id="twilio-sid" placeholder="AC..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twilio-token">Auth Token</Label>
                    <Input id="twilio-token" type="password" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilio-phone">Número de Telefone</Label>
                  <Input id="twilio-phone" placeholder="+5511999999999" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notificações por E-mail</CardTitle>
                <CardDescription>Configure quais notificações serão enviadas por e-mail</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Novos Agendamentos</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificação quando um novo agendamento for criado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Pagamentos Aprovados</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificação quando um pagamento for aprovado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Agendamentos Cancelados</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificação quando um agendamento for cancelado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notificações por SMS</CardTitle>
                <CardDescription>Configure quais notificações serão enviadas por SMS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Agendamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Envie SMS 24h antes do agendamento
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirmação de Pagamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Envie SMS quando pagamento for confirmado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Configurações de segurança e acesso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticação em Dois Fatores</Label>
                    <p className="text-sm text-muted-foreground">
                      Exigir 2FA para usuários admin
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Logs de Auditoria</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar todas as ações importantes no sistema
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Timeout de Sessão (minutos)</Label>
                  <Input id="session-timeout" type="number" defaultValue="60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">Tentativas de Login Máximas</Label>
                  <Input id="max-login-attempts" type="number" defaultValue="5" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-4">
            <ReconciliationConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ReconciliationConfigTab() {
  const { data: config, refetch } = trpc.reconciliationConfig.get.useQuery();
  const upsertConfig = trpc.reconciliationConfig.upsert.useMutation({
    onSuccess: () => {
      toast.success("Configuração de conciliação salva com sucesso!");
      refetch();
    },
    onError: (error) => toast.error("Erro ao salvar configuração: " + error.message),
  });

  const [formData, setFormData] = useState({
    frequencia: "diaria" as "diaria" | "semanal" | "mensal",
    diaSemana: 1,
    diaMes: 1,
    horario: "09:00",
  });

  useEffect(() => {
    if (config) {
      setFormData({
        frequencia: config.frequencia,
        diaSemana: config.diaSemana || 1,
        diaMes: config.diaMes || 1,
        horario: config.horario || "09:00",
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertConfig.mutate({
      frequencia: formData.frequencia,
      diaSemana: formData.frequencia === "semanal" ? formData.diaSemana : undefined,
      diaMes: formData.frequencia === "mensal" ? formData.diaMes : undefined,
      horario: formData.horario,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Conciliação</CardTitle>
        <CardDescription>
          Configure a frequência obrigatória de conciliação de inspeções para todas as ITLs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="frequencia">Frequência de Conciliação *</Label>
            <Select
              value={formData.frequencia}
              onValueChange={(value) =>
                setFormData({ ...formData, frequencia: value as "diaria" | "semanal" | "mensal" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diaria">Diária (todos os dias, no dia seguinte)</SelectItem>
                <SelectItem value="semanal">Semanal (uma vez por semana)</SelectItem>
                <SelectItem value="mensal">Mensal (uma vez por mês)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.frequencia === "diaria" &&
                "Todas as ITLs devem fazer conciliação diariamente, no dia seguinte."}
              {formData.frequencia === "semanal" &&
                "Todas as ITLs devem fazer conciliação uma vez por semana, no dia selecionado."}
              {formData.frequencia === "mensal" &&
                "Todas as ITLs devem fazer conciliação uma vez por mês, no dia selecionado."}
            </p>
          </div>

          {formData.frequencia === "semanal" && (
            <div className="space-y-2">
              <Label htmlFor="diaSemana">Dia da Semana *</Label>
              <Select
                value={formData.diaSemana.toString()}
                onValueChange={(value) => setFormData({ ...formData, diaSemana: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Domingo</SelectItem>
                  <SelectItem value="1">Segunda-feira</SelectItem>
                  <SelectItem value="2">Terça-feira</SelectItem>
                  <SelectItem value="3">Quarta-feira</SelectItem>
                  <SelectItem value="4">Quinta-feira</SelectItem>
                  <SelectItem value="5">Sexta-feira</SelectItem>
                  <SelectItem value="6">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.frequencia === "mensal" && (
            <div className="space-y-2">
              <Label htmlFor="diaMes">Dia do Mês *</Label>
              <Input
                id="diaMes"
                type="number"
                min="1"
                max="31"
                value={formData.diaMes}
                onChange={(e) => setFormData({ ...formData, diaMes: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">Selecione um dia entre 1 e 31</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="horario">Horário (opcional)</Label>
            <Input
              id="horario"
              type="time"
              value={formData.horario}
              onChange={(e) => {
                const time = e.target.value;
                // Garantir que os minutos sejam múltiplos de 30
                if (time) {
                  const [hours, minutes] = time.split(":").map(Number);
                  const roundedMinutes = Math.round(minutes / 30) * 30;
                  const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
                  const finalHours = roundedMinutes === 60 ? hours + 1 : hours;
                  setFormData({ ...formData, horario: `${String(finalHours).padStart(2, "0")}:${String(finalMinutes).padStart(2, "0")}` });
                } else {
                  setFormData({ ...formData, horario: "" });
                }
              }}
              step="1800"
            />
            <p className="text-xs text-muted-foreground">Horário sugerido para realizar a conciliação (intervalos de 30 minutos)</p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Importante:</strong> Esta configuração é aplicada a todas as ITLs. A conciliação é obrigatória
              para garantir que todas as inspeções sejam registradas no sistema e não sejam feitas "por fora".
            </p>
          </div>

          <Button type="submit" disabled={upsertConfig.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {upsertConfig.isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

