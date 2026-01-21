import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { COOKIE_NAME } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, LogOut, Menu, X, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
};

const orgaoNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/orgao" },
  { icon: FileText, label: "Laudos", path: "/orgao/reports" },
];

export default function OrgaoLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth({ redirectOnUnauthenticated: false });
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const utils = trpc.useUtils();

  // Buscar órgãos do usuário
  const { data: userOrgaos } = trpc.orgaos.getMyOrgaos.useQuery(undefined, {
    enabled: !!user && user.role === "orgao",
  });
  
  const orgao = userOrgaos?.[0]?.orgao;

  const handleLogout = async () => {
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
    window.location.replace(getLoginUrl());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "orgao") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-4">Acesso não autorizado</p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/orgao" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">{APP_TITLE}</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">{orgao?.nome || "Órgão"}</p>
              <p className="text-xs text-muted-foreground">{user?.name || user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed md:static inset-y-0 left-0 z-50 w-64 border-r bg-card transform transition-transform duration-200 ease-in-out md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-1 p-4">
              {orgaoNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || location.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

