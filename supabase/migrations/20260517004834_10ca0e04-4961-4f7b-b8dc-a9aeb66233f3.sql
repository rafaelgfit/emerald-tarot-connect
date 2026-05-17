
CREATE TABLE public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  whatsapp_remetente TEXT,
  mensagem_template TEXT NOT NULL DEFAULT 'Oi, {nome}, tudo bem? Passando para lembrar você que seu atendimento será no dia {data} às {hora}. Caso precise remarcar, nos envie uma mensagem.',
  display_name TEXT,
  telefone TEXT,
  tema TEXT NOT NULL DEFAULT 'light',
  paleta TEXT NOT NULL DEFAULT 'esmeralda',
  duracao_padrao_minutos INTEGER NOT NULL DEFAULT 60,
  horario_inicio TIME,
  horario_fim TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own settings select" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own settings insert" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own settings update" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own settings delete" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
