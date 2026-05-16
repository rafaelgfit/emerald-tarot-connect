import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Phone, Cake, Sparkles } from "lucide-react";
import { isoDateToBr } from "@/lib/format";
import { ConsulenteFormDialog } from "@/components/app/ConsulenteFormDialog";
import { AtendimentoDetailDialog } from "@/components/app/AtendimentoDetailDialog";

export const Route = createFileRoute("/_authenticated/consulentes/$id")({
  component: ConsulenteDetail,
});

function ConsulenteDetail() {
  const { id } = Route.useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedAtend, setSelectedAtend] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["consulente", id],
    queryFn: async () => {
      const [{ data: c }, { data: h }] = await Promise.all([
        supabase.from("consulentes").select("*").eq("id", id).single(),
        supabase
          .from("atendimentos")
          .select("*")
          .eq("consulente_id", id)
          .order("data_atendimento", { ascending: false })
          .order("hora_atendimento", { ascending: false }),
      ]);
      return { consulente: c, historico: h ?? [] };
    },
  });

  if (!data?.consulente) {
    return <div className="p-8">Carregando...</div>;
  }

  const c = data.consulente;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/consulentes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>

      <Card className="p-6 mb-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif">{c.nome}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {c.signo && (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-4 text-[var(--gold)]" /> {c.signo}
                </span>
              )}
              {c.data_nascimento && (
                <span className="inline-flex items-center gap-1">
                  <Cake className="size-4" /> {isoDateToBr(c.data_nascimento)}
                </span>
              )}
              {c.telefone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-4" /> {c.telefone}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4 mr-2" /> Editar
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="font-medium">Histórico do consulente</h2>
          <p className="text-xs text-muted-foreground">Clique em uma linha para ver os detalhes</p>
        </div>
        {data.historico.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum atendimento registrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Hora</th>
                <th className="text-left p-3">Tipo de jogo</th>
                <th className="text-left p-3">Modalidade</th>
                <th className="text-left p-3">Retorno</th>
              </tr>
            </thead>
            <tbody>
              {data.historico.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-border hover:bg-muted/40 cursor-pointer"
                  onClick={() => setSelectedAtend(a.id)}
                >
                  <td className="p-3">{isoDateToBr(a.data_atendimento)}</td>
                  <td className="p-3">{a.hora_atendimento.slice(0, 5)}</td>
                  <td className="p-3">{a.tipo_jogo ?? "—"}</td>
                  <td className="p-3 capitalize">{a.tipo_atendimento}</td>
                  <td className="p-3">
                    {a.retorno ? <Badge variant="secondary">Sim</Badge> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ConsulenteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        consulente={c}
        onSaved={refetch}
      />
      <AtendimentoDetailDialog
        atendimentoId={selectedAtend}
        onOpenChange={(v) => !v && setSelectedAtend(null)}
      />
    </div>
  );
}