# Phase 4B.4 — Comments, waveform & musical moments

Rapport initial de la candidate locale. La validation technique puis l'autorisation
explicite de commit/déploiement sont consignées dans
[l'addendum final](comments-moments-phase4b4-validation.md). Les observations de
baseline ci-dessous décrivent l'état avant livraison, pas la release ultérieure.

## Baseline 4B.3

Commit et release active : `2c3e7c6459750d3744c1ad0cf78a4c696baae2ce`.
Le commit est déjà sur `origin/migration/freebox-storage`. Aucun nouveau commit
de baseline n'est nécessaire. Le workflow canonique confirme `Deja a jour`.
Contrôle du 12 septembre 2026 : service active/running, NRestarts=0,
timers deploy/health actifs, `/`, `/live`, `/discover`, `/search`, `/healthz`
publics 200, racine disque 44 %. Le health applicatif canonique est `/` avec
Host synaura.fr ; `/healthz` est servi par le reverse proxy, pas par Next.

## Matrice préalable — sources métier réelles

| Domaine | Source canonique existante | Réutiliser / adapter | Ne pas étendre |
| --- | --- | --- | --- |
| Track : conversation | `comments`, `parent_id`, `/api/tracks/[id]/comments` | Normalisation commune, pagination, création, édition, replies | Les listes locales indépendantes de Live et CommentDialog |
| Modération track | `comment_moderation`, `creator_comment_filters`, `/comments/moderation` | Lecture filtrée commune et permissions créateur ; inclure timestamps et suppression auteur | Lecture brute qui réaffiche les commentaires masqués ; nouveaux contrats DB |
| Likes commentaire | `comment_likes`, `/comments/[commentId]/like` | Toggle existant, réponse serveur, synchronisation commune | Like UI sans rollback / sans succès backend |
| Moments track | `comments.timestamp_seconds` | Même commentaire, auteur, replies et modération ; projection chronologique | Deuxième conversation ou stockage temporel séparé |
| Réactions temporelles | `track_moment_reactions`, `/reactions`, `lib/momentReactions.ts` | Types et labels existants, agrégation bornée, déduplication par ID | Présence en temps réel inventée |
| Waveform | `track_waveforms`, `/waveform`, `lib/waveform.ts` | Peaks réels et cache partagé, durée AudioCore prioritaire, abonnement temps local | Faux peaks ; décode par card inactive ; nouvel élément Audio |
| Waveform Live | `components/player/Waveform`, SynauraScroll, ScrollPostSlide | Brancher le cache commun, garder Live ±5 | Boucles rAF indépendantes pour les nouvelles surfaces ; événements touch/pointer doublés |
| Player historique | `TikTokPlayer`, `PlayerCommentsDrawer`, normalizers | Endpoints et types temporels utiles | Recopier le monolithe ou ses fetchs sans annulation |
| CommentDialog / CommentSection | UI historique ; CommentSection sans consommateur actif | Remplacer les points d'entrée concernés par la surface commune | Nouveau drawer artisanal |
| Posts | `post_comments`, `/api/posts/[id]/comments` | Adapter liste/création/suppression et curseur, identité `post` | Aucun contrat replies/likes de commentaires n'existe en production : ne pas afficher de faux contrôles |
| Clips | `musicClipInteractionStore`, fichiers SSD, `/api/music-clips/[id]/comments` | Adapter liste/création/suppression et compteur, identité `clip` | Redirection des commentaires vers le morceau source ; fusion clip/track |
| Surface / historique | Context Surface Controller 4B.2 | Renderer `comments`, pile bornée et focus restore existants | Nouveau système d'overlay ou de history |
| Auteur | Profile Peek 4B.3 | `useProfilePeek`, même cache profil, retour Comments | Duplication des données profil |

Audit PostgreSQL effectué en lecture seule sous le rôle applicatif. État observé :
14 commentaires track, 3 lignes de modération, 0 likes commentaires, 3 commentaires
post, 10 réactions, 160 waveforms, 5 clips. Les commentaires clips sont stockés
sur le SSD par le contrat existant, pas dans une nouvelle table.

Contraintes confirmées : `comment_moderation` PK `(comment_id, creator_id)` ;
`comment_likes` unique `(comment_id,user_id)` ; `track_waveforms` PK
`(track_id,track_type)` ; réactions unique `(track_id,user_id,reaction_type,timestamp_seconds)`.
Indexes existants : comments `(track_id,created_at DESC)`, parent_id, index partiel
`(track_id,timestamp_seconds)` ; post `(post_id,created_at DESC)` ; réactions
`(track_id,timestamp_seconds)`. Aucune migration nécessaire pour la candidate.

## Décisions d'implémentation

Un modèle client par clé `entityType:entityId`, partagé par Live et Track,
avec capacités explicites. Conversation et Moments sont deux projections de la
même collection. Les mutations sont confirmées par le backend avant publication.
Le cache conserve les brouillons et la sélection pendant Profile Peek imbriqué.
Le renderer est lazy et ne connaît pas la présentation drawer/sheet.
Les posts et clips conservent leurs capacités existantes ; l'ajout de replies et
likes post nécessiterait une évolution métier/DB distincte, signalée pour revue.

La lecture track publique actuelle contourne la modération et la lecture modérée
omet les timestamps. La suppression auteur écrit un marqueur sous l'auteur alors
que la lecture ne consulte que le créateur du morceau. Ces bugs réels seront
corrigés dans la candidate en préservant la clé Phase 1B et le stockage existant.

## Architecture livrée

- `components/comments/CommentsRegistration.tsx` enregistre le renderer lazy
  `comments` dans le contrôleur 4B.2 existant. Aucun nouveau host/overlay.
- `lib/commentsModel.ts` normalise les trois identités ; Conversation est la
  liste paginée, Moments sa projection temporelle. Pas de stockage social parallèle.
- `lib/commentsClient.ts` partage requêtes et mutations via TanStack Query.
  Clés incluant type, ID et utilisateur ; cache 5 minutes ; `signal` transmis
  à fetch ; requêtes concurrentes identiques dédupliquées. Les brouillons sont
  isolés par utilisateur et entité et survivent au Peek imbriqué.
- `useCommentsSurface` est utilisé par Live track/post/clip et les routes Track
  et Post. CommentDialog et PostCommentsSheet deviennent des adaptateurs.
  Le player historique conserve son UI legacy hors de ce chantier : il n'a pas
  été recopié ni étendu ; ses endpoints track bénéficient de la lecture modérée.
- Le timestamp du composer est capturé explicitement, figé pendant la frappe,
  retirable. Un échec backend conserve le brouillon et affiche une erreur.
  Création/suppression/like ne sont affichés comme réussis qu'après réponse serveur.
- Compteurs partagés et invalidations ciblées mettent à jour les consommateurs
  montés. Un total exact est repris du backend ou d'une première page complète ;
  sinon le compteur reçu de l'entité demeure la base de mise à jour.

## Waveform et AudioCore

La waveform compacte réutilise les peaks réels de `/waveform`. Le hook partagé
est désormais dédupliqué ; le décodage de repli est annulable et ne crée aucun
élément musical Audio. Un échec d'enregistrement des peaks ne jette pas un
décodage réussi. Sur les parcours mesurés, tous les peaks étaient en cache serveur :
aucun décodage de repli n'a été nécessaire.

Playhead et horloge sont alimentés par les abonnements AudioCore existants,
sans polling React global. Six clusters maximum, avec représentation accessible
et repères positionnés selon les timestamps. Les timestamps détaillés restent
disponibles dans la conversation. L'inventaire des marqueurs est borné à 200
commentaires temporels ; la pagination de conversation reste disponible au-delà.

Ouvrir/fermer n'appelle aucune commande audio. Le seek vérifie que le morceau
du panneau est celui de l'AudioCore. La route Track utilisait encore un `<audio
controls>` indépendant : ses commandes ont été raccordées au lecteur global
existant, sans refaire la page. L'architecture AudioCore est inchangée.

## Modération / données

Les lectures `/comments` et `/comments/moderation` convergent. Timestamps,
replies, likes et permissions réutilisent les contrats existants. Les marqueurs
de suppression auteur **et** créateur sont respectés. Une indisponibilité de la
modération provoque une erreur, pas l'affichage de données non filtrées.

Les mutations vérifient l'appartenance du commentaire au morceau. Replies et
likes vérifient également l'accès au morceau. Les deux upserts conservent
`onConflict: 'comment_id,creator_id'`. La suppression auteur ne prétend plus
réussir si l'upsert a échoué et ne bascule plus vers un hard delete silencieux.
Aucune migration ni modification de contrainte DB.

Posts : conversation, création et suppression existantes. Pas de faux timestamps.
**Replies/likes de commentaires Post ne sont pas implémentés** : leur contrat est
absent de la base auditée. Cela reste une décision métier/DB à valider, pas un
bouton factice. Clips : endpoint propre au clip et lien source séparé ; le GET
ne réécrit plus le compteur. Les écritures de commentaires Clip sur le SSD ne
sont pas déclarées validées par le test local (le stockage distant n'est pas monté).

## Continuité, focus et responsive

Live conserve son montage et sa fenêtre ±5. Le brouillon commun alimente le
contrat de retour 4B.1 lorsqu'une route complète est ouverte. Les clics d'ouverture
contextuelle et les interactions internes ne déclenchent pas cette sauvegarde.
Les noms/avatars ont des clés de focus logiques pour le retour depuis Profile Peek.
Les références DOM des entrées fermées sont libérées par le contrôleur existant.

Desktop : drawer canonique, 432 px à 1440 et plafonné à 480 px à 1920.
Mobile 390×844 : sheet 82dvh (692 px mesurés), un scroll conversation, footer
non superposé au scroll, safe area et adaptation `visualViewport`. Le composer
reste dans l'écran. Cibles de la nouvelle surface ≥44 px, tabs ARIA et navigation
fléchée, waveform clavier, focus initial de région, Escape et Back.

## Tests exécutés le 12 septembre 2026

- TypeScript : PASS.
- 75 tests modèle, DB contract/Phase1B/Postgres, sécurité 0B, continuité Live,
  Context Surfaces et Profile Peek : PASS lors du contrôle intermédiaire.
- 12 tests dédiés modèle/API 4B.4 : PASS (dont 5 exécutant les handlers réels
  transpiles avec sessions/DB isolées ; ils ne prétendent pas remplacer PostgreSQL).
- AudioCore : 35 tests PASS lors du premier passage ; relance finale consignée ci-dessous.
- E2E authentifié : `scripts/comments-moments-gate.mjs`, deux modes.
  `gate-results.json` : commentaire temporel + réponse, like/unlike, timestamp
  figé, cluster, Peek imbriqué, retour focus auteur, mobile/desktop, cache 20 cycles.
  `read-only/gate-results.json` : route Track/Back, absence d'audio secondaire,
  identité Clip, cold/warm et mesure rAF, sans nouvelle écriture sociale.
- Aucun `pageerror` dans les deux runs PASS. Cela ne signifie pas un audit de
  toutes les erreurs réseau ou de tous les logs console historiques du site.
- Missing track : 404. Absence d'appels comments sur les cards inactives : PASS.
- Un seul AudioCore / un seul élément musical, queue identique à l'ouverture,
  abonnement état 1→2→1 et temps 2→4→2, 14 listeners AudioCore : observés.
- La mesure des slides exclut les div placeholders : seules les `section`
  avec contenu constituent les slides montées (maximum 11).

### Nettoyage des tests authentifiés

Deux runs ont créé au total quatre commentaires clairement préfixés
`[TEST PHASE 4B.4]`, dont deux replies ; les likes ont été retirés. Chaque DELETE
API a répondu 200 et a exercé l'upsert auteur corrigé. La baseline production
ignorant encore cette suppression douce, les quatre lignes ont ensuite été
retirées par une transaction ciblée, après vérification de leurs IDs, auteur et
préfixe. Contrôle final : **0 ligne restante parmi ces quatre IDs**.
Cette suppression des données de test est définitive ; aucun contenu utilisateur
préexistant n'a été supprimé. Les notifications normales de création peuvent
subsister ; leur circuit n'a pas été désactivé pour les tests.

## Performance locale (pas des chiffres production)

Windows / Chromium headless, Next development, données réelles via tunnel SSH.
Les cold samples recréent le document/cache client, avec compilateur serveur déjà
chaud. Le premier chargement initial avec compilation était beaucoup plus lent.

| Mesure | Résultat |
| --- | --- |
| Ouverture froide, n=5 | p50 563 ms ; p95 empirique 834 ms |
| Ouverture chaude, n=20 | p50 73 ms ; p95 103 ms |
| Requêtes sur 20 réouvertures | 0 |
| Waveform active | 1 GET, aucun decode dans le parcours mesuré |
| Heap après GC, avant/après 20 cycles | 21 953 632 → 22 659 212 octets (+0,67 Mio) |
| DOM CDP, avant/après | 1 623 → 1 782 nœuds |
| Listeners DOM CDP, avant/après | 770 → 783 |
| rAF, échantillon 3 s | 432 intervalles ; médiane 6,9 ms ; maximum 7,2 ms ; aucun intervalle >1,5× médiane |

Le comptage initial retenait artificiellement les handles DOM du runner : les
handles de `waitForSelector` sont désormais disposés. Les chiffres ci-dessus
proviennent du runner corrigé. Le faible delta restant n'est **pas** une preuve
d'absence de fuite à long terme. rAF mesure la régularité d'exécution, pas les
dropped frames du compositor à 60 Hz ; le dernier échantillon ne couvre pas un
scroll manuel simultané. Une mesure sur téléphone reste nécessaire.

## Captures pour revue

Répertoire `docs/comments-moments-phase4b4-captures/` :

- `desktop-conversation-1440.png`, `desktop-moments-1440.png` ;
- `desktop-cluster-1440.png`, `desktop-nested-profile-1440.png` ;
- `desktop-comments-1920.png` ;
- `mobile-conversation-390.png`, `mobile-moments-390.png` ;
- `mobile-marker-390.png`, `mobile-nested-profile-390.png` ;
- `mobile-composer-focused-390.png` (focus textarea, **pas un clavier OS simulé**).

Les captures denses montrent les vrais commentaires temporaires du compte de
test, supprimés après contrôle. Aucun faux signal social n'est injecté dans l'app.

## Réserves explicites avant validation complète

1. Clavier virtuel physique, lecteur d'écran réel et zoom navigateur 200 % :
   non validés par Chromium desktop.
2. Écriture réaction temporelle, création Post et mutation Clip SSD : pas de
   nouveau test E2E réel déclaré PASS. Modèle des réactions et agrégation testés ;
   lecture/identité Clip vérifiées. Le Post n'était pas dans la fenêtre de rendu
   de l'E2E complémentaire et ce cas y est marqué SKIP. Le contrôle dédié
   `scripts/comments-post-gate.mjs` a ensuite validé sur un vrai Post la surface
   canonique, l'absence de moments inventés, le brouillon conservé et Back sans
   changement de route : PASS, zéro pageerror, aucune mutation sociale.
3. Changement rapide d'entité : annulation/dédup testées sur le QueryClient ;
   le scénario complet à forte latence dans l'UI reste à compléter.
4. Inventaire legacy conservé hors Live/Track/Post : pas de promesse de suppression
   de toutes les anciennes interfaces de commentaires de l'application.

La candidate est disponible pour revue, mais ces réserves interdisent d'affirmer
que **toute** la matrice demandée est validée. Aucune Phase 4B.5 commencée.

## Contrôle final du build et de production

`npm run build` : PASS (compilation, lint/type validation, 90 pages statiques et
traces). Bundle `/live` mesuré par l'utilitaire Next du build : 426 791 octets
First Load JS (environ 427 kB), contre 420 kB dans le rapport baseline 4B.3.
Partagé : 338 kB contre 334 kB. Ces deltas approximatifs comparent deux rapports
de build, pas un benchmark A/B effectué sur la même machine.

Relance finale : **87/87 tests PASS** (AudioCore, Context Surfaces, Live Continuity,
Profile Peek, modèle/API 4B.4). TypeScript et `git diff --check` PASS.
Les avertissements Browserslist obsolète et runtime edge sont préexistants ;
aucune mise à jour de dépendance hors périmètre n'a été effectuée.

Production : release `2c3e7c6459750d3744c1ad0cf78a4c696baae2ce` inchangée,
service actif, `/healthz` public 200, racine 44 %. Les warnings systemd listés
sont historiques (dernier le 10 septembre), pas des erreurs de la candidate.
Aucun code 4B.4 n'a été committé, poussé ou déployé.

Hors périmètre préservé : PLAY_STORE.md, capacitor.config.ts, synaura-app/**,
.claude/, supabase/.temp/ et artefacts d'audit préexistants. Aucun environnement,
secret, dump ou fichier natif n'a été ajouté à l'index.
