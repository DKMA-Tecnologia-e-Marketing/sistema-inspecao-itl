import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO, APP_TITLE } from "@/const";
import { COOKIE_NAME } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Building2,
  Calendar,
  Users,
  FileText,
  Settings,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  DollarSign,
  Wrench,
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

const tenantNavSections: NavSection[] = [
  {
    items: [{ icon: LayoutDashboard, label: "Dashboard", path: "/tenant" }],
  },
  {
    title: "Operacional",
    items: [
      { icon: Calendar, label: "Inspeções", path: "/tenant/appointments" },
      { icon: Users, label: "Clientes", path: "/tenant/customers" },
      { icon: DollarSign, label: "Precificação", path: "/tenant/pricing" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { icon: DollarSign, label: "Faturamento", path: "/tenant/financial" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { icon: Users, label: "Usuários", path: "/tenant/users" },
      { icon: Wrench, label: "Técnicos", path: "/tenant/tecnicos" },
      { icon: FileText, label: "Relatórios", path: "/tenant/reports" },
      { icon: Settings, label: "Configurações", path: "/tenant/settings" },
    ],
  },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Buscar permissões do usuário baseadas no grupo
  const { data: userMenuPermissions } = trpc.userGroups.getById.useQuery(
    { id: user?.groupId || 0 },
    { enabled: !!user?.groupId }
  );

  // Filtrar menus baseado nas permissões do grupo
  // Se o usuário é admin ou não tem grupo, mostra todos os menus
  const getFilteredNavSections = (): NavSection[] => {
    if (user?.role === "admin" || !user?.groupId || !userMenuPermissions) {
      return tenantNavSections;
    }

    const allowedPaths = userMenuPermissions.menuPaths || [];

    return tenantNavSections.map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedPaths.includes(item.path)),
    })).filter((section) => section.items.length > 0);
  };

  const filteredNavSections = getFilteredNavSections();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Aguardar um pouco mais se ainda estiver carregando ou se não houver usuário mas ainda estiver verificando
  if (!isAuthenticated && !loading) {
    // Pequeno delay para evitar redirecionamento prematuro após login
    setTimeout(() => {
      if (!user) {
        window.location.href = "/";
      }
    }, 500);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar se o usuário é operador, admin ou usuário vinculado a um tenant
  const hasTenantAccess = user?.role === "operator" || user?.role === "admin" || (user?.role === "user" && user?.tenantId);
  if (!hasTenantAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta área.</p>
          <Link href="/">
            <Button>Voltar para Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-card border-r border-border transition-all duration-300 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            {!sidebarCollapsed && (
              <Link href="/tenant" className="flex items-center gap-2 font-semibold">
                <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />
                <span className="text-sm">Gestão ITL</span>
              </Link>
            )}
            {sidebarCollapsed && (
              <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 mx-auto" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {filteredNavSections.map((section, sectionIdx) => (
              <div key={sectionIdx} className={cn("space-y-1", sectionIdx > 0 && "mt-6")}>
                {section.title && !sidebarCollapsed && (
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const isActive = location === item.path || location.startsWith(item.path + "/");
                  const Icon = item.icon;
                  return (
                    <Link key={item.path} href={item.path} onClick={() => setSidebarOpen(false)}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                                {item.badge}
                              </span>
                            )}
                            {isActive && <ChevronRight className="h-4 w-4" />}
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-border p-4">
            {!sidebarCollapsed && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name || "Operador"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || "operador@itl.com.br"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
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
            >
              <LogOut className="h-4 w-4 mr-2" />
              {!sidebarCollapsed && "Sair"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "md:ml-16" : "md:ml-64")}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Área de Gestão</h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="container mx-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}










