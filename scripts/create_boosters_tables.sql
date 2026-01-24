-- Schéma Boosters & Missions (idempotent)
-- À exécuter dans Supabase SQL editor

-- Table des boosters disponibles (catalogue)
CREATE TABLE IF NOT EXISTS public.boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('track','artist')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  multiplier NUMERIC NOT NULL CHECK (multiplier >= 1.0),
  duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la table existait déjà, élargir la contrainte de rareté (idempotent)
ALTER TABLE public.boosters DROP CONSTRAINT IF EXISTS boosters_rarity_check;
ALTER TABLE public.boosters
  ADD CONSTRAINT boosters_rarity_check CHECK (rarity IN ('common','rare','epic','legendary'));

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

-- Boosts actifs appliqués aux artistes
CREATE TABLE IF NOT EXISTS public.active_artist_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booster_id UUID NOT NULL REFERENCES public.boosters(id) ON DELETE RESTRICT,
  multiplier NUMERIC NOT NULL CHECK (multiplier >= 1.0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'booster'
);
CREATE INDEX IF NOT EXISTS idx_active_artist_boosts_artist ON public.active_artist_boosts(artist_id);
CREATE INDEX IF NOT EXISTS idx_active_artist_boosts_expires ON public.active_artist_boosts(expires_at);

-- Ouverture quotidienne (cooldown / streak)
CREATE TABLE IF NOT EXISTS public.user_booster_daily (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_opened_at TIMESTAMPTZ,
  streak INTEGER NOT NULL DEFAULT 0
);

-- Pity / anti-malchance (compteurs d'ouvertures depuis une rareté)
CREATE TABLE IF NOT EXISTS public.user_booster_pity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opens_since_rare INTEGER NOT NULL DEFAULT 0,
  opens_since_epic INTEGER NOT NULL DEFAULT 0,
  opens_since_legendary INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historique des ouvertures (daily / pack / mission)
CREATE TABLE IF NOT EXISTS public.user_booster_open_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'daily',
  booster_id UUID REFERENCES public.boosters(id) ON DELETE SET NULL,
  booster_key TEXT,
  rarity TEXT,
  type TEXT,
  multiplier NUMERIC,
  duration_hours INTEGER
);
CREATE INDEX IF NOT EXISTS idx_user_booster_history_user ON public.user_booster_open_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_booster_history_opened ON public.user_booster_open_history(opened_at);

-- Packs abonnés (claims hebdo)
CREATE TABLE IF NOT EXISTS public.user_booster_pack_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  claimed_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pack_claim_user_period ON public.user_booster_pack_claims(user_id, pack_key, period_start);

-- Missions de base
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('plays','likes','shares','boosts')),
  threshold INTEGER NOT NULL CHECK (threshold > 0),
  reward_booster_id UUID REFERENCES public.boosters(id) ON DELETE SET NULL,
  cooldown_hours INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la table existait déjà, élargir la contrainte goal_type (idempotent)
ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_goal_type_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_goal_type_check CHECK (goal_type IN ('plays','likes','shares','boosts'));

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

-- Daily Spin (roue quotidienne)
CREATE TABLE IF NOT EXISTS public.user_daily_spin (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_spun_at TIMESTAMPTZ,
  streak INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_daily_spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spun_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result_key TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_payload JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_user_daily_spin_history_user ON public.user_daily_spin_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_spin_history_spun ON public.user_daily_spin_history(spun_at);

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

-- Nouveaux boosters (meilleure progression + une vraie "chase" légendaire)
INSERT INTO public.boosters (key, name, description, type, rarity, multiplier, duration_hours)
SELECT 'track_boost_rare', 'Boost rare de piste (x1.22 / 12h)', 'Bon push + durée plus longue', 'track', 'rare', 1.22, 12
WHERE NOT EXISTS (SELECT 1 FROM public.boosters WHERE key='track_boost_rare');

INSERT INTO public.boosters (key, name, description, type, rarity, multiplier, duration_hours)
SELECT 'artist_boost_epic', 'Boost épique d’artiste (48h)', 'Mise en avant plus forte sur la page artiste', 'artist', 'epic', 1.35, 48
WHERE NOT EXISTS (SELECT 1 FROM public.boosters WHERE key='artist_boost_epic');

INSERT INTO public.boosters (key, name, description, type, rarity, multiplier, duration_hours)
SELECT 'track_boost_legendary', 'Boost légendaire de piste (x1.55 / 12h)', 'Coup de projecteur massif (très rare)', 'track', 'legendary', 1.55, 12
WHERE NOT EXISTS (SELECT 1 FROM public.boosters WHERE key='track_boost_legendary');

-- Seed missions (daily/weekly) (idempotent)
-- Note: reward_booster_id est optionnel; on le mappe par booster.key quand possible.
INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'daily_plays_3',
  'Daily: écouter 3 musiques jusqu’au bout',
  'plays',
  3,
  (SELECT id FROM public.boosters WHERE key='track_boost_common' LIMIT 1),
  24,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='daily_plays_3');

INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'daily_likes_2',
  'Daily: liker 2 musiques',
  'likes',
  2,
  (SELECT id FROM public.boosters WHERE key='track_boost_common' LIMIT 1),
  24,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='daily_likes_2');

INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'daily_shares_1',
  'Daily: partager 1 musique',
  'shares',
  1,
  (SELECT id FROM public.boosters WHERE key='track_boost_common' LIMIT 1),
  24,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='daily_shares_1');

INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'weekly_plays_20',
  'Weekly: 20 écoutes complètes',
  'plays',
  20,
  (SELECT id FROM public.boosters WHERE key='track_boost_rare' LIMIT 1),
  168,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='weekly_plays_20');

INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'weekly_likes_10',
  'Weekly: liker 10 musiques',
  'likes',
  10,
  (SELECT id FROM public.boosters WHERE key='artist_boost_rare' LIMIT 1),
  168,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='weekly_likes_10');

INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'weekly_shares_5',
  'Weekly: partager 5 musiques',
  'shares',
  5,
  (SELECT id FROM public.boosters WHERE key='track_boost_epic' LIMIT 1),
  168,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='weekly_shares_5');

INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'daily_boosts_1',
  'Daily: utiliser 1 booster',
  'boosts',
  1,
  (SELECT id FROM public.boosters WHERE key='track_boost_common' LIMIT 1),
  24,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='daily_boosts_1');

INSERT INTO public.missions (key, title, goal_type, threshold, reward_booster_id, cooldown_hours, enabled)
SELECT
  'weekly_boosts_3',
  'Weekly: utiliser 3 boosters',
  'boosts',
  3,
  (SELECT id FROM public.boosters WHERE key='track_boost_rare' LIMIT 1),
  168,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE key='weekly_boosts_3');


