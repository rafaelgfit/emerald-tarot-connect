import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, RotateCcw, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "superadmin");
    if ((roles?.length ?? 0) === 0) throw redirect({ to: "/dashboard" });
  },
  component: AdminUsuariosPage,
});

type Approval = {
  user_id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
};

function AdminUsuariosPage() {
  const qc = useQueryClient();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["account-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_approvals")
        .select("user_id, email, status, created_at, approved_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Approval[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: "approved" | "rejected" | "pending";
    }) => {
      const { data: me } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("account_approvals")
        .update({
          status,
          approved_at: status === "approved" ? new Date().toISOString() : null,
          approved_by: status === "approved" ? me.user?.id ?? null : null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["account-approvals"] });
      toast.success(
        vars.status === "approved"
          ? "Conta aprovada"
          : vars.status === "rejected"
            ? "Conta rejeitada"
            : "Conta retornada para pendente",
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar"),
  });

  const badge = (status: Approval["status"]) => {
    if (status === "approved")
      return <Badge className="bg-primary text-primary-foreground">Aprovada</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Rejeitada</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-serif text-foreground">Gestão de usuários</h1>
          <p className="text-sm text-muted-foreground">
            Aprove ou rejeite contas para liberar o acesso ao sistema.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : !approvals?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma conta cadastrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Cadastrada em</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.user_id} className="border-t border-border">
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">{badge(a.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {a.status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus.mutate({ userId: a.user_id, status: "approved" })
                          }
                        >
                          <Check className="size-4 mr-1" /> Aprovar
                        </Button>
                      )}
                      {a.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateStatus.mutate({ userId: a.user_id, status: "rejected" })
                          }
                        >
                          <X className="size-4 mr-1" /> Rejeitar
                        </Button>
                      )}
                      {a.status !== "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus.mutate({ userId: a.user_id, status: "pending" })
                          }
                        >
                          <RotateCcw className="size-4 mr-1" /> Pendente
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}