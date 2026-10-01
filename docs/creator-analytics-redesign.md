# Synaura — Creator Analytics

Candidate locale du 27 septembre 2026. Refonte demandée de `/stats`, sans déploiement, migration ou modification de la collecte AudioCore.

## Expérience

- Vue d’ensemble : quatre métriques sélectionnables, comparaison à la période précédente sur une même échelle, graphique au survol et au clavier, tableau accessible des valeurs, instantané des dernières 48 heures, faits dérivés des résultats et meilleurs morceaux.
- Contenus : sons classiques et IA, recherche locale, tri par écoutes/auditeurs/J’aime/fin de parcours, pagination, ouverture de l’analyse d’un morceau ; posts et clips distingués selon les mesures réellement disponibles.
- Audience : comptes uniques dédupliqués sur la période, démarrages anonymes explicités, origine, plateformes, pays renseignés et activité par jour/heure UTC.
- Périodes : 7, 28, 90 jours complets ou sélection personnalisée de 1 à 90 jours. Comparaison à une fenêtre immédiatement précédente de durée identique. Aujourd’hui est exclu des comparaisons pour ne pas comparer une journée partielle à une journée complète.
- Exports CSV distincts : jours, sons, posts, clips. UTF-8 avec BOM, séparateur point-virgule, échappement des guillemets et protection contre les formules issues des titres/contenus.
- Navigation globale conservée ; animations sobres utilisant les tokens et la préférence d’ambiance existants, arrêtées avec `prefers-reduced-motion`.

L’inspiration fonctionnelle est le découpage des outils créateur, les comparaisons et exports documentés dans [YouTube Analytics, mode avancé](https://support.google.com/youtube/answer/9717005?hl=en). Cela ne constitue pas une promesse de parité avec YouTube/TikTok : impressions, revenus, démographie et rétention seconde par seconde ne sont pas collectés de façon exploitable ici.

## Définitions et périmètre des chiffres

| Affichage | Source | Limite explicitée |
| --- | --- | --- |
| Écoutes enregistrées | `track_events.play_start`, classiques + IA | Nombre d’événements, pas le compteur public historique ; événements absents ou départs multiples possibles. |
| Auditeurs identifiés | Comptes distincts ayant un départ sur toute la période | Anonymes exclus ; ne pas additionner les uniques journaliers. |
| J’aime reçus | `track_likes` + `ai_track_likes` ajoutés dans la période | Seulement les J’aime encore présents ; les retraits effacent l’historique disponible. |
| Jusqu’au bout / parcours | Départs, progression maximale, fin regroupés par morceau + compte/session + jour UTC | Minimum cinq parcours ; une session navigateur n’est pas un identifiant d’écoute. Plusieurs écoutes peuvent être regroupées ; aucun taux prétendument exact par écoute. |
| Origines / plateformes / pays | Métadonnées déclarées des départs | Inconnus visibles ; pas de géolocalisation ou de pays inventé. |
| Dernières 48 h | 48 tranches horaires dont l’heure courante partielle | Instantané, pas un flux temps réel ; filtre musical conservé, filtre de dates ignoré explicitement. |
| Abonnés / nouveaux abonnements | Relations `user_follows` encore présentes | Total du compte, pas croissance nette ; désabonnements historiques inconnus. |
| Posts | Posts du créateur, `post_likes`, `post_comments` | Interactions encore présentes reçues pendant la période, même sur d’anciens posts ; filtres musicaux non appliqués. |
| Clips | Clips du créateur et leurs compteurs existants | Cumuls actuels hors période. Pas de vues ni de rétention ajoutées. |

Les classements chargent au maximum 500 sons par écoutes, 100 posts par interactions et 100 clips récents, avec limites visibles. Recherche/tri des sons et exports portent sur cette sélection chargée, pas sur un catalogue arbitrairement grand. Les agrégats généraux ne tronquent pas les événements à une limite de lignes.

## Calculs et sécurité

La nouvelle route privée `/api/stats/creator` exécute une seule requête paramétrée en lecture seule. Les recommandations PostgreSQL appliquées ici sont l’agrégation côté base et les résultats bornés, sans nouvelle table/index/migration. Les événements sont bornés aux deux périodes comparées ou aux 48 tranches horaires récentes : une période personnalisée ancienne ne charge pas toutes les années intermédiaires. L’appartenance provient exclusivement de la session serveur, jamais d’un identifiant de compte fourni par le client. Sons IA : les identifiants préfixés et les anciens UUID marqués IA sont reconnus sans attribuer leurs événements aux sons classiques portant le même UUID.

- 401 sans compte ; 400 pour filtres invalides ; 404 pour morceau absent de la sélection possédée ; 503 explicite si base indisponible.
- Réponses privées `no-store`, variation Cookie/Authorization ; aucune identité d’auditeur/session envoyée au navigateur.
- Aucun résultat fictif substitué à une erreur. Le client annule les anciennes requêtes, ignore les réponses tardives et masque les résultats lors d’un changement de compte/filtre. Délai maximum de 20 s.
- Changer de vue, métrique, tri, recherche ou page locale ne déclenche aucune nouvelle requête analytique. Actualisation explicite et changement de filtre serveur seulement.
- Les anciennes routes statistiques restent inchangées pour leurs consommateurs existants. Les anciens problèmes de ces routes ne sont donc pas déclarés globalement corrigés : la nouvelle page utilise uniquement la nouvelle route.
- Aucun changement AudioCore, paiement, droits d’abonnement, données utilisateur, taxonomy Community ou infrastructure.

## Aperçu hors réseau

`/dev/stats` utilise des données fictives explicitement marquées. `/dev/stats?empty=1` expose l’état vide. Le même composant d’interface est utilisé ; les données de démonstration ne sont pas importées par `/stats` ni par son API. La route de démonstration renvoie `notFound()` en production ; son exception d’onboarding est strictement limitée au développement. Horloge transmise par le serveur pour éviter un décalage d’hydratation. Liens vers les contenus fictifs désactivés, exports préfixés `demo`.

Le serveur privé n’est pas joignable depuis le réseau actuel de l’utilisateur. Aucune ouverture de port ni tentative d’accès production n’a été faite. Les comptes réels, les volumes réels et le plan de requête production restent à valider au retour sur le réseau autorisé.

## Vérifications

- Suite complète après approfondissement : **911/911 PASS**, dont 21 tests dédiés modèle, route réelle exécutée avec dépendances isolées, erreurs, propriété, CSV, annulation, réponses tardives, changement de compte, comparaisons et absence de refetch local.
- PostgreSQL isolé : requête SQL réelle exécutée avec PGlite sur les définitions de tables extraites de la baseline versionnée. PASS : frontières UTC, période précédente, audience dédupliquée, événements répétés, anonymes, espaces d’identifiants IA/classiques, propriété, tentative d’injection, interactions sur anciens posts, état vide et dates personnalisées. Ce n’est pas une mesure de performance production.
- TypeScript : PASS.
- Navigateur local : 1440, 768 et 390 px, aucune largeur de document supérieure au viewport. Vue d’ensemble et audience examinées visuellement ; recherche, pagination, sélection IA, analyse d’un morceau, retour à tous les sons, posts/clips, comparaison, dates personnalisées et export essayés. Tableau de contenus avec défilement horizontal interne sur petit écran, sans débordement de la page.
- Défauts trouvés pendant les essais : nom accessible d’export mobile manquant, export Posts/Clips orienté vers les séries musicales, saisie de dates contrôlée ne reprenant pas toujours la valeur visible, horodatage de démonstration différent entre serveur/client. Corrigés.
- `git diff --check` : PASS. Scan ciblé des fichiers ajoutés : aucune clé privée, clé fournisseur ou URL de connexion avec secret détectée. Les changements préexistants, natifs et hors statistiques sont conservés ; rien staged.
- Compilation finale : `next build` PASS. Le bundle de la nouvelle route contient bien la dernière correction de bornage des périodes anciennes. Avertissements existants : base Browserslist ancienne et route edge exclue de la génération statique.
- Smoke du build production local via `next start` : `/stats` HTTP 200 (coquille privée derrière la résolution de session), `/api/stats/creator` sans session HTTP 401 avec `private, no-store`, `/dev/stats` HTTP 404. Serveur de test arrêté, développement relancé pour la revue.

## Restant avant publication

Revue visuelle utilisateur, essai connecté avec vraies données, mesure SQL sur les volumes réels. Mobile physique, lecteur d’écran réel et performance en production non validés ici. Aucun commit, push ou déploiement effectué.

## Approfondissement et correction de navigation

La navigation historique observée venait de l’alias `/dev/stats`, absent de `usesUnifiedNavigation`, alors que `/stats` utilisait déjà `AppNavigation`. L’alias exact rejoint maintenant la navigation commune et reprend le cadrage de `/stats` en développement. Aucune navigation propre à Stats n’a été créée, aucun nouvel item ajouté à la barre. Les routes d’entrée, l’authentification, les embeds et les autres aperçus restent hors de cette modification. Les garde-fous historiques de cadrage conservent leurs hashes : seule cette ligne d’alias exacte est projetée, avec un test d’équivalence de comportement et des cas négatifs.

Nouveautés :

- **Comparer** : deux morceaux indépendants sur la même période et la même échelle, sélection des sons, écoutes/auditeurs/J’aime/fin de parcours, tableau quotidien accessible et export CSV propre à la comparaison. Les auditeurs peuvent se recouper : ne pas additionner leurs uniques. La comparaison n’établit pas une causalité ou une supériorité artistique. Les choix de morceaux restent au niveau de la page pour survivre aux changements de période ; un filtre excluant un morceau revient à une sélection disponible.
- Deux requêtes privées supplémentaires uniquement lorsque l’onglet Comparer est monté et contient deux morceaux distincts. Même propriétaire de session, mêmes bornes temporelles, annulation et rejet des réponses tardives. Changer la métrique du graphique n’appelle pas le serveur. Les deux rapports sont déjà calculés par l’API existante de la candidate ; aucune nouvelle collecte.
- **Mouvements du catalogue** : hausses/baisses triées par variation absolue, volumes avant/après, pourcentages uniquement avec une base précédente non nulle, concentration des écoutes sur les trois premiers sons, jours actifs et moyenne incluant les jours à zéro. Périmètre des 500 sons chargés explicitement signalé lorsqu’il est dépassé.
- **Ils reviennent écouter** : intersection des comptes identifiés entre les deux fenêtres, comptes non observés dans la fenêtre précédente, taux de retour des auditeurs précédents, nombre de comptes présents sur plusieurs jours. « Non observé avant » ne signifie ni première écoute à vie ni nouvel utilisateur. Les comptes anonymes restent exclus. L’ensemble est agrégé dans la même requête bornée, sans envoyer d’identifiants au client et sans migration.
- Graphiques adaptés à la largeur réelle du panneau pour garder les axes lisibles sur mobile ; observer de redimensionnement nettoyé au démontage.
- Démonstration cohérente entre ligne de contenu, analyse individuelle et comparaison ; scénarios synthétiques en hausse et en baisse. Toujours marquée fictive et interdite en production.

Validation de ce passage :

- Comparaison navigateur Stats/Communauté : même navigation principale, neuf liens identiques, un seul propriétaire. Aperçu testé à 1440, 1024 et 390 px sans débordement horizontal de document.
- Comparaison : sélecteurs A/B, mesure de fin de parcours, export, inspection d’un jour à la flèche clavier ; bloc de retour d’audience inspecté sur mobile.
- SQL réel isolé : retour entre périodes, nouveaux dans la fenêtre, un jour vs plusieurs jours, exclusion des anonymes et scoping IA testés en plus des cas initiaux.
- 911 tests PASS. TypeScript et compilation de production mis à jour : PASS. Smoke rejoué sur ce build local : `/stats` 200, API privée sans session 401/no-store, aperçu de démonstration 404. Aucun déploiement distant.
- Réserves de ce passage : accès aux données privées réelles et performance serveur non vérifiés. Aucune publication.

## Addendum du 1er octobre 2026

Le passage suivant ajoute les associations exposition–écoute, l’observation passive des passages musicaux et les affichages quotidiens posts/clips. Le réseau privé est redevenu accessible : requête réelle exécutée sur le compte propriétaire en lecture seule, avec mesure SQL et inspection de la production existante. Cela lève la réserve de compatibilité avec les données réelles, pas celle du parcours connecté complet ni des appareils physiques.

Les changements, calculs, réserves et preuves sont détaillés dans [Parcours produit et statistiques](product-journeys-hardening.md). Les indications précédentes d’absence de nouvelle collecte décrivent les versions antérieures de cette candidate. Aucun déploiement effectué.
