-- Défis musicaux V1
-- Execute in Supabase SQL editor before enabling Défis musicaux.

CREATE TABLE IF NOT EXISTS public.music_challenges (
  id text PRIMARY KEY,
  title text NOT NULL,
  prompt text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('clip', 'variation', 'track', 'open')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  accent_color text,
  cover_url text,
  source_track_id text,
  source_track_type text CHECK (source_track_type IN ('track', 'ai_track')),
  club_slug text CHECK (club_slug IN ('feedback', 'collab', 'remix', 'ai')),
  started_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL REFERENCES public.music_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('clip', 'variation', 'track')),
  content_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_music_challenges_window ON public.music_challenges(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_music_challenges_source_track ON public.music_challenges(source_track_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON public.challenge_entries(challenge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_user ON public.challenge_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_content ON public.challenge_entries(content_type, content_id);

CREATE OR REPLACE FUNCTION public.update_music_challenges_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_music_challenges_updated_at ON public.music_challenges;
CREATE TRIGGER trg_music_challenges_updated_at
BEFORE UPDATE ON public.music_challenges
FOR EACH ROW EXECUTE FUNCTION public.update_music_challenges_updated_at();

ALTER TABLE public.music_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

-- Lecture publique restreinte aux défis déjà commencés (actifs ou terminés) ;
-- un défi "upcoming" reste invisible à toute lecture directe anon/authenticated.
-- L'API (rôle service, supabaseAdmin) continue de tout lire, RLS ou pas.
DROP POLICY IF EXISTS "Music challenges are public" ON public.music_challenges;
CREATE POLICY "Music challenges are public" ON public.music_challenges
FOR SELECT USING (starts_at <= now());

-- challenge_entries : aucune policy pour anon/authenticated (ni SELECT, ni
-- INSERT, ni UPDATE, ni DELETE). Seul le rôle service peut lire ou écrire
-- cette table, via POST /api/challenges/[id]/participate (validations
-- complètes : défi actif, type compatible, propriété, contenu publié) et
-- GET /api/challenges/[id] (revalidation live du contenu source). Impossible
-- de créer ou lire une participation par un insert/select Supabase direct.
