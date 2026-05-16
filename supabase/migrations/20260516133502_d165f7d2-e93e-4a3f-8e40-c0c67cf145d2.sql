-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('superadmin', 'user');

-- Tabela de papéis
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para checar papel (security definer evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies user_roles
CREATE POLICY "user sees own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "superadmin manages roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Tabela de aprovação de contas
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.account_approvals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own approval"
  ON public.account_approvals FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "superadmin updates approvals"
  ON public.account_approvals FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "superadmin deletes approvals"
  ON public.account_approvals FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_account_approvals_updated_at
BEFORE UPDATE ON public.account_approvals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger no signup: cria papel + status de aprovação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'admin@local' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin')
      ON CONFLICT DO NOTHING;
    INSERT INTO public.account_approvals (user_id, email, status, approved_at)
      VALUES (NEW.id, NEW.email, 'approved', now())
      ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
      ON CONFLICT DO NOTHING;
    INSERT INTO public.account_approvals (user_id, email, status)
      VALUES (NEW.id, NEW.email, 'pending')
      ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill para usuários já existentes
INSERT INTO public.user_roles (user_id, role)
SELECT id, CASE WHEN lower(email) = 'admin@local' THEN 'superadmin'::public.app_role ELSE 'user'::public.app_role END
FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.account_approvals (user_id, email, status, approved_at)
SELECT id, email,
  CASE WHEN lower(email) = 'admin@local' THEN 'approved'::public.approval_status ELSE 'pending'::public.approval_status END,
  CASE WHEN lower(email) = 'admin@local' THEN now() ELSE NULL END
FROM auth.users
ON CONFLICT DO NOTHING;