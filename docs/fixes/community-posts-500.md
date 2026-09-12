# Correctif séparé — Community posts HTTP 500

Statut : **VALIDÉE — commit/push/déploiement autorisés, clôture conditionnée au smoke production**.
Validation locale : 13 septembre 2026 (Europe/Paris). Baseline protégée : `f71bd509e9de9eecb1817f87bbc6b58fb23f517f`, tag `synaura-live-4b-baseline`.
Le contexte historique ci-dessous explique l'ouverture du ticket, pas l'état de cette candidate.

## Reproduction confirmée avant la livraison 4B.7

Baseline production : `2a6ab2a834146494c795650840b673c411206a02`.

`GET /api/community/posts?category=feedback&limit=30&sort=recent` renvoie HTTP 500 sur `https://synaura.fr` comme sur le build local. Réponse publique générique ; log local : `Relation PostgreSQL introuvable entre forum_posts et user_id` (`PG_ERROR`). Le club s'ouvre, mais ses posts ne chargent pas. Le retour Live est indépendant et testé.

## Piste de correction à instruire

Examiner le select relationnel `profiles:user_id (...)` de `app/api/community/posts/route.ts`, le résolveur de relations du wrapper PostgreSQL et le fallback existant `shouldFallbackSelect` dans `lib/communityPosts.ts`. Cause observée : résolution de cette relation refusée. Ne pas supposer qu'une migration ou une nouvelle FK est nécessaire avant inspection du contrat réel.

## Périmètre et critères d'acceptation

- Correctif et commit distincts de 4B.7 ; aucun changement de design/handoff/AudioCore.
- GET anonyme et authentifié : HTTP 200, auteurs corrects, filtre catégorie, tri, pagination et identités conservés.
- Ne pas exposer des données privées ; ne pas transformer toute erreur SQL en succès vide.
- Tests de régression sur relation/fallback ; contrats DB, type-check, build, smoke club.
- Pas de suppression, création de contenu utilisateur, modification de droits ou contrat DB sans justification vérifiée.

## Diagnostic confirmé sur la baseline finale 4B

Avant modification, build production local, même PostgreSQL via tunnel SSH existant :
`GET http://localhost:3000/api/community/posts?category=feedback&limit=30&sort=recent` → 500.
Même erreur pour collab, remix, ai et ai_prompt (valeur réelle du club `/community/ai`).
Réponse publique : `{"error":"Erreur lors de la récupération des posts"}`.
Erreur serveur : `Relation PostgreSQL introuvable entre forum_posts et user_id`, code PG_ERROR, details/hint null.

Trace vérifiée : GET construit `from('forum_posts').select('*, profiles:user_id (...)')` ; `lib/database.ts` interprète profiles comme alias et **user_id comme table relationnelle**, pas colonne FK. Après le SELECT, `hydrateRows` appelle `resolveRelation` même pour une liste vide. Le lookup pg_constraint ne résout pas forum_posts → table user_id. Le wrapper normalise l'exception ; `shouldFallbackSelect` reconnaît des erreurs PostgREST/anglaises mais pas ce message français. La route retourne 500 avant le batch auteur.

La stack native n'est pas conservée par cette normalisation : aucune stack inventée. `scripts/community-posts-query-probe.mjs` rejoue le GET exact de la baseline et conserve SQL paramétré/erreur structurée dans `artifacts/community-posts-fix/query-probe.json`, sans valeurs des paramètres.

## Schéma réel — READ ONLY

Audit dans BEGIN READ ONLY puis ROLLBACK, base postgres, rôle existant synaura_app. Aucune écriture de contenu, DDL, configuration ou droit.

| Élément | Constat |
| --- | --- |
| forum_posts.user_id | UUID NOT NULL, FK validée forum_posts_user_id_fkey → auth.users(id), ON DELETE CASCADE |
| profiles.id | UUID PK, FK validée → auth.users(id), ON DELETE CASCADE |
| Posts/profils | Pas de FK directe ; identité auth partagée : forum_posts.user_id = profiles.id |
| Index posts | PK, category, created_at DESC, user_id |
| Index profils | PK id, adaptée au batch par IDs |
| Likes | forum_post_likes référence posts et auth.users ; unicité (post_id,user_id) |
| Données | 10 posts, 4 auteurs, 0 profil absent, 0 auth orpheline, 0 auteur NULL, 1 avatar NULL |
| Catégories stockées | question 7, suggestion 2, general 1 |
| CHECK catégorie | question/suggestion/bug/general seulement |
| Visibilité | Pas de colonne hidden/deleted/private/club-membership ; is_locked concerne l'écriture |
| RLS existante | forum_posts désactivée, profiles activée ; rôle serveur non superuser mais BYPASSRLS existant ; politiques SELECT publiques historiques |
| Dépendances | Pas de vue ni trigger non interne sur forum_posts ; fonctions get_active_members_count, update_forum_post_likes_count, update_forum_post_replies_count |

Colonnes, contraintes, indexes, politiques et fonctions : `artifacts/community-posts-fix/schema.json`.
Les suppressions existantes sont physiques et contrôlées par propriétaire dans la route dédiée. Aucun filtre, droit, rôle ni route de suppression changé.

**Aucune migration nécessaire pour le 500** : le batch via identité auth partagée respecte le modèle. Une FK destinée uniquement à satisfaire une syntaxe historique serait artificielle. La [documentation des jointures Supabase](https://supabase.com/docs/guides/database/joins-and-nesting) décrit la détection par FK ; le contrat du wrapper local inspecté ici reste déterminant.

## Correction minimale et robustesse

- GET : SELECT posts sans embedding historique ; `attachAuthors` existant résout les profils en un batch par IDs uniques. Catégorie/search, pagination, likes viewer et visibilité des tracks associés conservés.
- `attachAuthors` propage une vraie erreur DB, au lieu de la confondre avec un auteur absent.
- Tri primaire inchangé (created_at/likes_count/replies_count), puis id DESC pour stabiliser les égalités. Des compteurs égaux existent réellement (groupes de 6 et 2 posts).
- Forum : pas de fetch `/api/users/by-id/:id` si `post.author` est déjà fourni. Le premier E2E a révélé 10 appels pour 4 auteurs, dont 7 pour le même auteur ; replay final : **0**. Fallback ancien conservé si auteur absent.

Aucun changement de contrat page/limit, endpoint, catégorie, design ou architecture. Les branches legacy de compatibilité du tri restent en place ; aucun élargissement arbitraire des fallbacks SQL.
Un post sans profil résolvable est conservé avec author omis du JSON ; aucun utilisateur inventé. L'UI garde « Créateur Synaura » et son fallback Avatar. Auteur NULL/orphelin : fixtures uniquement, pas création en production où les contraintes les empêchent normalement.

Le JSON auteur expose seulement id/name/username/avatar, vérifié sur les réponses réelles. Le wrapper SQL lit base.* puis projette les champs en JavaScript : ne pas confondre restriction JSON et restriction SQL.
Les erreurs DB posts/profils, dont 42501, restent HTTP 500. Les posts verrouillés restent lisibles ; les tracks privés associés sont masqués sauf pour leur propriétaire ; les likes restent filtrés par viewer. Le helper auteur partagé avec POST propage désormais aussi ses erreurs de lecture ; aucune logique d'écriture/autorisation POST modifiée (non authentifié : 401).

## Réserve de données distincte du 500

**Aucun post stocké sous feedback/collab/remix/ai/ai_prompt.** Les quatre clubs affichent donc un état vide correct, pas un PASS de contenu Feedback existant visible.
Le helper d'écriture legacyCategory transforme feedback en question, collab/remix/ai_prompt en suggestion ; l'origine n'est pas conservée de manière permettant une reclassification certaine. Aucune reclassification arbitraire, création de post ni migration de catégories ici.
Les 10 vrais posts et leurs auteurs sont validés dans `/community/forum` sans filtre. Un club Feedback peuplé reste **NON TESTÉ faute de données correspondantes**. L'évolution de la taxonomie nécessite une décision séparée.

## Performance et pagination

Avant, HTTP local réel : feedback 500 en 951,9 ms ; collab 17,4 ; remix 473,8 ; ai 5,7 ; ai_prompt 553,6. Échantillons ponctuels chaud/froid, pas une comparaison statistique contrôlée.
Après, 3 GET HTTP par catégorie sur next build + next start, même DB/tunnel, **24 réponses 200**. Médianes indicatives, pas des p95 :

| Catégorie | Posts / auteurs | min / médiane / max (ms) |
| --- | --- | --- |
| feedback | 0 / 0 | 37,9 / 61,9 / 96,3 |
| collab | 0 / 0 | 60,6 / 62,7 / 64,0 |
| remix | 0 / 0 | 61,7 / 63,9 / 64,9 |
| ai | 0 / 0 | 56,9 / 62,0 / 69,0 |
| ai_prompt | 0 / 0 | 63,1 / 63,5 / 63,7 |
| question | 7 / 2 | 114,0 / 139,3 / 172,9 |
| suggestion | 2 / 2 | 141,5 / 189,8 / 199,6 |
| all | 10 / 4 | 86,3 / 92,3 / 105,2 |

Artefact http-after.json, build cNOY0nRdMUWkXDkYI-YKq, même code API que la candidate finale, avant le seul garde frontend. Parcours final rejoué sur le build **6xWsumq7FGG03woS2B1IZ**.

Comptage SQL métier par vraie route/wrapper et PG READ ONLY, session exclue (distinct des timings HTTP) :

- Avant : 2 requêtes (posts + lookup relation), puis 500 pour les 8 catégories du probe.
- Après, club vide : 2 (posts + count), aucun lookup auteur.
- Fixture 30 posts sans track : 3 (posts + count + batch auteurs), pas 31.
- Après, 10 posts réels / 4 auteurs : **7 requêtes à froid**, ~123 ms dans le probe. Posts, count, batch auteurs, tracks, lookup creator_id legacy, fallback batch tracks, batch profils créateurs. Ce coût legacy des tracks préexiste, reste borné et hors correction. Ne pas revendiquer 3 queries pour ces données réelles.

Recent/popular/most_replied : 4 pages de limite 3 sur les 10 vrais posts, ordre égal au SQL canonique, **0 doublon**. Fixtures : égalités, bornes page/limit, JSON pagination. Aucune refonte cursor/OFFSET.

## Gates et captures

- 16 tests ciblés : catégories/JSON, auteur/avatar, orphelin/NULL, batch unique, tri/pagination, erreurs DB, visibilité privée/lock, likes viewer, anti-relation legacy, POST 401, garde frontend.
- Suite complète DB/sécurité/app : **284/284 PASS**, zéro skip (`artifacts/community-posts-fix/tests-final.log`).
- npm run type-check : PASS ; npm run build : PASS, build final 6xWsumq7FGG03woS2B1IZ (`build-final.log`).
- E2E Chromium visible, vraie authentification compte E2E, build production local : **35/35 PASS**, zéro exception JS, erreur console/HTTP, mutation sociale tentée ou appel profil redondant (`e2e-verified/results.json`).
- Parcours : Community → Feedback → retour → Collab → retour → Remix → retour → AI → retour → forum, 10 associations auteur vérifiées → Community.
- Captures de revue sous `artifacts/community-posts-fix/e2e-reviewed/` : community.png, feedback.png, collab.png, remix.png, ai.png, forum-real-posts.png. Dernière capture cadrée sur les posts réels, sans retouche artistique.
- git diff --check : PASS ; index vide. Scan des 9 fichiers candidats (motifs clés privées/tokens/URL DB authentifiée + comparaison en mémoire avec 13 valeurs sensibles locales) : PASS, aucun secret détecté.
- Replay avec cadrage des posts réels : `e2e-reviewed/results.json`, **35/35 PASS**, zéro erreur console/HTTP/JS, zéro mutation sociale et zéro refetch profil. Captures Feedback et forum inspectées visuellement.

Les mutations sociales sont bloquées par le navigateur de test (hors authentification) ; aucune tentée. Aucun post créé/modifié/supprimé. Credentials SSH/DB/E2E lus en mémoire, pas écrits dans les artefacts. Ces artefacts restent locaux, hors proposition de versionnement.

## Risques et sécurité production

- Club Feedback peuplé : réserve explicite ci-dessus, aucun faux PASS.
- Tracks associés et sélecteurs relationnels de routes de détail legacy : non refactorisés. Le smoke de listes ne valide pas tous les endpoints Community ni l'ouverture d'un détail.
- Fallback frontend pour profil réellement absent conservé ; zéro refetch mesuré sur les 10 posts réels, pas sur un lot hypothétique de profils manquants.
- Aucun changement Live, AudioCore, Context Surfaces, Profile Peek, Comments/Moments, Actions, handoffs, intro ou natif. Cloudinary 401 séparé.
- Modifications utilisateur/natives et addendums locaux des deux rapports 4B préexistants préservés. Aucune migration/commit/push/déploiement. La production conserve la baseline ; son 500 public n'est donc pas déclaré corrigé.

## Liste exacte de la livraison — 10 fichiers

1. app/api/community/posts/route.ts — embedding retiré, ordre secondaire stable.
2. lib/communityPosts.ts — erreur DB auteur propagée.
3. app/community/forum/page.tsx — garde anti-refetch auteur déjà présent.
4. tests/community-posts-fix.test.mjs — 16 tests ciblés.
5. scripts/lib/community-posts-harness.mjs — vrais modules isolés pour tests/probe, aucun bypass HTTP.
6. scripts/community-posts-schema-audit.mjs — audit réel READ ONLY.
7. scripts/community-posts-query-probe.mjs — avant/après READ ONLY, comptage SQL/pagination.
8. scripts/community-posts-e2e.mjs — parcours authentifié local sans mutations sociales.
9. docs/fixes/community-posts-500.md — ce rapport.
10. docs/fixes/community-historical-category-debt.md — dette historique séparée, documentée sans nouveau chantier.

Décision utilisateur : candidate du **500 de liste** validée, commit isolé/push/déploiement canonique autorisés. La [dette de population des clubs](community-historical-category-debt.md) reste séparée. Le runner accepte désormais explicitement la production via COMMUNITY_E2E_BASE_URL ; aucune modification applicative supplémentaire. La clôture effective sera consignée après contrôle de production, sans anticiper le résultat.

Contrôle production final en lecture seule : current et last-successful-sha = `f71bd509e9de9eecb1817f87bbc6b58fb23f517f`, comme HEAD et le tag local dé-référencé ; service active, healthz public `ok`, racine à 45 %, 32 Go disponibles. Aucun changement de production effectué.
