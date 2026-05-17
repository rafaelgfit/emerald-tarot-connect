import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, MessageCircle, User, Palette, Clock } from "lucide-react";
import { maskPhone, maskTime, normalizeTime } from "@/lib/format";
import {
  PALETAS,
  DEFAULT_TEMPLATE,
  useUserSettings,
  useInvalidateSettings,
} from "@/hooks/use-user-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  const s = useUserSettings();
  const invalidate = useInvalidateSettings();

  const [whatsappRemetente, setWhatsappRemetente] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [displayName, setDisplayName] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tema, setTema] = useState<"light" | "dark">("light");
  const [paleta, setPaleta] = useState("esmeralda");
  const [duracao, setDuracao] = useState("60");
  const [horaIni, setHoraIni] = useState("");
  const [horaFim, setHoraFim] = useState("");

  useEffect(() => {
    setWhatsappRemetente(s.whatsapp_remetente ?? "");
    setTemplate(s.mensagem_template || DEFAULT_TEMPLATE);
    setDisplayName(s.display_name ?? "");
    setTelefone(s.telefone ? maskPhone(s.telefone) : "");
    setTema(s.tema);
    setPaleta(s.paleta);
    setDuracao(String(s.duracao_padrao_minutos));
    setHoraIni(s.horario_inicio?.slice(0, 5) ?? "");
    setHoraFim(s.horario_fim?.slice(0, 5) ?? "");
  }, [s]);

  // Live-preview tema/paleta while editing
  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
    document.documentElement.setAttribute("data-palette", paleta);
  }, [tema, paleta]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const hi = horaIni ? normalizeTime(horaIni) : null;
      const hf = horaFim ? normalizeTime(horaFim) : null;
      if (horaIni && !hi) throw new Error("Horário de início inválido");
      if (horaFim && !hf) throw new Error("Horário de fim inválido");
      const dur = parseInt(duracao, 10);
      if (!dur || dur < 15) throw new Error("Duração mínima de 15 minutos");

      const payload = {
        user_id: u.user.id,
        whatsapp_remetente: whatsappRemetente.replace(/\D/g, "") || null,
        mensagem_template: template.trim() || DEFAULT_TEMPLATE,
        display_name: displayName.trim() || null,
        telefone: telefone.replace(/\D/g, "") || null,
        tema,
        paleta,
        duracao_padrao_minutos: dur,
        horario_inicio: hi,
        horario_fim: hf,
      };
      const { error } = await supabase
        .from("user_settings")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Configurações salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-serif">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Personalize suas preferências. Tudo aqui é individual da sua conta.
        </p>
      </header>

      <div className="space-y-6">
        {/* Perfil */}
        <Card className="p-6">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <User className="size-4 text-primary" /> Perfil
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome de exibição</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                maxLength={120}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
              />
            </div>
          </div>
        </Card>

        {/* WhatsApp */}
        <Card className="p-6">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <MessageCircle className="size-4 text-primary" /> WhatsApp dos lembretes
          </h2>
          <div className="space-y-4">
            <div>
              <Label>Número remetente</Label>
              <Input
                value={whatsappRemetente}
                onChange={(e) => setWhatsappRemetente(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número que aparece como remetente na sua identificação. O WhatsApp Web abre no número do consulente.
              </p>
            </div>
            <div>
              <Label>Template da mensagem</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis disponíveis: <code>{"{nome}"}</code>, <code>{"{data}"}</code>, <code>{"{hora}"}</code>.
              </p>
            </div>
          </div>
        </Card>

        {/* Aparência */}
        <Card className="p-6">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <Palette className="size-4 text-primary" /> Aparência
          </h2>
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Tema</Label>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTema(t)}
                    className={cn(
                      "px-4 py-2 rounded-md border text-sm capitalize transition-colors",
                      tema === t
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {t === "light" ? "Claro" : "Escuro"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Paleta de cores</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PALETAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaleta(p.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      paleta === p.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="flex gap-1 mb-2">
                      {p.swatch.map((c) => (
                        <span
                          key={c}
                          className="size-6 rounded-full border border-border/50"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Agenda */}
        <Card className="p-6">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <Clock className="size-4 text-primary" /> Preferências de agenda
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Duração padrão (min)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
              />
            </div>
            <div>
              <Label>Início do expediente</Label>
              <Input
                placeholder="HH:MM"
                value={horaIni}
                onChange={(e) => setHoraIni(maskTime(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label>Fim do expediente</Label>
              <Input
                placeholder="HH:MM"
                value={horaFim}
                onChange={(e) => setHoraFim(maskTime(e.target.value))}
                inputMode="numeric"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg">
            <Save className="size-4 mr-2" />
            {save.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
