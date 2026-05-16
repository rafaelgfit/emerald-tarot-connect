import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { isoDateToBr } from "@/lib/format";
import { AgendamentoFormDialog } from "@/components/app/AgendamentoFormDialog";

export const Route = createFileRoute("/_authenticated/agendamentos")({
  component: AgendamentosPage,
});

function AgendamentosPage() {
  const [open, setOpen] = useState(false);

  const { data: consulentes } = useQuery({
    queryKey: ["consulentes-min"],
    queryFn: async () => {
      const { data } = await supabase.from("consulentes").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data, refetch } = useQuery({
    queryKey: ["agendamentos-futuros"],
    queryFn: async () => {
      const { data } = await supabase
        .from("atendimentos")
        .select("*, consulentes(nome)")
        .gte("data_atendimento", today)
        .order("data_atendimento", { ascending: true })
        .order("hora_atendimento", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif">Agendamentos</h1>
          <p className="text-muted-foreground mt-1">Próximas consultas marcadas</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" /> Novo agendamento
        </Button>
      </header>

      <Card className="overflow-hidden">
        {!data?.length ? (
          <div className="p-12 text-center text-muted-foreground">Nenhum agendamento futuro.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Consulente</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Hora</th>
                <th className="text-left p-3">Dia</th>
                <th className="text-left p-3">Duração</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {(a.consulentes as { nome: string } | null)?.nome ?? "—"}
                  </td>
                  <td className="p-3">{isoDateToBr(a.data_atendimento)}</td>
                  <td className="p-3">{a.hora_atendimento.slice(0, 5)}</td>
                  <td className="p-3">{a.dia_semana}</td>
                  <td className="p-3">{a.duracao_minutos} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <AgendamentoFormDialog
        open={open}
        onOpenChange={setOpen}
        consulentes={consulentes ?? []}
        onSaved={refetch}
      />
    </div>
  );
}