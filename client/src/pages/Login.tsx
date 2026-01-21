import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, Shield, CheckCircle2, ExternalLink } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Verificar se já está autenticado (apenas após carregar)
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Redirecionar se já estiver autenticado (apenas uma vez após carregar)
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !loginMutation.isPending) {
      console.log("[Login] Usuário já autenticado, redirecionando...", user.role);
      if (user.role === "admin") {
        window.location.replace("/admin");
      } else if (user.role === "operator") {
        window.location.replace("/tenant");
      } else {
        window.location.replace("/");
      }
    }
  }, [authLoading, isAuthenticated, user]); // Removido loginMutation.isPending das dependências

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      try {
        console.log("[Login] Sucesso - dados recebidos:", data);
        console.log("[Login] User role:", data.user?.role);
        console.log("[Login] User tenantId:", data.user?.tenantId);
        
        toast.success("Login realizado com sucesso!");
        
        // Invalidar e refetch o auth.me para atualizar o cache
        await utils.auth.me.invalidate();
        
        // Aguardar um pouco para garantir que o cookie foi salvo
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refetch para obter o usuário atualizado
        try {
          const meResult = await utils.auth.me.refetch();
          console.log("[Login] auth.me após refetch:", meResult.data);
        } catch (error) {
          console.error("[Login] Erro ao refetch auth.me:", error);
        }
        
        // Redirecionar baseado no role e tenantId
        const userRole = data.user?.role;
        const userTenantId = data.user?.tenantId;
        console.log("[Login] Redirecionando para role:", userRole, "tenantId:", userTenantId);
        
        // Forçar redirecionamento completo da página
        if (userRole === "admin") {
          window.location.href = "/admin";
        } else if (userRole === "operator" || (userRole === "user" && userTenantId)) {
          // Usuários com role "operator" OU usuários com role "user" vinculados a um tenant vão para /tenant
          window.location.href = "/tenant";
        } else {
          window.location.href = "/";
        }
      } catch (error) {
        console.error("[Login] Erro ao processar sucesso:", error);
        toast.error("Erro ao processar login. Tente novamente.");
      }
    },
    onError: (error) => {
      console.error("[Login] Erro na mutation:", error);
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Lado esquerdo - Logo e informações sobre o app */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <img 
              src="/logo-inspeciona-sp.png" 
              alt="Inspeciona SP Logo" 
              className="w-48 h-48 object-contain mb-6 drop-shadow-2xl"
              onError={(e) => {
                // Fallback se a imagem não carregar
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <h1 className="text-5xl font-bold tracking-tight mb-2">Inspeciona SP</h1>
            <p className="text-xl text-blue-100 text-center max-w-md">
              Sistema completo de gestão e inspeção técnica para o estado de São Paulo
            </p>
          </div>
          
          {/* Sobre o App */}
          <div className="mt-8 space-y-6 text-left max-w-lg">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-semibold mb-4">Sobre o Sistema</h2>
              <p className="text-blue-100 leading-relaxed mb-4">
                O <strong>Inspeciona SP</strong> é uma plataforma moderna e completa desenvolvida para 
                gerenciar todo o processo de inspeção técnica de veículos no estado de São Paulo. 
                Com recursos avançados de gestão, relatórios detalhados e interface intuitiva, 
                facilitamos o trabalho de estabelecimentos credenciados e garantimos a conformidade 
                com as normas regulamentadoras.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Gestão Completa</h3>
                    <p className="text-xs text-blue-100">Controle total sobre inspeções, agendamentos e relatórios</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Relatórios Detalhados</h3>
                    <p className="text-xs text-blue-100">Gere relatórios profissionais e exporte em múltiplos formatos</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Segurança e Confiabilidade</h3>
                    <p className="text-xs text-blue-100">Seus dados protegidos com criptografia avançada e backups automáticos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Créditos A7 Codex */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <p className="text-sm text-blue-100 text-center">
                Desenvolvido por{" "}
                <a 
                  href="http://a7codex.com.br/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-white hover:text-blue-200 underline inline-flex items-center gap-1 transition-colors"
                >
                  A7 Codex
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <p className="text-xs text-blue-200/80 text-center mt-2">
                Soluções digitais personalizadas com tecnologia de ponta
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulário de login */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardHeader className="space-y-4 text-center pb-8">
              {/* Mobile logo */}
              <div className="lg:hidden flex flex-col items-center justify-center gap-3 mb-4">
                <img 
                  src="/logo-inspeciona-sp.png" 
                  alt="Inspeciona SP Logo" 
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <h1 className="text-3xl font-bold">Inspeciona SP</h1>
              </div>
              
              {/* Desktop title */}
              <div className="hidden lg:block">
                <CardTitle className="text-3xl font-bold">Bem-vindo de volta</CardTitle>
                <CardDescription className="text-base mt-2">
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </div>
              
              {/* Mobile title */}
              <div className="lg:hidden">
                <CardTitle className="text-2xl font-bold">Acesso ao Sistema</CardTitle>
                <CardDescription className="text-sm mt-2">
                  Entre com seu e-mail e senha
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
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
                    className="h-11 text-base"
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
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
                    className="h-11 text-base"
                    autoComplete="current-password"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" 
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
              
              {/* Footer info */}
              <div className="pt-4 border-t">
                <p className="text-xs text-center text-muted-foreground mb-2">
                  Sistema de Inspeção - São Paulo
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  Desenvolvido por{" "}
                  <a 
                    href="http://a7codex.com.br/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                  >
                    A7 Codex
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


