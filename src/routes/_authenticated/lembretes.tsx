import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, Check } from "lucide-react";
import { isoDateToBr, whatsappLink } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lembretes")({
  component: LembretesPage,
});

function diffDias(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function montarMensagem(nome: string, isoDate: string, hora: string) {
  return `Oi, ${nome}, tudo bem? Passando para lembrar você que seu atendimento será no dia ${isoDateToBr(isoDate)} às ${hora.slice(0, 5)}. Caso precise remarcar, nos envie uma mensagem.`;
}

function LembretesPage() {
  const { data } = useQuery({
    queryKey: ["lembretes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("atendimentos")
        .select("id, data_atendimento, hora_atendimento, lembrete_semana_enviado, lembrete_2dias_enviado, consulentes(nome, telefone)")
        .gte("data_atendimento", new Date().toISOString().slice(0, 10))
        .order("data_atendimento");
      return (data ?? []).map((a) => ({ ...a, dias: diffDias(a.data_atendimento) }));
    },
  });

  const semana = (data ?? []).filter((a) => a.dias >= 5 && a.dias <= 8 && !a.lembrete_semana_enviado);
  const doisDias = (data ?? []).filter((a) => a.dias >= 1 && a.dias <= 3 && !a.lembrete_2dias_enviado);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-serif">Lembretes WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Atendimentos próximos a 1 semana e a 2 dias. Clique em "Enviar" para abrir o WhatsApp com a mensagem pronta e depois marque como enviado.
        </p>
      </header>

      <Section titulo="Falta ~1 semana" itens={semana} campo="lembrete_semana_enviado" />
      <Section titulo="Faltam ~2 dias" itens={doisDias} campo="lembrete_2dias_enviado" />
    </div>
  );
}

type Item = {
  id: string;
  data_atendimento: string;
  hora_atendimento: string;
  lembrete_semana_enviado: boolean;
  lembrete_2dias_enviado: boolean;
  dias: number;
  consulentes: { nome: string; telefone: string | null } | null;
};

function Section({ titulo, itens, campo }: { titulo: string; itens: Item[]; campo: "lembrete_semana_enviado" | "lembrete_2dias_enviado" }) {
  const qc = useQueryClient();
  const marcar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("atendimentos").update({ [campo]: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lembretes"] });
      toast.success("Lembrete marcado como enviado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="p-5 mb-4">
      <h2 className="font-medium mb-3 flex items-center gap-2">
        <Clock className="size-4 text-primary" /> {titulo}
      </h2>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lembrete pendente.</p>
      ) : (
        <ul className="divide-y divide-border">
          {itens.map((a) => {
            const nome = a.consulentes?.nome ?? "—";
            const tel = a.consulentes?.telefone;
            const msg = montarMensagem(nome, a.data_atendimento, a.hora_atendimento);
            return (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {isoDateToBr(a.data_atendimento)} às {a.hora_atendimento.slice(0, 5)} · faltam {a.dias} dia(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  {tel ? (
                    <a href={whatsappLink(tel, msg)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="size-4 mr-2" /> Abrir WhatsApp
                      </Button>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground self-center">Sem telefone</span>
                  )}
                  <Button size="sm" onClick={() => marcar.mutate(a.id)} disabled={marcar.isPending}>
                    <Check className="size-4 mr-2" /> Marcar enviado
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}