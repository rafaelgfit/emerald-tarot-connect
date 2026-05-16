import { createFileRoute, redirect, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Users, Calendar, Bell, LogOut, Sparkles, ShieldCheck, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
  },
  component: AuthLayout,
});

const baseNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/consulentes", label: "Consulentes", icon: Users },
  { to: "/atendimentos", label: "Atendimentos", icon: Calendar },
  { to: "/lembretes", label: "Lembretes", icon: Bell },
] as const;

function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      if (mounted) setEmail(userRes.user?.email ?? "");
      const [{ data: approval }, { data: roles }] = await Promise.all([
        supabase.from("account_approvals").select("status").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (!mounted) return;
      setStatus((approval?.status as "pending" | "approved" | "rejected" | undefined) ?? "pending");
      setIsSuperadmin(!!roles?.some((r) => r.role === "superadmin"));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (status !== "approved") {
    const rejected = status === "rejected";
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-secondary via-background to-accent/10">
        <Card className="w-full max-w-md p-8 text-center shadow-[var(--shadow-elegant)]">
          <div
            className={cn(
              "size-14 rounded-full flex items-center justify-center mx-auto mb-4",
              rejected ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground",
            )}
          >
            {rejected ? <XCircle className="size-7" /> : <Clock className="size-7" />}
          </div>
          <h1 className="text-xl font-serif mb-2">
            {rejected ? "Acesso negado" : "Aguardando aprovação"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {rejected
              ? "Sua conta foi rejeitada pelo administrador. Entre em contato para mais informações."
              : "Sua conta foi criada e está aguardando aprovação do superadministrador. Você receberá acesso assim que for liberada."}
          </p>
          <p className="text-xs text-muted-foreground mb-4">Conectado como {email}</p>
          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </Card>
      </div>
    );
  }

  const nav = isSuperadmin
    ? [...baseNav, { to: "/admin/usuarios", label: "Usuários", icon: ShieldCheck } as const]
    : baseNav;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
          <div
            className="size-9 rounded-full flex items-center justify-center text-gold-foreground shrink-0"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="font-serif text-lg leading-tight">Baralho Cigano</p>
            <p className="text-xs opacity-70">Gestão de consultas</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={logout}
          >
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}