-- ============================================================
-- Star Academy TikTok × Synaura — Migration SQL
-- ============================================================

-- Extension pour générer des bytes aléatoires (tracking token)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────
-- Table principale des candidatures
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.star_academy_applications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Identité
  full_name             text        NOT NULL,
  age                   integer     NOT NULL CHECK (age >= 13 AND age <= 99),
  email                 text        NOT NULL,
  phone                 text,
  location              text        NOT NULL,

  -- Profil artistique
  tiktok_handle         text        NOT NULL,
  category              text        NOT NULL,
  level                 text,
  link                  text,

  -- Présentation
  bio                   text        NOT NULL,
  availability          text,

  -- Fichier audio
  audio_url             text,
  audio_filename        text,

  -- Compte Synaura créé lors de l'inscription
  synaura_username      text,
  user_id               uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Gestion du statut
  status                text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  admin_notes           text,

  -- Suivi candidat (token unique envoyé par email)
  tracking_token        text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Horodatage des notifications envoyées
  notification_sent_at  timestamptz,

  -- Unicité par email
  UNIQUE(email)
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_sa_applications_status ON public.star_academy_applications(status);
CREATE INDEX IF NOT EXISTS idx_sa_applications_email  ON public.star_academy_applications(email);
CREATE INDEX IF NOT EXISTS idx_sa_applications_token  ON public.star_academy_applications(tracking_token);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_sa_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sa_updated_at ON public.star_academy_applications;
CREATE TRIGGER trg_sa_updated_at
  BEFORE UPDATE ON public.star_academy_applications
  FOR EACH ROW EXECUTE FUNCTION update_sa_updated_at();

-- ────────────────────────────────────────────────────────────
-- Table de configuration du concours
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.star_academy_config (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Valeurs par défaut (modifiables depuis le panel admin ou Supabase)
INSERT INTO public.star_academy_config (key, value) VALUES
  ('max_candidates', '200'),
  ('deadline',       '2026-09-01'),
  ('is_open',        'true')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Bucket Supabase Storage pour les audios
-- ────────────────────────────────────────────────────────────
-- À exécuter dans l'interface Supabase Storage :
-- Créer un bucket "star-academy-audio" avec accès public = false

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.star_academy_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_academy_config       ENABLE ROW LEVEL SECURITY;

-- Candidatures : n'importe qui peut insérer (formulaire public)
CREATE POLICY "sa_public_insert" ON public.star_academy_applications
  FOR INSERT WITH CHECK (true);

-- Candidatures : lecture par le service role (admin) seulement
CREATE POLICY "sa_service_all" ON public.star_academy_applications
  USING (auth.role() = 'service_role');

-- Candidatures : un utilisateur connecté peut voir sa propre candidature
CREATE POLICY "sa_own_read" ON public.star_academy_applications
  FOR SELECT USING (user_id = auth.uid());

-- Config : lecture publique (affichage deadline/places restantes)
CREATE POLICY "sa_config_public_read" ON public.star_academy_config
  FOR SELECT USING (true);

-- Config : modification réservée au service role
CREATE POLICY "sa_config_service_write" ON public.star_academy_config
  USING (auth.role() = 'service_role');
