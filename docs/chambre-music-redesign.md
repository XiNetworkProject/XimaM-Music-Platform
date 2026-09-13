# La Chambre Sonore — espaces musicaux

État : **présentation implémentée dans la candidate locale, sans commit ni déploiement**.
Date : 13 septembre 2026. Cette note couvre le lot musical ; elle ne vaut pas validation visuelle ou fonctionnelle de l’ensemble de Synaura.

## Direction et périmètre

La composition approuvée de La Chambre Sonore devient une grammaire de produit : fond noir profond, lumière cobalt, grands titres sans empattement resserrés, pochettes réelles en plans asymétriques, lignes fines et commandes stables. Les pages utilitaires ne sont pas forcées dans un diaporama : l’entrée raconte, puis l’écoute, les listes et les conversations gardent leur défilement natif.

Les tokens partagés restent la source des couleurs et de la typographie. La membrane approuvée est réutilisée comme décoration CSS sur Discovery, les sélections historiques et l’identité Profile Peek ; aucun nouveau rendu WebGL, son synthétique ou moteur audio n’est ajouté. Les pochettes, titres, noms, statistiques, genres et playlists proviennent toujours des sources existantes. Aucun exemple de contenu n’est injecté dans les routes publiques.

## Inventaire réalisé

| Route / surface | Présentation du lot | Fonctions conservées |
| --- | --- | --- |
| `/discover` | Ouverture « Suivez l’onde », membrane en fond, pochette réelle inclinée et titre de morceau | Sélection de tête, ambiances, résultats d’ambiance, Radar, sorties, pépites, populaires, collections, créateurs, clubs |
| Ambiances Discovery | Portails à pochettes, composition 2+4 colonnes adaptée au mobile, préférence réelle identifiable, noms accessibles | `onOpen`, identifiants/ordre des ambiances, pochettes réelles, mises en avant des préférences |
| `/track/[id]` | Grand plan de pochette, titre sans empattement, zone de création et faits séparés | Lecture explicite, AudioCore global, waveform et moments du morceau courant seulement, actions et routes existantes |
| `/profile/[username]` | Paysage latéral, identité forte, avatar en plan incliné, statistiques et morceau à la une structurés | Sons, clips, variations, playlists, posts, follow partagé, édition/upload, tris et actions ; nom accessible ajouté à l’édition de bannière |
| `/playlists/[id]` | Couverture plus ample, titre éditorial, métriques regroupées, toolbar et liste lisibles | Tout lire, aléatoire, recherche, genres, tri, likes, commentaires, file, données et règles collection |
| `/album/[id]` | Pochette / identité à gauche, parcours des titres à droite ; compact sur téléphone | Lire, aléatoire, ajouter tout à la file, partager, lecture par titre, durées et identité réelle |
| Live musical | Pochette en volume, titre resserré, accent cobalt, commandes séparées de l’image | Feed et types de cartes, filtres, gestes, historique, activité des cartes, queue et waveform |
| Live posts | Texte fort et média réel dans une composition propre | Auteur, post, image, extrait musical et toutes les actions |
| Mini-player | Ligne d’écoute compacte, accent cobalt, transparence remplacée par un plan sombre lisible | Transport, seek, actions secondaires accessibles via le même disclosure natif, toutes les commandes existantes |
| Lecteur développé | Pochette en volume, plan fixe pour titre et waveform, actions accessibles | Même queue et AudioCore, vidéo de couverture, contrôles, sliders, ouverture/réduction, gestures |
| Fallback TrackCover | Monogramme/pochette absente en noir/cobalt avec ligne elliptique | Image, vidéo muette, activité/hover, fallback réseau et chargement inchangés |
| Profile Peek | Portrait rectangulaire, membrane discrète, nom complet pouvant revenir à la ligne, métriques | Focus initial neutre, `82dvh`, padding bas avec safe area, follow, morceaux, CTA desktop/mobile et retour |
| Comments / Moments | Identité compacte, tabs et détails d’instant cobalt, conversation et composer stables | Dimensions, visualViewport, scroll, drafts, clavier, waveform/clusters, modération et mutations inchangés |
| Actions / Queue / Lyrics / Details / Share / Playlist Picker | Identité avec vraie pochette, hiérarchie de menu, file et paroles plus lisibles | Menus clavier, lazy queries, droits et actions, file unique, téléchargements, partage et retours |
| `/radar` | Titres resserrés, premier morceau en composition large, cartes et métriques allégées | Vraies écoutes, sélection émergente, play, queue, likes, commentaires, auteurs et états vides |
| `/for-you` | « À votre fréquence », mosaïque réelle, sélection/listening list Chambre | Endpoint et algorithme inchangés, même chargement et handlers de lecture ; rangées devenues boutons natifs clavier |
| `/trending` | « L’onde collective », mêmes motifs de sélection, hiérarchie des rangs conservée | Endpoint trending inchangé, rangs réels, total/durées et handlers ; rangées devenues boutons natifs clavier |

La copie de `/for-you` ne promet plus un traitement IA spécifique qui n’était pas démontré par son endpoint. Les libellés accentués de la collection ont été rétablis (« Aléatoire », « Ajouter à la file », « Durée »).

## Fichiers du lot

19 fichiers source, dont 2 feuilles de style et 17 TSX :

- `components/v2/music-v2.css`, `components/v2/contexts-v2.css`.
- `app/discover/DiscoverClient.tsx`, `app/discover/DiscoverMoodTiles.tsx`.
- `app/track/[id]/TrackPageClient.tsx`, `app/profile/[username]/page.tsx`.
- `app/playlists/[id]/page.tsx`, `app/album/[id]/page.tsx`.
- `app/for-you/page.tsx`, `app/trending/page.tsx`.
- `components/home/SynauraScroll.tsx`, `components/home/ScrollPostSlide.tsx`.
- `components/TikTokPlayer.tsx`, `components/FullScreenPlayer.tsx`, `components/TrackCover.tsx`.
- `components/profile/ProfilePeekSurface.tsx`, `components/comments/CommentsSurface.tsx`, `components/actions/ActionsSurface.tsx`.
- `components/radar/RadarSection.tsx`.

Tests ajoutés : `tests/chambre-music-redesign.test.mjs`, `tests/chambre-player-loading.test.mjs`.

## Préservation et contrôles source

Avant toute modification, copie exacte de chaque fichier dans `artifacts/chambre-full-redesign/before/music/`, avec chemins correspondants. Aucune restauration Git ni suppression de modifications préexistantes. Les différences antérieures des mêmes fichiers ont été conservées.

Comparaison AST contre ces copies :

- **420 attributs de handlers JSX `on*` inchangés**, dans le même ordre, sur les 17 TSX.
- **212 appels protégés contrôlés** : effets, queries, fetch, mutation de queue/index, play/pause/seek, waveform et hooks Profile Peek/follow sélectionnés. Après le constat QA ci-dessous, 211 restent identiques ; une seule exception autorisée concerne le cleanup de l’effet de chargement du lecteur développé. Son corps est comparé au snapshot après retrait exact des seuls ajouts autorisés. Aucune fonction complète n’est exclue de l’audit.
- Aucun fichier API, DB, AudioCore, provider, contrôleur de surfaces, hook, contrat ou application native édité par ce lot.
- `prototypes/chambre-sonore/` et `components/chamber/` non modifiés par ce lot.
- Aucun environnement, secret, dump ou clé lu/copied dans les snapshots.

Cette égalité source n’équivaut pas à une validation audio en navigateur : elle prouve que la refonte n’a pas changé ces handlers et appels protégés, hormis l’exception exacte documentée. Un test automatisé vérifie les empreintes AST des 420 handlers et des 212 appels contre les snapshots ; il échoue si un autre changement s’ajoute.

## Bug réel rencontré en QA : lecteur développé bloqué en développement

Observation de l’agent principal : après lecture de « Sacré Charlemagne » depuis la revue Track, le clic sur « Ouvrir le lecteur Synaura » laissait « Un instant pour la musique » plus de 20 secondes alors que le morceau continuait.

Diagnostic read-only : le composant est importé statiquement ; ce texte est son état de chargement de feed, pas un fallback de lazy import. La clé `feedLoadedRef` était renseignée avant la requête. Le replay StrictMode setup → cleanup → setup invalidait la première réponse (`mounted=false`) puis empêchait le second setup de charger, car la même clé était déjà mémorisée. Aucun résultat ne pouvait sortir `loading` de `true`. Ce défaut était présent dans la copie antérieure à la refonte.

Contrôle réseau ciblé effectué pendant le diagnostic : feed reco Hip-Hop **HTTP 200 en 229 ms** ; boosted **HTTP 200 en 227 ms**. Aucun paramètre ou accès backend modifié.

Correction minimale autorisée après diagnostic : un booléen local `settled` indique qu’une réponse de la requête courante a été traitée. Le cleanup ne libère la clé que si la requête n’est pas terminée, que son identifiant est toujours courant et que la clé lui appartient encore. Une réponse terminée conserve sa clé ; les erreurs terminées gardent également la politique existante. Le cleanup n’annule pas le fetch réseau existant : il rend possible le replay et la réponse abandonnée reste ignorée.

**Aucun changement** aux mutations AudioCore, à `alignExpandedPlayerQueue`, aux règles de file, aux dépendances de l’effet ni aux endpoints.

Les six tests de régression extraient le **vrai callback d’effet et le vrai reducer** depuis le TSX par AST, les transpilent et les exécutent avec des promesses contrôlées. Ils couvrent le replay StrictMode, les succès/échecs stale, une clé possédée par une nouvelle requête, la réouverture chaude d’une instance restée montée et une véritable nouvelle instance. Les contrôles de queue utilisent le vrai helper d’alignement avec des sorties simulées : pas de deuxième lecture au simple affichage. Le test n’est pas une copie manuelle de l’algorithme.

La réouverture chaude testée ne promet pas de cache inter-montages : une instance réellement démontée possède de nouvelles refs et suit le chargement habituel. La vérification visuelle après correction appartient à la QA principale.

## Tests effectués dans ce lot

Commande ciblée :

```text
node --test tests/chambre-music-redesign.test.mjs tests/chambre-player-loading.test.mjs tests/music-v2-presentation.test.mjs tests/profile-peek-phase4b3.test.mjs tests/comments-moments-phase4b4.test.mjs tests/contextual-actions-phase4b5.test.mjs
```

Résultat : **53 tests PASS, 0 FAIL** (16 nouveaux, 37 existants). Aucun test existant affaibli.

- Parse TSX des 17 sources : PASS.
- Parse PostCSS des deux feuilles : PASS.
- `git diff --check` sur les fichiers suivis du lot : PASS ; avertissements LF/CRLF du dépôt sans erreur de whitespace.
- Recherche ciblée de clés privées, clés AWS, clés Stripe live et URL PostgreSQL avec credentials dans les sources/test/note du lot : aucune occurrence détectée. Ce contrôle ciblé ne remplace pas le scan global avant commit.
- Responsive explicitement prévu en CSS : desktop, tablette, mobile, 360 px, hauteur courte, mouvement réduit. Contrôles source seulement, pas preuve de captures à ces dimensions.

## Réserves et QA à ne pas confondre

- **Visuel réel de ce lot : non exécuté par cet agent.** Le navigateur et les captures sont coordonnés par l’agent principal pour éviter les collisions. Revoir Discovery et ambiances, Track, Profile, Album/Playlist, Live, mini/full player, Radar, `/for-you`, `/trending`, surfaces contextuelles sur desktop/mobile.
- **Type-check global et build : réservés à la passe coordonnée principale**, pas lancés en parallèle ici.
- **Backend / comptes / média : non configurés par ce lot.** Seules les deux lectures de diagnostic indiquées ci-dessus ont été contrôlées. Les états indisponible/erreur restent réels. Ne pas annoncer follow, mutations de commentaires, playlists, profils, auth ou média distant validés si le backend local ou les droits ne sont pas disponibles.
- **Audio réel, retours, clavier OS Android/Gboard et NVDA réel : non retestés par cet agent.** Les anciens invariants sont préservés en source mais ces réserves ne sont pas levées par une refonte CSS.
- Les anciennes routes `/for-you` et `/trending` conservent volontairement leurs handlers historiques de chargement de queue et lecture. Une éventuelle harmonisation de ces implémentations avec des parcours plus récents constituerait un travail fonctionnel séparé.
- Admin et services historiques Météo / Star Academy restent conservés ; aucune suppression ou promesse de refonte complète de ces outils dans ce lot musical.

## Livraison

Candidate locale uniquement. Aucun staging, commit, push, tag ni déploiement réalisé. La validation de ce lot ne clôture aucune phase produit à elle seule.
