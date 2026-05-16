import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { isoDateToBr } from "@/lib/format";
import { AtendimentoEditDialog } from "@/components/app/AtendimentoEditDialog";

export const Route = createFileRoute("/_authenticated/atendimentos")({
  component: AtendimentosPage,
});

function AtendimentosPage() {
  const [sel, setSel] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["atendimentos-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("atendimentos")
        .select("*, consulentes(nome)")
        .order("data_atendimento", { ascending: true })
        .order("hora_atendimento", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif">Atendimentos</h1>
          <p className="text-muted-foreground mt-1">Histórico geral — próximos no topo</p>
        </div>
      </header>

      <Card className="overflow-hidden">
        {!data?.length ? (
          <div className="p-12 text-center text-muted-foreground">Nenhum atendimento.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Consulente</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Hora</th>
                <th className="text-left p-3">Dia</th>
                <th className="text-left p-3">Modalidade</th>
                <th className="text-left p-3">Retorno</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-muted/40 cursor-pointer" onClick={() => setSel(a.id)}>
                  <td className="p-3 font-medium">{(a.consulentes as { nome: string } | null)?.nome ?? "—"}</td>
                  <td className="p-3">{isoDateToBr(a.data_atendimento)}</td>
                  <td className="p-3">{a.hora_atendimento.slice(0, 5)}</td>
                  <td className="p-3">{a.dia_semana}</td>
                  <td className="p-3 capitalize">{a.tipo_atendimento}</td>
                  <td className="p-3">{a.retorno ? "Sim" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <AtendimentoEditDialog
        atendimentoId={sel}
        onOpenChange={(v: boolean) => !v && setSel(null)}
        onSaved={refetch}
      />
    </div>
  );
}