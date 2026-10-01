# Parcours produit et statistiques — candidate locale

1er octobre 2026. Aucun commit, push, déploiement, migration ou changement d’infrastructure dans ce passage. Modifications préexistantes, notamment natives, conservées hors staging.

## Livré

### Statistiques

- Expositions musicales par surface puis associations affichage–écoute : même compte et même morceau, dans les 30 minutes et dans la période sélectionnée. Déduplication par surface/compte/morceau. Une écoute peut être associée à plusieurs surfaces : ni attribution causale ni taux de conversion global. Anonymes exclus de l’association.
- Partages et ajouts à une playlist signalés par les événements existants, pas des destinataires atteints ou des ajouts encore actifs.
- Observation passive du lecteur musical web : identifiant de mesure, progression contiguë dans vingt tranches de 5 %, déduplication des passages au sein d’une écoute. Seeks natifs, pauses, changements de vitesse et trous d’observation invalident l’intervalle. Commandes AudioCore, queue et éléments audio inchangés.
- Une tranche est comptée après une seconde de contenu observée, ou la moitié d’une tranche pour un morceau court. À vitesse accélérée : temps de contenu, pas temps mural. Minimum cinq départs instrumentés pour la courbe. Collecte indicative, non antifraude, sans reconstruction historique. Une répétition conservant la même génération AudioCore reste dans la même mesure. Fermeture brutale, événement perdu, arrière-plan et frontière de période peuvent réduire la couverture.
- Affichages quotidiens des posts et clips du créateur, indépendants du filtre musical. Ce ne sont pas des vues vidéo, des uniques ou une rétention vidéo.
- Une requête agrégée paramétrée, bornée en dates et limitée au créateur connecté. Aucune identité d’auditeur transmise à la page. Les recommandations PostgreSQL ont guidé le regroupement côté serveur et la vérification sur le schéma réel ; aucune table ni aucun index ajouté.

Fichiers principaux : `lib/creatorAnalytics/{model,query}.ts`, `lib/playbackMeasurement.ts`, `hooks/useAudioService.ts`, `components/analytics/AnalyticsEvidence.tsx` et interface Stats existante.

### Reprise après interruption

- Brouillons texte Studio IA et nouveau post Community, séparés par compte/formulaire. `sessionStorage`, expiration sept jours, restauration explicite sans écraser silencieusement la saisie. Retour dans le formulaire et rechargement dans le même onglet ; effacement après succès, erreur de stockage visible.
- Aucun fichier joint, son source, secret, paiement ou projet complet sauvegardé. Pas de synchronisation entre appareils ni garantie après fermeture de l’onglet. Pièces jointes à sélectionner à nouveau.
- Suivi IA : après épuisement des tentatives de lecture du statut, reprise de la tâche existante sans nouvelle génération payante. Anciennes réponses/minuteries ignorées au changement de compte. Une indisponibilité du stockage local ne doit pas interrompre un travail déjà démarré.
- Upload vidéo : annulation préalable empêche le transfert. Suppression du second POST média automatique après erreur réseau ambiguë ; essai manuel seulement, avec avertissement de conserver l’onglet et sur le redémarrage possible du transfert entier. Pas d’upload multipart reprenable ni de garantie d’idempotence d’un nouvel essai après perte de la réponse serveur.

### Recommandations et abonnement

- Options d’un morceau : davantage/moins de ce style, masquer l’artiste via le contrat existant ; pas de requête sur une carte inactive ni d’action audio pour voter.
- Préférences : artistes masqués nommés, rétablissement individuel, erreur/nouvelle tentative. Noms chargés en une requête groupée, réponse privée non mise en cache. Ces actions orientent les prochaines recommandations ; elles ne remplacent pas la queue et n’effacent pas immédiatement tous les éléments préchargés.
- Retour du paiement : fini le statut « actif » arbitraire. Vérification réussie + abonnement actif/en essai requis ; sinon revérification sans nouvel achat.
- Défaut de sécurité corrigé : avant mise à jour du profil, Checkout de type abonnement et `subscription.metadata.userId` identique au compte connecté requis. Une session étrangère ou sans rattachement est refusée. La création existante renseigne cette métadonnée ; une ancienne session sans celle-ci échouera de façon fermée.
- Aucun paiement, changement de formule ou crédit consommé pendant les essais.

## Vérifications locales

- **919/919 tests PASS**, dont huit dédiés à ce passage. Anciennes empreintes conservées ; différences fonctionnelles exactes revues projetées dans `tests/helpers/product-journeys-reviewed.json`, sans remplacer les hashes historiques.
- Exécutés : progrès normal, seeks longs/courts, pause, vitesse, identité, données invalides ; isolement/expiration du brouillon ; confirmation fermée par défaut et Checkout étranger refusé sans écriture ; annulation avant XHR. Certaines protections de reprise IA/upload sont contrôlées statiquement : pas une panne fournisseur réelle.
- SQL réel isolé/PGlite sur tables extraites de la baseline : associations, doublons, anonymes, propriété, séparation IA/classique, tranches dédupliquées, valeurs invalides, expositions sociales et cas historiques de Stats. PASS.
- Navigateur : restauration explicite après rechargement, A/B sans migration de texte ; desktop 1440×900 et mobile simulé 390×844, document de 390 px sans débordement. Aucun log console de niveau erreur capturé sur l’onglet de revue au contrôle. Captures : `artifacts/product-journeys/`. Démonstration explicitement marquée, jamais substituée aux statistiques privées.
- TypeScript, compilation et scan final : PASS, bilan ci-dessous.

## Vraies données : lecture seule

Accès privé rétabli après confirmation utilisateur. SSH canonique, tunnel temporaire loopback, identifiants uniquement en mémoire. Transaction `READ ONLY`, rôle applicatif non superuser, timeout 10 secondes. Script : `scripts/product-journeys-readonly.mjs`.

Compte propriétaire @ximamoff : 342 morceaux. Exécutions isolées :

| Période | Départs enregistrés | Auditeurs identifiés | Temps observé |
| --- | ---: | ---: | ---: |
| 7 jours | 127 | 4 | 365 ms |
| 28 jours | 604 | 4 | 719 ms |
| 90 jours | 2 878 | 10 | 1 824 ms |

`EXPLAIN (ANALYZE, BUFFERS)` supplémentaire sur 28 jours : planification 9,733 ms, exécution 1 585,662 ms, 522 blocs partagés trouvés en cache, aucun lu sur disque à la racine du plan. Ce ne sont pas des mesures p50/p95 ; charge/cache variables. Zéro écoute instrumentée attendu : candidate non déployée.

État distant consulté sans relancer de service : `current` = `last-successful-sha` = `ed8287dcd1cfb6e1c344a74dee7bfb4cf60ba130`. Service actif/running, zéro redémarrage, dernier health systemd réussi, `/healthz` 200. Racine 49 %, SSD média 7 %. Sur la dernière heure : zéro `PG_ERROR`, `Relation PostgreSQL introuvable`, `QueryError`, `unhandledRejection`, `uncaughtException`. Cela concerne la version existante, pas la candidate.

## Réserves explicites

- **Android/Gboard réel NON TESTÉ** : l’utilisateur le fera après un futur déploiement. Clavier multiligne, timestamp/retrait, scroll, fermeture, lecture écran verrouillé/arrière-plan et retour à essayer.
- **Lecteur d’écran réel NON TESTÉ**. DOM/clavier ne valent pas NVDA/TalkBack.
- Calculs privés exécutés directement en lecture seule ; parcours Stats connecté rejoué avec `test2`, en complément de la démonstration et des agrégats réels de @ximamoff. Voir le contrôle de session ci-dessous.
- Paiement réel, génération facturée, interruption d’upload SSD et persistance des préférences sur un vrai compte non rejoués. Aucun contenu utilisateur créé/supprimé pour prétendre les valider.
- Rétention vidéo, relectures exactes indépendantes, attribution causale affichage→abonnement et reprise de fichier après fermeture non implémentées : contrats complémentaires nécessaires.
- Réponse sur le réseau ≠ autorisation de publication. Candidate pour revue, aucune certification globale de tous les parcours Synaura.

## Bilan final

- `npm run type-check` : PASS, rejoué après les dernières corrections de mesure.
- `npm run build` : PASS, 101 pages statiques générées. Avertissements existants : Browserslist ancien et runtime edge excluant une génération statique. Pas de mise à jour de dépendances opportuniste.
- `next start`, build local sur loopback : `/stats` 200 (coquille, pas une validation connectée), `/api/stats/creator` 401 sans session avec `private, no-store`, `/api/recommendations/taste` 401 sans session, `/dev/stats` 404, `/subscriptions/success` 200.
- Le premier contrôle du retour d’abonnement était resté sur « Synaura te reconnaît… ». Le problème a depuis été reproduit et corrigé : voir le contrôle de session ci-dessous. La réponse 200 sans utilisateur observée initialement provenait d’un appel sans cookie et ne permettait pas de conclure à l’état de la session du navigateur.
- `node scripts/product-journeys-review.mjs` : 47 fichiers examinés, zéro signature de secret ou valeur d’environnement sensible détectée, `git diff --check` PASS, staging vide. Scan heuristique de cette candidate uniquement, pas garantie sur tout l’historique du dépôt.
- Tunnel de lecture seule fermé, serveur de test production local arrêté. Aucun service distant relancé ni modification de production. Aperçu de développement rétabli pour revue.
- Décision du premier passage : candidate locale vérifiée sur ces périmètres, pas une validation complète de publication. La réserve de session est traitée ci-dessous ; les mutations réelles encadrées et réserves physiques restent explicites.

## Session et parcours connectés

Contrôle complémentaire du 1er octobre 2026, autorisé après le bilan précédent. Toujours aucun commit, push ou déploiement.

### Cause et correction

Le callback NextAuth peut conserver une session reconnue lorsque la lecture de son profil échoue, mais sans `session.user.id`. `OnboardingGate` attendait alors indéfiniment. Reproduction dans le navigateur avec le cookie existant de `test2`, en retirant uniquement la connexion DB du serveur local ; aucune interruption du serveur distant. Le même état a été reproduit par exécution isolée du vrai callback d’authentification.

Le contrôle de session affiche maintenant une récupération explicite pour un profil non résolu. Une session en attente ou une lecture des préférences qui ne termine pas atteint le même écran au bout de 15 secondes. Erreur HTTP et réponse invalide ne débloquent pas le contenu privé. Les requêtes de préférences sont annulées au démontage/changement de compte et les réponses obsolètes ignorées. Les exceptions de routes publiques et le retour vers l’onboarding avec les paramètres de paiement sont conservés.

« Recharger et réessayer » recharge explicitement la page courante, sans achat, modification de cookie ou déconnexion forcée. Le scénario panne locale → écran de récupération → base reconnectée → même compte et page d’abonnement fonctionnelle a été exécuté. Captures dans `artifacts/session-validation/`.

### Essais sur le compte test2

| Parcours | Vérification réalisée |
| --- | --- |
| Retour d’abonnement | Plan Free, activation non confirmée ; bouton de revérification conserve cet état. Aucun Checkout soumis, aucun achat. |
| Statistiques réelles | Quatre morceaux IA privés, périodes 28/90 jours, onglet Contenus, recherche locale « QA privée » donnant deux résultats ; API privée 200, absence de chiffres inventés lorsque les événements sont absents. |
| Community | Saisie multiligne, rechargement, proposition explicite de restauration, titre/texte restaurés à l’identique puis remise à l’état initial. Aucun post envoyé. |
| Studio | Titre/direction/paroles multiligne restaurés après rechargement puis retirés ; quatre morceaux existants, V6 Mini pour Free, solde inchangé à 26 crédits. Aucun bouton de génération ou d’écriture IA utilisé. |
| Préférences | Liste des artistes masqués réellement chargée, vide sur ce compte, API 200. Aucun vote artificiel ni masquage ajouté pour provoquer un test. |
| Suivi IA | Pas de tâche réellement bloquée disponible sur le compte. Cinq tests exécutent le vrai hook avec réseau et stockage simulés : reprise du même identifiant, double clic, huit échecs, réponse tardive après changement de compte, stockage indisponible. Aucune requête fournisseur réelle. |

Les formulaires étaient vides avant l’essai, sans ancien brouillon proposé ; seules les saisies de validation créées ici ont été retirées. Le Studio conserve son fonctionnement existant de sauvegarde automatique des préférences d’interface : des `PATCH /api/user/preferences` du compte E2E ont eu lieu à son ouverture. Ce parcours n’est donc pas décrit comme intégralement en lecture seule, contrairement aux vérifications SQL précédentes. Aucun contenu publié, crédit débité ou goût de recommandation artificiel ajouté.

L’endpoint administratif `/api/suno/credits`, sollicité par le Studio existant, répond 403 pour ce compte non administrateur ; le quota utilisateur et le solde affiché répondent normalement. Ce n’est pas présenté comme une génération fournisseur validée ni comme une console globalement sans erreurs réseau.

### Contrôles du correctif

Huit nouveaux tests exécutent le contrôle de session et son callback : profil absent, attente bornée, erreur/JSON invalide, réponse tardive après timeout, récupération, changement de compte, nettoyage et préservation des frontières publiques/privées. Les cinq tests de suivi IA sont exécutables et non seulement des assertions sur le texte du code.

- Suite finale : **932/932 PASS**, zéro échec, annulation ou test ignoré.
- `npm run type-check` : PASS après compilation. `npm run build` : PASS, 101 pages statiques ; mêmes avertissements Browserslist/runtime edge que précédemment.
- Build production local connecté, lancé avec `next start` via le lanceur existant : même session reconnue, abonnement Free/non confirmé, revérification sans achat ; Stats affiche les quatre morceaux réels du compte. Aucun déploiement distant.
- Sans session : API Stats 401 avec `private, no-store`, préférences de recommandation 401, `/dev/stats` 404 ; coquilles `/stats` et `/subscriptions/success` 200. Aucune donnée privée déduite d'une réponse de coquille.
- Aucun nouveau log console d'erreur capturé pendant ce smoke abonnement/Stats. Le journal de l'onglet conservait une erreur NextAuth antérieure, à l'arrêt volontaire du serveur local ; les 403 administratifs du Studio restent signalés ci-dessus.
- Capture responsive supplémentaire : aucun débordement du document à **488 px CSS effectivement mesurés**. L'override demandé de 390 px n'a pas donné un viewport CSS de 390 px dans cette session ; ce contrôle n'est donc pas une validation 390 px ni un essai physique. Override retiré ensuite. Captures : `artifacts/session-validation/`.
- Scan final : 50 fichiers du périmètre, aucune signature de secret ni valeur sensible d'environnement détectée ; `git diff --check` PASS, staging vide. Modifications préexistantes conservées. Scan ciblé et heuristique, pas une certification de tout le dépôt.

Serveur de production local arrêté ; aperçu de développement connecté rétabli sur `http://127.0.0.1:3000`. Son tunnel temporaire loopback reste nécessaire à la revue sur les vraies données ; aucune configuration distante modifiée. Aucun commit, push ou déploiement. Les limites Android/lecteur d'écran physique, paiement réel, génération fournisseur et reprise d'upload SSD restent ouvertes ; le blocage de session est corrigé et vérifié sur le périmètre décrit.
