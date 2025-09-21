-- Ajoute colonnes manquantes pour stockage/public_id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tracks' AND column_name='audio_public_id'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN audio_public_id text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tracks' AND column_name='cover_public_id'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN cover_public_id text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tracks' AND column_name='audio_size_mb'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN audio_size_mb numeric;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tracks' AND column_name='cover_size_mb'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN cover_size_mb numeric;
  END IF;
END $$;
