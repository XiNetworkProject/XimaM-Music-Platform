# Migrations posterieures a la baseline

La baseline canonique porte la version `20260907000000_production_baseline`.
Trois migrations Phase 1B ont ete testees puis appliquees en production :

- `20260907211500_add_admin_email_campaigns.sql` ;
- `20260907212000_harden_security_definer_functions.sql` ;
- `20260907212500_add_critical_fk_indexes.sql`.

Nom : `YYYYMMDDHHMMSS_description.sql`.

Exemple : `20260908143000_add_track_lookup_index.sql`.

Chaque migration doit indiquer en commentaire : objectif, preconditions,
estimation du verrou/volume, validation read-only et strategie de retour. Elle ne
doit contenir aucune donnee utilisateur, aucun secret et aucune transaction
explicite. Le runner `database/scripts/migrate.mjs` gere transaction, verrou,
ordre, checksum et enregistrement.

Les migrations historiques de `scripts/` et `supabase/` ne sont jamais copiees
ici et ne sont jamais rejouees au-dessus de la baseline. La migration historique
manquante `20260727143000 account_identity_security` est deja absorbee par la
baseline et ne doit pas etre recreee.
