# Phase 1A — contrat de donnees et baseline PostgreSQL canonique

Etat au 7 septembre 2026. Audit production read-only, baseline locale et test de
reconstruction isole termines. Aucun objet ni aucune donnee de la base de
production n'a ete modifie. La seule DDL distante a cible une base temporaire au
nom aleatoire, detruite apres validation.

## 1. Inventaire reel de production

Source observee : PostgreSQL 17.11, cluster Debian `17/restore`, port loopback
5433, base `postgres`. Le catalogue exhaustif sans donnees est sous
`database/reference/catalog/`.

| Objet | Nombre | Detail |
|---|---:|---|
| schemas visibles | 13 | `auth`, `extensions`, `graphql`, `graphql_public`, `information_schema`, `pg_catalog`, `pgbouncer`, `public`, `realtime`, `storage`, `supabase_migrations`, `synaura_private`, `vault` |
| tables/partitions applicatives | 137 | `public` 95, `auth` 23, `realtime` 10, `storage` 8, `supabase_migrations` 1 |
| vues | 5 | 3 `public`, 2 `extensions` |
| vues materialisees | 0 | aucune |
| sequences | 11 | `public` 9, `auth` 1, `realtime` 1 |
| index | 458 | index explicites et index de contraintes |
| contraintes | 471 | 137 PK, 154 FK, 60 uniques, 120 checks |
| triggers non internes | 44 | definitions dans le catalogue et la baseline |
| fonctions | 171 | 0 procedure |
| extensions | 5 | `plpgsql`, `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `uuid-ossp` |
| types | 158 | 13 enums et 145 composites, principalement les row types des tables |
| policies | 157 | sur 61 tables; 62 tables `public` ont RLS, 33 ne l'ont pas |

Owners dominants : les 107 objets relationnels `public` appartiennent a
`postgres`; les 24 objets relationnels `auth` a `supabase_auth_admin`; `storage`
a `supabase_storage_admin`; `realtime` principalement a
`supabase_realtime_admin`. Les CSV `relations`, `schemas`, `routines` et `types`
donnent chaque owner; `relation_acl` et `routine_acl` developpent les grants.

Classification statique des 98 tables/vues `public` : 90 utilisees par le
runtime, 6 probablement utilisees selon les statistiques mais sans appel runtime
litteral retrouve, et 2 vues sans reference (`track_stats_daily` et
`track_traffic_sources_30d`). Cette classification n'autorise aucune suppression.

## 2. Cartographie code vers base

`database/reference/code-database-map.csv` contient une ligne par table, vue,
sequence ou fonction, avec fichiers, operations et domaine. Les racines analysees
sont `app/`, `components/`, `hooks/`, `contexts/`, `lib/` et les scripts actifs.

Les structures indispensables aujourd'hui couvrent notamment :

- auth : `auth.users`, `auth.identities`, `auth.sessions`,
  `auth.refresh_tokens`, `auth.mfa_factors`, `auth.mfa_amr_claims`, `profiles`,
  `account_private`, `password_resets`;
- catalogue/audio : `tracks`, `ai_tracks`, `ai_generations`, `track_waveforms`,
  `track_remixes`, `track_views`, `track_events`, `track_stats`;
- social : `track_likes`, `comments`, `comment_likes`, `comment_reactions`,
  `track_moment_reactions`, `user_follows`, posts et forum;
- playlists : `playlists`, `playlist_tracks`;
- messaging : conversations, participants, rooms, messages, attachments,
  reactions, requests, blocks et evenements realtime;
- notifications : `notifications`, `notification_preferences`,
  `push_subscriptions`, `admin_broadcasts`;
- IA/credits : generations, tracks, playlists, likes, balances, ledger, quotas
  et usages;
- domaines specialises : City, Boosters, Community, Meteo et Star Academy.

Sept noms demandes par du code runtime sont absents de production :
`admin_email_campaigns`, `ai_generated_tracks`, `creator_filters`, `follows`,
`moderation_actions`, `user_statuses` et `user_subscriptions`. Certaines branches
ont des fallbacks, mais leur presence dans du code atteignable est une dette de
fiabilite. En particulier, la production possede `user_follows`, pas `follows`;
deux routes de statistiques utilisent encore `follows`.

## 3. Les 84 fichiers SQL historiques

Le depot contient exactement 84 fichiers : 65 sous `scripts/`, 15 migrations
timestampées sous `supabase/migrations/` et 4 fichiers SQL a la racine
`supabase/`. La classification complete et son evidence sont dans
`database/reference/legacy-sql-classification.csv`.

| Classe | Nombre | Interpretation |
|---|---:|---|
| A | 15 | version presente dans le registre Supabase de production |
| B | 29 | effet/objet retrouve en production, execution historique non tracee |
| C | 4 | correctif remplace par l'etat canonique actuel |
| D | 5 | variantes concurrentes du schema IA |
| E | 9 | diagnostic ou operation ponctuelle/data |
| F | 20 | bootstrap/policies/grants Supabase legacy |
| G | 2 | fichiers vides, probablement obsoletes |
| H | 0 | aucun cas reste sans classification minimale |

Les cinq variantes IA sont `create-ai-generations-table`,
`create_ai_generations_table`, `safe`, `direct` et `complete`; elles ne doivent
plus etre choisies au cas par cas. La baseline tranche en faveur de la structure
reelle. Aucun ancien fichier n'a ete supprime ou deplace.

## 4. Baseline canonique

La source unique est maintenant :

1. `database/baseline/000_prerequisite_roles.sql`;
2. `database/baseline/010_production_schema.sql`.

Le second fichier est une capture `schema-only` avec owners et ACL, canonisee
pour supprimer le token aleatoire de `pg_dump`. Il contient schemas, extensions,
types, tables, vues, sequences, fonctions, contraintes, index, triggers,
publications, RLS, policies, grants et privileges par defaut. Il ne contient ni
`COPY`, ni donnee de table, ni mot de passe de role.

La baseline n'est pas une migration a appliquer a `postgres`. Elle s'applique
uniquement a une base vide et isolee. Les roles globaux placeholders sont
least-privilege; les attributs de production restent documentes, pas imposes.

## 5. Convention et suivi des migrations futures

Le format retenu est `YYYYMMDDHHMMSS_description.sql`, strictement apres
`20260907000000`. Une migration est transactionnelle par defaut, immuable apres
application, validee en dev/base isolee avant staging puis production, et liee a
un SHA-256. Les operations incompatibles avec une transaction font l'objet d'un
runbook dedie.

Le runner minimal `database/scripts/migrate.mjs` gere ordre, transaction,
advisory lock, checksum, refus des versions dupliquees et confirmation de backup
en production. Le nouveau registre propose est
`synaura_private.schema_migrations`.

Le registre historique `supabase_migrations.schema_migrations` n'est pas fiable
comme source de reconstruction : il contient 16 versions, mais le depot n'en
possede que 15. `20260727143000 account_identity_security` est en production et
absent du repository. Le registre historique et le schema `auth` sont preserves.
Le nouveau registre n'a pas ete cree en production pendant cette phase.

## 6. Statut du schema auth legacy

Reellement necessaires au runtime actuel :

- `auth.users` : login local, creation, reset, changement de contacts,
  suppression et jointures administratives;
- `auth.identities` : identites locales/Google/telephone;
- `auth.sessions` et `auth.refresh_tokens` : sessions mobiles locales;
- `auth.mfa_factors` et `auth.mfa_amr_claims` : MFA mobile.

Necessaires temporairement : l'enveloppe du schema `auth`, ses enums, contraintes
et objets dont dependent les tables ci-dessus. Quarante FK `public` ciblent
directement `auth.users`; son retrait demande donc une migration explicite du
modele d'identite, pas un renommage.

Compatibilite Supabase uniquement : `auth.uid()`, `auth.role()`, `auth.jwt()` et
`auth.email()` lisent les claims PostgreSQL. Le serveur Next actuel n'en injecte
aucun. Ces fonctions restent necessaires aux policies legacy et eventuellement a
un client Supabase qui serait reintroduit.

Probablement supprimables plus tard, apres preuve d'absence de GoTrue : tables
OAuth/SAML/SSO/WebAuthn/audit non referencees par le code local. Elles restent
dans la baseline car elles font partie de la production et peuvent porter une
compatibilite implicite.

## 7. RLS et BYPASSRLS

La protection serveur effective est applicative : `synaura_app` est `LOGIN`,
non-superuser, mais `BYPASSRLS`; il a SELECT/INSERT/UPDATE/DELETE sur les 95
tables `public`. `auth.uid()` et `auth.role()` retournent normalement `NULL` pour
ce chemin. Aucune policy n'est donc une barriere pour les requetes Next.

Sur les 157 policies, 114 ciblent implicitement `{public}`, 35
`{authenticated}`, 7 `{anon,authenticated}` et 1 `{service_role}`. 107 utilisent
`auth.uid()`, 10 `auth.role()` et 21 contiennent une branche `true`. Aucun trafic
actuel d'un role `anon`/`authenticated` via PostgREST n'a ete prouve sur l'hote.

Classement :

- reellement utilisees par un autre client : aucune preuve positive;
- potentiellement utiles : policies d'ownership correctement bornees si un futur
  chemin sans `BYPASSRLS` injecte des claims fiables;
- legacy : policies reposant sur `auth.uid/role` pour un chemin qui n'existe plus;
- trompeuses : toutes si elles sont presentees comme protection du serveur Next,
  et plus particulierement les policies `PUBLIC`/`true`.

Risque connexe : 15 fonctions `public` sont `SECURITY DEFINER`; 11 n'ont pas de
`search_path` fixe et restent executables par `PUBLIC`. Les trois vues statistiques
`public` n'ont pas non plus `security_invoker` et sont largement accordees. Aucune
n'a ete modifiee ici. Le durcissement exige inventaire des appels, retrait des
grants inutiles, schema prive et tests avec un role restreint.

## 8. `dbAdmin === db`

`lib/database.ts` exporte litteralement `dbAdmin = db`. Il n'existe ni second
pool, ni second role, ni cle service. L'analyse trouve 934 appels directs runtime
`dbAdmin.from/rpc` dans 192 fichiers et 155 appels `db.from/rpc` dans 40 fichiers.
Le nom `dbAdmin` ne confere donc aucun privilege supplementaire.

Les usages sensibles incluent suppression de compte et de medias, routes admin,
credits/IA, facturation, notifications, messaging, moderation, gestion des
tracks/playlists et ecritures auth. Leur privilege reel vient de l'unique
connexion `synaura_app` avec `BYPASSRLS`.

Cible progressive, non appliquee :

1. mesurer/nommer les operations par repository de domaine;
2. creer un role runtime sans `BYPASSRLS` avec grants minimaux;
3. conserver un role privilegie non partage, uniquement pour quelques services
   serveur audites (auth interne, jobs/admin), jamais pour le frontend;
4. tester chaque domaine avec le role restreint avant de basculer;
5. retirer l'alias trompeur seulement apres migration complete des appels.

## 9. Couche de compatibilite `lib/database.ts`

Points solides : identifiants valides par allowlist, valeurs parametrees, support
des filtres usuels, transactions natives disponibles a cote, hydration des
relations groupee par relation plutot que par ligne.

Ecarts/fragilites :

- les `SELECT` chargent toujours `base.*` puis projettent en JavaScript;
- une relation ajoute une requete catalogue FK et une requete de donnees par
  niveau; les embeddings imbriques peuvent devenir une explosion de requetes,
  sans snapshot transactionnel commun;
- `count: exact` execute une requete supplementaire;
- UPDATE/DELETE font toujours `RETURNING *`, meme sans retour demande;
- `throwOnError` et `abortSignal` sont des no-op; certaines methodes chainees RPC
  sont aussi des no-op;
- la resolution d'une surcharge RPC repose surtout sur le nombre d'arguments;
- les erreurs sont ramenees en reponse `500` generique;
- les resultats et mutations utilisent massivement `any`;
- un UPDATE/DELETE sans filtre n'a pas de garde applicative;
- le cache de FK peut devenir stale apres migration;
- les relations ne reproduisent pas toutes les subtilites PostgREST.

Contrat casse detecte : deux upserts de `comment_moderation` omettent
`onConflict`; la couche choisit `(id)`, alors que la table n'a pas de colonne
`id` et que sa PK est `(comment_id, creator_id)`. Les upserts vers
`user_statuses` et `user_subscriptions` ciblent des tables absentes. Ces points
sont documentes mais non corriges, conformement a l'interdiction de changer
l'API pendant la Phase 1A.

Classe A, maintien temporaire : CRUD simple a faible volume. Classe B,
migration recommande : auth, account deletion, billing/subscriptions, messaging,
notifications et operations multi-tables vers repositories/services natifs.
Classe C prioritaire : feed/recommandation/statistiques, recherche, credits IA,
upserts cites et parcours relationnels imbriques.

## 10. Dette de types

Aucun type PostgreSQL genere complet n'a ete trouve. Le seul artefact nomme
Supabase est `types/next-auth-supabase.d.ts`; le reste combine interfaces locales,
types de routes et `any`. L'analyse large trouve 2 189 occurrences de `any` dans
les racines scannees, indicateur de dette generale et non exclusivement DB.

Cible proposee : generer des types bruts depuis la baseline, les versionner dans
un module unique `database/types`, puis exposer des DTO de domaine dans les
repositories. Les types bruts ne doivent pas devenir directement les contrats
HTTP/UI. La Phase 1A ne reecrit aucun modele existant.

## 11. Integrite et contraintes

Diagnostics read-only :

- 0 profil sans `auth.users`, mais 6 utilisateurs auth actifs sans profil;
- 0 doublon case-insensitive de username/email profil;
- 0 doublon `(follower_id, following_id)`;
- 0 waveform orphelin, mais 14 lignes `track_stats` sans `tracks` correspondant;
- 0 `ai_track` sans generation et 0 track avec creator orphelin;
- les 232 tracks ont `creator_id`, mais les 232 ont `user_id = NULL` :
  `creator_id` est la cle runtime, `user_id` est une variante legacy nullable;
- 0 abonnement push, message request ou reaction temporelle orpheline parmi les
  diagnostics cibles; 1 `active_track_boosts.track_id` ne rejoint pas `tracks`.

Soixante-huit colonnes terminees par `_id` n'ont pas de FK. Beaucoup sont des IDs
externes ou polymorphes (`suno_id`, Stripe, Mux, `content_id`) et ne doivent pas
recevoir une FK aveugle. Candidats a examiner : `track_events.track_id/user_id`,
`recommendation_impressions.user_id`, `push_subscriptions.user_id`, IDs de
message requests, `track_moment_reactions`, City et moderation.

Risques de contrat : `subscriptions.user_id` n'est ni unique ni indexe alors que
des chemins supposent un abonnement utilisateur; les couples polymorphes
`track_id` + type ne peuvent pas etre garantis par une FK simple; les cascades
vers `auth.users` ont un rayon d'impact eleve. Toute nouvelle contrainte sur une
table volumineuse doit commencer par un diagnostic, puis `NOT VALID`/validation
planifiee si approprie.

## 12. Index et plans

Les plans `EXPLAIN` sans `ANALYZE` utilisent `idx_tracks_created` pour les tracks
recents, `idx_tracks_popular` pour le populaire,
`idx_notifications_user_created` et `idx_reco_impressions_user_created`.
Les index adaptes existent aussi pour messages et commentaires, mais PostgreSQL
choisit actuellement un seq scan puis tri vu leurs 24 et 14 lignes estimees; ce
n'est pas une anomalie a ce volume.

Critique avant croissance :

- definir le contrat d'unicite puis indexer `subscriptions(user_id)`;
- ajouter `playlist_tracks(track_id)` pour la FK/cascade et les recherches
  inversees;
- ajouter `playlists(creator_id[, created_at])` pour bibliotheque et suppression
  de profil;
- traiter la recherche `ILIKE '%...%'`, actuellement en seq scan, avec index
  trigrammes ou recherche dediee seulement apres mesure des requetes reelles.

Benefique a mesurer : index des 34 FK `public` sans prefixe d'index, notamment
payments, post comments, notifications sender, boosters et plusieurs relations
auth; index partiels/composites `is_public` pour tracks/IA lorsque le volume le
justifie. `pg_stat_statements` est installe mais absent de
`shared_preload_libraries`, donc aucune statistique de requete normalisee n'etait
disponible sans redemarrage/configuration.

Inutile/premature : ajouter un index par colonne, indexer les IDs externes sans
requete correspondante ou dupliquer les index existants. Quatre groupes sont
deja strictement dupliques : deux sur `comment_likes`, un sur
`conversation_participants` et un sur `track_likes`. Plusieurs prefix indexes
sont aussi redondants mais aucune suppression n'est autorisee dans cette phase.

## 13. Carte de dette legacy

- Cloudinary : URL et `*_public_id` coexistent sur tracks, profils, clips et
  Star Academy; les suppressions de compte utilisent encore ces champs.
- Supabase : schemas `auth`, `storage`, `realtime`, roles, policies, publications,
  fonctions claims et registre de migrations subsistent.
- IA : cinq schemas historiques concurrents et colonnes de providers/tasks
  coexistent dans l'etat final.
- Identifiants : UUID pour l'identite, TEXT pour beaucoup de tracks/messages et
  IDs polymorphes; `messages.conversation_id` est TEXT alors que d'autres objets
  de messaging emploient des UUID.
- Social : `user_follows` est canonique en production, mais `follows` reste cite
  par deux routes.
- Mobile : sessions, refresh tokens, identities et MFA reposent directement sur
  les tables `auth` legacy.
- Tables legacy : `public.users` contient encore 4 lignes estimees tandis que
  `auth.users`/`profiles` forment le chemin principal; aucune suppression n'est
  decidee.

## 14. Reconstruction et tests

Une premiere base puis la validation finale
`synaura_phase1a_final_5ea888fc0d41` ont ete creees depuis `template0`. La
baseline complete a ete appliquee, puis les assertions ont retrouve 137 tables,
458 index, 471 contraintes, 157 policies et 11/11 tables critiques. Les schemas
`auth`, `public`, `realtime`, `storage`, `supabase_migrations` et
`synaura_private` ont ete verifies. La base a ete detruite : `TEMP_DB_AFTER=0`.

La reconstruction a signale seulement que `wal_level` n'est pas `logical` pour
les publications realtime dans cette base de test. Les objets ont neanmoins ete
crees; cette capacite Supabase n'est pas utilisee par Next aujourd'hui.

Suites executees : contrat DB et compat layer 10/10, auth locale/mobile 19/19,
media 4/4, routes critiques 13/13, securite Phase 0B 11/11, soit 57 tests; tous
passent. `tsc --noEmit` passe egalement. Les avertissements Node
`MODULE_TYPELESS_PACKAGE_JSON` preexistaient et n'affectent pas les resultats.

## 15. Risques restants et proposition Phase 1B

Risques prioritaires : role unique `BYPASSRLS`, 11 fonctions `SECURITY DEFINER`
publiques sans `search_path`, code visant 7 objets absents, cinq appels upsert sans
contrat valide, dette de types, registre historique incomplet, 34 FK publiques
non indexees et recherche non indexee.

Phase 1B proposee, a ne pas demarrer automatiquement : corriger d'abord les
contrats applicatifs casses (objets absents/upserts), introduire des repositories
sur auth/messaging/abonnements, ajouter des tests d'autorisation avec un role
restreint, puis durcir les fonctions/grants et tester le retrait progressif de
`BYPASSRLS` domaine par domaine. Les index critiques viendraient par migrations
mesurees, sans nettoyage destructif des tables/colonnes legacy.

## Verdict

`PHASE 1A CLOSED`

La source de verite structurelle, l'inventaire exhaustif, la cartographie, la
classification des 84 SQL, les conventions futures, le suivi minimal, les
diagnostics et la reconstruction deterministe existent. Les dettes identifiees
sont volontairement reportees et aucune refonte/destruction interdite n'a ete
effectuee.
