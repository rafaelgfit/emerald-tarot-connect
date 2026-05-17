import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMySubscription,
  createAsaasSubscription,
  getCheckoutLink,
  cancelMySubscription,
} from "@/lib/subscription.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CreditCard, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assinatura")({
  component: AssinaturaPage,
});

function daysLeft(iso: string | null | undefined) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function AssinaturaPage() {
  const queryClient = useQueryClient();
  const fetchSub = useServerFn(getMySubscription);
  const createSub = useServerFn(createAsaasSubscription);
  const getLink = useServerFn(getCheckoutLink);
  const cancelSub = useServerFn(cancelMySubscription);

  const { data, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => fetchSub(),
  });

  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createSub({ data: { name, cpfCnpj, phone, billingType: "UNDEFINED" } }),
    onSuccess: (res) => {
      toast.success("Assinatura criada! Abrindo página de pagamento...");
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      if (res.invoiceUrl) window.open(res.invoiceUrl, "_blank");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar assinatura"),
  });

  const linkMut = useMutation({
    mutationFn: () => getLink(),
    onSuccess: (res) => {
      if (res.invoiceUrl) {
        window.open(res.invoiceUrl, "_blank");
      } else {
        toast.info("Nenhuma fatura em aberto.");
      }
    },
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelSub(),
    onSuccess: () => {
      toast.success("Assinatura cancelada");
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }

  const sub = data?.subscription;
  const status = sub?.status ?? "trialing";
  const trialDays = daysLeft(sub?.trial_ends_at);
  const hasActiveSubscription = !!sub?.asaas_subscription_id;

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex items-center gap-3">
        <div
          className="size-10 rounded-full flex items-center justify-center text-gold-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          <CreditCard className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-serif">Assinatura</h1>
          <p className="text-sm text-muted-foreground">
            Plano mensal — R$ 10,00/mês
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Status atual</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {status === "trialing" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4" />
              {trialDays !== null && trialDays > 0
                ? `Restam ${trialDays} dia${trialDays === 1 ? "" : "s"} de degustação.`
                : "Sua degustação terminou."}
            </div>
          )}
          {status === "active" && sub?.current_period_end && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Próxima cobrança em{" "}
              {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}.
            </div>
          )}
          {(status === "past_due" || status === "expired") && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              Acesso bloqueado. Regularize o pagamento para continuar.
            </div>
          )}
        </CardContent>
      </Card>

      {!hasActiveSubscription ? (
        <Card>
          <CardHeader>
            <CardTitle>Assinar agora</CardTitle>
            <CardDescription>
              R$ 10,00/mês via PIX, Boleto ou Cartão. Você escolhe a forma de
              pagamento na próxima tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                <Input
                  id="cpfCnpj"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="Somente números"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Celular (opcional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !name || !cpfCnpj}
              className="w-full"
              size="lg"
            >
              <Sparkles className="size-4 mr-2" />
              {createMut.isPending ? "Criando..." : "Assinar por R$ 10/mês"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => linkMut.mutate()} disabled={linkMut.isPending}>
              <CreditCard className="size-4 mr-2" />
              Abrir fatura em aberto
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Confirmar cancelamento da assinatura?"))
                  cancelMut.mutate();
              }}
              disabled={cancelMut.isPending}
            >
              Cancelar assinatura
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    trialing: { label: "Em degustação", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    active: { label: "Ativa", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    past_due: { label: "Atrasada", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    expired: { label: "Expirada", className: "bg-red-100 text-red-800 hover:bg-red-100" },
    canceled: { label: "Cancelada", className: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200" },
  };
  const cfg = map[status] ?? map.trialing;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}