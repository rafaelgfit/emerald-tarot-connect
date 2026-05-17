import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  maskDate,
  maskTime,
  brDateToIso,
  normalizeTime,
  diaDaSemana,
  buildDateTime,
  intervalosSobrepoem,
} from "@/lib/format";
import { useUserSettings } from "@/hooks/use-user-settings";

type Consulente = { id: string; nome: string };

export function AgendamentoFormDialog({
  open,
  onOpenChange,
  consulentes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consulentes: Consulente[];
  onSaved?: () => void;
}) {
  const [consulenteId, setConsulenteId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const settings = useUserSettings();
  const defaultDur = String(settings.duracao_padrao_minutos ?? 60);
  const [duracao, setDuracao] = useState(defaultDur);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setConsulenteId("");
      setData("");
      setHora("");
      setDuracao(defaultDur);
    }
  }, [open, defaultDur]);

  const isoData = brDateToIso(data);
  const dia = isoData ? diaDaSemana(isoData) : "";

  const { data: dayList } = useQuery({
    queryKey: ["agenda-do-dia", isoData],
    enabled: !!isoData,
    queryFn: async () => {
      const { data } = await supabase
        .from("atendimentos")
        .select("id, hora_atendimento, duracao_minutos, consulentes(nome)")
        .eq("data_atendimento", isoData!)
        .order("hora_atendimento", { ascending: true });
      return data ?? [];
    },
  });

  const dur = useMemo(() => parseInt(duracao, 10) || 60, [duracao]);

  const save = async () => {
    if (!consulenteId) return toast.error("Selecione o consulente");
    if (!isoData) return toast.error("Data inválida");
    const horaNorm = normalizeTime(hora);
    if (!horaNorm) return toast.error("Hora inválida");

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const start = buildDateTime(isoData, horaNorm);
      const conflict = (dayList ?? []).some((e) =>
        intervalosSobrepoem(
          start,
          dur,
          buildDateTime(isoData, e.hora_atendimento.slice(0, 5)),
          e.duracao_minutos,
        ),
      );
      if (conflict) {
        toast.error("Conflito de agenda: já existe atendimento nesse horário");
        setLoading(false);
        return;
      }
      const { error } = await supabase.from("atendimentos").insert({
        user_id: userData.user!.id,
        consulente_id: consulenteId,
        data_atendimento: isoData,
        hora_atendimento: horaNorm,
        dia_semana: dia,
        duracao_minutos: dur,
      });
      if (error) throw error;
      toast.success("Agendamento criado");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Consulente*</Label>
            <Select value={consulenteId} onValueChange={setConsulenteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {consulentes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data*</Label>
            <Input
              placeholder="DD/MM/AAAA"
              value={data}
              onChange={(e) => setData(maskDate(e.target.value))}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>Hora*</Label>
            <Input
              placeholder="HH:MM"
              value={hora}
              onChange={(e) => setHora(maskTime(e.target.value))}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>Dia da semana</Label>
            <Input value={dia} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input
              type="number"
              min={15}
              step={15}
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
            />
          </div>

          {isoData && (
            <div className="col-span-2 mt-2 rounded-md border border-border overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 text-xs uppercase text-muted-foreground">
                Atendimentos em {data} ({dia})
              </div>
              {!dayList?.length ? (
                <div className="p-4 text-sm text-muted-foreground">Nenhum atendimento neste dia.</div>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {dayList.map((d) => (
                    <li key={d.id} className="px-3 py-2 flex items-center justify-between">
                      <span className="font-medium">{d.hora_atendimento.slice(0, 5)}</span>
                      <span className="text-muted-foreground">
                        {(d.consulentes as { nome: string } | null)?.nome ?? "—"} · {d.duracao_minutos} min
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}