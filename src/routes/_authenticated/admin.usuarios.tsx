import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, RotateCcw, ShieldCheck } from "lucide-react";

type Approval = {
  user_id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  approved_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    if (!roles?.some((r) => r.role === "superadmin")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminUsuariosPage,
});

function AdminUsuariosPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_approvals")
      .select("user_id,email,status,approved_at,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar usuários");
    } else {
      setItems((data ?? []) as Approval[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (userId: string, status: Approval["status"]) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("account_approvals")
      .update({
        status,
        approved_by: userRes.user?.id ?? null,
        approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("user_id", userId);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(
      status === "approved"
        ? "Conta aprovada"
        : status === "rejected"
          ? "Conta rejeitada"
          : "Status redefinido",
    );
    load();
  };

  const renderStatus = (s: Approval["status"]) => {
    if (s === "approved") return <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Aprovada</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejeitada</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-serif">Aprovação de usuários</h1>
          <p className="text-sm text-muted-foreground">
            Apenas o superadministrador pode aprovar ou rejeitar contas.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it.user_id}>
                  <TableCell className="font-medium">{it.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(it.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{renderStatus(it.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {it.status !== "approved" && (
                      <Button size="sm" onClick={() => setStatus(it.user_id, "approved")}>
                        <Check className="size-4 mr-1" /> Aprovar
                      </Button>
                    )}
                    {it.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setStatus(it.user_id, "rejected")}
                      >
                        <X className="size-4 mr-1" /> Rejeitar
                      </Button>
                    )}
                    {it.status !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(it.user_id, "pending")}
                      >
                        <RotateCcw className="size-4 mr-1" /> Pendente
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}