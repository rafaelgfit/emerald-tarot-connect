import { createFileRoute, redirect, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Calendar, Bell, LogOut, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
    // Check approval
    const userId = data.user.id;
    const [{ data: roles }, { data: approval }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("account_approvals").select("status").eq("user_id", userId).maybeSingle(),
    ]);
    const isSuperadmin = (roles ?? []).some((r) => r.role === "superadmin");
    if (!isSuperadmin && approval?.status !== "approved") {
      throw redirect({ to: "/pending-approval" });
    }
  },
  component: AuthLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/consulentes", label: "Consulentes", icon: Users },
  { to: "/atendimentos", label: "Atendimentos", icon: Calendar },
  { to: "/lembretes", label: "Lembretes", icon: Bell },
] as const;

function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: isSuperadmin } = useQuery({
    queryKey: ["is-superadmin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "superadmin");
      return (data?.length ?? 0) > 0;
    },
  });

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

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
          {isSuperadmin && (
            <Link
              to="/admin/usuarios"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                location.pathname.startsWith("/admin")
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <ShieldCheck className="size-4" />
              Usuários
            </Link>
          )}
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