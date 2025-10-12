-- Tables et fonctions pour le système de crédits IA

-- 1) Table des soldes de crédits
CREATE TABLE IF NOT EXISTS public.ai_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;

-- Politiques (lecture propre utilisateur)
DROP POLICY IF EXISTS "read_own_ai_credits" ON public.ai_credit_balances;
CREATE POLICY "read_own_ai_credits" ON public.ai_credit_balances
  FOR SELECT USING (auth.uid() = user_id);

-- 2) Fonction: ajouter des crédits
CREATE OR REPLACE FUNCTION public.ai_add_credits(p_user_id uuid, p_amount integer)
RETURNS void AS $$
BEGIN
  INSERT INTO public.ai_credit_balances(user_id, balance)
  VALUES (p_user_id, GREATEST(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.ai_credit_balances.balance + GREATEST(p_amount, 0),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Fonction: débiter des crédits (avec garde non-négative)
CREATE OR REPLACE FUNCTION public.ai_debit_credits(p_user_id uuid, p_amount integer)
RETURNS boolean AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT balance INTO current_balance FROM public.ai_credit_balances WHERE user_id = p_user_id FOR UPDATE;
  IF current_balance IS NULL THEN
    current_balance := 0;
  END IF;
  IF current_balance < p_amount THEN
    RETURN FALSE; -- solde insuffisant
  END IF;
  UPDATE public.ai_credit_balances SET balance = balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Bonus d'inscription: 50 crédits pour chaque nouveau profil
-- Suppose une table profiles(id uuid) déjà en place
DROP TRIGGER IF EXISTS trg_ai_welcome_credits ON public.profiles;
DROP FUNCTION IF EXISTS public.ai_grant_welcome_credits();

CREATE OR REPLACE FUNCTION public.ai_grant_welcome_credits()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.ai_add_credits(NEW.id, 50);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_welcome_credits
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ai_grant_welcome_credits();

-- 5) Crédit mensuel selon plan (starter/pro/enterprise)
-- Ce job peut être exécuté via cron (pg_cron) ou edge function schedulée; voici la fonction
DROP FUNCTION IF EXISTS public.ai_grant_monthly_plan_credits();
CREATE OR REPLACE FUNCTION public.ai_grant_monthly_plan_credits()
RETURNS void AS $$
DECLARE r RECORD;
        plan text;
        amount integer;
BEGIN
  FOR r IN SELECT id, plan FROM public.profiles LOOP
    plan := COALESCE(r.plan, 'free');
    amount := CASE plan
      WHEN 'starter' THEN 120
      WHEN 'pro' THEN 360
      WHEN 'enterprise' THEN 1200
      ELSE 0
    END;
    IF amount > 0 THEN
      PERFORM public.ai_add_credits(r.id, amount);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


