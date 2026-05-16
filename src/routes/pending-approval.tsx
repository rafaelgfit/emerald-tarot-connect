import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export const Route = createFileRoute("/pending-approval")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    const userId = data.user.id;
    const [{ data: roles }, { data: approval }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("account_approvals").select("status").eq("user_id", userId).maybeSingle(),
    ]);
    const isSuperadmin = (roles ?? []).some((r) => r.role === "superadmin");
    if (isSuperadmin || approval?.status === "approved") {
      throw redirect({ to: "/dashboard" });
    }
    return { status: approval?.status ?? "pending", email: data.user.email };
  },
  component: PendingApprovalPage,
});

function PendingApprovalPage() {
  const { status, email } = Route.useRouteContext();
  const navigate = useNavigate();
  const rejected = status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-secondary via-background to-accent/10">
      <Card className="w-full max-w-md p-8 text-center shadow-[var(--shadow-elegant)]">
        <div
          className="size-14 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          <Clock className="size-7" />
        </div>
        <h1 className="text-2xl font-serif text-foreground">
          {rejected ? "Acesso negado" : "Aguardando aprovação"}
        </h1>
        <p className="text-sm text-muted-foreground mt-3">
          {rejected
            ? "Sua conta foi rejeitada pelo administrador. Entre em contato para mais informações."
            : "Sua conta foi criada e está aguardando a aprovação do administrador. Você receberá acesso assim que for liberado."}
        </p>
        <p className="text-xs text-muted-foreground mt-4">{email}</p>
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="size-4 mr-2" /> Sair
        </Button>
      </Card>
    </div>
  );
}