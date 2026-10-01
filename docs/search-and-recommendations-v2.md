# Recherche V2 et trajectoire des recommandations

Date : 27 septembre 2026. Candidate locale, non commitée, non déployée.

Choix produit confirmé : **équilibre entre goûts personnels, nouveautés et petits artistes**.

Suite au chantier recherche décrit ici, une seconde demande a lancé la refonte locale des recommandations : voir [politique équilibrée v1](recommendation-policy-v1.md). Les mentions « non modifié » et propositions ci-dessous décrivent le périmètre du premier chantier recherche ; le nouvel addendum donne l'état actuel des moteurs, corrections et validations. Les réserves d'accès au serveur réel restent ouvertes.

## Livré dans cette candidate

- Une recherche commune à la page `/search`, à la navigation desktop et à l’ancienne `TopSearchBar`. Mobile : accès compact à la même page ; pas de deuxième moteur.
- Cinq familles : sons publics classiques/IA, profils, clips publiés, playlists publiques, posts publics. Les anciennes clés de réponse sont conservées pour Découvrir.
- Classement par intention : titre exact, identité du créateur, début de titre, sous-chaîne, mots dans titre/auteur, mots dans les métadonnées, puis correspondances proches. Les likes ne passent plus devant un titre exact.
- Accents français courants et ligatures normalisés. Tolérance approximative via `pg_trgm.word_similarity` à partir de quatre caractères, seuil 0,62. Ce n’est ni une compréhension sémantique ni un modèle IA de recherche.
- Requêtes paramétrées ; aucun `%` ou `_` saisi ne devient un joker SQL. Saisie bornée à 120 caractères, deux caractères minimum, limite bornée à 60 résultats par catégorie.
- Saisie temporisée à 240 ms ; annulation et garde d’identité de requête ; pagination stable par score/identifiant, curseur lié à la recherche et à la catégorie ; dédoublonnage des pages.
- Suggestions rapides uniquement lorsque la barre est ouverte et une recherche est saisie. Clavier : flèches, Entrée, Échap ; champ nommé et sélection annoncée.
- Recherche récente stockée seulement sur ce navigateur, effaçable. URL partageable après validation ou choix de filtre ; retour Live conservé.
- Lecture explicite par AudioCore existant ; Profile Peek et Actions conservés. Pas de nouvel élément musical, de lecture automatique à la saisie ou de remise à zéro de queue.
- Mouvements décoratifs limités et respect de la préférence globale, de la réduction des animations et de l’onglet masqué via `useLivingMotion`.
- Erreur réseau explicite avec réessai : une base inaccessible ne devient pas un faux « aucun résultat ».

La route publique `/search` est exclue de l’attente d’onboarding, comme `/live`. Un JWT local existant sans profil résolu la bloquait indéfiniment hors accès PostgreSQL (`authenticated`, identité absente). Cette exception concerne uniquement cette route publique ; aucun endpoint privé, droit ou callback d’authentification n’est changé.

### Contrats de visibilité

La recherche ne retourne que les sons `is_public IS TRUE` avec audio non vide. Pour l’IA : morceau **et génération** publics, génération terminée. Un clip doit être publié, posséder une vidéo et conserver une source musicale publiquement lisible. Les playlists comptent seulement leurs morceaux publics lisibles. L’image d’un morceau attaché à un post n’est utilisée que si ce morceau est public. Les profils sont projetés par liste explicite de champs publics : ni email, ni rôle, ni préférences.

Aucune migration, extension, index, écriture DB de production ou donnée utilisateur modifiée. `pg_trgm` figure dans la baseline SQL existante ; sa disponibilité sur le serveur et les plans réels restent à vérifier avant publication. Documentation de référence : [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html).

## Inventaire des principaux classements produit

Cet inventaire couvre les parcours musicaux et sociaux repérés, pas une certification exhaustive de chaque calcul de tout le produit. Aucun des moteurs ci-dessous n’a été modifié par cette candidate hors recherche.

| Parcours | Implémentation active repérée | État / limite à traiter |
| --- | --- | --- |
| Recherche | `app/api/search/route.ts`, `lib/search/*` | Nouvelle candidate : pertinence avant popularité ; mesures SQL à réaliser. |
| Live musical | `SynauraScroll`, `/api/ranking/feed`, `lib/recommendation/{candidates,signals,engine}` | Déjà personnalisé, exclusions, pénalités de répétition, diversité artiste/genre et sélection émergente. Ne pas repartir de zéro. |
| Posts du flux | `/api/recommendations/mixed`, `rerankPosts` | Classement distinct des sons ; vérifier le mélange final et les signaux propres aux posts. |
| Flux mixte / warm feed | `/api/recommendations/feed`, `SynauraWarmFeed` | Autre composition sons/posts. Une même politique doit être testée sur chaque consommateur avant convergence. |
| Clips | `lib/recommendation/clips.ts` et son alimentation dans Live | Fraîcheur, engagement, affinités et pénalités ; quotas initiaux puis éléments différés. Mesurer diversité en profondeur, pas seulement les premières cartes. |
| Découvrir | `/api/discover`, `DiscoveryLibrary` | Défaut `trending`, tri nouveautés chronologique, sélection « hidden » ; candidats bornés, IA exclue du pool standard. Pas un catalogue infini exhaustif. |
| Radar / ambiances | `lib/discoverData.ts`, `/api/discover/{radar,moods}` | Sélections distinctes. Ambiances textuelles sur un pool de 400 titres ordonnés par lectures ; les artistes faibles en exposition peuvent ne jamais entrer dans ce pool. |
| Compatibilité / recommandations personnelles | `lib/recommendation/serverFeed.ts`, `/api/tracks/{recommended,trending}`, `/api/recommendations/personal` | Adaptateurs vers le moteur commun ; conserver leurs contrats pendant la consolidation. |
| Mobile natif | `/api/mobile/discover` | Moteur partagé mais assemblage dédié ; ne pas confondre validation web et validation native. |
| Suite automatique / titres proches | `hooks/useAudioRecommendations.ts`, consommé par `useAudioService` | Score client genre/tags/artiste/fraîcheur/popularité, historique local ; différent du score serveur Live. Harmoniser la politique, pas le propriétaire audio. |
| Redécouverte | `/api/tracks/rediscover` | Comptage des écoutes terminées et ancienneté ; chargement de l’historique puis agrégation en application, à profiler. |

`lib/recommendationEngine.ts` semble ancien : aucun import direct trouvé dans app/components/hooks/lib. Ne pas le présenter comme le moteur de production ni le réécrire sans prouver un consommateur. `AppNavbar` et `SearchModal` ne présentent pas non plus de consommateur trouvé ; laissés intacts, pas supprimés aveuglément.

### Points concrets repérés

1. Le moteur Live possède déjà des créneaux `affinity`, `quality`, `emerging`, `fresh`, `momentum`, `catalog`, avec adaptations au démarrage sans historique. Il ne se réduit pas à la popularité.
2. La couverture des candidats est une limite plus importante que les seuls poids : pools récents/populaires/catalogue/qualité/IA bornés. Un meilleur score ne peut découvrir un artiste absent du pool.
3. « Émergent » est actuellement approximé par métriques et faibles lectures. Ne pas promettre une mesure de taille réelle de carrière ou de qualité artistique.
4. Les signaux serveur plafonnent déjà certaines contributions par utilisateur/session et pénalisent skips/expositions. Conserver ces protections et tester leur efficacité plutôt que créer un second historique concurrent.
5. Les événements et critères diffèrent entre posts, clips, sons, mobile et autoplay. L’absence de politique produit versionnée rend leur comportement difficile à comparer.
6. Défaut de parsing identifié dans `serverFeed.integerParam` : `Number(null)` vaut 0, donc une limite absente est ramenée au minimum au lieu du défaut. Confirmé à la lecture du code, pas reproduit contre le serveur ici. Correction séparée à accompagner d’un test ; non modifié dans cette candidate.
7. Plusieurs paramètres de pagination emploient `Number`/`parseInt` sans traitement homogène des valeurs non finies. Les durcir dans leur chantier dédié.

## Proposition : une politique commune, plusieurs intentions

La recherche répond à **ce qu’on demande** ; la recommandation aide à **ce qu’on pourrait aimer**. Ne pas personnaliser au point de masquer un titre exact recherché.

Pour Live « Pour toi », point de départ à expérimenter, pas changement livré : sur une fenêtre de 20 propositions, environ 8 créneaux d’affinité, 6 de nouveauté et 6 d’artistes peu exposés. Chaque sélection occupe un seul créneau même si elle satisfait plusieurs critères. Sans historique, redistribuer vers découverte/qualité/catalogue. Garder les filtres explicites « Abonnements », « Nouveautés », etc. fidèles à leur intention.

Garde-fous communs : exclusion des contenus privés/masqués et des blocages applicables, id stable, absence de doublon, diversité de créateurs, pas de répétition immédiate, normalisation des signaux et raison compréhensible de recommandation. Un boost commercial ne doit jamais se déguiser en goût personnel.

Ordre recommandé :

1. Instrumenter et mesurer le système existant : couverture artistes, part de nouveautés/peu exposés, répétitions, écoutes volontaires et complétées, skips rapides, diversité, latence et erreurs. Les métriques de rétention seules ne suffisent pas.
2. Élargir/stratifier les pools avant classement, avec budget par source. Vérifier que sons IA, clips et sons classiques respectent la même visibilité sans écraser leur identité.
3. Introduire une politique versionnée testable en mode comparaison, sans changer le flux servi. Rejouer des sessions avec/sans historique et genres rares.
4. Unifier exclusions, normalisation et quotas ; garder des scores spécifiques au format. Stabiliser la pagination dans la session et cloisonner les caches personnalisés par utilisateur.
5. Faire converger l’autoplay client vers cette sélection, sans modifier AudioCore, les gestes explicites ou la continuité Live.
6. Déployer progressivement après comparaison et validation, avec retour à la politique précédente. Aucun déploiement automatique dans cette tâche.

## Validation et limites

- Suite finale : **843 tests PASS**, dont 13 nouveaux tests recherche exécutant le véritable handler API, le hook et la page avec dépendances contrôlées. Normalisation, curseurs, paramètres SQL, visibilité structurelle, catégories, erreurs, annulation A/B/C, pagination tardive, double-clic, gestes play/pause et retour Live couverts. Ce ne sont **pas** des tests navigateur ou d’exécution SQL PostgreSQL ; l’exécution SQL est vérifiée séparément ci-dessous.
- TypeScript : PASS.
- Build production local : PASS, 99 pages statiques générées. Avertissements de données Browserslist anciennes et de runtime edge conservés, sans mise à jour de dépendances de production. `git diff --check` PASS ; scan ciblé des nouveaux fichiers/diffs sans secret détecté ; aucun fichier staged.
- Test SQL complémentaire PASS : les cinq requêtes réellement exécutées avec PGlite 0.5.8 / PostgreSQL + `pg_trgm`, en mémoire et avec fixtures synthétiques uniquement (`scripts/search-postgres-fixtures.mjs`). Titre exact devant remix très populaire, accents/ligatures, auteur, genre, faute proche, injection littérale, pages sans doublons, morceaux privés/sans audio, parents IA privés/en attente, posts privés, clips brouillons/sources privées, compte de playlist et image privée exclus. Un changement de visibilité de la source fait disparaître le clip. Dépendance de test uniquement dans `.tmp`, aucun ajout à l’application. Référence : [extensions PGlite](https://pglite.dev/extensions/).
- Anciennes assertions qui figeaient le HTML/comportement de la recherche avant refonte remplacées par les contrats de la nouvelle recherche ; les protections des autres pages restent en place.
- Rendu d’entrée inspecté en navigateur à 1440 × 960 et 390 × 844 ; état d’indisponibilité constaté, pas maquillé en résultats vides. Les suggestions visibles provenaient du cache local existant, pas d’une nouvelle lecture du serveur. Conflit trouvé avec l’ancienne règle `.v2-personal--search nav[aria-label="Filtrer les résultats"]` qui imposait `flex-wrap: wrap` : la règle de la nouvelle recherche est désormais explicitement prioritaire, sans changer les autres pages.
- Dernier build relancé après cette correction CSS : PASS. Contrôle navigateur du build final à 390 × 844 : largeur document 390 px, six filtres à la même ordonnée, `nowrap` et défilement horizontal effectifs. Captures : `artifacts/search-v2/desktop-1440.png` et `artifacts/search-v2/mobile-390.png`. Le serveur de prévisualisation utilise le build production local sur le port 3000 ; ce n’est pas un déploiement sur synaura.fr.
- Barre commune contrôlée dans Découvrir en session anonyme sur le build final : présente sur desktop, largeur document 1024 px pour viewport tablette 1024 px ; saisie ouvrant les suggestions (`aria-expanded=true`), erreur réseau explicite faute de DB, Échap refermant (`aria-expanded=false`). Sélection parmi des résultats réels toujours à valider une fois le serveur accessible.
- Blocage externe confirmé par l’utilisateur : PC actuellement hors du réseau du serveur `192.168.1.43`. Aucune ouverture de port ni manipulation d’accès réseau tentée.
- **Non validés** : requêtes sur le PostgreSQL de production, extension active sur cet hôte, plans `EXPLAIN (ANALYZE, BUFFERS)`, pertinence sur catalogue courant, p50/p95/max, rendu de résultats réels et parcours Profile Peek/Actions depuis ces nouveaux résultats. Pas de conclusion de performance indexée : les expressions de normalisation ne disposent d’aucun nouvel index.
- Avant toute publication : contrôler ces points en lecture seule, puis tester recherche exacte, accentuée, par auteur, typo, genres, chaque catégorie, pagination, changements rapides, clavier, retour Live, contenus privés absents et absence de requête dans une barre inactive.

Décision : candidate locale pour revue, **pas GO production** tant que la validation PostgreSQL et le parcours connecté ne sont pas terminés. Aucun commit, push ou déploiement.
