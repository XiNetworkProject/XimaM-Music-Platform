-- ============================================================
-- Star Academy TikTok — Staff / Coachs — Migration SQL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.star_academy_staff_applications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Identite
  full_name             text        NOT NULL,
  age                   integer     NOT NULL CHECK (age >= 18 AND age <= 99),
  email                 text        NOT NULL,
  phone                 text,
  location              text        NOT NULL,

  -- Profil
  role                  text        NOT NULL
                                    CHECK (role IN ('coach_vocal', 'coach_scenique', 'direction_musicale', 'jury', 'production', 'autre')),
  experience            text        NOT NULL,
  speciality            text,
  tiktok_handle         text,
  portfolio_url         text,

  -- Motivation
  motivation            text        NOT NULL,
  availability          text        NOT NULL,

  -- Compte Synaura
  synaura_username      text,
  user_id               uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Gestion
  status                text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  admin_notes           text,
  tracking_token        text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  notification_sent_at  timestamptz,

  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_sa_staff_status ON public.star_academy_staff_applications(status);
CREATE INDEX IF NOT EXISTS idx_sa_staff_email  ON public.star_academy_staff_applications(email);
CREATE INDEX IF NOT EXISTS idx_sa_staff_role   ON public.star_academy_staff_applications(role);
CREATE INDEX IF NOT EXISTS idx_sa_staff_token  ON public.star_academy_staff_applications(tracking_token);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_sa_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sa_staff_updated_at ON public.star_academy_staff_applications;
CREATE TRIGGER trg_sa_staff_updated_at
  BEFORE UPDATE ON public.star_academy_staff_applications
  FOR EACH ROW EXECUTE FUNCTION update_sa_staff_updated_at();

-- RLS
ALTER TABLE public.star_academy_staff_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_staff_public_insert" ON public.star_academy_staff_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "sa_staff_service_all" ON public.star_academy_staff_applications
  USING (auth.role() = 'service_role');

CREATE POLICY "sa_staff_own_read" ON public.star_academy_staff_applications
  FOR SELECT USING (user_id = auth.uid());
