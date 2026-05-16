import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { maskDate, maskTime, brDateToIso, isoDateToBr, normalizeTime, diaDaSemana, buildDateTime, intervalosSobrepoem } from "@/lib/format";

type Consulente = { id: string; nome: string };

export function AtendimentoFormDialog({
  open,
  onOpenChange,
  consulentes,
  onSaved,
  initialConsulenteId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consulentes: Consulente[];
  onSaved?: () => void;
  initialConsulenteId?: string;
}) {
  const [consulenteId, setConsulenteId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("60");
  const [tipoJogo, setTipoJogo] = useState("");
  const [modalidade, setModalidade] = useState("presencial");
  const [trabalho, setTrabalho] = useState("");
  const [obs, setObs] = useState("");
  const [retorno, setRetorno] = useState(false);
  const [dataRetorno, setDataRetorno] = useState("");
  const [loading, setLoading] = useState(false);
  const [askRetorno, setAskRetorno] = useState(false);
  const [pendingRetorno, setPendingRetorno] = useState<{ data: string } | null>(null);
  const [horaRetornoInput, setHoraRetornoInput] = useState("");

  useEffect(() => {
    if (open) {
      setConsulenteId(initialConsulenteId ?? "");
      setData(""); setHora(""); setDuracao("60"); setTipoJogo("");
      setModalidade("presencial"); setTrabalho(""); setObs("");
      setRetorno(false); setDataRetorno(""); setHoraRetornoInput("");
    }
  }, [open, initialConsulenteId]);

  const isoData = brDateToIso(data);
  const dia = isoData ? diaDaSemana(isoData) : "";

  const checkConflict = async (
    isoDate: string, hhmm: string, dur: number, ignoreId?: string,
  ): Promise<boolean> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data: existing } = await supabase
      .from("atendimentos")
      .select("id, data_atendimento, hora_atendimento, duracao_minutos")
      .eq("user_id", userData.user!.id)
      .eq("data_atendimento", isoDate);
    const start = buildDateTime(isoDate, hhmm);
    return (existing ?? []).some((e) => {
      if (ignoreId && e.id === ignoreId) return false;
      return intervalosSobrepoem(
        start, dur,
        buildDateTime(e.data_atendimento, e.hora_atendimento.slice(0, 5)),
        e.duracao_minutos,
      );
    });
  };

  const save = async () => {
    if (!consulenteId) return toast.error("Selecione o consulente");
    if (!isoData) return toast.error("Data inválida");
    const horaNorm = normalizeTime(hora);
    if (!horaNorm) return toast.error("Hora inválida");
    const dur = parseInt(duracao, 10) || 60;

    setLoading(true);
    try {
      const conflict = await checkConflict(isoData!, horaNorm, dur);
      if (conflict) {
        toast.error("Conflito de agenda: já existe atendimento nesse horário");
        setLoading(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const isoRetorno = retorno ? brDateToIso(dataRetorno) : null;
      const { error } = await supabase.from("atendimentos").insert({
        user_id: userData.user!.id,
        consulente_id: consulenteId,
        data_atendimento: isoData!,
        hora_atendimento: horaNorm,
        dia_semana: dia,
        duracao_minutos: dur,
        tipo_jogo: tipoJogo || null,
        tipo_atendimento: modalidade,
        trabalho: trabalho || null,
        observacoes: obs || null,
        retorno,
        data_retorno: isoRetorno,
      });
      if (error) throw error;
      toast.success("Atendimento agendado");

      if (retorno && isoRetorno) {
        setPendingRetorno({ data: isoRetorno });
        setHoraRetornoInput("");
        setAskRetorno(true);
      } else {
        onOpenChange(false);
        onSaved?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const confirmRetorno = async () => {
    if (!pendingRetorno) return;
    const horaNorm = normalizeTime(horaRetornoInput);
    if (!horaNorm) return toast.error("Horário inválido");
    const dur = parseInt(duracao, 10) || 60;
    const conflict = await checkConflict(pendingRetorno.data, horaNorm, dur);
    if (conflict) {
      toast.error("Conflito de agenda no horário do retorno");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("atendimentos").insert({
      user_id: userData.user!.id,
      consulente_id: consulenteId,
      data_atendimento: pendingRetorno.data,
      hora_atendimento: horaNorm,
      dia_semana: diaDaSemana(pendingRetorno.data),
      duracao_minutos: dur,
      tipo_jogo: tipoJogo || null,
      tipo_atendimento: modalidade,
      observacoes: "Retorno do atendimento anterior",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    // marcar hora_retorno no original (último inserido — buscar)
    await supabase
      .from("atendimentos")
      .update({ hora_retorno: horaNorm })
      .eq("consulente_id", consulenteId)
      .eq("data_atendimento", isoData ?? "")
      .eq("hora_atendimento", normalizeTime(hora) ?? "");
    toast.success("Retorno agendado");
    setAskRetorno(false);
    setPendingRetorno(null);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo atendimento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Consulente*</Label>
              <Select value={consulenteId} onValueChange={setConsulenteId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {consulentes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data*</Label>
              <Input placeholder="DD/MM/AAAA" value={data} onChange={(e) => setData(maskDate(e.target.value))} inputMode="numeric" />
            </div>
            <div>
              <Label>Hora*</Label>
              <Input placeholder="HH:MM" value={hora} onChange={(e) => setHora(maskTime(e.target.value))} inputMode="numeric" />
            </div>
            <div>
              <Label>Dia da semana</Label>
              <Input value={dia} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Duração (min) — provisionamento da agenda</Label>
              <Input type="number" min={15} step={15} value={duracao} onChange={(e) => setDuracao(e.target.value)} />
            </div>
            <div>
              <Label>Tipo de jogo</Label>
              <Input value={tipoJogo} onChange={(e) => setTipoJogo(e.target.value)} placeholder="Mesa Real" />
            </div>
            <div>
              <Label>Tipo de atendimento</Label>
              <Select value={modalidade} onValueChange={setModalidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Trabalho</Label>
              <Input value={trabalho} onChange={(e) => setTrabalho(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-2">
              <Checkbox id="ret" checked={retorno} onCheckedChange={(v) => setRetorno(!!v)} />
              <Label htmlFor="ret" className="cursor-pointer">Retorno</Label>
            </div>
            {retorno && (
              <div className="col-span-2">
                <Label>Data de retorno</Label>
                <Input placeholder="DD/MM/AAAA" value={dataRetorno} onChange={(e) => setDataRetorno(maskDate(e.target.value))} inputMode="numeric" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={askRetorno} onOpenChange={setAskRetorno}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja agendar retorno?</AlertDialogTitle>
            <AlertDialogDescription>
              Retorno em {pendingRetorno ? isoDateToBr(pendingRetorno.data) : ""}. Informe o horário:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="HH:MM" value={horaRetornoInput} onChange={(e) => setHoraRetornoInput(maskTime(e.target.value))} inputMode="numeric" />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setAskRetorno(false); onOpenChange(false); onSaved?.(); }}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRetorno}>Sim, agendar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}