-- Ajouter le champ scheduled_at à la table meteo_bulletins
ALTER TABLE meteo_bulletins 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Mettre à jour la contrainte CHECK pour inclure 'scheduled' dans status
ALTER TABLE meteo_bulletins 
DROP CONSTRAINT IF EXISTS meteo_bulletins_status_check;

ALTER TABLE meteo_bulletins 
ADD CONSTRAINT meteo_bulletins_status_check 
CHECK (status IN ('draft', 'published', 'scheduled'));

-- Créer un index sur scheduled_at pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_scheduled_at ON meteo_bulletins(scheduled_at) 
WHERE scheduled_at IS NOT NULL;

