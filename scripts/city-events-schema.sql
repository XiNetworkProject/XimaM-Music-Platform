-- Synaura City events engine
-- Execute in Supabase SQL editor before enabling persisted City events.

CREATE TABLE IF NOT EXISTS public.city_events (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('friday_drop', 'challenge', 'battle', 'seasonal')),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'sparkles',
  accent text NOT NULL DEFAULT '#7C5CFF',
  week_key text NOT NULL,
  day_key text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'resolved', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  challenge_tag text,
  theme text,
  config jsonb NOT NULL DEFAULT '{}',
  reward jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.city_event_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.city_events(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  slot integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'algorithmic' CHECK (source IN ('algorithmic', 'curated', 'submission', 'winner')),
  score numeric,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, track_id)
);

CREATE TABLE IF NOT EXISTS public.city_event_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.city_events(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.city_event_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.city_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected', 'winner')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, track_id)
);

CREATE TABLE IF NOT EXISTS public.city_event_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.city_events(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rank integer NOT NULL DEFAULT 1,
  reason text,
  showcase_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  resolved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, rank)
);

CREATE TABLE IF NOT EXISTS public.city_user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.city_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_key text NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'expired')),
  metadata jsonb NOT NULL DEFAULT '{}',
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, reward_key)
);

CREATE INDEX IF NOT EXISTS idx_city_events_week ON public.city_events(week_key, kind);
CREATE INDEX IF NOT EXISTS idx_city_events_status ON public.city_events(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_city_event_tracks_event ON public.city_event_tracks(event_id, slot);
CREATE INDEX IF NOT EXISTS idx_city_event_tracks_track ON public.city_event_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_city_event_votes_event ON public.city_event_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_city_event_votes_track ON public.city_event_votes(event_id, track_id);
CREATE INDEX IF NOT EXISTS idx_city_event_votes_user ON public.city_event_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_city_event_participations_event ON public.city_event_participations(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_city_event_participations_user ON public.city_event_participations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_city_event_winners_event ON public.city_event_winners(event_id);
CREATE INDEX IF NOT EXISTS idx_city_user_rewards_user ON public.city_user_rewards(user_id, status);

CREATE OR REPLACE FUNCTION public.update_city_events_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_city_events_updated_at ON public.city_events;
CREATE TRIGGER trg_city_events_updated_at
BEFORE UPDATE ON public.city_events
FOR EACH ROW EXECUTE FUNCTION public.update_city_events_updated_at();

DROP TRIGGER IF EXISTS trg_city_event_votes_updated_at ON public.city_event_votes;
CREATE TRIGGER trg_city_event_votes_updated_at
BEFORE UPDATE ON public.city_event_votes
FOR EACH ROW EXECUTE FUNCTION public.update_city_events_updated_at();

DROP TRIGGER IF EXISTS trg_city_event_participations_updated_at ON public.city_event_participations;
CREATE TRIGGER trg_city_event_participations_updated_at
BEFORE UPDATE ON public.city_event_participations
FOR EACH ROW EXECUTE FUNCTION public.update_city_events_updated_at();

ALTER TABLE public.city_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_event_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_event_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_event_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_event_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_user_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "City events are public" ON public.city_events;
CREATE POLICY "City events are public" ON public.city_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "City event tracks are public" ON public.city_event_tracks;
CREATE POLICY "City event tracks are public" ON public.city_event_tracks FOR SELECT USING (true);

DROP POLICY IF EXISTS "City votes are readable" ON public.city_event_votes;
CREATE POLICY "City votes are readable" ON public.city_event_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage their city votes" ON public.city_event_votes;
CREATE POLICY "Users manage their city votes" ON public.city_event_votes
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "City participations are readable" ON public.city_event_participations;
CREATE POLICY "City participations are readable" ON public.city_event_participations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage their city participations" ON public.city_event_participations;
CREATE POLICY "Users manage their city participations" ON public.city_event_participations
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "City winners are public" ON public.city_event_winners;
CREATE POLICY "City winners are public" ON public.city_event_winners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users read their city rewards" ON public.city_user_rewards;
CREATE POLICY "Users read their city rewards" ON public.city_user_rewards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their city rewards" ON public.city_user_rewards;
CREATE POLICY "Users update their city rewards" ON public.city_user_rewards
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
