-- Créer la table meteo_views pour logger les vues des bulletins
CREATE TABLE IF NOT EXISTS meteo_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id UUID NOT NULL REFERENCES meteo_bulletins(id) ON DELETE CASCADE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur bulletin_id pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meteo_views_bulletin_id ON meteo_views(bulletin_id);

-- Créer un index sur created_at pour les requêtes par date
CREATE INDEX IF NOT EXISTS idx_meteo_views_created_at ON meteo_views(created_at);

-- Créer un index composite sur bulletin_id et created_at pour les stats
CREATE INDEX IF NOT EXISTS idx_meteo_views_bulletin_created ON meteo_views(bulletin_id, created_at);

-- Créer un index sur source pour les stats par source
CREATE INDEX IF NOT EXISTS idx_meteo_views_source ON meteo_views(source) WHERE source IS NOT NULL;

