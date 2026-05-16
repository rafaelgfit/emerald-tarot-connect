import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isoDateToBr, maskDate, brDateToIso } from "@/lib/format";

export function AtendimentoEditDialog({
  atendimentoId,
  onOpenChange,
  onSaved,
}: {
  atendimentoId: string | null;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const open = !!atendimentoId;

  const { data: row } = useQuery({
    queryKey: ["atendimento-edit", atendimentoId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendimentos")
        .select("*, consulentes(nome)")
        .eq("id", atendimentoId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [duracao, setDuracao] = useState("60");
  const [tipoJogo, setTipoJogo] = useState("");
  const [modalidade, setModalidade] = useState("presencial");
  const [trabalho, setTrabalho] = useState("");
  const [obs, setObs] = useState("");
  const [retorno, setRetorno] = useState(false);
  const [dataRetorno, setDataRetorno] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (row) {
      setDuracao(String(row.duracao_minutos ?? 60));
      setTipoJogo(row.tipo_jogo ?? "");
      setModalidade(row.tipo_atendimento ?? "presencial");
      setTrabalho(row.trabalho ?? "");
      setObs(row.observacoes ?? "");
      setRetorno(!!row.retorno);
      setDataRetorno(row.data_retorno ? isoDateToBr(row.data_retorno) : "");
    }
  }, [row]);

  const save = async () => {
    if (!atendimentoId) return;
    setLoading(true);
    try {
      const isoRetorno = retorno ? brDateToIso(dataRetorno) : null;
      const { error } = await supabase
        .from("atendimentos")
        .update({
          duracao_minutos: parseInt(duracao, 10) || 60,
          tipo_jogo: tipoJogo || null,
          tipo_atendimento: modalidade,
          trabalho: trabalho || null,
          observacoes: obs || null,
          retorno,
          data_retorno: isoRetorno,
        })
        .eq("id", atendimentoId);
      if (error) throw error;
      toast.success("Atendimento atualizado");
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
          <DialogTitle>Atendimento</DialogTitle>
        </DialogHeader>
        {!row ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Consulente</Label>
                <Input
                  value={(row.consulentes as { nome: string } | null)?.nome ?? ""}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input value={isoDateToBr(row.data_atendimento)} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Hora</Label>
                <Input value={row.hora_atendimento.slice(0, 5)} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Dia da semana</Label>
                <Input value={row.dia_semana} readOnly className="bg-muted" />
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
              <div>
                <Label>Tipo de jogo</Label>
                <Input
                  value={tipoJogo}
                  onChange={(e) => setTipoJogo(e.target.value)}
                  placeholder="Mesa Real"
                />
              </div>
              <div>
                <Label>Tipo de atendimento</Label>
                <Select value={modalidade} onValueChange={setModalidade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Trabalho</Label>
                <Textarea value={trabalho} onChange={(e) => setTrabalho(e.target.value)} rows={4} />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-2">
                <Checkbox id="ret-edit" checked={retorno} onCheckedChange={(v) => setRetorno(!!v)} />
                <Label htmlFor="ret-edit" className="cursor-pointer">
                  Retorno
                </Label>
              </div>
              {retorno && (
                <div className="col-span-2">
                  <Label>Data de retorno</Label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={dataRetorno}
                    onChange={(e) => setDataRetorno(maskDate(e.target.value))}
                    inputMode="numeric"
                  />
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}