
CREATE TABLE public.consulentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  data_nascimento date,
  signo text,
  telefone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consulentes_user ON public.consulentes(user_id);

ALTER TABLE public.consulentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own consulentes select" ON public.consulentes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own consulentes insert" ON public.consulentes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own consulentes update" ON public.consulentes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own consulentes delete" ON public.consulentes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.atendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consulente_id uuid NOT NULL REFERENCES public.consulentes(id) ON DELETE CASCADE,
  data_atendimento date NOT NULL,
  hora_atendimento time NOT NULL,
  dia_semana text NOT NULL,
  duracao_minutos integer NOT NULL DEFAULT 60,
  tipo_jogo text,
  tipo_atendimento text NOT NULL DEFAULT 'presencial',
  trabalho text,
  observacoes text,
  retorno boolean NOT NULL DEFAULT false,
  data_retorno date,
  hora_retorno time,
  lembrete_semana_enviado boolean NOT NULL DEFAULT false,
  lembrete_2dias_enviado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_atendimentos_user ON public.atendimentos(user_id);
CREATE INDEX idx_atendimentos_consulente ON public.atendimentos(consulente_id);
CREATE INDEX idx_atendimentos_data ON public.atendimentos(data_atendimento, hora_atendimento);

ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own atendimentos select" ON public.atendimentos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own atendimentos insert" ON public.atendimentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own atendimentos update" ON public.atendimentos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own atendimentos delete" ON public.atendimentos FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consulentes_updated BEFORE UPDATE ON public.consulentes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_atendimentos_updated BEFORE UPDATE ON public.atendimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
