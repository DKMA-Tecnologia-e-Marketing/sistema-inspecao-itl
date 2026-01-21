import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { COOKIE_NAME } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  Settings,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Tags,
  Briefcase,
  PieChart,
  MessageSquare,
  ChevronRight,
  Shield,
  ListChecks,
  Wrench,
  Scale,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  badge?: string;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const adminNavSections: NavSection[] = [
  {
    items: [{ icon: LayoutDashboard, label: "Dashboard", path: "/admin" }],
  },
  {
    title: "Gerenciamento",
    items: [
      { icon: Building2, label: "Estabelecimentos", path: "/admin/tenants" },
      { icon: Users, label: "Usuários", path: "/admin/users" },
      { icon: Shield, label: "Órgãos", path: "/admin/orgaos" },
    ],
  },
  {
    title: "Serviços e Preços",
    items: [
      { icon: Tags, label: "Categorias", path: "/admin/categories" },
      { icon: Briefcase, label: "Serviços", path: "/admin/services" },
      { icon: ClipboardList, label: "Escopos", path: "/admin/scopes" },
      { icon: DollarSign, label: "Preços", path: "/admin/prices" },
      { icon: PieChart, label: "Split", path: "/admin/split" },
    ],
  },
  {
    title: "Inspeções",
    items: [
      { icon: ListChecks, label: "Tipos de Inspeção", path: "/admin/inspection-types" },
      { icon: Wrench, label: "Linhas de Inspeção", path: "/admin/inspection-lines" },
      { icon: Scale, label: "Precificação por ITL", path: "/admin/inspection-pricing" },
    ],
  },
  {
    title: "Operacional",
    items: [
      { icon: Calendar, label: "Inspeções", path: "/admin/appointments" },
    ],
  },
  {
    title: "Integrações",
    items: [
      { icon: MessageSquare, label: "WhatsApp", path: "/admin/whatsapp" },
      { icon: CreditCard, label: "Iugu", path: "/admin/iugu" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { icon: FileText, label: "Relatórios", path: "/admin/reports" },
      { icon: DollarSign, label: "Conciliação Financeira", path: "/admin/reconciliation" },
      { icon: Shield, label: "Logs de Auditoria", path: "/admin/audit" },
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth({ redirectOnUnauthenticated: false });
  const utils = trpc.useUtils();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fechar sidebar no mobile quando clicar em um link
  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Verificar se usuário tem senha - se não tiver, forçar logout imediatamente
  if (!loading && user && !user.passwordHash) {
    // Usuário sem senha - limpar tudo e redirecionar
    if (typeof window !== "undefined") {
      // Limpar cookie de sessão
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      localStorage.removeItem("manus-runtime-user-info");
      window.location.replace("/");
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado ou não for admin, redirecionar imediatamente
  if (!loading && (!isAuthenticated || user?.role !== "admin")) {
    if (typeof window !== "undefined") {
      // Limpar cookies e localStorage antes de redirecionar
      const hostname = window.location.hostname;
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
      localStorage.clear();
      window.location.href = "/";
    }
    return null;
  }

  // Mostrar loading apenas enquanto está carregando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-transform bg-card border-r shadow-lg",
          "md:translate-x-0",
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-16"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-4 md:px-6">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 shrink-0" />}
            <span className={cn("font-semibold text-lg truncate", !sidebarOpen && "hidden")}>
              {APP_TITLE}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {adminNavSections
                .filter((section) => {
                  // Ocultar seção "Serviços e Preços" para admin@inspecionasp.com.br
                  if (section.title === "Serviços e Preços" && user?.email === "admin@inspecionasp.com.br") {
                    return false;
                  }
                  return true;
                })
                .map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-2">
                    {section.title && sidebarOpen && (
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </div>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path;
                      const isDisabled = !!item.badge;
                      
                      if (isDisabled) {
                        return (
                          <div
                            key={item.path}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-not-allowed opacity-50"
                            )}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-muted-foreground">{item.label}</span>
                            {item.badge && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <Link key={item.path} href={item.path}>
                          <div
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors group relative cursor-pointer",
                              isActive
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            title={!sidebarOpen ? item.label : undefined}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "")} />
                            <span className={cn("flex-1", !sidebarOpen && "hidden")}>{item.label}</span>
                            {isActive && sidebarOpen && (
                              <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
                            )}
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                // Limpar localStorage e cache primeiro
                localStorage.clear();
                utils.auth.me.setData(undefined, null);
                utils.invalidate();
                
                // Chamar logout no servidor
                try {
                  await logout();
                } catch (error) {
                  // Ignorar erros, já limpamos localmente
                }
                
                // Forçar redirecionamento com replace para evitar histórico
                window.location.replace("/");
              }} 
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("transition-all duration-300", sidebarOpen ? "md:ml-64 ml-0" : "ml-0")}>
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Área Administrativa</h1>
          </div>
          {user && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate max-w-[200px]">{user.name}</span>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
