# Phase 4B.6 — Desktop richness & mobile polish

## Audit préalable — 12 septembre 2026

Baseline production authentifiée : `ffc19fe11876c6b8231a21b633fbcfb816c21a7d`.
Inventaire effectué avant toute modification applicative : 120 captures, 20 vues × 6 formats (1440×900, 1920×1080, 360×800, 390×844, 430×932, 768×1024).
Sources locales : `artifacts/polish-phase4b6/before/`, `results.json`, `peek-results.json`. Six échecs initiaux du sélecteur Profile Peek sont des erreurs du harness ; le complément corrigé passe 6/6. Aucune mutation sociale, notification supprimée ou contenu créé. Les impressions/plays analytiques sont neutralisés dans le navigateur de test uniquement.

### Matrice avant code

| Surface | Problème visuel observé | Responsive | Priorité | Correction locale prévue | Risque métier |
|---|---|---|---|---|---|
| Live | Cover masquée par les métadonnées, rail très éloigné sur grand écran ; rail sur le texte en mobile | Tous, surtout 390/1920 | P1 | Composition CSS de la scène, réserver un espace au rail et au dock, hiérarchie du titre | Moyen : vérifier swipe, lecture et surfaces sans modifier leurs handlers |
| Discover | Collages et covers affichent l’icône navigateur cassée | Tous | P1 | Fallback média commun ; conserver les erreurs réseau visibles | Faible, présentation seule |
| Search | Actions de ligne à x506 sur écran 390, titres imposant la largeur ; images cassées | 360–430 | P1 | Contraintes min-width/grid et fallback | Faible, aucune logique de recherche |
| Track | Hero petit dans une très grande largeur ; pile mobile ; texte clair sur header de posts clair | Tous | P1 | Taille artwork/typo/espacement ; fond de section tokenisé | Faible, aucun nouveau lecteur ou contrat Comments |
| Profile complet | Banner et hero disproportionnés, pistes loin sous le fold ; images cassées | Mobile/tablette surtout | P2 | Hauteurs et espacements responsive, fallback | Faible ; Profile Peek explicitement exclu |
| Library | Tabs cachés horizontalement, vide/spacing, copy interne « Queue. Favorites. » | Mobile/desktop | P2 | Densité et affordance du scroll, copie utilisateur | Faible, gestion inchangée |
| Playlist | Hero très haut, titre 96px, shell isolé, covers cassées | Tous | P2 | Dimensions et tokens Phase 3 en conservant le fond éditorial ; fallback | Faible, contrat playlist inchangé |
| Notifications | Lignes excessivement longues sur desktop, petits boutons supprimer | 1440/1920, mobile | P2 | Largeur de lecture, cibles 44px | Faible, ne pas déclencher les mutations |
| Messages | Inbox étroite desktop, tab Amis débordant légèrement à 390, empty très bas | Mobile | P2 | Espacement et flex des tabs uniquement | Faible ; compte E2E sans conversation, parcours réel indisponible |
| Create | Colonne étroite dans le grand écran, entrée IA disproportionnée | Desktop | P2 | Largeur et grille des entrées existantes | Faible, workspace inchangé |
| AI (entrée) | Bibliothèque presque blanche avec texte blanc, toolbar coupée mobile | Tous/mobile | P1 | Frontière visuelle thème/flex uniquement | Moyen : ne pas refondre l’intérieur du workspace |
| Studio (entrée) | Identité propre, navigation et player séparés ; pas de défaut bloquant observé | Tous | Observation | Conserver | Aucun changement |
| Profile Peek | Cohérent, footer baseline correctement réservé | Tous | Conserver | Aucun changement autorisé | Protégé |
| Conversation | Header, waveform, tabs, composer cohérents | Tous | Conserver | Aucun changement | Protégé |
| Moments | Même langage que Conversation, waveform visible | Tous | Conserver | Aucun changement | Protégé |
| Queue | Drawer desktop / sheet mobile avec scroll interne | Tous | Conserver | Aucun changement | Aucun |
| Playlist Picker | Même header et spacing que Queue | Tous | Conserver | Aucun changement | Aucun |
| Lyrics | Texte lisible et scrollable | Tous | Conserver | Aucun changement | Aucun |
| Details | Espace libre proportionnel au peu de données ; footer cohérent | Tous | Conserver | Aucun changement | Aucun |
| Options | Popover compact desktop / sheet courte mobile, différence justifiée par le contenu | Tous | Conserver | Aucun changement | Aucun |

Les images inspectées sont de vrais écrans production, pas des maquettes. Le feed peut évoluer entre captures : comparaison de composition, pas égalité pixel de données dynamiques. Les débordements détectés dans les barres volontairement scrollables sont distingués des actions Search réellement inaccessibles.

## Limites et invariants

- Mobile émulé : pas de téléphone Android/Gboard réel ni NVDA réel ; aucune revendication de validation physique.
- Inbox E2E vide : ne pas envoyer de message à un utilisateur pour fabriquer une preuve.
- Cloudinary historique 401 reste un chantier distinct ; le fallback n’altère ni les URLs stockées ni le monitoring.
- Aucun changement AudioCore, Comments/Moments, Profile Peek, Context Surface Controller, endpoints/DB, intro ou apps natives.
- Les neuf modifications natives/documentation préexistantes et les artifacts des anciennes phases restent hors périmètre, sans suppression ni revert.
- Pas de commit, push ou déploiement ; pas de Phase 4B.7.

## Validation candidate

Candidate prête pour revue visuelle. Gate technique local PASS sur le build production `W2jEAB2nAJQEbZSy1zTvl` (`next build` + `next start`), avec les réserves de couverture explicites ci-dessous. Ce résultat n'est ni une validation créative utilisateur ni une autorisation de déploiement.

### Défaut réel supplémentaire : waveform Live mobile

Le probe DOM local reproduit le défaut production : 180 barres, parent 324px, gap 2px, largeur calculée de chaque barre **0px**. Les 179 espacements demandaient déjà 358px. Correction de présentation seule dans `components/player/Waveform.tsx` : gap plafonné à la moitié de la largeur répartie sur le nombre réel de peaks. Aucun rééchantillonnage, endpoint, timestamp, marker ou comportement audio modifié. `MusicalWaveform` et les contrats Comments restent intacts.

### Contrôles intermédiaires

- 240/240 tests existants PASS ; TypeScript PASS.
- Les premiers diagnostics dev contiennent des captures de chargement et trois erreurs transitoires « Invalid or unexpected token » pendant compilation/navigation. Ils ne sont **pas** retenus comme captures finales. Un probe après compilation puis le gate final sur build production local passent sans erreur JS.

## Modifications locales

- **Live** : grille de scène, artwork carré dimensionné par son espace disponible (container units CSS), métadonnées à droite sur desktop, rail adjacent. Mobile/tablette : artwork + rail, puis métadonnées ; marge dock/safe-area. Écrans courts/zoom : rail dans sa colonne pleine hauteur, métadonnées scrollables. Titre non tronqué arbitrairement. Cibles 44px minimum dans la scène. Pulse et bouton Suivre retrouvent un contraste lisible. Aucun handler musical ou de navigation modifié.
- **Search** : les deux grilles de résultats sont contraintes à `minmax(0,1fr)`, les lignes et leurs textes peuvent rétrécir, les vignettes gardent leur place. Les actions ne sont plus repoussées hors écran.
- **Track** : artwork 112px mobile / 288px desktop, hero en ligne, titre 24/36px. Le fond de la section posts attachés utilise les tokens surface/muted et retrouve un contraste correct. La route conserve ses actions, le lecteur global et la surface Comments existante.
- **Profile complet** : banner 176/208/256px suivant breakpoint, titre plafonné à 36px ; aucune modification du Peek.
- **Library / Notifications / Messages** : scrollbar discrète mais visible pour les tabs Library, copie de bibliothèque orientée utilisateur ; notifications max-width 1120px et suppression 44px ; inbox moins espacée, tabs flexibles sans largeur intrinsèque bloquante. Pas de mutation métier.
- **Playlist** : max-width 1480px, titre 30/36px, hero et artwork responsive, radius/shadow Phase 3, réserve player. Identité éditoriale et fond conservés, retour/partage/actions inchangés.
- **Create** : entrées existantes sur deux colonnes desktop dans 1200px, pile mobile conservée. **AI** : texte d’entrée « Créer » corrigé, fonds de la bibliothèque raccordés au thème et toolbar en wrap ; menus métier/génération non refondus. **Studio** conservé.
- **Média** : `SynauraImage`, petite primitive cliente sans dépendance, utilisée dans Discover/Search/Library/Playlist/Profile et les backgrounds Track/PostAudioCard/Shell. Au premier échec, artwork local existant (`default-cover.svg`) ou avatar local existant ; garde anti-boucle et état par source. Les erreurs 401 restent observables dans Network. Pas de modification des médias ou données distants, du chargement audio ou du cache de requêtes.
- **Motion / style** : aucune animation ajoutée, aucune police/palette/dépendance nouvelle. Motion tokens et reduced-motion globaux conservés. CSS Live strictement scoped à sa nouvelle scène, pas aux portails ni aux autres types du feed.

### Bug de validation zoom corrigé

Le premier gate à 200 % (viewport CSS 713×394, DPR 2.5) a trouvé un rail de hauteur 0, couvert par les métadonnées. La disposition spéciale écran court corrige ce chevauchement. Rejeu natif : rail réellement hit-testable, Options/Playlist/Queue/Lyrics/Details sans overflow, Tab/Shift+Tab confinés dans le dialog, aucune erreur UI/API locale. Le fixture playlist privé créé par le gate a été supprimé puis relu : 404 confirmé ; aucun contenu préexistant supprimé.

### Périmètres conservés

Les sept familles de surfaces utilisent leurs primitives existantes et ne sont pas uniformisées artificiellement. Le breakpoint sheet/drawer existant (mobile/tablette) est conservé. Le contexte musical continue derrière elles. Les changements touchent uniquement les fichiers visuels listés dans le diff et les outils/documents de validation. Aucun fichier n’est staged.

### Revue complémentaire sous le fold

Le vrai scroller est `.app-scroll-container`, pas `document` : les captures full-page initiales ne suffisaient pas. Le harness a donc réellement scrollé vers le composer Track, la carte Calme Discover, les statistiques Profile et le bas Library. Les images `artifacts/polish-phase4b6/tail/` ont confirmé trois contrastes à corriger : overlay Discover utilisant des opacités non générées, cadre clair du composer de posts, cartes métriques de profil claires avec texte adapté au sombre. Corrections locales des fonds/overlays ; aucun formulaire, chiffre ou contrat changé. Même correction d’opacités pour le fond décoratif Track (le fallback révélait le gradient invalide).

Les flèches précédent/suivant sont déplacées dans le rail Live existant, avec les mêmes handlers et labels : elles ne recouvrent plus le panneau de métadonnées sur tablette. Les métadonnées secondaires crème reçoivent un contraste renforcé, sans changement de palette.

## Tests et preuves — résultats finaux

- **240/240 tests existants PASS**, `npm run type-check` PASS, `npm run build` PASS, `git diff --check` PASS. Logs locaux : `artifacts/polish-phase4b6/unit-tests.log` et `build.log`. Le build conserve les avertissements historiques Browserslist/caniuse et génération statique Edge ; pas de modification d'outillage.
- Capture finale du build production local : **120/120**, **0 erreur JavaScript**, **0 image cassée visible**, contre 170 occurrences visibles d’images cassées dans l’inventaire production initial (répétitions entre formats, pas 170 fichiers distincts). Résultat : `artifacts/polish-phase4b6/after/results.json`, terminé le 12 septembre 2026 à 17:24:22 UTC.
- **34/34 assertions responsive/navigation PASS** sur le build final : Search actions accessibles et retour conservant la query, Peek depuis Search/Discover, Actions imbriquées, focus restauré, Library favoris/playlists, empty Messages réel, artwork carré / rail séparé / barres de waveform de largeur positive aux six formats. Le bouton Options a un véritable `:focus-visible` clavier ; les commandes précédent/suivant changent puis restaurent l'item. Reduced-motion vérifié. Résultat : `artifacts/polish-phase4b6/responsive-gate/results.json`.
- **Zoom navigateur natif 200 %** : neuf routes (Search, Track, Profile, Library, Playlist, Notifications, Messages, Create, Discover) sur build final, sans overflow horizontal essentiel. Le zoom utilise `chrome.tabs.setZoom(2)`, pas une transformation CSS. Les tabs/filtres volontairement scrollables restent distingués des débordements bloquants.
- **Gate métier historique : 40 contrôles PASS**, exécutés sur serveur dev avant la compilation finale : playlists privées réellement créées/ajoutées/retirées, favoris interceptés pour éviter un signal social persistant, queue, paroles réelles, partage/clipboard réel, Details, draft Comments et Profile Peek imbriqué, handoff Track sans second élément musical, retour Live et continuité AudioCore. Ouverture/fermeture des surfaces sans mutation audio ; instance/listeners/subscribers AudioCore stables. Le premier échec de zoom est conservé en diagnostic ; son rejeu corrigé passe **10/10**, incluant focus Tab/Shift+Tab confiné, rail hit-testable et cinq surfaces sans overflow. Preuves : `functional/results.json` et `functional-zoom/results-zoom.json` dans les artifacts de cette phase. Le fixture privé du gate a été supprimé (DELETE 200), puis relu (404) ; aucun contenu existant supprimé.
- Captures réellement scrollées sous le fold : composer Track, carte Discover, métriques Profile vérifiés après correction dans `artifacts/polish-phase4b6/tail-final/`. Bas Library vérifié au-dessus du dock. Les captures full-page seules ne sont pas présentées comme preuve de ces zones.

## Performance sur build production local final

Un warm-up puis **20 ouvertures chaudes par surface**, clic réel vers contenu prêt puis deux frames peintes avec transition terminée. Pour les drawers issus d'Options, le chronomètre part du clic sur leur ligne ; l'ouverture préalable d'Options n'est pas incluse. Données persistées réelles, ordre de fixtures fixé uniquement dans le navigateur de test, audio mis en pause par l'UI, écritures analytiques interceptées. Pas de compilation ni de capture matricielle concurrente pendant la mesure. Les temps incluent le navigateur et l'ordonnancement de la machine locale, pas une mesure terrain.

| Surface | p50 (ms) | p95 (ms) | max (ms) | >750 ms |
|---|---:|---:|---:|---:|
| Options | 196,9 | 198,0 | 200,3 | 0 |
| Playlist Picker | 9,2 | 10,8 | 22,8 | 0 |
| Queue | 9,3 | 22,9 | 22,9 | 0 |
| Lyrics | 9,5 | 22,8 | 23,0 | 0 |
| Details | 9,1 | 22,6 | 23,0 | 0 |
| Share | 9,3 | 23,0 | 23,0 | 0 |

Gate PASS : **0 requête organisation superflue à chaud**, **0 query des cards inactives**, **0 exception JavaScript**, **0 spike >750 ms**. Aucune optimisation supplémentaire justifiée. Preuve détaillée : `artifacts/polish-phase4b6/production-perf.json`.

- **Live First Load JS gzip : 429 631 octets**, baseline 429 268, soit **+363 octets (+0,085 %)** selon le calcul Next local de page. Shared : **339 kB**, inchangé à la précision du rapport Next. ActionsSurface lazy : **15 948 octets bruts / 5 462 gzip**, inchangé. Aucun package ni enregistrement eager de surface ajouté. Source : `artifacts/polish-phase4b6/bundle.json`.
- Live au repos après mesure : **765 éléments DOM**, **7 images**, **0 image cassée**, une animation recensée déjà terminée (durée 220 ms), aucune animation nouvelle introduite.
- Heap après GC avant/après les cycles : **9 473 804 → 10 887 584 octets** (+1 413 780). Compteurs CDP de tous les nœuds : **1 466 → 1 492** ; listeners JS : **1 281 → 1 290**. Ces compteurs diffèrent du nombre d'éléments DOM du document. Le delta inclut les premiers chargements lazy et états conservés ; cette seule mesure ne démontre ni fuite ni absence absolue de fuite. Le gate métier distinct vérifie la stabilité des abonnements AudioCore et le montage borné des slides.
- **LCP local 1 644 ms ; CLS local 0,0312**, collectés par PerformanceObserver dans ce parcours authentifié. Mesure ponctuelle locale avec données réelles/tunnel, pas un score Lighthouse ni des Core Web Vitals terrain ou une comparaison statistique avant/après.

## Jeu de revue et reproduction

- [Galerie avant/après](desktop-mobile-polish-phase4b6-captures/review.html) : 20 surfaces, sélecteurs 1440/1920/390/768, captures réelles côte à côte. Les PNG sources restent dans `artifacts/polish-phase4b6/before/` et `after/`, sans dupliquer des centaines de diagnostics dans la documentation.
- [Live desktop avant/après](desktop-mobile-polish-phase4b6-captures/live-comparison-1440.png) et [Live mobile avant/après](desktop-mobile-polish-phase4b6-captures/live-comparison-390.png). Les composites sont des captures d'une galerie HTML, sans retouche des images applicatives.
- Capture : `node scripts/desktop-mobile-polish-capture.mjs` (variables `POLISH_BASE`, `POLISH_OUTPUT`, filtres `POLISH_WIDTHS` / `POLISH_SURFACES` selon le runner).
- Gate responsive : `node scripts/desktop-mobile-polish-gate.mjs` ; galerie : `node scripts/desktop-mobile-polish-review.mjs`.
- Mesure : `node scripts/contextual-actions-production-perf.mjs`, avec `ACTIONS_PERF_OUTPUT=artifacts/polish-phase4b6/production-perf.json`. Ces runners utilisent la configuration E2E locale existante ; aucun identifiant n'est inclus dans le rapport.

## Réserves et décision

**GO pour revue visuelle de la candidate uniquement.** Aucun blocage technique trouvé dans les parcours effectivement testés ; l'approbation créative reste à l'utilisateur.

- Android/Gboard et NVDA réels **non testés**, aucun appareil/lecteur réel disponible dans ce passage. L'émulation ne ferme pas ces réserves historiques.
- Messages : inbox et empty state authentifiés vérifiés, mais **conversation, attachments et notes vocales non exercés** car le compte E2E ne dispose pas d'une conversation. Aucune fabrication de preuve ni message envoyé à autrui.
- Les causes des médias Cloudinary 401, permissions remix/clip sur source autorisée et optimisation du build Freebox restent hors phase. Le fallback traite uniquement le rendu des médias défaillants observés, sans garantir tous les assets de toute la base.
- Le contrôle de contraste est visuel et ciblé sur les défauts constatés, pas une certification exhaustive WCAG. Les captures démontrent les données/états disponibles, pas chaque combinaison loading/error possible.

Production vérifiée en lecture seule : release active **`ffc19fe11876c6b8231a21b633fbcfb816c21a7d`**, service `synaura.service` actif et `https://synaura.fr/healthz` répond `ok`. La baseline 4B.5 n'a pas changé.

Git : HEAD inchangé, index vide, aucun commit/push/déploiement. Les neuf fichiers préexistants (PLAY_STORE, Capacitor et natif Android) et les anciens artifacts restent intacts et hors périmètre. Aucun diff dans les répertoires protégés AudioCore/Comments/Profile Peek/Context Surfaces/API/DB ni dans les dépendances. Recherche ciblée de secrets dans le diff de phase et ses nouveaux fichiers : aucun secret détecté ; les environnements et clés ne sont pas inclus. Cette recherche ne prétend pas auditer tout l'historique du dépôt.

**Arrêt avant Phase 4B.7.**

## Addendum — validation visuelle et correction UTF-8 avant livraison

12 septembre 2026 : **candidate 4B.6 validée visuellement par l'utilisateur**, avec autorisation de commit et déploiement après correction des textes AI uniquement. Les mentions « pas de commit/déploiement » ci-dessus décrivent la remise initiale pour revue.

- `BibliothÃ¨que` corrigé en `Bibliothèque` aux trois emplacements UI de la page AI. Le scan des fichiers applicatifs de la candidate et des composants AI ne trouve le même défaut que dans `app/ai-generator/page.tsx`.
- **205 fragments littéraux/template/texte JSX, sur 179 lignes**, corrigés : libellés, placeholders, aria-labels, statuts, notifications, messages d'erreur, titres de secours et console visible du studio. Réparation des séquences UTF-8 interprétées en Windows-1252 seulement, sans reformulation ou traduction nouvelle.
- Aucun changement de structure AST, identifiants, classes JSX ou styles AI : comparaison automatique PASS. Aucun changement de design, architecture, endpoints ou contrat métier pendant cette passe.
- Les commentaires de développement, `console.*` techniques et un hint interne de prompt Suno restent inchangés. Les occurrences historiques dans les pages légales/admin et les API sont hors candidate et non corrigées ; aucun remplacement global du dépôt.
- **242/242 tests PASS**, dont deux nouveaux tests ciblés UTF-8. Type-check PASS ; build production local PASS, ID **`F0KqxsO2bhzQtoFSXFEs8`**. Avertissements historiques de build uniquement.
- Captures AI **1440×900 et 390×844 PASS**, inspection visuelle effectuée : aucun mojibake visible ou dans les labels accessibles, aucune image cassée, aucun débordement détecté, aucune exception JS. Les deux 403 `/api/suno/credits` correspondent au contrôle d'accès provider/admin déjà présent lors de l'audit ; aucune génération payante ni mutation média lancée.
- Premier essai de capture non retenu : le serveur local redémarré sans sa variable DATABASE_URL de session refusait l'authentification. Configuration restaurée uniquement dans le processus local via le tunnel existant ; aucun fichier d'environnement ni réglage production modifié. Rejeu authentifié propre.
- Preuves finales : [AI desktop](desktop-mobile-polish-phase4b6-captures/ai-1440.png), [AI mobile](desktop-mobile-polish-phase4b6-captures/ai-390.png), résultat détaillé local `artifacts/polish-phase4b6/ai-encoding-final/results.json`. La galerie matricielle historique reste une preuve locale de revue, non une nouvelle capture après correction.
- Les réserves Android/Gboard, NVDA, conversation Messages et médias historiques demeurent explicitement documentées. Aucune Phase 4B.7 commencée.

Les hashes de livraison, le résultat du workflow canonique et le smoke production seront consignés dans un rapport opérationnel local distinct, pour éviter un second déploiement documentaire.
