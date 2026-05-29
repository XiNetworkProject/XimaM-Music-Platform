CREATE TABLE IF NOT EXISTS public.recommendation_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL,
  session_id text NULL,
  content_type text NOT NULL CHECK (content_type IN ('track', 'post')),
  content_id text NOT NULL,
  source text NULL,
  rank integer NULL,
  score numeric NULL,
  reasons text[] NULL
);

CREATE INDEX IF NOT EXISTS idx_reco_impressions_user_created
  ON public.recommendation_impressions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reco_impressions_content_created
  ON public.recommendation_impressions (content_type, content_id, created_at DESC);

