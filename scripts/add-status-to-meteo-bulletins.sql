-- Ajouter le champ status à la table meteo_bulletins
ALTER TABLE meteo_bulletins 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Mettre à jour les bulletins existants pour qu'ils soient tous 'published'
UPDATE meteo_bulletins 
SET status = 'published' 
WHERE status IS NULL OR status NOT IN ('draft', 'published');

-- Créer un index sur status pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_status ON meteo_bulletins(status);

