import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Search, Clock, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

export default function WhatsApp() {
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [messageType, setMessageType] = useState<string>("template");
  const [message, setMessage] = useState("");

  const templates = [
    {
      id: "confirmacao",
      name: "Confirmação de Agendamento",
      content: "Olá {{nome}}! Seu agendamento foi confirmado para {{data}} às {{hora}} em {{local}}. Nos vemos lá!",
    },
    {
      id: "lembrete",
      name: "Lembrete 24h",
      content: "Olá {{nome}}! Lembramos que sua inspeção está agendada para amanhã às {{hora}}. Não esqueça!",
    },
    {
      id: "cancelamento",
      name: "Cancelamento",
      content: "Olá {{nome}}! Infelizmente seu agendamento para {{data}} foi cancelado. Entre em contato para reagendar.",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp</h2>
          <p className="text-muted-foreground">Gerencie mensagens e templates do WhatsApp Business</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.234</div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens Recebidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">856</div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxa de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">69%</div>
              <p className="text-xs text-muted-foreground">Tempo médio: 2min</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Mensagem</CardTitle>
              <CardDescription>Envie mensagens para clientes via WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Estabelecimento</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">ITL Centro - São Paulo</SelectItem>
                    <SelectItem value="2">ITL Zona Norte - São Paulo</SelectItem>
                    <SelectItem value="3">ITL Guarulhos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Mensagem</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {messageType === "template" && (
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select onValueChange={(value) => {
                    const template = templates.find((t) => t.id === value);
                    if (template) setMessage(template.content);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Digite sua mensagem aqui..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {"{{nome}}"}, {"{{data}}"}, {"{{hora}}"}, {"{{local}}"}
                </p>
              </div>

              <Button className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Templates Disponíveis</CardTitle>
              <CardDescription>Templates pré-configurados para envio rápido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico de Mensagens</CardTitle>
                <CardDescription>Últimas mensagens enviadas e recebidas</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Buscar..." className="w-64" />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Histórico de mensagens será exibido aqui</p>
              <p className="text-xs mt-2">Integração com WhatsApp Business API em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}










