-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  last_payment_id TEXT,
  last_payment_status TEXT,
  reminder_10_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_5_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_1_sent BOOLEAN NOT NULL DEFAULT false,
  trial_expired_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_asaas_subscription_id ON public.subscriptions(asaas_subscription_id);
CREATE INDEX idx_subscriptions_asaas_customer_id ON public.subscriptions(asaas_customer_id);
CREATE INDEX idx_subscriptions_status_trial ON public.subscriptions(status, trial_ends_at);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "user inserts own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "superadmin updates subscriptions"
ON public.subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Update handle_new_user to create subscription with trial + auto-approve
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
    INSERT INTO public.account_approvals (user_id, email, status, approved_at)
      VALUES (NEW.id, NEW.email, 'approved', now())
      ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
      VALUES (NEW.id, 'trialing', now() + INTERVAL '30 days')
      ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: create trialing subscription for existing non-superadmin users that don't have one
INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
SELECT u.id, 'trialing', now() + INTERVAL '30 days'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'superadmin');