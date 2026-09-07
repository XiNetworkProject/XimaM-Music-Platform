# Phase 1B — cohérence runtime et sécurité PostgreSQL

État final au 8 septembre 2026. L'audit initial et les diagnostics complémentaires
ont été exécutés en transactions `READ ONLY` sur PostgreSQL 17.11, cluster
`17/restore`, port 5433, base `postgres`. Les trois migrations retenues ont été
reconstruites et testées sur base temporaire, sauvegardées, puis appliquées en
production le 7 septembre 2026. Aucun commit Git n'a été créé.

## 1. Détail des sept objets runtime absents

L'inventaire reproductible complet est
`database/reference/runtime-objects-phase1b.csv`.

| Objet | Type | Consommateur / chemin | Fréquence et comportement en absence | Classe / décision |
|---|---|---|---|---|
| `admin_email_campaigns` | table | `app/api/admin/emails/route.ts`, historique `/admin/emails` | faible mais actif; l'envoi continue, l'écriture d'historique échoue silencieusement et la liste reste vide | A — table minimale créée |
| `ai_generated_tracks` | table | `app/embed/[trackId]/page.tsx`, `/embed/ai-<id>` | faible; l'embed IA répond « Track introuvable » | B — ancien nom; la vraie table est `ai_tracks` (215 lignes lors de l'audit); correction différée car le player/embed est hors périmètre |
| `creator_filters` | table | `lib/creatorModeration.ts`, service sans importeur | aucune fréquence observée; erreur journalisée puis filtre mémoire vide | C — fonctionnalité inactive; successeur `creator_comment_filters`; ne pas créer |
| `follows` | table | routes `stats/debug` et `stats/overview`, fallback statistique | seulement si `user_follows` échoue; le second fallback échoue à son tour ou est absorbé | B — référence legacy; `user_follows` existe; retrait ultérieur |
| `moderation_actions` | table | `lib/creatorModeration.ts`, service sans importeur | aucune fréquence observée; lecture/écriture retourne `[]` ou `false` | C — fonctionnalité inactive; les routes actives utilisent `comment_moderation` |
| `user_statuses` | table | `lib/onlineStatusService.ts`, service de présence sans importeur | aucune fréquence observée; état offline/false par défaut | C — ne pas créer sans décision d'architecture présence |
| `user_subscriptions` | table | `lib/subscriptionService.ts`, service sans importeur | aucune fréquence observée; limites gratuites par défaut et écriture absorbée | C — modèle remplacé par `profiles`/`subscriptions`; ne pas créer |

L'ancien SQL `scripts/repair-admin-migration-gaps.js` décrivait la seule structure
classée A. Aucun ancien `CREATE` pertinent n'a été retrouvé pour les six autres
noms. L'écart vient d'un mélange de renommages, fallbacks et services jamais
activés, pas de sept migrations manquantes.

## 2. Corrections réellement appliquées

En production :

- création de `public.admin_email_campaigns`, ses contraintes, deux index, RLS
  activé et grants limités à `synaura_app`/`service_role` ;
- durcissement des 11 signatures `SECURITY DEFINER` ;
- ajout de quatre index FK réellement justifiés ;
- création du suivi canonique `synaura_private.schema_migrations`, enregistrement
  de la baseline et des trois migrations Phase 1B.

Dans le workspace, deux appels `comment_moderation.upsert` utilisent maintenant
la clé `(comment_id, creator_id)`. Ils ne sont pas déployés sur l'hôte applicatif :
la contrainte explicite « ne pas créer de commit » interdit le chemin de
déploiement normal. Les DDL en production restent compatibles avec la version
applicative actuellement déployée (`49deac75…`).

## 3. Détail des cinq upserts

Le détail ligne par ligne est dans
`database/reference/upsert-audit-phase1b.csv`.

| Fichier | Table / conflit demandé | Contrat réel | Risque et décision |
|---|---|---|---|
| route de modération commentaire | `comment_moderation`, défaut `(id)` | PK `(comment_id, creator_id)`, 0 doublon | erreur SQL et réponse 500; `onConflict` corrigé |
| route DELETE commentaire | `comment_moderation`, défaut `(id)` | PK `(comment_id, creator_id)`, 0 doublon | l'exception déclenchait une suppression physique imprévue; `onConflict` corrigé |
| `onlineStatusService.ts:55` | `user_statuses(user_id)` | table absente | service non importé; aucun index/table artificiel ajouté |
| `onlineStatusService.ts:120` | `user_statuses(user_id)` | table absente | même décision C |
| `subscriptionService.ts:187` | `user_subscriptions(user_id)` | table absente; cardinalité métier non décidée | service non importé et conflit avec le modèle actif; aucune unicité inventée |

Les deux seuls contrats applicables ont été testés par deux écritures successives
sur la même clé : une seule ligne subsiste et la seconde valeur gagne. Aucune
contrainte unique n'a été ajoutée sans vérification préalable.

## 4. État des orphelins

La requête reproductible est `database/reference/orphan-audit-phase1b.sql`.

- Les 14 lignes `track_stats` n'ont ni parent dans `tracks`, ni correspondance
  dans `ai_tracks`. Elles ont toutes un compteur historique de vues. Six ont
  encore respectivement 3, 1, 22, 2, 2 et 3 événements dans `track_events` ;
  aucune n'a de ligne actuelle dans `track_views`, `track_likes`, `comments` ou
  `playlist_tracks`. Les identifiants anciens (`685…`, `688…`, `track_<timestamp>`)
  suggèrent des pistes legacy supprimées ou non migrées. Elles sont conservées :
  leur rôle d'agrégat historique et la politique de rétention ne sont pas décidés.
- Le boost `d89dde68-ecb4-4399-a497-e7d59dfee592` n'est pas orphelin. Son
  `track_id=ai-9e321ea6-2d17-4035-81c1-de8acf1ff94d` correspond à `ai_tracks`
  après normalisation du préfixe, la génération est `completed` et le propriétaire
  correspond. Il est seulement expiré depuis le 17 juin 2026 dans une table
  nommée « active » ; les requêtes runtime filtrent l'expiration.
- Aucun autre orphelin critique nouveau n'a été confirmé dans ce périmètre.

Aucune suppression ni FK hasardeuse n'a été appliquée. La prévention proposée est
un job de réconciliation qui comprend les deux espaces d'identifiants `tracks` et
`ai_tracks`, plus une politique explicite d'archivage des agrégats ; une FK directe
ne peut pas représenter proprement cette relation polymorphe.

## 5. Audit des 11 `SECURITY DEFINER`

Le détail des owners, signatures, callers, objets touchés, ACL et justification
est dans `database/reference/security-definer-audit-phase1b.csv`.

Les 11 signatures, toutes owner `postgres`, sont : deux `ai_add_credits`, deux
`ai_debit_credits`, `check_user_quota`, `get_monthly_generations_count`,
`get_user_ai_stats`, `get_user_quota_remaining`, `increment_ai_usage`,
`record_track_view` et `toggle_track_like`.

Avant correction, aucune ne fixait `search_path`; chacune était exécutable par
`PUBLIC`, `anon`, `authenticated`, `service_role` et `synaura_app`. Le schéma
`public` n'accordait toutefois pas `CREATE` à `PUBLIC`, et aucune fonction homonyme
d'un autre schéma exploitable n'a été trouvée. Le risque était donc réel par
configuration trop large, sans preuve d'exploitation.

Les fonctions actives de crédits/quota gardent `SECURITY DEFINER` pour préserver
leurs opérations atomiques et leurs callers. Les fonctions dormantes sont gardées
par compatibilité, sans entreprendre le nettoyage destructif exclu de cette phase.

## 6. Corrections `SECURITY DEFINER`

Chaque signature a désormais `search_path=pg_catalog, public`. `EXECUTE` a été
retiré à `PUBLIC`, `anon` et `authenticated`, puis accordé explicitement à
`synaura_app` et `service_role`. Les objets référencés par leur nom restent
résolus dans `public`, alors que `pg_catalog` est prioritaire et que les rôles
non fiables ne peuvent pas créer dans `public`.

Les appels RPC sous rôle applicatif passent ; les ACL et `proconfig` ont été
revalidés en production. Références de conception : documentation Supabase sur
les [fonctions de base](https://supabase.com/docs/guides/database/functions) et
la [sécurisation de l'API](https://supabase.com/docs/guides/api/securing-your-api).

## 7. Analyse des 34 FK sans index préfixe

`database/reference/foreign-key-index-audit-phase1b.csv` contient exactement 34
lignes avec volume, requête observée et décision :

- A, index clairement utile : 4 ;
- B, volume faible ou table vide : 23 ;
- C, accès actuel couvert autrement : 2 (`tracks.user_id`,
  `user_missions.mission_id`) ;
- D, à mesurer : 5 (`notifications.sender_id`, `password_resets.user_id`,
  `profiles.referred_by`, `user_booster_open_history.booster_id`,
  `user_boosters.booster_id`).

Les tables A ne comptaient que 7 à 132 lignes. Les plans par défaut préféraient
donc légitimement des scans séquentiels à ce volume. La vérification avec
`enable_seqscan=off`, dans une transaction read-only, prouve que les quatre
chemins sont utilisables ; le script est
`database/reference/verify-phase1b-index-plans.sql`.

## 8. Index ajoutés

- `idx_active_artist_boosts_user_expires (user_id, expires_at DESC)` ;
- `idx_active_track_boosts_user_expires (user_id, expires_at DESC)` ;
- `idx_playlist_tracks_track (track_id)` ;
- `idx_playlists_creator_created (creator_id, created_at DESC)`.

Ils ont été créés transactionnellement : à ce volume, un verrou bref borné par
`lock_timeout=5s` était moins risqué qu'un cycle `CONCURRENTLY`. Les quatre index
sont `indisvalid=true` et `indisready=true` en production.

## 9. Migration Supabase historique manquante

Identifiant exact : `20260727143000 account_identity_security`, soit le 27 juillet
2026 à 14:30 selon son timestamp. Le registre contient 35 statements, avec MD5
`355dff12693797208017362925017715` sur leur concaténation auditée.

Elle a : rendu `profiles.email` nullable ; ajouté le suivi de tentatives à
`password_resets` ; créé/complété `account_private`, son index email, ses checks,
ses triggers et trois policies RLS ; migré l'email et l'état MFA ; installé le
trigger qui déplace les futurs emails hors de `profiles` ; resserré grants et
fonctions. La baseline Phase 1A contient déjà l'état final correspondant.

Origine probable : migration appliquée directement depuis un environnement ou
un pipeline Supabase dont le fichier local n'a pas été conservé. Elle n'a été ni
recréée ni rejouée. `database/reference/missing-migration-audit-phase1b.sql`
documente comment réinterroger le registre, et la baseline reste l'origine
canonique.

## 10. Classification des 934 usages `dbAdmin`

Le résultat reproductible est `database/reference/dbadmin-usage.csv`, généré par
`database/scripts/classify-dbadmin-usage.mjs` :

| Groupe | Nombre |
|---|---:|
| A — lecture normale | 590 |
| B — mutation utilisateur normale | 260 |
| C — opération administrative | 61 |
| D — webhook/callback | 4 |
| E — maintenance/diagnostic | 18 |
| F — auth | 1 |
| G — système/cron | 0 |
| H — besoin démontré de privilèges PostgreSQL élevés | 0 |
| I — usage injustifié/indéterminé | 0 |
| **Total** | **934 dans 192 fichiers** |

Les groupes sont exclusifs. `H=0` signifie qu'aucun `from/rpc` n'exige un
superuser ou `BYPASSRLS`; cela ne signifie pas que les 934 chemins sont déjà
validés avec un rôle restreint.

## 11. Résultat du rôle restreint de test

Sur une reconstruction temporaire, le harness
`database/scripts/rebuild-phase1b-isolated.sh` a créé un rôle `NOLOGIN`,
`NOSUPERUSER`, `NOBYPASSRLS`, sans création de DB/role ni réplication. Les grants
générés couvrent 91 relations par opération, huit signatures RPC et uniquement
les séquences effectivement nécessaires ; aucun `GRANT ALL`, `ALL TABLES` ou
`ALL SEQUENCES`.

Résultats : baseline + trois migrations passent ; upsert composite et RPC de
lecture passent ; aucun échec schema, table, séquence ou fonction dans le scénario
testé. L'insertion `admin_email_campaigns` est correctement refusée par RLS sans
policy (`RESTRICTED_ROLE_RLS_DENIAL=confirmed`), puis passe après ajout d'une
policy explicite temporaire. Base et rôle temporaires ont été supprimés ; compte
résiduel vérifié à zéro.

Ce test démontre la faisabilité mais aussi que le retrait de `BYPASSRLS` exige un
inventaire/pilotage des policies par domaine. Il n'autorise pas sa suppression en
production.

## 12. Recommandation du modèle de sécurité DB

Recommandation : **Option A**, API/services comme autorité d'autorisation et rôle
PostgreSQL restreint, sans transformer Synaura en client RLS.

L'architecture Next.js et les apps natives passent déjà par l'API, sans claims
PostgreSQL utilisateur. Un rôle serveur à grants explicites, complété par des
policies `TO <role_runtime>` seulement sur les tables où RLS reste activé, réduit
fortement le blast radius avec un coût de migration maîtrisable. RLS peut rester
en défense ou pour un éventuel Data API, mais ne doit pas être présenté comme la
source de l'autorisation serveur.

L'Option B imposerait `SET LOCAL` de claims fiables dans chaque transaction,
policies utilisateur cohérentes partout et discipline stricte avec le pooling.
Sur 934 appels et plusieurs clients natifs, sa complexité, son risque de contexte
mal borné et son coût dépassent l'intérêt actuel. Elle ne devient rationnelle que
si l'accès direct Data API/client devient un objectif produit. Voir la
[documentation RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Le modèle cible A sera un nouveau chantier : aucun attribut du rôle production
`synaura_app` n'a été changé ; il reste non-superuser avec `BYPASSRLS`.

## 13. Repositories natifs introduits

Aucun repository n'a été introduit. Les anomalies démontrées pouvaient être
corrigées par deux contrats d'upsert et trois migrations ciblées. Ajouter une
abstraction sans migrer un parcours complet aurait augmenté la surface sans
bénéfice immédiat, et les domaines feed/player étaient explicitement exclus.

Pour un prochain chantier, les meilleurs pilotes sont notifications (ACL et
volume), messaging (transactions multi-tables) puis auth interne (frontière de
privilège). Chacun doit commencer par un seul parcours mesuré.

## 14. Migrations créées

- `20260907211500_add_admin_email_campaigns.sql` ;
- `20260907212000_harden_security_definer_functions.sql` ;
- `20260907212500_add_critical_fk_indexes.sql`.

Chaque fichier documente objectif, préconditions, verrou/volume, validation et
retour. Le runner `database/scripts/apply-phase1b-migrations.sh` prend un advisory
lock, borne les timeouts, applique et enregistre checksum dans la même transaction.

## 15. Migrations appliquées en production

Les trois migrations ont été appliquées une fois, puis le même chemin a été
relancé : les trois répondent `ALREADY_APPLIED` et la validation finale passe.

| Version | SHA-256 enregistré |
|---|---|
| baseline `20260907000000` | `fd153507f9b85f4c8abc433240fe225c92c56022b7c4befefa5ac031e5f4c382` |
| `20260907211500` | `d94df781d61374eb9c9c797b9ad6940c70ad83864c65b5f52dbfa3cab4d23510` |
| `20260907212000` | `ec24d5865cf61ffd922a3ea02a918ef05c2eca55d65f63dc48092d4640cdf650` |
| `20260907212500` | `3dbc31d60585dcb6ce5ad63563b1b00aec66cc05ff4f80a20342ddbfc4b806d9` |

Les checksums locaux et production sont identiques. Les smoke SQL ont été
encapsulés dans une transaction puis annulés : zéro ligne de test résiduelle.

## 16. Sauvegarde préalable

`synaura-db-backup.service` a terminé avec succès le 7 septembre 2026 de
21:52:56 à 21:52:58 UTC (`ExecMainStatus=0`). Artefact chiffré :
`synaura-20260907T215257Z.dump.enc`, 3 632 656 octets.

Le job a validé le déchiffrement et `pg_restore --list`, calculé le checksum et
n'a laissé aucun dump plaintext. La variable de confirmation de backup n'a été
positionnée qu'après ce contrôle.

## 17. Tests exécutés

- deux reconstructions PostgreSQL temporaires, dont une avec le chemin exact du
  runner production ; rôles et DB temporaires supprimés ;
- tests SQL : objet A, upsert composite idempotent, 11 fonctions/ACL, quatre
  index, suivi des migrations, RLS/refus puis policy explicite ;
- `npm run test:database-contract` : 18/18 ;
- suites auth locale/mobile : 19/19 ;
- suites sécurité, routes critiques et destinataires email admin : 26/26 ;
- `npm run type-check` : succès ;
- `git diff --check` : succès, uniquement avertissements de conversion LF/CRLF ;
- production : accueil HTTP 200, playlists populaires HTTP 200, admin emails
  sans session HTTP 403 attendu, services PostgreSQL et Synaura actifs ;
- journaux `warning` depuis la fenêtre de migration : aucune entrée.

## 18. Erreurs ou incidents

Deux erreurs de requête ont été rencontrées pendant la construction des audits
(`ACL public` puis mauvais nom de colonne owner IA). Elles se sont produites dans
des transactions explicitement read-only, interrompues et rollbackées, puis les
requêtes ont été corrigées et rejouées.

Un premier lot de smoke HTTP a observé un refus loopback isolé sur un appel alors
que les appels précédent et suivant réussissaient. Le passage séquentiel avec
quatre retries donne ensuite 200/403/200, les services n'ont pas redémarré et les
journaux ne montrent aucun warning : événement transitoire non reproductible,
sans preuve d'indisponibilité durable.

Les reconstructions affichent l'avertissement attendu sur les publications
logiques quand `wal_level` de la DB temporaire n'est pas `logical`; il ne bloque
ni la baseline ni les validations. Aucun incident de migration, perte de donnée,
lock long ou rollback production.

## 19. Dette restante

- déployer les deux corrections TypeScript via le processus normal après
  autorisation de commit ;
- retirer plus tard les six références legacy/inactives, notamment le fallback
  `follows` et l'ancien nom d'embed IA, dans leurs périmètres respectifs ;
- définir la rétention des 14 agrégats legacy et purger les boosts expirés avec
  un job explicitement auditable ;
- tester progressivement les 934 chemins avec un vrai rôle login restreint en
  environnement non-production et concevoir les policies de rôle nécessaires ;
- mesurer les cinq FK catégorie D avant toute création d'index ;
- revoir la course check/update de `increment_ai_usage` ;
- corriger le contrat dormant qui appelle `get_user_ai_stats` avec un paramètre
  de période absent de sa signature ;
- garder sous surveillance les fonctions legacy conservées et les vues publiques
  non `security_invoker` relevées en Phase 1A.

Le journal officiel Supabase des
[breaking changes](https://supabase.com/changelog?types=breaking-change) a été
consulté ; aucune rupture actuelle n'impose de modifier ces migrations ciblées.

## 20. Proposition de suite

Proposition : une Phase 1C courte, explicitement autorisée, pour déployer les deux
correctifs applicatifs puis piloter l'Option A sur un domaine borné
(notifications recommandé), avec rôle non-`BYPASSRLS`, policies/grants explicites,
shadow traffic ou tests d'intégration et rollback. Aucun changement de rôle
production ne doit précéder ce pilote.

Le chantier audio peut être autorisé à la place si sa priorité produit est
supérieure ; il devra traiter séparément `ai_generated_tracks`/`ai_tracks` sans
réouvrir player, feed ou apps natives implicitement. Aucune Phase 1C ni aucun
chantier audio n'est commencé ici.

PHASE 1B CLOSED
