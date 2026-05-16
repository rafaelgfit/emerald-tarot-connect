import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock } from "lucide-react";
import { isoDateToBr, whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/lembretes")({
  component: LembretesPage,
});

function diffDias(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function LembretesPage() {
  const { data } = useQuery({
    queryKey: ["lembretes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("atendimentos")
        .select("id, data_atendimento, hora_atendimento, consulentes(nome, telefone)")
        .gte("data_atendimento", new Date().toISOString().slice(0, 10))
        .order("data_atendimento");
      return (data ?? []).map((a) => ({ ...a, dias: diffDias(a.data_atendimento) }));
    },
  });

  const semana = (data ?? []).filter((a) => a.dias === 7);
  const doisDias = (data ?? []).filter((a) => a.dias === 2);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-serif">Lembretes WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Atendimentos a 1 semana e 2 dias. Clique para abrir o WhatsApp com a mensagem pronta.
        </p>
      </header>

      <Section titulo="Falta 1 semana" itens={semana} mensagem={(n) => `Olá, ${n}! Passando para lembrar do nosso atendimento daqui a 1 semana. 💚`} />
      <Section titulo="Faltam 2 dias" itens={doisDias} mensagem={(n) => `Olá, ${n}! Lembrete do nosso atendimento daqui a 2 dias. 💚`} />
    </div>
  );
}

type Item = {
  id: string;
  data_atendimento: string;
  hora_atendimento: string;
  consulentes: { nome: string; telefone: string | null } | null;
};

function Section({ titulo, itens, mensagem }: { titulo: string; itens: Item[]; mensagem: (n: string) => string }) {
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
            return (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {isoDateToBr(a.data_atendimento)} às {a.hora_atendimento.slice(0, 5)}
                  </p>
                </div>
                {tel ? (
                  <a href={whatsappLink(tel, mensagem(nome))} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="size-4 mr-2" /> Enviar
                    </Button>
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem telefone</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}