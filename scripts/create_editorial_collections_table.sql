CREATE TABLE IF NOT EXISTS public.editorial_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL UNIQUE REFERENCES public.playlists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'collection',
  banner_url TEXT,
  cover_url TEXT,
  theme_colors JSONB NOT NULL DEFAULT '["#8B5CF6", "#EC4899", "#22D3EE"]'::jsonb,
  badge TEXT NOT NULL DEFAULT 'Synaura Originals',
  is_featured BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  download_enabled BOOLEAN NOT NULL DEFAULT true,
  comments_enabled BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS editorial_collections_published_idx
  ON public.editorial_collections (is_published, is_featured, position, created_at DESC);

CREATE INDEX IF NOT EXISTS editorial_collections_slug_idx
  ON public.editorial_collections (slug);

CREATE OR REPLACE FUNCTION public.touch_editorial_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_editorial_collections_updated_at ON public.editorial_collections;
CREATE TRIGGER touch_editorial_collections_updated_at
  BEFORE UPDATE ON public.editorial_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_editorial_collections_updated_at();

ALTER TABLE public.editorial_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published editorial collections are public" ON public.editorial_collections;
CREATE POLICY "Published editorial collections are public"
  ON public.editorial_collections
  FOR SELECT
  USING (is_published = true);

