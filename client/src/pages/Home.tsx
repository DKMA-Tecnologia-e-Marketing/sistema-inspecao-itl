import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Usar useAuth com tratamento de erro - ignorar erros de autenticação
  const authResult = useAuth();
  const user = authResult?.user ?? null;
  const isAuthenticated = authResult?.isAuthenticated ?? false;
  const loading = authResult?.loading ?? false;

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin") {
        window.location.href = "/admin";
      } else if (user.role === "operator") {
        window.location.href = "/tenant";
      }
    }
  }, [isAuthenticated, user, loading]);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onMutate: () => {
      console.log("Login mutation started...");
    },
    onSuccess: async (data) => {
      console.log("=== LOGIN SUCCESS ===");
      console.log("Login success - user data:", data.user);
      console.log("Full response:", data);
      console.log("User role:", data.user?.role);
      console.log("User tenantId:", data.user?.tenantId);
      
      toast.success("Login realizado com sucesso!");
      
      // Invalidar cache para atualizar o estado do usuário
      await utils.auth.me.invalidate();
      
      // Redirecionar baseado no role e tenantId
      const userRole = data.user?.role;
      const userTenantId = data.user?.tenantId;
      
      if (userRole === "admin") {
        window.location.href = "/admin";
      } else if (userRole === "operator" || (userRole === "user" && userTenantId)) {
        // Usuários com role "operator" OU usuários com role "user" vinculados a um tenant vão para /tenant
        window.location.href = "/tenant";
      } else {
        window.location.href = "/";
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
      toast.error(error.message || "Erro ao fazer login. Verifique suas credenciais.");
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (error) {
      // Erro já tratado no onError
      console.error("Login mutation error:", error);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {APP_LOGO && (
                <img 
                  src={APP_LOGO} 
                  alt={APP_TITLE} 
                  className="h-16 w-16 object-contain"
                />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              {APP_TITLE}
            </h1>
            <p className="text-muted-foreground text-sm">
              Sistema de Inspeção Técnica
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                required
                className="h-11 bg-background/50 border-2 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
                required
                className="h-11 bg-background/50 border-2 focus:border-blue-500 transition-colors"
              />
            </div>

            <Button 
              type="submit"
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
              </>
            ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
              </Button>
          </form>

          {/* Info adicional */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Acesso restrito a administradores e operadores</p>
          </div>
          </CardContent>
        </Card>
    </div>
  );
}
