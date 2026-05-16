import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { maskPhone, maskDate, brDateToIso, isoDateToBr, calcularSigno } from "@/lib/format";

type Consulente = {
  id?: string;
  nome: string;
  data_nascimento: string | null;
  signo: string | null;
  telefone: string | null;
};

export function ConsulenteFormDialog({
  open,
  onOpenChange,
  consulente,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consulente?: Consulente | null;
  onSaved?: () => void;
}) {
  const [nome, setNome] = useState("");
  const [nasc, setNasc] = useState("");
  const [tel, setTel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(consulente?.nome ?? "");
      setNasc(isoDateToBr(consulente?.data_nascimento ?? ""));
      setTel(consulente?.telefone ?? "");
    }
  }, [open, consulente]);

  const signoCalc = calcularSigno(brDateToIso(nasc));

  const save = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        user_id: userData.user!.id,
        nome: nome.trim(),
        data_nascimento: nasc ? brDateToIso(nasc) : null,
        signo: signoCalc || null,
        telefone: tel || null,
      };
      if (consulente?.id) {
        const { error } = await supabase.from("consulentes").update(payload).eq("id", consulente.id);
        if (error) throw error;
        toast.success("Consulente atualizado");
      } else {
        const { error } = await supabase.from("consulentes").insert(payload);
        if (error) throw error;
        toast.success("Consulente cadastrado");
      }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{consulente?.id ? "Editar consulente" : "Novo consulente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome*</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de nascimento</Label>
              <Input
                placeholder="DD/MM/AAAA"
                value={nasc}
                onChange={(e) => setNasc(maskDate(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label>Signo</Label>
              <Input value={signoCalc} readOnly className="bg-muted" />
            </div>
          </div>
          <div>
            <Label>Telefone / Celular</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={tel}
              onChange={(e) => setTel(maskPhone(e.target.value))}
              inputMode="tel"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}