-- Albums schema: create albums table and link tracks to albums

-- Create albums table
CREATE TABLE IF NOT EXISTS public.albums (
  id                text PRIMARY KEY,
  title             text NOT NULL,
  description       text NULL,
  cover_url         text NULL,
  cover_public_id   text NULL,
  creator_id        uuid NOT NULL,
  is_public         boolean NOT NULL DEFAULT true,
  released_at       timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Optional: reference to auth.users if available; ignore failures if RLS prevents it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.albums
      ADD CONSTRAINT albums_creator_fk FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  -- Ignore if constraint already exists or not allowed
  NULL;
END $$;

-- Add album linkage to tracks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'album_id'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN album_id text NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'track_number'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN track_number integer NULL;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- Add FK if possible
DO $$
BEGIN
  ALTER TABLE public.tracks
    ADD CONSTRAINT tracks_album_fk FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tracks_album ON public.tracks (album_id, track_number);


