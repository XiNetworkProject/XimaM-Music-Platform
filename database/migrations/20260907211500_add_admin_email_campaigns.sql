-- Objectif: persister l'historique de la route admin d'envoi de campagnes.
-- Preconditions: public.profiles existe; public.admin_email_campaigns est absente.
-- Verrou/volume: creation d'une table vide et de deux index vides; verrou bref.
-- Validation: insertion/lecture sous synaura_app puis controle des grants et RLS.
-- Retour: DROP TABLE public.admin_email_campaigns; aucune donnee historique preexistante.

CREATE TABLE public.admin_email_campaigns (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_id uuid,
  template text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  cta_label text,
  cta_url text,
  target text NOT NULL,
  recipient_count integer DEFAULT 0 NOT NULL,
  sent_count integer DEFAULT 0 NOT NULL,
  failed_count integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT admin_email_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT admin_email_campaigns_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT admin_email_campaigns_target_check
    CHECK (target = ANY (ARRAY['all'::text, 'specific'::text])),
  CONSTRAINT admin_email_campaigns_counts_check
    CHECK (
      recipient_count >= 0
      AND sent_count >= 0
      AND failed_count >= 0
      AND sent_count + failed_count <= recipient_count
    )
);

ALTER TABLE public.admin_email_campaigns OWNER TO postgres;
ALTER TABLE public.admin_email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX admin_email_campaigns_created_at_idx
  ON public.admin_email_campaigns (created_at DESC);
CREATE INDEX admin_email_campaigns_admin_id_idx
  ON public.admin_email_campaigns (admin_id);

REVOKE ALL ON TABLE public.admin_email_campaigns FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_email_campaigns TO synaura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_email_campaigns TO service_role;
