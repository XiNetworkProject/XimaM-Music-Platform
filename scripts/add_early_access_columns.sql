-- Ajoute des colonnes d'accès anticipé sur profiles si manquantes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_early_access'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_early_access BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'early_access_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN early_access_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_waitlisted'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_waitlisted BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Index utiles
CREATE INDEX IF NOT EXISTS profiles_is_early_access_idx ON public.profiles (is_early_access);
