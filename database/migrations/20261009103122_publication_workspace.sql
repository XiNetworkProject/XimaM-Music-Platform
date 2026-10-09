-- Additive only: existing titles, media and publication states are untouched.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS data jsonb;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS cover_video_url text;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS cover_video_public_id text;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS cover_video_poster_url text;

-- Server-only receipt, committed in the same transaction as all release tracks.
CREATE TABLE public.publication_requests (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  request_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_key)
);
ALTER TABLE public.publication_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.publication_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.publication_requests TO synaura_app;
COMMENT ON TABLE public.publication_requests IS 'Server-owned publication receipts. No browser access; prevents duplicate releases after retries.';
