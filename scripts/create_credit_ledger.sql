-- ──────────────────────────────────────────────────────────────
-- Credit ledger + mise à jour des RPC pour traçabilité
-- À exécuter APRÈS create_ai_credits.sql
-- ──────────────────────────────────────────────────────────────

-- 1) Table ledger : journal de tous les mouvements de crédits
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  source text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_source ON public.credit_ledger(source);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_ledger" ON public.credit_ledger;
CREATE POLICY "read_own_ledger" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- 2) Mise à jour ai_add_credits avec écriture ledger
CREATE OR REPLACE FUNCTION public.ai_add_credits(
  p_user_id uuid,
  p_amount integer,
  p_source text DEFAULT 'admin_adjustment',
  p_description text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  new_balance integer;
BEGIN
  INSERT INTO public.ai_credit_balances(user_id, balance)
  VALUES (p_user_id, GREATEST(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.ai_credit_balances.balance + GREATEST(p_amount, 0),
        updated_at = NOW()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_ledger(user_id, delta, balance_after, source, description)
  VALUES (p_user_id, GREATEST(p_amount, 0), COALESCE(new_balance, p_amount), p_source, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Mise à jour ai_debit_credits avec écriture ledger
CREATE OR REPLACE FUNCTION public.ai_debit_credits(
  p_user_id uuid,
  p_amount integer,
  p_source text DEFAULT 'action_spend',
  p_description text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.ai_credit_balances
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id AND balance >= p_amount
    RETURNING balance INTO new_balance;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.credit_ledger(user_id, delta, balance_after, source, description)
  VALUES (p_user_id, -p_amount, new_balance, p_source, p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Mise à jour du trigger de bienvenue pour écrire dans le ledger
CREATE OR REPLACE FUNCTION public.ai_grant_welcome_credits()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.ai_add_credits(NEW.id, 50, 'welcome_bonus', 'Bonus inscription');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Mise à jour des crédits mensuels (nouveaux montants, sans Enterprise)
CREATE OR REPLACE FUNCTION public.ai_grant_monthly_plan_credits()
RETURNS void AS $$
DECLARE
  r RECORD;
  plan_name text;
  amount integer;
BEGIN
  FOR r IN SELECT id, plan FROM public.profiles LOOP
    plan_name := COALESCE(r.plan, 'free');
    amount := CASE plan_name
      WHEN 'starter' THEN 600
      WHEN 'pro' THEN 2400
      ELSE 0
    END;
    IF amount > 0 THEN
      PERFORM public.ai_add_credits(r.id, amount, 'subscription_grant',
        'Crédits mensuels plan ' || plan_name);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
