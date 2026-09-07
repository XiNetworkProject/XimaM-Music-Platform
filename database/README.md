# PostgreSQL canonique Synaura

Cette arborescence est la source de verite du contrat PostgreSQL a partir de la
Phase 1A. Elle contient la baseline de **la production observee le 7 septembre
2026** et les migrations Phase 1B appliquees ensuite, pas un schema idealise. Les
anciens fichiers de `scripts/` et `supabase/` sont conserves comme historique,
mais ne doivent plus servir a reconstruire une base.

## Organisation

- `baseline/000_prerequisite_roles.sql` cree uniquement, lorsqu'ils sont absents,
  des roles `NOLOGIN` minimaux requis par les proprietaires et ACL du schema.
- `baseline/010_production_schema.sql` est la structure `pg_dump --schema-only`
  canonisee de PostgreSQL 17.11 : schemas, extensions, types, tables, vues,
  sequences, fonctions, contraintes, index, triggers, publications, RLS,
  policies, proprietaires, grants et privileges par defaut.
- `migrations/` contient exclusivement les changements posterieurs a la baseline.
- `reference/catalog/` contient l'inventaire read-only de production en CSV.
- `reference/code-database-map.csv` relie les objets aux fichiers et operations.
- `reference/legacy-sql-classification.csv` classe les 84 anciens fichiers SQL.
- `reference/validate-reconstruction.sql` valide une reconstruction vide.
- `scripts/migrate.mjs` est le runner minimal de migrations futures.
- `scripts/rebuild-isolated.sh` cree, valide puis detruit une base temporaire.
- `scripts/rebuild-phase1b-isolated.sh` reconstruit baseline + Phase 1B et teste
  un role applicatif temporaire `NOBYPASSRLS`.

La baseline ne contient aucune ligne de table, aucun mot de passe et aucun secret.
Les noms de colonnes sensibles (`password`, `token`, `secret`) font naturellement
partie de la structure `auth`, mais aucune valeur n'est versionnee.

## Etat de reference

La reconstruction validee contient :

- 137 tables/partitions hors catalogues systeme, dont 95 tables `public`,
  23 `auth`, 10 `realtime`, 8 `storage` et 1 `supabase_migrations` ;
- 5 vues, 0 materialized view et 11 sequences ;
- 458 index, 471 contraintes, 44 triggers et 171 fonctions ;
- 5 extensions (`plpgsql`, `pg_stat_statements`, `pg_trgm`, `pgcrypto`,
  `uuid-ossp`) ;
- 13 enums, 157 policies RLS et les ACL/proprietaires observes.

Empreinte du snapshot structurel brut avec owners :
`f71db9ee3f9a74f9218d5994e82cb1305b3749ffd4620caa315794a09e937293`.
Empreinte du fichier canonique normalise :
`9ca15a67a2148dd5cca4a63ec8f2a6154c1a6a379a747dd97aaa22b3f09409d6`.

## Creer une base de developpement vide

Prerequis : PostgreSQL 17, les extensions listees plus haut disponibles sur le
serveur, et un role de bootstrap autorise a creer des roles/extensions.

```bash
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=postgres
bash database/scripts/rebuild-isolated.sh
```

Le script choisit un nom `synaura_baseline_test_*`, part de `template0`, applique
les deux fichiers dans l'ordre, execute les assertions et supprime uniquement la
base qu'il vient de creer. Pour conserver une base dev, appliquer manuellement
les deux fichiers a une base vide puis provisionner le login applicatif hors Git.

## Role applicatif reel

La production utilise un unique login `synaura_app`, non-superuser mais avec
`BYPASSRLS`. `db` et `dbAdmin` pointent sur le meme pool et les routes Next.js
n'injectent pas de claims `auth.uid()`. Les policies ne protegent donc pas les
requêtes serveur actuelles. Ce comportement est conserve et documente; il n'est
pas recommande comme cible finale.

Les roles du fichier `000_prerequisite_roles.sql` sont volontairement `NOLOGIN`
et `NOBYPASSRLS`. Les attributs globaux de production ne sont pas appliques par
la baseline : ils doivent etre provisionnes explicitement, sans mot de passe dans
Git. Ne jamais appliquer le bootstrap de roles comme outil de mise en conformite
sur un cluster existant; il n'altere aucun role deja present.

## Migrations futures

Les nouveaux fichiers suivent `YYYYMMDDHHMMSS_description.sql`, ASCII minuscule
et underscores. Le timestamp doit etre strictement superieur a
`20260907000000`, identifiant de la baseline. Voir `migrations/README.md`.

Apres validation de la baseline sur une base existante, initialiser une seule
fois le nouveau suivi :

```bash
DATABASE_URL='postgresql://...' node database/scripts/migrate.mjs --baseline
```

Puis inspecter ou appliquer :

```bash
DATABASE_URL='postgresql://...' node database/scripts/migrate.mjs --status
DATABASE_URL='postgresql://...' node database/scripts/migrate.mjs
```

En production, le runner refuse l'execution sans double intention explicite :

```bash
SYNAURA_MIGRATION_BACKUP_CONFIRMED=1 \
DATABASE_URL='postgresql://...' \
node database/scripts/migrate.mjs --production
```

Cette variable signifie qu'un backup PostgreSQL recent a ete verifie. Elle ne
declenche pas de sauvegarde. Il faut aussi relire le SQL, verifier la cible de
connexion et prevoir le rollback avant execution.

## Regles de migration

1. Une migration est immuable apres application; son SHA-256 est enregistre.
2. Le runner prend un advisory lock et enveloppe chaque fichier dans sa propre
   transaction. Les fichiers ne contiennent donc ni `BEGIN`, ni `COMMIT`, ni
   `ROLLBACK`.
3. `IF EXISTS`/`IF NOT EXISTS` n'est utilise que si la semantique idempotente est
   reelle; il ne doit pas masquer une divergence.
4. Les changements longs (`CREATE INDEX CONCURRENTLY`, grosses validations) sont
   planifies separement, car ils ne peuvent pas suivre la transaction standard.
5. Un rollback est une migration forward corrective ou, exceptionnellement, un
   fichier `.down.sql` relu et execute manuellement. Le runner ne rollback jamais
   automatiquement des donnees.
6. Developpement puis base isolee, staging, backup production, application,
   validations catalogues et smoke tests : cet ordre est obligatoire.

## Suivi historique

`supabase_migrations.schema_migrations` existe avec 16 lignes en production. Les
15 migrations versionnees sous `supabase/migrations/` y figurent, mais la version
`20260727143000 account_identity_security` existe en production sans fichier
correspondant dans le depot. Ce registre n'est donc pas une source reconstructible
fiable. Il est preserve pour l'historique.

Le registre canonique `synaura_private.schema_migrations` a ete cree en
production pendant la Phase 1B avec version, nom, checksum, date et role
d'application. Il contient la baseline `20260907000000` et les trois migrations
Phase 1B. Le registre Supabase historique reste informatif et n'est jamais
rejoue au-dessus de la baseline.

## Etat Phase 1B

La Phase 1B a ajoute `admin_email_campaigns`, durci 11 signatures
`SECURITY DEFINER` et cree quatre index FK cibles. Le rapport complet, les tests
du role restreint et les limites restantes sont dans
`docs/database-phase-1b.md`.
