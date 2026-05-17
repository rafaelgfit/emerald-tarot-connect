import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserSettings = {
  user_id: string;
  whatsapp_remetente: string | null;
  mensagem_template: string;
  display_name: string | null;
  telefone: string | null;
  tema: "light" | "dark";
  paleta: string;
  duracao_padrao_minutos: number;
  horario_inicio: string | null;
  horario_fim: string | null;
};

export const DEFAULT_TEMPLATE =
  "Oi, {nome}, tudo bem? Passando para lembrar você que seu atendimento será no dia {data} às {hora}. Caso precise remarcar, nos envie uma mensagem.";

const DEFAULTS: Omit<UserSettings, "user_id"> = {
  whatsapp_remetente: null,
  mensagem_template: DEFAULT_TEMPLATE,
  display_name: null,
  telefone: null,
  tema: "light",
  paleta: "esmeralda",
  duracao_padrao_minutos: 60,
  horario_inicio: null,
  horario_fim: null,
};

const Ctx = createContext<UserSettings | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async (): Promise<UserSettings | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: row } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return (row as UserSettings | null) ?? { user_id: u.user.id, ...DEFAULTS };
    },
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const tema = data?.tema ?? "light";
    const paleta = data?.paleta ?? "esmeralda";
    document.documentElement.classList.toggle("dark", tema === "dark");
    document.documentElement.setAttribute("data-palette", paleta);
  }, [data?.tema, data?.paleta]);

  return <Ctx.Provider value={data ?? null}>{children}</Ctx.Provider>;
}

export function useUserSettings(): UserSettings {
  const v = useContext(Ctx);
  if (v) return v;
  return { user_id: "", ...DEFAULTS };
}

export function useInvalidateSettings() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["user-settings"] });
}

export function montarMensagem(
  template: string,
  vars: { nome: string; data: string; hora: string },
): string {
  return template
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{data}", vars.data)
    .replaceAll("{hora}", vars.hora);
}

export const PALETAS = [
  { id: "esmeralda", label: "Esmeralda & Dourado", swatch: ["#1e7a5f", "#d4a84a"] },
  { id: "roxo", label: "Roxo Místico", swatch: ["#6b46c1", "#d4a84a"] },
  { id: "oceano", label: "Oceano Profundo", swatch: ["#1e6091", "#5cc3c0"] },
  { id: "rose", label: "Rosé & Bordô", swatch: ["#a83253", "#e8a87c"] },
] as const;
