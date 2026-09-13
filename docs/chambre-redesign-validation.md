# Synaura — refonte complète La Chambre Sonore

> **REOPENED — REFONTE INCOMPLÈTE.** La revue utilisateur a rejeté l’état de livraison ci-dessous. Ce rapport décrit le premier passage, pas une validation du produit. La reprise et les vrais manques sont suivis dans `chambre-redesign-resumption.md` ; les résultats de build/tests ci-dessous ne prouvent pas l’aboutissement visuel ou fonctionnel.

Candidate locale, 13 septembre 2026. Aucun commit, staging, push ou déploiement autorisé/exécuté dans ce chantier. La production n’a pas été utilisée comme environnement de test.

## Direction conservée

L’entrée approuvée reste le point de référence : noir profond, matière argent/cobalt, typographie sans empattement resserrée, lumière et mouvements maîtrisés. Les cinq chapitres présentent Synaura avant la salle d’écoute. Les fichiers de `components/chamber/` et du prototype autonome sont surveillés par hash et ne sont pas édités. L’accueil public `/` et son alias `/landing` réutilisent exactement ce composant ; l’aiguillage serveur des membres vers Live/onboarding reste intact.

Un accès public « Entrer » est ajouté autour de la scène, uniquement sur l’accueil et son alias. Il mène au choix connexion/inscription existant. La bulle globale de queue est masquée sur `/landing` pour ne pas doubler le transport de la Chambre. L’aperçu approuvé `/dev/chambre` reste inchangé.

L’interface d’usage ne devient pas un diaporama : listes, conversations, outils et formulaires conservent leurs scrolls, actions et états. Les photographies/pochettes sont celles des contenus ; la membrane n’est pas une fausse donnée musicale.

## Couverture et accès fonctionnels

Le registre [chambre-redesign-route-coverage.md](chambre-redesign-route-coverage.md) inventorie chaque route, sans confondre inventaire, recomposition, revue visuelle et validation connectée. Les rapports de domaine donnent le détail des fonctions et fichiers :

- [Musique et contextes](chambre-music-redesign.md) : Live, Discovery, Radar, Track, Profile, Album, Playlist, players, Comments/Moments, Profile Peek, Actions, Queue, Lyrics, Details, Share, Playlist Picker, sélections historiques.
- [Création](chambre-creation-redesign.md) : intentions, AI Generator, vraie bibliothèque AI, Studio IDE, variation, upload, publication, Clip, inspecteur et approbations.
- [Personnel/social/services](chambre-personal-redesign.md) : bibliothèque, recherche, messages, notifications, Community, posts, City, défis, réglages, statistiques, abonnements, boosters, compte/onboarding, support, légal, téléchargements et partenariats.

| Parcours | Accès conservés dans la candidate |
|---|---|
| Écouter / retrouver | Nav principale Live, Découvrir, Bibliothèque, Profil ; titres et commandes de lecture explicites |
| Créer | Menu et hub : AI, import audio, Clip, post, variation, Studio ; source et défi transmis par les handoffs existants |
| Organiser / inspecter | File, playlist, paroles, détails et partage restent dans leurs surfaces canoniques |
| Rencontrer | Profil auteur, follow, Comments/Moments, Messages, Notifications, Community/FAQ/forum, City/événements |
| Compte / outils secondaires | Menu compte : profil, bibliothèque AI, statistiques, boosters, City, paramètres, abonnement, aide et déconnexion |
| Administration | Les sept destinations et leurs guards sont conservés ; cadre et navigation adaptés, autorisations inchangées |
| Routes historiques | `/feed` reste un prototype technique ; Météo et Star Academy gardent leurs fonctions et identité historique, sans refonte métier |
| Documents / aliases | Aucun texte juridique réécrit ; `/contact`, `/requests`, `/enter/continue` gardent leur rôle de redirection |

`/studio/library` demeure une démonstration historique annoncée, non persistante. La bibliothèque utilisateur réelle est `/ai-library`. Aucune fonction n’est supprimée pour faciliter la refonte. Les applications natives et leurs modifications utilisateur sont hors périmètre.

## Préservation

Chaque fichier existant touché a une copie de son état local précédent dans `artifacts/chambre-full-redesign/before/`. Ces copies incluent les modifications utilisateur et les travaux V2 antérieurs ; elles ne correspondent pas simplement à HEAD. `inventory.json` attribue les changements de ce chantier par comparaison de hashes.

Le contrôle surveille 356 fichiers API, database, audio, providers, middleware, controller, route chrome, dépendances et scènes approuvées. L’égalité des fichiers protégés est contrôlée séparément des tests UI. Les comparaisons AST de domaine vérifient handlers, effets et appels métier contre les copies locales ; voir l’exception ciblée ci-dessous.

L’exclusion `artifacts/**/*` du compilateur évite de traiter les copies de sauvegarde comme de nouvelles sources de l’application. Aucune source applicative n’est exclue pour masquer une erreur de type.

## Bugs réellement observés et corrections limitées

1. Entrée publique : accès direct au compte manquant lors de sa promotion vers `/` ; accès `/enter` rétabli sans modifier la scène.
2. Ancien alias `/landing` : risque de seconde commande de file lorsque la queue existe ; visibilité harmonisée avec l’accueil.
3. Anciennes règles globales : annulation forcée de tout espacement typographique et halos mauve/corail prioritaires sur les tokens ; ces règles ne s’appliquent plus à la candidate Chambre. Les anciens thèmes hors Chambre sont préservés.
4. Grand lecteur : loader infini observé après lecture réelle puis ouverture, en développement StrictMode. La requête abandonnée gardait une clé empêchant son replay. Correction limitée au propriétaire de chargement du lecteur : libération de la seule clé inachevée appartenant à la requête courante. Pas de modification AudioCore, endpoint, logique d’alignement ou contrôle de lecture. Tests exécutant le véritable callback et reducer, avec réponses différées ; exception AST précise documentée dans le rapport musical.
5. Chevron de fermeture des commentaires du lecteur : bouton sans nom observé dans l’arbre accessible ; ajout du seul nom « Réduire les commentaires », sans changement du handler.
6. Contrastes hérités sur cinq badges/contrôles : le blanc sur les nouveaux accents clairs était insuffisant. Les trois contrôles de messagerie, le compteur de navigation et le badge du menu mobile utilisent le fond de bouton existant `--v2-accent-fill` (5,31:1 avec le blanc). Aucun handler ni layout modifié. Le nom accessible du contrôle mobile « Connexion » correspond maintenant au texte affiché hors session.

## Environnement et réserves non maquillées

La base de données locale n’est pas connectée. Le serveur confirme explicitement `DATABASE_URL est requise pour acceder a PostgreSQL`. Le catalogue public peut être servi depuis le cache Next préexistant et contenir de vrais morceaux, auteurs et médias ; cela ne prouve pas une connexion DB. La route canonique `/discover` a effectivement montré son écran d’erreur serveur. Les détails Profile/Track, commentaires et waveform répondent 404 dans cet environnement. Les événements d’écoute ont été tentés automatiquement par le parcours réel mais ont échoué localement (500/PG_ERROR pour cette configuration manquante) ; aucun contenu n’a été publié ou modifié par ces essais.

Le laboratoire `/dev/v2` monte des composants réels avec le catalogue public éventuellement en cache. Il n’injecte ni compte ni session et conserve une bannière explicite. Pour Discovery, le même échantillon est utilisé dans plusieurs sections de revue : les classements, recommandations et ambiances ne sont pas validés par ces captures. Les deux labs `/dev/v2` et `/dev/chambre` restent désactivés en build production.

Restent à valider avec environnement isolé et compte autorisé : identité/permissions réelles, données privées, Profile Peek peuplé, Comments/Moments et mutations/modération, likes/follow, messagerie, notifications, playlists, upload/Clip SSD, générations/approbations, paiement, parcours complets Live/Back/queue et historique. Aucune écriture métier, génération payante, transaction, publication ou suppression n’a été réalisée pour produire les captures.

Android/Gboard réel : NON TESTÉ. NVDA réel : NON TESTÉ. Zoom navigateur réel 200 % : NON TESTÉ ; ne pas confondre avec une réduction de viewport. Revue visuelle globale par l’utilisateur encore nécessaire avant checkpoint ou déploiement.

## Résultats centralisés

Les preuves brutes sont conservées dans `artifacts/chambre-full-redesign/` ; aucun ancien résultat V2 n’est présenté comme preuve de la direction Chambre.

- Suite complète : **413 PASS, 0 FAIL, 0 SKIP** (`test-suite.log`), incluant les tests de chargement réel extrait du player et l’audit des handlers. Il s’agit des suites locales de contrats/modèles/sources, pas de 413 scénarios E2E connectés.
- Type-check : **PASS** (`type-check.log`).
- `git diff --check` : **PASS** ; index Git vide.
- Scan heuristique de 111 fichiers de présentation, tests, scripts et rapports de ce chantier : aucune clé/secret détecté. Ce n’est pas une certification de tout l’historique ni des modifications utilisateur préexistantes.
- Hashes des 356 fichiers protégés : inchangés au contrôle centralisé.
- Build final : **PASS** (`build.log`), compilation/lint/types et 92/92 pages statiques générées. Avertissements non bloquants conservés : données Browserslist anciennes et page utilisant le runtime edge non statique. Aucune dépendance mise à jour pour masquer ces avertissements.
- Smoke du build final lancé localement avec `next start` : `/`, `/enter`, `/landing`, `/create` et la membrane retournent **200** ; `/dev/v2` et `/dev/chambre` retournent **404** comme prévu (`public-build-smoke.json`). Ce smoke public ne rend pas les logs DB sains : les revalidations connectées restent impossibles sans configuration locale.

### Revue navigateur réellement effectuée

| Surface | Preuve et limite |
|---|---|
| Entrée `/` | Cinq chapitres et salle d’écoute présents, scène réutilisée inchangée ; 1440 et 390 sans overflow horizontal ; accès « Entrer » sans chevauchement et arrivée réelle sur le choix connexion/inscription |
| `/enter`, connexion | Formulaires et liens réels ; desktop 1440 et mobile 390, Tab email → mot de passe et Shift+Tab inverse, focus visible |
| `/create` | Desktop 1440/mobile 390 ; les quatre intentions restent sélectionnables, collab/feedback/remix changent vers leurs liens existants |
| Découvrir | **Composant lab**, catalogue réel en cache ; 1440/390 sans overflow, ambiances et actions présentes ; SSR canonique non validé |
| Track | **Composant lab** avec identité/media réels de Sacré Charlemagne ; 1440/390 sans overflow ; route canonique/données DB non validées |
| Grand lecteur | Lecture explicite réelle, loader reproduit puis résolu après correction ; captures 1440/390 ; fermeture/réouverture garde le même titre, position observée de 0:46 à 1:45 sans remise à zéro visible |
| Commentaires du grand lecteur | Ouverture/fermeture UI sans interruption apparente ; vrai chargement des commentaires indisponible (DB locale), aucune mutation envoyée |
| `/community` | Cadre et quatre clubs avec accès forum/City/FAQ/posts/partenariats ; captures 1440/390, aucune prétention de valider les compteurs vides sans DB |
| `/search` | Champ de recherche et contrôle accessible sur mobile 390 ; résultats connectés non validés |
| `/publish` | Étapes, autorisations et destinations existantes revues ; aucun upload/publication déclenché |
| Live lab | État vide/erreur local observé ; **pas** de validation visuelle du feed peuplé ou de ses handoffs dans cet environnement |

Les captures sont des contrôles d’interface, pas des benchmarks GPU/FPS, ni des tests téléphone réel. Les composants/requêtes en erreur ne sont pas déclarés sains artificiellement.

## État de livraison

**Candidate locale implémentée — revue visuelle utilisateur et QA connectée encore requises.** 98 fichiers existants ont été adaptés dans ce chantier, avec ajouts de wrapper, tests et documentation. Les 102 routes inventoriées ne sont pas présentées comme 102 écrans intégralement recomposés et testés : les outils techniques, services historiques et outils administratifs conservent le traitement décrit dans le registre.

La galerie `artifacts/chambre-full-redesign/review.html` réunit les captures de cette direction. Le laboratoire `/dev/v2` permet de parcourir les composants et donne aussi les liens vers les routes réelles ; il ne remplace pas leur validation serveur.

HEAD reste `d0ac45379227b4ad86042b6b8eb2156535f1b817`. Index vide, aucun commit/tag/push/déploiement. Les changements antérieurs, notamment natifs, sont conservés sans être attribués à cette refonte. Aucun prochain chantier n’est lancé automatiquement.
