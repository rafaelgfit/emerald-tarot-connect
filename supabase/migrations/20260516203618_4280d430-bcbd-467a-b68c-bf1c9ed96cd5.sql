CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) = 'lovableadmin@gmail.com' THEN
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
$function$;

-- Backfill se a conta já existir
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'lovableadmin@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'superadmin')
      ON CONFLICT DO NOTHING;
    INSERT INTO public.account_approvals (user_id, email, status, approved_at)
      VALUES (v_uid, 'lovableadmin@gmail.com', 'approved', now())
      ON CONFLICT (user_id) DO UPDATE SET status = 'approved', approved_at = now();
  END IF;
END $$;