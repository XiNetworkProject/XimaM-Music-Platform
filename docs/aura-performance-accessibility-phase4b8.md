# Phase 4B.8 — Aura, performance, accessibilité et rollout

Statut : **clôture technique validée par l’utilisateur ; livraison finale autorisée sous gates**. Les constats ci-dessous décrivent la candidate auditée ; l’addendum de livraison distingue les corrections finales et la vérification production.

## Matrice Aura préalable — avant modification applicative

Définition produit : **« l’atmosphère vivante autour d’un son et de la communauté qui l’entoure. »** Ni note, réputation, monnaie, influence, duplicata du like ou score Radar. Aucun nombre Aura.

Recherche des mots Aura/Aurora et identifiants associés dans les sources web, types et catalogue structurel ; le sous-mot « Synaura » et le futur du verbe avoir sont exclus des résultats pertinents. Les documents historiques et apps natives sont classés hors modification.

| Occurrence / source | Classe | Décision |
| --- | --- | --- |
| `SynauraSonicIntro` : « Entre dans l’Aura », fallback CSS ; `SynauraSonicScene`/shader Aura | A branding / B ambiance | Baseline intro 4A V3.2 protégée, aucune modification |
| `DiscoverSynaura` : `AuraStage`, copywriting et CSS `aura-breathe` | A/B | Conserver ; vérifier reduced motion réel avant toute correction ciblée |
| `OnboardingFlow` : « Ton Aura prend forme / est prête » | A | Métaphore des préférences, pas un score ; conserver |
| `FullScreenPlayer` : « davantage cette aura » | A / D ambigu | Copywriting de préférence musicale existante ; ne prouve pas de signal social. Pas de changement requis pour Live |
| `TikTokPlayer` : `auraPalette`, `AuraVisualLayer`, toggle Aura Visuals, CSS drift/float, préférence locale | B / D legacy | Pas le feed canonique `/live` (qui monte `SynauraScroll`). Ne pas importer cette couche ni son lecteur dans Live |
| `auraVisualEnabled` / `aura_visual_enabled` dans API tracks/AI, candidates, providers, types player | B, donnée de présentation | Booléen de permission visuelle, pas un score ni activité ; contrat conservé |
| Messages : thème `aura` violet et fond `aurora` tous deux libellés « Aura » ; `lib/messaging.ts` | B / D confusion de libellés | Deux sélecteurs distincts, aucun signal social. Pas de migration ni renommage de clé persistée |
| Catalogue `conversation_participants.theme_key`, défaut `aura` | B, préférence persistée | Conserver ; aucune donnée sociale Aura trouvée dans le catalogue inspecté |
| `HomeFlowPrelude` : animations `synaura-aurora-*` | B | Ambiance existante, pas une présence ; respecter reduced motion |
| `app/suno.css` : couches `aurora-*` ; `SynauraLoader` : gradient `aurora-loader` ; page de test branding | B / D legacy ou démonstration | Ne pas étendre ni déplacer dans Live |
| Moments/Comments : clusters, réactions, commentaires, timestamps réels, waveform | C signal social réel, non nommé Aura | Expression déjà lisible sans nouvelle couche ; pas de nombre/presence inventés |
| Documents branding/carrousel historiques, captures HTML de référence | A / D documentation | Hors runtime ; conserver |
| « aura accès », « aurait validé » | Hors classification produit | Faux positifs linguistiques, ne pas renommer |

**E — suppression/renommage : aucune occurrence ne justifie à ce stade une suppression applicative.** Les ambiguïtés legacy sont identifiées, pas traitées par refonte.

**Décision expressive : ne pas ajouter d'effet Aura dans cette candidate.** La waveform, la palette et les clusters existants portent déjà les signaux autorisés ; aucun bénéfice démontré d'un halo/glow supplémentaire. Coût de nouvelle expression Aura : zéro import, query, animation ou dépendance. Cela n'affirme pas que les effets hérités sont gratuits.

Présence du créateur : afficher un auteur de commentaire prouve une participation, pas qu'il est connecté maintenant. Aucun backend de nombre d'auditeurs simultanés n'est établi ; aucun affichage de ce type n'est ajouté.

## Point de départ

Baseline production : `2af010a8dfb44bd7636f0d3a4d407d852f1bd657`. [Livraison 4B.7](creation-social-handoffs-phase4b7-deployment.md) : 55/55 contrôles production PASS, contexte Live/queue/audio conservés. Rollback immédiat disponible vers 4B.6 ; aucun nouveau tag nécessaire pour identifier cette baseline.

Périmètre repris de la section 4B.8 de l'[audit Live Experience](live-experience-phase4b-audit.md) : Aura fondée sur les signaux existants ; budgets réseau/DOM/mémoire ; clavier, lecteur d'écran, reduced motion ; rollout mesuré et réversible. Le présent document n'ajoute pas de feature ni d'autorisation de refonte.

## Travaux réalisés sur la candidate locale

Cinq fichiers applicatifs dans le premier passage validé :

- `components/ui/SynauraOverlay.tsx` : trap Tab réel. Les menuitems roving `tabIndex=-1` étaient comptés à tort ; Tab sortait d'Options. Depuis le titre initial Lyrics, Tab sortait aussi vers BODY. Filtrage des éléments visibles, tabulables, non disabled/inert ; rebouclage depuis une cible initiale hors ordre Tab.
- `components/home/SynauraScroll.tsx` : cartes rendues mais inactives `inert` et `aria-hidden`. Le clavier atteignait la carte précédente hors écran et déclenchait un scroll/autoplay. Le diagnostic isolé a confirmé que Profile Peek n'était pas la cause. Aucun changement d'AudioCore ou de scroll algorithmique.
- `app/discover/DiscoverTiles.tsx` : noms accessibles des boutons iconiques lecture, défilement et ouverture album.
- `app/profile/[username]/page.tsx` : noms accessibles du raccourci spotlight Track, des actions iconiques des morceaux et des boutons flottants mobiles partage/suivi.
- `components/QueueBubble.tsx` : texte/icône « File » sur le token de premier plan du thème, après constat d'un contraste de 1,04:1 sur le fond sombre. Ni position, taille, fond ou comportement changés.

Aucune refonte, dépendance, API, DB, modèle comments/moments, signal social ou architecture. Une correction locale de lisibilité, sans nouvelle palette. Les neuf modifications utilisateur/natives présentes au départ restent intactes.

Preuves : `artifacts/final-phase4b8/golden-desktop-r2` (Options), `golden-desktop-after` (Lyrics), `diagnostic` (focus des cartes puis ouverture Peek isolée). Les tentatives incomplètes ne sont pas des PASS.

## Méthodologie reproductible

`scripts/live-final-hardening.mjs` lance un navigateur Chromium jetable, jamais attaché au navigateur de l'utilisateur. Login E2E réel ; données publiques réelles. Trois morceaux publiés ordonnés de manière déterministe uniquement dans le runner, sauf session longue qui utilise le feed réel non remplacé. Aucun contenu social créé/supprimé ; writes analytiques et notifications interceptés, mutations sociales interdites dans ce runner.

Production locale Next 14.2.30, `next build` + `next start`, Chrome 139.0.7258.154, desktop 1440×900 et mobile émulé 390×844. Le zoom est réglé à **2 par l'API native du navigateur**, pas par CSS ou deviceScaleFactor. Sémantique AX/DOM et vrais événements clavier ; ce n'est pas NVDA.

Avant : build `fL8UOVo5kd-yIy7mxYzpJ`. Candidate finale : `dvJMVCOhc7_15getnUxtV` (build intermédiaire `i5LJ7gX675YcWueoY2o3F` pour les premiers parcours). Même application, machine et backend via tunnel SSH existant. `scripts/live-final-server.mjs` garde l'URL DB dans la mémoire du processus ; aucune valeur secrète écrite dans ces rapports.

Deux mesures différentes, volontairement séparées : Actions = clic trusted → contenu puis deux frames avec animation terminée ; runner global = début de commande du driver → contenu et deux frames. Les round trips incluent les interactions et attentes de vérification, **pas une latence de restauration pure**. LCP/CLS locaux sont des observations de navigation, pas des p75 terrain.

## Résultats établis et budgets

| Mesure | Avant | Candidate | Lecture |
| --- | ---: | ---: | --- |
| Client Live, somme gzip des chunks | 432 941 o | 433 075 o | +134 o, +0,031 %, aucune optimisation revendiquée |
| Intersection partagée de toutes les pages, gzip | 340 119 o | 340 120 o | Écart 1 o ; volume brut identique |
| Next First Load arrondi Live / shared | 431 / 339 kB | 431 / 339 kB | Méthode distincte, ne pas additionner aux lignes précédentes |
| LCP / CLS local | 1 236 ms / 0,03135 | 2 056 ms / 0,03140 | Deux navigations ponctuelles, pas des percentiles terrain |
| 30 cycles Peek/Comments/Options | DOM 767 → 767 | DOM 767 → 767 | Surface fermée : zéro contenu métier monté |
| Audio | 1 élément, 14 listeners natifs | Identique | Ne pas confondre listeners natifs et abonnés AudioCore |
| Heap après GC, warm → fin | 7 780 112 → 8 753 084 o | 10 008 604 → 11 007 052 o | Delta absolu non comparable : documents/frames diffèrent ; voir ci-dessous |

Budgets de validation : zéro mutation audio à l'ouverture/fermeture ; un seek par action waveform/marker explicite ; au plus 11 slides montées ; zéro surface fantôme ; zéro refetch métier chaud injustifié et zéro query sociale lourde de card inactive ; zéro ouverture chaude >750 ms. Alerte mémoire : croissance des nodes/listeners après warm-up, ou pente heap persistante non expliquée. Alerte bundle : hausse >1 % sans justification, pas un objectif d'optimisation artificiel. Les mesures heap doivent être interprétées avec le cache, les imports et l'instrumentation de test.

Les compteurs CDP englobent tous les documents/frames : **avant 2 documents/1 frame, après 4 documents/2 frames**. Il serait incorrect d'attribuer la différence absolue de heap/listeners à ces quelques changements applicatifs. Dans chaque passe, les nodes/listeners plafonnent après cinq cycles (avant 1229/705 ; après 1498/1296). Le DOM de page et les listeners audio natifs restent identiques. Deux tâches longues initiales après (58 et 145 ms), une de 50 ms pendant les cycles ; pas de longue tâche répétitive systématique. L'écart LCP 820 ms n'est pas attribué causalement au correctif ; ce relevé unique ne suffit pas à démontrer une régression terrain.

### Ouvertures chaudes, comparaison explicite

Actions : 20 ouvertures chacune après warm-up, clic trusted → contenu peint et transition terminée. Millisecondes, p50 / p95 / max.

| Surface | Avant | Après |
| --- | --- | --- |
| Options | 196,7 / 197,8 / 201,9 | 196,3 / 202,5 / 202,5 |
| Playlist Picker | 9,5 / 22,6 / 23,0 | 11,2 / 28,7 / 29,2 |
| Queue | 9,4 / 18,9 / 22,9 | 11,8 / 25,4 / 32,9 |
| Lyrics | 9,3 / 10,3 / 29,8 | 11,4 / 26,2 / 37,7 |
| Details | 9,3 / 23,0 / 23,9 | 12,6 / 26,6 / 26,9 |
| Share | 9,3 / 21,9 / 34,5 | 11,0 / 23,7 / 28,1 |

**Zéro >750 ms**, zéro query d'organisation chaude, zéro query inactive, zéro exception JS dans les deux benchmarks. Options est dominé par sa transition de présentation, pas un fetch chaud. Le premier warm-up avant coûtait 437 ms avec import lazy + track/abonnement, Playlist 70,6 ms avec son GET ; les autres réutilisent les données déjà chaudes. Aucun spike chaud à attribuer à GC/session/import ; pas d'optimisation ajoutée.

Runner global, 30 ouvertures, autre métrique (driver → loaded + deux frames) : Peek avant 84,7 / 124,9 / 127,8, après **84,9 / 115,4 / 118,0** ; Comments avant 50,5 / 65,0 / 65,3, après **49,1 / 75,4 / 85,0** ; Options avant 41,0 / 82,0 / 88,6, après **37,8 / 89,1 / 89,9**. Ne pas comparer directement cette ligne aux 196 ms d'animation terminée du tableau Actions.

Sources : `before/actions-perf.json`, `after/actions-perf.json`, `metrics/results.json`, `metrics-after/results.json` sous `artifacts/final-phase4b8/`.

## Accessibilité observée — audit initial, avant clôture ciblée

Desktop final : **57 contrôles PASS** (golden + audit des routes/surfaces), mobile golden : **33 PASS**. Tab/Shift+Tab, labels de dialogues, flèches des tabs Conversation/Moments, waveform clavier, marker, draft au retour du Profile Peek auteur, queue/contexte/audio des retours Track/AI/Messages ; parcours Search et Discover inclus. Après correction, Tab Live ne change ni carte ni source audio ; les cartes inactives sont absentes du parcours AX.

Zoom natif 200 % rejoué sur le build final : document de 713 px CSS, toutes les dix routes inspectées et les surfaces sans débordement horizontal ; focus maintenu dans les dialogues. **Zéro bouton/dialogue/tab/input anonyme dans les arbres AX inspectés** après corrections, desktop et zoom. Reduced motion actif : aucune animation en cours au moment des relevés. Cela ne certifie pas tous les états possibles, les overlays système ou les modales payantes non déclenchées.

**Réserves audit, à ne pas transformer en PASS WCAG :**

- Plusieurs petits textes d'accent restent à ~2,4–3,5:1. Les noms/cibles principaux restent accessibles, mais une passe de contraste ciblée est nécessaire avant une clôture accessibilité sans réserve. Le défaut « File » de `QueueBubble` est corrigé dans la candidate finale.
- Deux boutons flottants Profile à 200 % (partage/suivi), non montés au viewport desktop initial, ont été corrigés puis revérifiés : zéro bouton anonyme dans le rejeu final. Le premier relevé n'était pas un PASS sur ce point.
- AI Liste/Grille mesurés ~23 px de hauteur ; contrôle natif Studio compact. Espacement/alternatives et critères WCAG de cible à expertiser, pas un FAIL automatique fondé sur la seule boîte CSS.
- Le scanner de contraste ne certifie pas dégradés/opacity, emojis ni descendants de contrôles disabled ; ces cas sont manuels. Pas de changement global de palette sur cette base.
- **Android/Gboard réel non testé** : ADB disponible mais aucun appareil connecté.
- **NVDA réel non testé** : aucun processus ni installation trouvés dans les emplacements usuels.
- Audit complémentaire 390 : géométrie/focus PASS sur les dix routes et surfaces ; **un bouton Notifications « Tout lire » sans nom AX** lorsque son texte `hidden sm:inline` est masqué. Le contrôle n'a pas été actionné (mutation de notifications). Réserve applicative à fermer, localisée dans `app/notifications/page.tsx` ; le PASS géométrie ne vaut pas PASS intégral d'accessibilité mobile.

## Télémétrie et erreurs

`reportLiveRestore` journalise événement/raison en développement seulement ; les analyses de lecture existantes restent inchangées. L'instrumentation locale du runner suffit à ce gate : aucune nouvelle analytics, donnée de commentaire ou query sensible envoyée. Pas de collecte terrain de latence de restauration ajoutée implicitement.

Classification : A = nouvelles erreurs applicatives (gate) ; B = dette héritée ; C = refus attendus (`/api/suno/credits` 403 non admin, login 401 lorsque le runner atteint huit connexions/10 min) ; D = médias Cloudinary 401 ; E = Community Feedback GET posts 500 OPEN, exclu. Les erreurs contrôlées du failure journey sont identifiées séparément. La console n'est pas masquée.

Défauts du runner corrigés et exclus des résultats applicatifs : sélecteurs desktop cachés sur mobile, entrée mobile « Voir en plein écran », navigation entre posts via ArrowDown, Shift+Tab en deux événements, identifiant d'instrumentation dans un iframe sans `crypto.randomUUID`. La protection de login n'est pas désactivée : espacement des rejeux.

## Matrice réseau

| Surface | Première ouverture observée | Chaud, cache valide | Après fermeture | Polling propre |
| --- | --- | --- | --- | --- |
| Profile Peek | GET profil public | 0 | 0 | Aucun |
| Comments | GET track/comments/moderation ; moments publics déjà chargés par Live actif | 0 | 0 nouveau dans la fenêtre observée | Aucun |
| Options | Import lazy + GET track et abonnement download | 0 | 0 | Aucun |
| Playlist Picker | GET playlists | 0 | 0 | Aucun |
| Queue | Snapshot AudioCore, pas de fetch | 0 | 0 | Aucun |
| Lyrics / Details / Share | Données track déjà chaudes depuis Options | 0 | 0 | Aucun |
| AI / Studio / Messages | Requêtes workspace après navigation réelle seulement | Hors cache de surface | Aucune query workspace par card inactive | Messages est une route, pas une surface |

Nuance importante : le Live actif charge les moments/commentaires nécessaires à sa waveform même sans ouvrir Comments. Cela n'est pas une query de card inactive ni une fuite de surface fermée. Les compteurs des cards inactives sont des observateurs sans queryFn (`skipToken`). Les caches Comments/Organization durent cinq minutes ; une revalidation après expiration dans la session longue est légitime, pas un refetch chaud inexpliqué.

Pollings globaux préexistants séparés : notifications toutes les 20 s, unread Messages ; vérification boost ponctuelle. Fenêtre avant de 30 cycles + idle fermé : seules ces requêtes globales réapparaissent après warm-up. Le benchmark Actions initial contient zéro `warmOrganizationRequests` et zéro `inactiveQueries`.

## Diagnostic interne AudioCore

`dev-audio/results.json` : mode développement exclusif, pas une mesure de performance production. Dix cycles de trois surfaces après warm-up : même `audio-core-1`, 14 listeners natifs, `stateSubscribers=1`, `timeSubscribers=2`, une instance musicale, zéro player secondaire actif, zéro retry. Au repos pausé dix secondes, `providerRenders=42 → 42`. La variation 38 → 42 pendant les cycles inclut une recompilation HMR de la candidate et n'est pas interprétée comme un coût de production.

Le serveur dev a réutilisé `.next` malgré une tentative de distDir distinct : serveur local production arrêté, diagnostic terminé, dev arrêté puis **rebuild production requis et rejoué**. Aucun serveur ni fichier de production distante modifié. Les abonnés internes ne sont volontairement pas exposés en production ; les mesures natives sont rapportées séparément.

## Session longue production locale — PASS

`artifacts/final-phase4b8/long/results.json`, build final : **615 005 ms, soit 10 min 15 s**. 35 passages, **33 identités distinctes**, feed réel non remplacé. 30 cycles Peek/Comments/Moments/Options/Queue/Lyrics/Playlist ; tous les cinq cycles, Track, AI et Messages avec retour Live, soit **18 retours de routes**. Même item, filtre, queue, document musical et état audio ; zéro item initial transitoire, zéro surface fantôme, zéro exception JS.

La lecture est volontairement pausée après la traversée pour éviter une fin naturelle de morceau au milieu d'un contrôle. Cette passe ne prétend donc pas valider dix minutes de streaming ininterrompu ; la continuité en lecture est couverte par les golden journeys séparés.

| Relevé après GC | Heap (octets) | DOM | Nodes CDP | Listeners CDP | Timers actifs |
| --- | ---: | ---: | ---: | ---: | --- |
| Après parcours, avant surfaces/routes | 11 684 552 | 1 231 | 2 046 | 1 380 | 6 intervalles / 158 timeouts |
| Cycle 5, routes chargées | 13 254 588 | 931 | 2 625 | 1 447 | 6 / 167 |
| Cycle 10 | 13 584 700 | 931 | 2 625 | 1 447 | 6 / 166 |
| Cycle 15 | 13 093 820 | 931 | 2 625 | 1 447 | 6 / 160 |
| Cycle 20 | 12 669 580 | 931 | 2 625 | 1 447 | 6 / 15 |
| Cycle 25 | 12 866 304 | 931 | 2 625 | 1 447 | 6 / 15 |
| Cycle 30 / fin | 10 636 940 | 931 | 2 354 | 855 | 6 / 15 |

Une instance audio et 14 listeners natifs à chaque relevé. Au plus 11 slides montées ; six à la fin après restauration du préfixe vu, avec 28 placeholders non interactifs, contre 51 initialement. Pas de pente mémoire monotone après chargement des routes ; timers et heap redescendent avec expiration/GC. Cela ne prouve pas l'absence de toute fuite sur une durée indéfinie.

Réseau : fetch initial des surfaces au cycle 1, revalidation des données cinq minutes plus tard au cycle 17 ; pas de refetch métier par ouverture entre ces bornes. Les retours de routes remontent/revalident les sources du feed (ranking, city, clips, recommandations, préférences) sans remplacer l'ancre vue : ce coût est distinct d'une query de surface chaude ou de card inactive. Six 403 admin Suno attendus et 16 erreurs média Cloudinary 401 ; zéro exception JS nouvelle.

## Failure journey — PASS

`artifacts/final-phase4b8/failures/results.json`, build final. Erreurs injectées uniquement dans le navigateur jetable : profil public 404, Comments 500, playlists GET 500 ; textes de repli présents et dialogue refermable. Refus `navigator.clipboard.writeText` : erreur explicite, jamais de faux succès « copié ». Snapshot rendu expiré par horloge du seul document de test : retour vers Live frais ; token inconnu supprimé sans faux retour ; Track inexistant : repli lisible. URL d'image volontairement inexistante dans le DOM jetable : couverture de secours chargée. Zéro exception JS.

Pas de mutation de playlist pour forcer un quota : le chemin GET en erreur est validé, pas un quota réel atteint. Pas de suppression de profil réel, de track ou de média serveur. Le test de couverture de secours ne ferme pas le ticket Cloudinary ni ne prétend réparer ses URLs historiques.

Les toasts d'information quotidiens peuvent momentanément couvrir le rail mobile. L'inspection `elementFromPoint` a identifié un `role=status`, pas un backdrop de Comments. Le runner utilise le vrai bouton Fermer du toast avant de poursuivre ; aucun masquage CSS ni suppression du système de notifications. Les fermetures attendent également la fin effective du backdrop avant l'action suivante.

Autre diagnostic mobile : un lien AI du menu compte `<details>` fermé gardait des dimensions retournées par Chromium ; le runner le sélectionnait avant la carte visible. Exclusion des descendants de details fermés dans la sélection et le scanner DOM. Le parcours tap Create → AI → Live passe ensuite sans changement applicatif. Le contraste « Déconnexion » du premier scan provenait aussi de ce contenu fermé et n'est pas une anomalie visible retenue.

## Captures finales utiles

Captures locales, non staged ; les essais incomplets restent des diagnostics et ne font pas partie de la baseline finale :

- `artifacts/final-phase4b8/final-desktop/` : Live 1440, Track, Profile, Discover, Library, Comments, Moments, cluster, Peek, Actions, Create, AI.
- `artifacts/final-phase4b8/golden-mobile/` : Live 390, Comments, Moments, Peek, Actions, retours Search/Discover.
- `artifacts/final-phase4b8/a11y-mobile/` : contrôle complémentaire des routes à 390.
- `artifacts/final-phase4b8/a11y-zoom200/results.json` : zoom réellement à 2, pas une capture simulant un zoom.

Revue visuelle : layout conservé, composer et scroll interne séparés, fermeture et tabs lisibles ; libellé File désormais visible. Les contrastes d'accent faibles de cette passe sont repris uniquement dans l’addendum de clôture ciblée, pas une nouvelle passe artistique. Les captures ne montrent pas de clavier Android réel.

## Invariants

- Conserver exactement les baselines validées : intro 4A V3.2, AudioCore, continuité 4B.1, contrôleur de surfaces, Profile Peek, Comments/Moments, Actions, polish et handoffs.
- Aucune duplication de player, de store de navigation, de souscription ou de route-workspace importée dans Live.
- Pas de transformation des contrats Track/Post/Clip, pas de replies/likes Post inventés, aucune mutation de contenu utilisateur pour fabriquer une validation.
- Pas de changement DB/API, migration ou configuration de production implicite.
- [Community posts 500](fixes/community-posts-500.md) et Cloudinary 401 restent des correctifs séparés. Leur présence ne doit pas être masquée par des fallbacks mensongers ni incluse dans le commit 4B.7.

## Gate et décision

**266/266 tests PASS**, incluant AudioCore Phase 2, Continuity, Context Surfaces, Peek, Comments/Moments, Actions, Handoffs, foundation, sécurité et contrats DB. Type-check PASS, build production PASS, `git diff --check` PASS. Avertissement Browserslist hérité, pas de mise à jour de dépendance opportuniste. Journaux : `artifacts/final-phase4b8/tests-final.log` et `build-final.log`.

Golden mobile 390×844 complet PASS ; mêmes vérifications desktop rejouées sur le build final. L'audit complémentaire de routes à 390 passe ses contrôles de géométrie/focus, mais révèle le label Notifications manquant ci-dessus. Les limites Android/NVDA réels, les petits textes d'accent sous les seuils de contraste et le quota playlist non provoqué restent explicitement ouverts. Aucune expression Aura ajoutée.

**Décision historique de la première passe : NO-GO avant correction du label et des accents confirmés.** L’utilisateur a ensuite validé la candidate et accepté le maintien explicite des réserves physiques. Le gate de livraison final est décrit ci-dessous ; aucune certification WCAG complète n’est revendiquée.

## État production avant livraison et périmètre Git

Production toujours sur `2af010a8dfb44bd7636f0d3a4d407d852f1bd657` : service actif, HTTP 200, aucun redémarrage automatique, racine 45 % avec 32 Go libres. Contrôle logs ciblé sur 30 minutes : zéro TypeError/ReferenceError/comment_moderation/Unhandled/out-of-memory. **Community Feedback GET posts 500 préexistant : OPEN et exclu**, pas de déclaration « toutes les surfaces sont saines ».

Build Freebox historique : installation 1 min 40,877 s, build 14 min 26,661 s, app restée disponible. RAM/swap relevés hors build seulement ; pics non connus. [Ticket infra séparé](fixes/freebox-build-duration.md), aucun tuning.

Après validation utilisateur uniquement : revue fichier par fichier, scan secrets, commit isolé, workflow canonique déjà en place, smoke public/authentifié léger, logs/health/disque/AudioCore. Rollback : SHA 4B.7 ci-dessus. Tag annoté proposé `synaura-live-4b-baseline`, uniquement après déploiement sain et pointant sur le SHA réellement servi. Le tag ne doit être créé qu’après la preuve de santé et l’égalité `current` / `last-successful-sha` / commit livré.

État au terme de l’audit initial : index vide ; aucun commit, push, déploiement ou tag. Cinq fichiers applicatifs de candidate listés plus haut ; scripts de validation, test et rapports locaux. Les neuf changements préexistants (PLAY_STORE, capacitor, configuration et plugin messaging natifs) sont préservés ; `.claude`, artifacts, docs.zip, anciens diagnostics et `supabase/.temp` non intégrés. Aucun secret trouvé par les motifs inspectés dans les fichiers de candidate ; aucune clé, env, dump, cache ou artefact de build à versionner. Cette vérification ne prétend pas auditer tout l'historique Git ou les fichiers utilisateur hors scope.

Voir le [bilan final Phase 4B](live-experience-phase4b-final.md) pour l'architecture, les invariants et le plan de retour.

## Addendum — clôture ciblée autorisée

Le label mobile reçoit `aria-label="Tout lire"` : même action, disabled, icône, texte desktop et layout. Le contrôle n’est pas actionné sur les notifications réelles du compte E2E.

Accents corrigés exclusivement : « Aperçu créateur », « Commenter à », timestamps de commentaires, « Morceau courant », « Suivant »/numéros de queue, « À écouter maintenant », « Créer avec l’IA » (bannière AI uniquement), « 1 · Idee musicale » et « Liens musicaux ». Les textes utilisent `color-mix(in srgb, var(--syn-accent) 65%, var(--syn-text-primary))`. Aucun token/palette nouveau : violet éclairci en thème sombre, renforcé en thème clair ; aucune modification du token d’accent global, des fonds, icônes, layouts ou animations.

Le scanner sait maintenant lire `color(srgb ...)`, afin de ne pas interpréter les canaux normalisés comme des valeurs RGB 0–255. Les contrôles désactivés, emojis et menu `<details>` fermé ne justifient pas une recoloration. « Mode & modèle » de Studio est un sous-texte neutre `text-white/35`, pas un petit texte d’accent : hors correction ciblée demandée, sans prétendre certifier toute l’accessibilité.

Build local de livraison : `MkYEeSiTGlua0BV-39ylB`. Type-check et build PASS ; 268/268 tests PASS, dont six guards Phase 4B.8. Golden + audit mobile : **83 contrôles PASS**, nom « Tout lire » présent dans l’arbre AX, zéro contrôle anonyme Notifications, zéro exception JS. Captures Notifications, Peek et AI revues : design conservé. Preuves : `artifacts/final-phase4b8/closure/mobile/results.json` et `notifications.png`.

Mesures après sur mobile : Aperçu/Commenter/Suivant 5,47:1 ; timestamps/Morceau courant 4,61:1 ; bannière AI 6,38:1 ; Liens musicaux 6,85:1 (seuil 4,5:1). Les éléments desktop hors viewport mobile sont mesurés séparément, pas déclarés PASS par absence.

**Réserves QA : Android/Gboard réel NON TESTÉ ; NVDA réel NON TESTÉ.** Community Feedback 500 OPEN / hors 4B.8 ; Cloudinary historiques 401 séparés. Aucun nouveau signal, effet ou feature Aura. Pas de Phase 4B.9.

Les preuves opérationnelles de livraison seront ajoutées après le smoke, sans inventer un SHA autoréférentiel dans ce commit. Le tag annoté sera l’identifiant Git immuable du commit réellement servi ; l’addendum post-bascule restera local si nécessaire pour ne pas provoquer une seconde livraison documentaire.

### Gate précommit — PASS / GO livraison

- Golden desktop 1440 + audit zoom natif 200 % : **84 contrôles PASS** ; viewport 713 px CSS, aucun débordement horizontal, aucun contrôle anonyme dans les arbres inspectés. Tab/Shift+Tab et focus des dialogues PASS ; reduced motion actif, zéro animation en cours aux relevés.
- Rejeu desktop ciblé des textes hors viewport mobile : **7 contrôles PASS** ; « À écouter maintenant » 3,45 → **6,52:1**, « 1 · Idee musicale » 3,03 → **5,74:1**. Les deux textes ont effectivement été trouvés/mesurés, pas un PASS vide.
- Golden mobile + audit : 83 PASS ; zéro exception JS. 268/268 tests, type-check, build, diff-check PASS. Scan des 19 fichiers prévus : aucun motif de credential et aucune valeur privée connue de l’environnement local.
- Preuves : `closure/desktop-zoom-r2/results.json`, `closure/accents-desktop/results.json`, `tests-closure.log`, `build-closure.log` sous `artifacts/final-phase4b8/`.
- Un essai desktop interrompu sur une cible en transition : runner synchronisé sur visibilité/opacity/interactivité réelles, puis rejeu complet PASS. Aucun bug applicatif supplémentaire ni modification d’architecture.

Les nouveaux refus réseau de ces smokes se limitent aux URLs média Cloudinary historiques 401 et au guard admin Suno 403 attendu ; aucune exception JavaScript. Ne pas présenter cette distinction comme une console entièrement vide.
