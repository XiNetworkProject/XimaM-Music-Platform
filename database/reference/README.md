# Reference de production — 2026-09-07

Les fichiers de ce repertoire proviennent de requetes catalogue executees dans
une transaction `READ ONLY`, avec `statement_timeout=30s` et `lock_timeout=2s`,
sur PostgreSQL 17.11 (`17/restore`, port 5433, base `postgres`). Ils ne contiennent
aucune ligne utilisateur.

`catalog/` separe les schemas, relations, colonnes, sequences, index, contraintes,
triggers, fonctions, extensions, types, policies, ACL, roles, statistiques,
diagnostics d'integrite et historique de migration. Les champs `estimated_rows`
et statistiques sont indicatifs et ne constituent pas un export de donnees.

`code-database-map.csv` couvre `app/`, `components/`, `hooks/`, `contexts/`,
`lib/` et les scripts JavaScript. Il classe chaque objet par usage detecte et
domaine. C'est une analyse statique : les noms construits dynamiquement et les
branches rarement executees peuvent echapper a la detection.

`referenced-objects-absent.csv` isole les noms litteraux demandes par le code mais
absents de production. `upsert-contracts.csv` compare les conflits declares aux
index uniques. `legacy-sql-classification.csv` couvre exactement les 84 fichiers
SQL historiques sans en supprimer aucun.

Pour regenerer ces artefacts depuis une nouvelle capture structurelle :

```bash
node database/scripts/generate-reference.mjs path/to/catalog-output.csv database/reference
```

La requete canonique est `production-audit.sql`. Elle doit etre envoyee a `psql`
en lecture seule; elle n'est jamais executee automatiquement par les tests.

## Artefacts Phase 1B

- `runtime-objects-phase1b.csv` : classement des sept objets runtime absents ;
- `upsert-audit-phase1b.csv` : cinq contrats d'upsert et leurs decisions ;
- `security-definer-audit-phase1b.csv` : audit des 11 signatures durcies ;
- `foreign-key-index-audit-phase1b.csv` : classement exact des 34 FK ;
- `dbadmin-usage.csv` et `dbadmin-usage-summary.md` : 934 appels classes ;
- `restricted-role-grants.sql` : grants generes du role de test ;
- `phase1b-production-audit.sql`, `orphan-audit-phase1b.sql`,
  `missing-migration-audit-phase1b.sql` et `verify-phase1b-index-plans.sql` :
  diagnostics production explicitement read-only ;
- `validate-phase1b.sql` : assertions baseline + migrations.

Le rapport de cloture est `docs/database-phase-1b.md`.
