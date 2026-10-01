-- Objective: add 36 distinct campaign/recharge boosters; preserve every old key,
-- owned inventory item, reward history and existing daily/pack rarity weight.
-- Preconditions: canonical production baseline + existing ai_add_credits function;
-- deploy the campaign-aware app before enabling acquisition of these new types.
-- Volume/lock: 36 catalogue inserts, brief ACCESS EXCLUSIVE lock on the small
-- boosters catalogue for its type constraint. No user inventory/balance writes.
-- Validation (read-only): SELECT type,rarity,count(*) FROM public.boosters
-- WHERE key LIKE 'campaign_%' GROUP BY type,rarity; expect 36 new keys total.
-- Rollback: disable only the 36 campaign keys (enabled=false), keep their IDs,
-- ledger and owned inventory. Keep the expanded constraint/compatible redemption
-- code while credit items exist; never delete rewards or revert credited balances.
-- The canonical runner owns transaction and migration history. Not applied here.
SET LOCAL lock_timeout = '3s';
ALTER TABLE public.boosters DROP CONSTRAINT boosters_type_check;
ALTER TABLE public.boosters ADD CONSTRAINT boosters_type_check
  CHECK (type IN ('track','artist','credits'));

WITH families(family,name,type,description,durations) AS (VALUES
  ('amplifier','Amplificateur','track','Priorité dans les recommandations Live et Découvrir.',ARRAY[3,6,12,24]),
  ('live','Pulse Live','track','Priorité ciblée dans le flux recommandé Live.',ARRAY[4,8,16,24]),
  ('radar','Radar','track','Priorité dans les recommandations de Découvrir.',ARRAY[6,12,24,48]),
  ('resonance','Résonance','track','Priorité auprès des auditeurs ayant une affinité musicale mesurée.',ARRAY[6,12,24,48]),
  ('horizon','Nouvel Horizon','track','Priorité auprès des auditeurs ne connaissant pas encore cet artiste.',ARRAY[6,12,24,48]),
  ('revival','Rappel','track','Relance des morceaux publiés depuis au moins 30 jours.',ARRAY[12,24,48,72]),
  ('release','Décollage','track','Priorité pour un morceau publié depuis moins de 14 jours.',ARRAY[3,6,12,24]),
  ('constellation','Constellation','artist','Soutien aux morceaux originaux publics du catalogue de cet artiste.',ARRAY[3,6,12,24]),
  ('creation','Création','credits','Recharge de crédits IA à activer une fois, sans déblocage des modèles abonnés.',ARRAY[1,1,1,1])
), tiers(ordinal,rarity,level,power) AS (VALUES
  (1,'common','Étincelle',1.5),(2,'rare','Impulsion',2.0),
  (3,'epic','Déferlante',3.0),(4,'legendary','Supernova',4.0)
)
INSERT INTO public.boosters(key,name,description,type,rarity,multiplier,duration_hours,enabled)
SELECT 'campaign_' || family || '_' || rarity, name || ' · ' || level,
       description, type, rarity, power, durations[ordinal], true
FROM families CROSS JOIN tiers
ON CONFLICT (key) DO NOTHING;
