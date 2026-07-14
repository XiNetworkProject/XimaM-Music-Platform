-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  platform text,
  device_name text,
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_kind ON public.push_subscriptions(user_id, p256dh);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access push" ON public.push_subscriptions;
CREATE POLICY "Service role full access push" ON public.push_subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "push_subs_own_read" ON public.push_subscriptions;
CREATE POLICY "push_subs_own_read" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
