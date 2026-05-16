import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { isoDateToBr } from "@/lib/format";

export function AtendimentoDetailDialog({
  atendimentoId,
  onOpenChange,
}: {
  atendimentoId: string | null;
  onOpenChange: (v: boolean) => void;
}) {
  const { data } = useQuery({
    queryKey: ["atendimento", atendimentoId],
    enabled: !!atendimentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendimentos")
        .select("*, consulentes(nome, telefone)")
        .eq("id", atendimentoId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={!!atendimentoId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do atendimento</DialogTitle>
        </DialogHeader>
        {!data ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div className="space-y-3 text-sm">
            <Row label="Consulente" value={(data.consulentes as { nome: string } | null)?.nome ?? "—"} />
            <Row label="Data" value={isoDateToBr(data.data_atendimento)} />
            <Row label="Hora" value={data.hora_atendimento.slice(0, 5)} />
            <Row label="Dia da semana" value={data.dia_semana} />
            <Row label="Duração" value={`${data.duracao_minutos} min`} />
            <Row label="Tipo de jogo" value={data.tipo_jogo ?? "—"} />
            <Row label="Modalidade" value={<span className="capitalize">{data.tipo_atendimento}</span>} />
            <Row label="Trabalho" value={data.trabalho ?? "—"} />
            <Row label="Observações" value={data.observacoes ?? "—"} />
            <Row
              label="Retorno"
              value={
                data.retorno ? (
                  <Badge variant="secondary">
                    {data.data_retorno ? isoDateToBr(data.data_retorno) : "marcado"}
                    {data.hora_retorno ? ` às ${data.hora_retorno.slice(0, 5)}` : ""}
                  </Badge>
                ) : (
                  "Não"
                )
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value}</span>
    </div>
  );
}