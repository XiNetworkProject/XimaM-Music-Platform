-- Schéma Boosters & Missions (idempotent)
-- À exécuter dans Supabase SQL editor

-- Table des boosters disponibles (catalogue)
CREATE TABLE IF NOT EXISTS public.boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('track','artist')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common','rare','epic')),
  multiplier NUMERIC NOT NULL CHECK (multiplier >= 1.0),
  duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventaire des boosters possédés par l'utilisateur
CREATE TABLE IF NOT EXISTS public.user_boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booster_id UUID NOT NULL REFERENCES public.boosters(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'owned' CHECK (status IN ('owned','used')),
  obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_user_boosters_user ON public.user_boosters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosters_status ON public.user_boosters(status);

-- Boosts actifs appliqués aux pistes
CREATE TABLE IF NOT EXISTS public.active_track_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booster_id UUID NOT NULL REFERENCES public.boosters(id) ON DELETE RESTRICT,
  multiplier NUMERIC NOT NULL CHECK (multiplier >= 1.0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'booster'
);
CREATE INDEX IF NOT EXISTS idx_active_boosts_track ON public.active_track_boosts(track_id);
CREATE INDEX IF NOT EXISTS idx_active_boosts_expires ON public.active_track_boosts(expires_at);

-- Ouverture quotidienne (cooldown / streak)
CREATE TABLE IF NOT EXISTS public.user_booster_daily (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_opened_at TIMESTAMPTZ,
  streak INTEGER NOT NULL DEFAULT 0
);

-- Missions de base
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('plays','likes','shares')),
  threshold INTEGER NOT NULL CHECK (threshold > 0),
  reward_booster_id UUID REFERENCES public.boosters(id) ON DELETE SET NULL,
  cooldown_hours INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_progress_at TIMESTAMPTZ,
  claimed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON public.user_missions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_mission ON public.user_missions(user_id, mission_id);

-- Seed minimal boosters (si absents)
INSERT INTO public.boosters (key, name, description, type, rarity, multiplier, duration_hours)
SELECT 'track_boost_common', 'Boost de piste (x1.15 / 6h)', 'Augmente le score de ranking de la piste', 'track', 'common', 1.15, 6
WHERE NOT EXISTS (SELECT 1 FROM public.boosters WHERE key='track_boost_common');

INSERT INTO public.boosters (key, name, description, type, rarity, multiplier, duration_hours)
SELECT 'artist_boost_rare', 'Boost d’artiste (24h)', 'Mise en avant de l’artiste', 'artist', 'rare', 1.20, 24
WHERE NOT EXISTS (SELECT 1 FROM public.boosters WHERE key='artist_boost_rare');

INSERT INTO public.boosters (key, name, description, type, rarity, multiplier, duration_hours)
SELECT 'track_boost_epic', 'Boost épique de piste (x1.30 / 6h)', 'Gros coup de projecteur temporaire', 'track', 'epic', 1.30, 6
WHERE NOT EXISTS (SELECT 1 FROM public.boosters WHERE key='track_boost_epic');


