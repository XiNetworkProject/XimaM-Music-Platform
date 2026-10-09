-- Prepared only. Do not run against production without release approval.
-- Purpose: durable owner-scoped Studio tasks and atomic, idempotent credit reservations.
-- No existing song, price or credit balance is modified by this migration.
-- Runner owns transaction/history. Rollback: disable STUDIO_TOOLS_ENABLED;
-- retain this table for reconciliation, refunds and user exports (never DROP jobs).
SET LOCAL lock_timeout = '3s';
CREATE TABLE public.studio_tool_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  request_hash text NOT NULL,
  action text NOT NULL CHECK (action IN ('extend','replace','vocals','instrumental','mashup','sounds','style','persona','stems','stems_multi','stems_instrument','wav','midi','cover','recovery')),
  input jsonb NOT NULL,
  model text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'submitting' CHECK (status IN ('submitting','pending','uncertain','completed','failed')),
  credits integer NOT NULL CHECK (credits BETWEEN 0 AND 1000),
  refunded boolean NOT NULL DEFAULT false,
  provider_task_id text,
  result jsonb NOT NULL DEFAULT '{"assets":[]}'::jsonb,
  generation_id uuid REFERENCES public.ai_generations(id) ON DELETE SET NULL,
  last_polled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_key),
  CHECK (NOT refunded OR status = 'failed')
);
CREATE INDEX studio_tool_jobs_owner_recent ON public.studio_tool_jobs(user_id, created_at DESC);
CREATE UNIQUE INDEX studio_tool_jobs_provider_unique ON public.studio_tool_jobs(provider_task_id) WHERE provider_task_id IS NOT NULL;
-- Only the existing trusted server role (BYPASSRLS) may access these jobs.
-- No browser role receives a policy or direct table privileges.
ALTER TABLE public.studio_tool_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.studio_tool_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.studio_tool_jobs TO synaura_app;
