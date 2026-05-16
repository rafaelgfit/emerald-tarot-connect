import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Calendar, Bell, TrendingUp, Sparkles } from "lucide-react";
import { isoDateToBr } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ count: totalCons }, { data: atend }] = await Promise.all([
        supabase.from("consulentes").select("id", { count: "exact", head: true }),
        supabase
          .from("atendimentos")
          .select("id, data_atendimento, hora_atendimento, tipo_atendimento, retorno, consulente_id, consulentes(nome)")
          .order("data_atendimento", { ascending: true })
          .order("hora_atendimento", { ascending: true }),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = (atend ?? []).filter((a) => a.data_atendimento >= today);
      const past = (atend ?? []).filter((a) => a.data_atendimento < today);
      const hojeCount = (atend ?? []).filter((a) => a.data_atendimento === today).length;
      const proximos7 = upcoming.filter((a) => {
        const diff =
          (new Date(a.data_atendimento).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24);
        return diff <= 7;
      });
      const retornosPendentes = (atend ?? []).filter((a) => a.retorno).length;
      return {
        totalConsulentes: totalCons ?? 0,
        totalAtendimentos: (atend ?? []).length,
        hoje: hojeCount,
        proximos7: proximos7.length,
        proximosList: upcoming.slice(0, 5),
        pastCount: past.length,
        retornosPendentes,
      };
    },
  });

  const stats = [
    { label: "Consulentes", value: data?.totalConsulentes ?? 0, icon: Users, accent: "primary" as const },
    { label: "Atendimentos hoje", value: data?.hoje ?? 0, icon: Sparkles, accent: "gold" as const },
    { label: "Próximos 7 dias", value: data?.proximos7 ?? 0, icon: Calendar, accent: "primary" as const },
    { label: "Retornos marcados", value: data?.retornosPendentes ?? 0, icon: Bell, accent: "gold" as const },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral da sua agenda</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <div
                  className={
                    s.accent === "gold"
                      ? "size-9 rounded-md flex items-center justify-center text-gold-foreground"
                      : "size-9 rounded-md flex items-center justify-center text-primary-foreground"
                  }
                  style={{
                    background:
                      s.accent === "gold" ? "var(--gradient-gold)" : "var(--gradient-primary)",
                  }}
                >
                  <Icon className="size-4" />
                </div>
              </div>
              <p className="text-3xl font-serif">{s.value}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" /> Próximos atendimentos
          </h2>
          <Link to="/atendimentos" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {!data?.proximosList?.length ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Nenhum atendimento agendado.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.proximosList.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {(a.consulentes as { nome: string } | null)?.nome ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isoDateToBr(a.data_atendimento)} às {a.hora_atendimento.slice(0, 5)} •{" "}
                    {a.tipo_atendimento}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}