# Phase 4B.5 — Contextual actions & organization

Statut : audit initial terminé, implémentation et validation à réaliser.
Baseline 4B.4 : `2db884a42eeab31bfb7fd11d64d9a505f19fe620` (CLOSED / DEPLOYED).
Aucun commit/déploiement autorisé avant revue. Ni AudioCore, ni logique
Comments/Moments, ni redesign Profile Peek/feed, ni apps natives, ni Cloudinary.

## Matrice initiale — avant tout code applicatif

| Action | Implémentations actuelles / UI | Source métier / API réelle | Duplications / défauts | Cible 4B.5 |
| --- | --- | --- | --- | --- |
| Favori | Live `useLibraryFavorites`, `providers.handleLike`; Library `useBatchLikeSystem`; Profile/mini-player `LikeButton/useLikeSystem` | `track_likes`, GET/POST/DELETE `/api/tracks/:id/like`, liste `/api/tracks?liked=true`; favori IA `/api/ai/tracks/:id/favorite` | Favori Live localStorage distinct du like serveur ; états locaux Library ; LikeContext existant mais nettoyage monté via useState et expiration mutante en render | Un seul favori serveur, immédiat, synchronisé via LikeContext existant ; conserver les données locales historiques sans migration implicite |
| Playlists / quick-add | Library picker inline et gestion complète ; `TrackContextMenu` expose un bouton sans action | `playlists`, `playlist_tracks`; GET/POST `/api/playlists`, GET/DELETE `/api/playlists/:id`, POST/DELETE `/api/playlists/:id/tracks` (body trackId / query trackId), ownership/visibilité/quota existants | Picker dupliqué, bouton vide ; `/api/playlists/simple` est un stockage mémoire de test, interdit pour ce chantier | Picker lazy commun ; liste propriétaire et membership réel, recherche, création privée rapide ; ajout/retrait après succès ; Library demeure gestion canonique |
| Queue / à suivre | `QueueDialog`, `QueueBubble`, Library, `TrackContextMenu`, provider React | AudioCore : snapshot.queue/currentTrack/currentIndex, setQueue/reorderQueue/removeFromQueue ; provider expose aussi une liste historique upNext persistée et fusionnée | Dialog large avec suggestions/requêtes, modèle historique parallèle upNext ; mode end insère à la fin de upNext, pas de toute la queue | Une projection de la queue AudioCore ; next après courant, end en fin ; dialog ancien devient bridge ; aucune copie persistée nouvelle, aucun changement du moteur |
| Lyrics | TikTokPlayer inline ; ancien panneau Live | Champ texte `tracks.lyrics` ou `ai_tracks.lyrics`, exposé GET `/api/tracks/:id` | Panneaux inline distincts ; endpoint Suno timestamped-lyrics appartient à la génération et ne prouve pas un contrat de lecture synchronisée | Surface lazy, texte réel uniquement ; état indisponible si absent, aucun karaoke inventé |
| Share / Web Share / copie | `TrackContextMenu`, Live shareTrack, Library shareTrack, Track `ShareButtons/TrackShareCardModal`, Profile partage profil | Web Share / clipboard ; `/track/:id` canonique, `/embed/:id` réel | Fallbacks et faux succès de copie ; partage profil/post/clip distinct du partage morceau | Un comportement track : Web Share sinon surface compacte de copie vérifiée ; annulation native non erreur ; conserver partages non-track |
| Details / crédits / métadonnées | Route Track complète, données feed/Profile | GET `/api/tracks/:id` : title/artist/createdAt/duration/genre/album, attribution remix et variationsCount, permissions remix | Aucun champ crédits structurés / explicit fiable exposé par cette API | Vue courte des seuls champs présents ; attribution réelle ; CTA route Track ; pas de crédits ni badge explicit inventés |
| Options / trois-points | TrackContextMenu portal maison ; Library menu local ; Profile menus propriétaire ; Track rangée d'actions | Agrégation UI des contrats ci-dessus | Menu playlist inopérant, actions différentes par card, overflow Track mobile | Liste d'actions commune ; petit menu desktop et sheet mobile via fondations overlay/controller ; gestion propriétaire complexe reste route |
| Remix / variations | Live remixSheetTrack et openStudioWithRemix ; Track modal ; `TrackCreateRemixActions` | GET track : canRemixAiVariation/allowAiVariation/remixVisibility ; `/api/remixes/source` ; `/ai-generator?mode=remix&sourceTrackId=...&sourceTrackType=...` | Confirmations artisanales, handoffs route dispersés | Confirmation contextuelle puis workspace existant ; conserver snapshot/token 4B.1, aucune génération automatique |
| Créer clip | Live useThisSound ; Track canUseSound ; route autonome | canUseSoundClientSide + allowClips/remixVisibility/owner ; `/clips/new?trackId=...&trackType=...` | À distinguer d'un clip existant commenté/partagé | Handoff explicite vers route existante avec retour Live, jamais création dans drawer |
| Download | Live lien audio brut non conditionné ; Track DownloadButton ; TikTokPlayer permission | `/api/subscriptions/my-subscription`, entitlements.features.download, media public, offlineLibrary ; aucun droit par morceau exposé | Lien Live contourne condition UI ; absence de contrat d'autorisation téléchargement par morceau | Ne pas exposer de lien brut ; action seulement lorsque permission existante vérifiable et média accessible ; pas d'élargissement de droits ni nouvel endpoint |
| Library | CRUD/reorder playlists, favoris serveur, récents/offline, menus et queue | APIs playlists/liked/recent ; cache UI actuel local | Gestion complexe ne doit pas migrer dans Live | Brancher seulement actions courtes/synchronisation ciblée ; gestion reste Library |
| Track | TrackPageClient, actions nombreuses sur rangée mobile | Track GET serveur, playback partagé, partage/remix/clip | Risque de dépassement horizontal documenté 4B.0 | Play + favori + Comments + Plus, grille/wrap ; page et Comments conservés |
| Profile / Peek | Profile LikeButton + menus propriétaire ; Peek play des morceaux récents | Données profil/public tracks existantes | Pas d'options courtes communes dans Peek | Ajouter uniquement le déclencheur d'actions sur morceau, pas de refonte Peek |
| Discover | DiscoverTiles + TrackCreateRemixActions | Données publiques feed/track | Actions partielles selon tile | Même déclencheur d'actions, aucune query details/lyrics/playlists au montage card |
| Search | Search résultats/suggestions track | `/api/search` et `/api/search/suggestions` | Navigation/play uniquement | Même déclencheur d'actions sur résultats pertinents |
| Live | SynauraScroll, snapshot4B.1, controller4B.2 | Feed ±5 + AudioCore + Comments4B.4 | Local favorites, overlays remix/lyrics, téléchargements non conditionnés | Remplacer seulement branchements d'actions, conserver feed/visuel/timeline |
| Navigation `/clips` | SECONDARY_WEB_NAV_ITEMS expose `/clips` ; aucune page index | `/clips/new` réel et filtre Live clips existant | Lien index 404 | **Décision B : retirer l'entrée secondaire /clips**. Ne pas fabriquer d'index vide ; création /clips/new conservée |

## Décisions d'implémentation

- Descripteur léger track et fonctions pures de capacités/URLs, pas de framework.
- TanStack Query existant pour les données lazy et invalidations playlists ciblées.
- LikeContext existant pour les favoris, pas de store concurrent.
- AudioCore reste propriétaire. Les adaptateurs React historiques peuvent être
  raccordés à sa queue, sans toucher `lib/audio/**` ni créer de nouvelle queue.
- Surface sœur Options → Playlist/Lyrics/Details remplace Options ; Comments/Peek
  restent le niveau précédent. Profondeur bornée par controller existant.
- Le controller n'a aujourd'hui que drawer/sheet/modal : une présentation compacte
  pour les actions doit réutiliser SynauraOverlay, pas un nouveau portal/overlay.
- Handoff route : capturer le retour Live via contrat existant, fermer les surfaces
  transitoires avant de pousser le workspace. Les IDs source ne sont jamais ceux
  du clip lorsqu'on agit sur un morceau.
- Les erreurs serveur/clipboard et quotas restent visibles, aucun faux succès.
- Les mutations E2E ne porteront que sur des fixtures isolées créées pour ce test.
  Favoriter un morceau public préexistant peut créer notifications/missions non
  réversibles : ne pas utiliser ce raccourci pour prouver le toggle.

## Candidate implémentée

`lib/trackActions.ts` contient uniquement normalisation, URLs, partage natif et
insertion de queue. `components/actions` branche huit descripteurs sur le controller
existant : options, playlists, queue, lyrics, details, share, remix et clip. Le rendu
lourd est importé dynamiquement ; les boutons ne chargent aucune playlist/parole.
Options est un menu compact desktop et une sheet mobile ; les listes et textes
utilisent le drawer/sheet existant. Aucun endpoint ni contrat DB n'est ajouté.

### Playlists et favoris

Le picker lit les playlists du compte, recherche, crée une **playlist privée** et
ajoute/retire via le vrai endpoint membership. La création et l'ajout sont deux
actions explicites, jamais un succès atomique fictif. Les états/erreurs serveur
restent visibles. Cache TanStack du compte et invalidations Library ciblées.

Le cœur signifie favori serveur ; le signet Live signifie playlist. Les anciens
favoris localStorage ne sont ni effacés ni migrés implicitement. LikeContext reste
la projection partagée, pas un deuxième stockage métier. Toggle lit l'état serveur
avant mutation ; une requête de lecture tardive ne doit pas annuler une mutation.
Le statut initial se charge pour Track, Options et le seul item Live actif.

### Queue

Les anciens noms `upNextTracks/addToUpNext/...` sont des adaptateurs de la queue
AudioCore ; aucune liste secondaire ni persistance `queue.upnext` active. Les
anciennes clés navigateur sont laissées intactes. QueueDialog est un pont vers le
controller, et l'ancien QueuePanel du player est retiré. Lire ensuite déduplique
et insère après le morceau chargé ; ajouter en fin déplace réellement à la fin.
Retirer/vider la suite sont explicites et ne retirent pas le morceau chargé.
Pas de drag/drop. Limite 500 : refus explicite, pas de suppression silencieuse.
**Aucune modification dans `lib/audio/**`.**

### Paroles, partage, informations et handoffs

Les paroles viennent de GET Track, sans génération ni faux karaoke. Les details
restent courts (date, durée, genres, album, attribution/variations si exposées).
Pas de crédits détaillés ou badge explicite inventés.

Web Share est prioritaire ; annuler n'ouvre pas un fallback. Le fallback présente
le lien `https://synaura.fr/track/<id>` et ne prétend copier qu'après résolution de
Clipboard.writeText. Les anciens dialogues Track/Live/Library/player sont raccordés
aux actions canoniques ; les partages de profils/posts/albums ne deviennent pas des
partages de morceaux.

Remix et clip ne génèrent rien dans la surface. Le CTA ferme les entrées history
transitoires, puis ouvre la route existante avec source et `liveReturn`. Le
snapshot 4B.1 demeure sur l'entrée Live. Les droits exposés par GET Track et le
compte restent nécessaires ; aucune permission n'est élargie pour l'E2E.
Téléchargement : abonnement existant, média public ou propriétaire et URL média
présente, sans lien audio brut dans le menu. Aucun nouvel accès serveur n'est créé.

### Intégrations et périmètre conservé

Live, Comments, Profile Peek, Track, Discover, Search, Profile et Library utilisent
le même déclencheur. Comments → Options → Playlist remplace la surface sœur et
conserve Comments comme parent. Profile Peek → morceau récent → Actions conserve
le Peek comme parent. Library garde gestion complexe, classement, édition et
suppression propriétaire. Les actions Track utilisent wrap + Plus sur mobile.
La navigation secondaire `/clips` 404 est retirée ; `/clips/new` reste disponible.

## Défauts observés et corrigés

- Le bloc métadonnées Live interceptait le clic Options : priorité de clic de la
  colonne track portée de z-30 à z-40, sans déplacement ni refonte du feed.
- La colonne track peut défiler seule dans les fenêtres de moins de 600 px de
  haut, sans modifier le layout normal 390×844/desktop. Le laboratoire `/dev/live`
  affiche un chrome/mini-player qui n'existe pas sur le vrai `/live` : le gate et
  les captures finaux utilisent exclusivement la route authentifiée `/live`.
- La bulle Queue traversait les overlays : masquée pendant une Context Surface,
  avec clé logique pour restitution du focus après fermeture.
- Le focus initial non interactif pouvait tracer une ligne bleue sur toute la
  sheet : exemption limitée à ce titre, focus-visible clavier conservé sur contrôles.
- LikeContext avait un intervalle créé dans un initialiseur et une suppression de
  cache pendant lecture/render : supprimés ; nettoyage au changement de session.
- GET Track n'expose pas le favori personnel : hydratation explicite de ce statut
  sur les surfaces actives, pas de confiance implicite dans `false` initial.
- Une file préparée sans morceau chargé ne perd plus son premier élément dans la
  projection « à suivre » ; le départ dépend de l'identité réellement chargée.
- Un refus Clipboard affiche une consigne française de copie manuelle ; aucun
  contournement de permission et aucun faux message « copié ».

## Validation

- **240 tests du dépôt PASS**, dont 12 nouveaux tests ciblés. Le test RSC existant
  vérifie désormais l'absence de prefetch sur chaque Link plutôt qu'un nombre fixe
  de deux liens : Remix est devenu un bouton de confirmation, sans prefetch.
- Type-check PASS ; `git diff --check` PASS ; **`npm run build` PASS** : compilation,
  validation lint/types, 90 pages statiques et traces. Avertissements préexistants
  Browserslist/caniuse-lite obsolète et génération statique désactivée en runtime edge.
- E2E authentifié : playlist créée/ajoutée/retirée et effacée via API ; vérification
  du DELETE par GET 404. Aucun contenu utilisateur préexistant supprimé.
- **49 contrôles UI PASS**, rapport `contextual-actions-phase4b5-captures/results.json`.
  Presse-papiers réel : lien canonique relu après écriture autorisée. Web Share
  natif/annulation/indisponibilité : tests de contrat, pas un partage envoyé à un tiers.
- Favoris UI/synchronisation : mutation réseau interceptée dans le navigateur
  jetable, sans faux like ni notification/mission persistante. Cette preuve n'est
  **pas** présentée comme une mutation favorite réelle en production.
- Options/playlists/queue/lyrics/share/details : ouvertures et fermetures à zéro
  play/pause/seek/load, même instance, même queue, même item Live.
- Queue next/end/remove/clear via un vrai morceau récent du Profile Peek : PASS.
- Comments/brouillon, Back imbriqué/focus et Track → Back → Live : PASS.
- Mobile 390×844 : surfaces bornées, scroll et champs visibles, Track sans
  débordement horizontal. Captures dans `contextual-actions-phase4b5-captures/`.
- Zoom natif Chrome desktop 200 % : confirmé par `chrome.tabs.getZoom() === 2`,
  pas par CSS zoom ni deviceScaleFactor. Options accessible après scroll interne,
  cinq surfaces sans débordement horizontal ; clavier/Tab/Shift+Tab/reduced-motion PASS.
- 20 cycles chauds : zéro requête organisation, slides ≤11, instance et listeners
  AudioCore stables. Aucun nouvel élément audio musical.

### Mesures locales finales

Mesures en développement, avec navigateur jetable authentifié et trois vrais
morceaux publics ordonnés uniquement dans ce navigateur. Pas un benchmark mobile
matériel ni une mesure du serveur de production.

| Mesure | Résultat |
| --- | --- |
| Première ouverture stabilisée | 1 054 ms |
| 20 ouvertures chaudes, p50 / p95 | 346 / 1 591 ms |
| Requêtes organisation pendant 20 cycles | 0 |
| Heap après GC, avant → après | 22 452 472 → 22 826 776 octets (+0,357 Mio) |
| Nœuds DOM, avant → après | 926 → 932 |
| Listeners DOM, avant → après | 806 → 805 |
| Listeners AudioCore | 14 → 14 |
| Abonnés état / temps AudioCore | 1 / 2 → 1 / 2 |
| Renders provider pendant les 20 cycles | 52 → 52 |
| Instance / génération / morceau / queue | Inchangés |
| Live First Load JS (utilitaire Next) | 429 268 octets ; baseline documentée 426 791 : +2 477 (+0,58 %) |
| First Load JS partagé (rapport Next) | 339 kB ; baseline documentée 338 kB |
| Chunk ActionsSurface lazy | 15 948 octets bruts / 5 462 gzip |

Le chronomètre inclut l'attente de stabilisation de 240 ms des animations. La
machine exécutait aussi des vérifications locales : le p95 de 1,59 s est conservé
tel que mesuré, sans le présenter comme une latence de production. L'absence de
croissance linéaire sur ce petit test n'est pas une preuve d'absence absolue de fuite.
Les tailles baseline/candidate comparent deux builds documentés, pas un A/B sur
deux checkouts construits simultanément. Mesure réalisée avant relance du serveur dev.

### Console et réponses réseau

Aucune exception UI non interceptée et aucune erreur HTTP API locale pendant les
49 contrôles. Le GET 404 de la playlist vient de la vérification **après suppression**.
Trois 401 d'images Cloudinary historiques sont consignés séparément. Un avertissement
RSC avec fallback de navigation est également présent dans la session de test ; son
origine précise n'a pas été attribuée. Il ne faut donc pas appeler la console
« entièrement propre » ni assimiler le PASS fonctionnel à cette affirmation.

### Captures examinées

`contextual-actions-phase4b5-captures/` :

- 1440 : `desktop-options-1440.png`, `desktop-playlist-1440.png`,
  `desktop-queue-1440.png`, `desktop-lyrics-1440.png`,
  `desktop-track-details-1440.png`, `desktop-share-1440.png`.
- 1920 : `desktop-live-queue-1920.png` (file non vide).
- 390×844 : `mobile-track-options-390.png`, `mobile-playlist-picker-390.png`,
  `mobile-queue-390.png`, `mobile-lyrics-390.png`, `mobile-track-actions-390.png`.
- Zoom natif : `zoom200-{track-options,playlist-picker,queue,lyrics,track-details}.png`.

`failure-state.png`, `results-core.json` et `results-zoom.json` sont des diagnostics
intermédiaires, pas la série de captures finale. `results.json` est le gate final.

### Réserves explicites

Android/Gboard physique et NVDA réel restent non testés ; l'émulation mobile ne
valide pas un clavier OS. Les 401 Cloudinary historiques restent un chantier séparé.
Aucun des 100 morceaux publics contrôlés n'autorise remix/clip : URLs et mécanisme
commun de retour sont testés, mais un handoff authentifié jusqu'au workspace avec
une source réellement autorisée reste à jouer avec une fixture appropriée. Aucun
droit existant n'a été modifié pour contourner cette réserve.

## État à la remise de la candidate (historique, avant autorisation de livraison)

**Candidate prête pour revue**, pas une autorisation implicite de release ni une
validation réelle des scénarios encore réservés ci-dessus. Ne pas commencer 4B.6.

Pas de commit, pas de staging, pas de push, pas de déploiement. HEAD inchangé :
`2db884a42eeab31bfb7fd11d64d9a505f19fe620`. Le script read-only
`scripts/contextual-actions-review.mjs` inventorie les fichiers candidats, compare
les secrets connus de l'environnement et cherche les motifs de credentials :
**aucun secret détecté** dans ce périmètre et ses artifacts textuels. Index vide.

Les modifications utilisateur préexistantes (PLAY_STORE, Capacitor, synaura-app),
`.claude`, `supabase/.temp`, artifacts et documents/captures des anciennes phases
sont laissés intacts et hors périmètre. Aucun fichier AudioCore, endpoint API ou
database modifié. Comments/Peek ne reçoivent que l'entrée d'actions sur morceau.

Production vérifiée en lecture seule le 12 septembre 2026 : lien `current` vers
`/srv/apps/synaura/releases/2db884a42eeab31bfb7fd11d64d9a505f19fe620`, service actif,
`https://synaura.fr/healthz` renvoie `ok`, API publique Track HTTP 200, racine à 44 %.
`/healthz` est servi par le frontal, pas par le port Next interne ; ne pas confondre
le 404 de cette URL sur Next direct avec le health check public canonique.

Prévisualisation locale relancée : `http://localhost:3000/live`.

PHASE 4B.5 CONTEXTUAL ACTIONS CANDIDATE READY

## Addendum — gate production local, 12 septembre 2026

Candidate fonctionnellement validée par l'utilisateur. Demande limitée au replay
performance puis commit/déploiement si aucun défaut réel. **Aucun changement de
feature, design, architecture ou code applicatif pendant ce replay.** Seuls le
runner de mesure, sa revue et ce rapport sont ajoutés/actualisés.

### Protocole reproductible

- `npm run build` (`next build`) : PASS, 90 pages statiques ; puis
  `npm run start -- --port 3000` (`next start`), pas le serveur dev.
- Build ID : `da9Lg1tM95RjUp0qsvVvF`, Next 14.2.30,
  Chrome 139.0.7258.154, viewport 1440×900, machine locale Windows.
- `node scripts/contextual-actions-production-perf.mjs` : navigateur E2E jetable
  authentifié, vrais morceaux/API. Seul l'ordre du feed est déterministe dans ce
  navigateur (trois morceaux publics). Analytics plays/events/impressions interceptés ;
  aucune mutation sociale, création de playlist ou contenu persistant.
- Entrée réelle dans Live, morceau chargé puis mis en pause via sa cover pour
  conserver l'entité pendant toute la série. Les mesures ne sont donc pas un
  nouveau test de lecture continue, déjà couvert par le gate fonctionnel.
- Une ouverture de warm-up par surface, puis **20 ouvertures chaudes chacune**,
  soit 120 échantillons retenus. Pas de suite de tests/build concurrente.
- Départ : capture du clic navigateur réel (`isTrusted=true`) dans la page.
  Deux mesures : contenu chargé ; panneau stabilisé (opacité finale, translation
  nulle, deux observations rAF). Cette dernière est une approximation du rendu
  visuel, pas une mesure matérielle photon-à-écran.
- Options : clic depuis Live fermé. Les cinq autres : clic de leur ligne dans
  Options déjà ouvert, remplacé dans le panneau existant. **Leur chiffre ne
  représente pas la somme Live → Options → surface.** L'ouverture préparatoire
  d'Options et la fermeture sont hors chronomètre. Aucune attente fixe de 240 ms
  incluse ; 250 ms après fermeture uniquement entre les échantillons.
- Percentiles nearest-rank : p50 = 10e, p95 = 19e valeur triée sur 20.
  Traces CDP GC, resource timings et long tasks observées, sans throttling ajouté.

### Résultats (ms)

| Surface | Contenu p50 / p95 / max | Stabilisé p50 / p95 / max | Ouvertures >750 ms |
| --- | --- | --- | --- |
| Options | 11,6 / 13,4 / 17,4 | 197,2 / 197,9 / 198,0 | 0/20 |
| Playlist Picker | 5,5 / 6,4 / 7,8 | 9,7 / 22,8 / 22,9 | 0/20 |
| Queue | 5,6 / 7,8 / 9,6 | 9,2 / 22,6 / 23,3 | 0/20 |
| Lyrics | 5,0 / 7,4 / 7,4 | 9,3 / 22,9 / 23,1 | 0/20 |
| Details | 5,1 / 8,1 / 9,4 | 9,3 / 16,0 / 22,9 | 0/20 |
| Share (fallback desktop) | 4,5 / 6,2 / 7,7 | 9,7 / 23,1 / 23,6 | 0/20 |

Preuve : [`production-perf.json`](contextual-actions-phase4b5-captures/production-perf.json),
120 échantillons individuels, warm-ups séparés, timings et corrélations conservés.
**Aucun pic >750 ms à attribuer. Aucune optimisation justifiée.**

### Coûts observés et absence de refetch

- Première ouverture Options exclue du chaud : 506,5 ms stabilisée. Chargement du
  chunk lazy `7592.14199314deb7f909.js` : 23,6 ms réseau ; premier GET Track :
  190,1 ms ; entitlement : 21,5 ms. Ces requêtes peuvent se chevaucher, leurs temps
  ne constituent pas une décomposition additive du total. Le solde n'est pas
  attribué arbitrairement à du GC ou à la session.
- Warm-up Playlist : 71,4 ms, dont GET playlists 53,5 ms. Les autres warm-ups
  n'ont pas de requête de données de surface.
- **Zéro import JS et zéro refetch Track/Playlist/favoris/entitlement pendant les
  ouvertures chaudes**, y compris les Options préparatoires. Cache de 5 minutes :
  toutes les mesures sont dans cette fenêtre, pas un test après expiration.
- **Zéro requête d'une card inactive** des deux autres entités, avant ou pendant
  les ouvertures. Pas de chargement des détails/playlists avant ouverture.
- Aucune revalidation `/api/auth/session` dans la série chaude.
- Seuls les pollings globaux préexistants sont présents : notifications (20 s),
  messages non lus (30 s), un check boost différé ; événements analytics de test
  interceptés. Ils ne sont pas des refetchs de surface.
- **Aucune long task ≥50 ms chevauchant les 120 ouvertures.** Événement GC observé
  le plus long dans ces fenêtres : 6,132 ms. Les événements peuvent être imbriqués
  ou sur des threads de fond : ne pas additionner leurs durées comme pause UI.
- Zéro exception JavaScript ; aucun HTTP API en erreur. Deux 401 Cloudinary
  historiques durant la préparation uniquement, ticket séparé maintenu. Le
  warning RSC du précédent run dev ne se reproduit pas dans cette série.
- Appels audio natifs inchangés à chaque ouverture. Aucun changement AudioCore,
  endpoint, DB ou modèle dans le diff applicatif de cette livraison.

Les essais de mise au point du runner ont échoué **avant** la série retenue :
entrée Flow non franchie, puis recherche d'un élément AudioCore dans le DOM alors
qu'il est détaché, puis sélecteur de cover trop spécifique. Le runner final se
base sur l'état visible et le bouton de cover existant. Aucun correctif produit
n'a été fait pour ces erreurs de préparation.

### Décision de livraison

**GO** selon l'autorisation explicite de l'utilisateur : 240/240 tests PASS,
type-check PASS, nouveau build production local PASS, revue des secrets connue
et `git diff --check` PASS. Gate fonctionnel précédent : 49 contrôles UI PASS.
Les réserves Android/NVDA réels et handoff autorisé remix/clip restent explicites ;
ce benchmark desktop ne les ferme pas et ne simule pas de partage Web Share OS.

Commit ciblé 4B.5 uniquement : code validé, tests/runners, rapport, captures finales,
résultats final et production-perf, rapport des tests. Exclusion des diagnostics
intermédiaires (`failure-state.png`, `results-core.json`, `results-zoom.json`), des
fichiers utilisateurs/natifs et artifacts des phases précédentes. Aucun secret,
environnement, cache ou `.next` à versionner.

Workflow prévu : push de la branche canonique, `synaura-deploy.service` via timer,
build isolé, préflight, bascule avec health check/rollback et rétention canonique.
Le rapport opérationnel après livraison restera local pour éviter un second push
documentaire déclenchant un nouveau build. **Arrêt avant 4B.6.**
