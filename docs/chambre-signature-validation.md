# Synaura — Signature Chambre, continuation produit

Candidate locale du 13 septembre 2026. Mandat : prolonger la direction validée sur l’ensemble de l’expérience avec des compositions propres aux différents espaces. Ce rapport ne déclare pas la refonte complète clôturée.

## Mise en œuvre

- Navigation partagée : liseré lumineux, réponses au focus/survol et atlas Espaces avec sculpture de lignes. Les destinations, le contrôleur de fenêtre et les handoffs restent leurs propriétaires existants.
- Création : pupitre d’intentions, pochette de sortie, progression de publication, cartes de versions IA, repères des outils AI/IDE et dossier Upload. Détails dans `chambre-signature-creation.md`.
- Musique : recherche avec repère visuel et trois accès existants sans préchargement, profil/portrait et discographie, playlists organisées et albums comme objets éditoriaux. Détails dans `chambre-signature-music.md`.
- Personnel/social : clubs et derniers posts réels ou état vide, bibliothèque de pochettes, journal d’activité ; invitations invitées explicites. Détails dans `chambre-signature-personal.md`.
- Services : identité de la sidebar harmonisée, aide comme bureau d’écoute, raccourcis compacts, ressources et formulaire lisibles. Aucun champ, envoi, destination ou document légal modifié.

Les couches signature sont bornées à leurs composants. Pas de palette concurrente, moteur graphique plein écran supplémentaire ou animation audio simulée. La sculpture de l’atlas est purement décorative et déterministe, avec une arrivée finie. La communauté comporte une rotation décorative continue très lente (80 secondes par tour), en plus des réponses au survol ; reduced motion l’arrête explicitement. Ce choix n’est pas une mesure de consommation GPU sur téléphone réel.

## Préservation

Copies avant ce lot dans `artifacts/chambre-signature/before/`. Les anciennes copies et empreintes ne sont pas écrasées. L’entrée, son prototype, son asset approuvé, AudioCore, providers, API, base et contrôleurs restent protégés par l’inventaire SHA-256 historique. La seule exception ancienne est le cadrage de `/publish` déjà autorisé au passage précédent.

Les tests de création comparent tous les imports, 339 événements, 372 contrôles, 2 636 appels hors JSX et 101 constructeurs avec les copies antérieures. Les tests musique exécutent les vrais rendus Album/Playlist et gardent leurs ordres/index. Les tests personnels gardent les empreintes de comportement des trois pages.

Adaptations précises des anciens tests : l’import purement décoratif Support est isolé ; les trois nouveaux `prefetch={false}` des raccourcis Search sont vérifiés avec leurs destinations exactes et exclus uniquement de l’ancienne empreinte. La couche Discovery est bornée avant l’ajout CSS musique, sans remplacer sa baseline. Aucun assouplissement général des handlers ou contrats.

## Revue navigateur réalisée

- Espaces 1440×900 / 390×844 : composition, scroll interne, liens accessibles ; Tab depuis le dernier lien boucle vers Fermer, Échap ferme et restitue le focus au bouton Espaces (`aria-expanded=false`).
- Create : action primaire mobile y649–696, page de 390 sans overflow ; changement Une idée → Un son donne bien Importer un morceau vers `/upload`. Captures desktop/mobile.
- Publish : action primaire mobile y506–554, page de 390 sans overflow ; pochette après l’action et étapes accessibles au scroll. Captures desktop/mobile et guide mobile.
- Community : captures desktop/mobile et clubs mobile ; quatre cartes de largeur 346,4 dans 390. Les quatre compteurs locaux à zéro ne sont pas une certification des données de production.
- Support : ressources et formulaire revus desktop/mobile ; lien Support technique amène le formulaire sous la barre haute, champs de largeur 300,8 dans une surface de 342,4. Aucun message envoyé.
- Bibliothèque : vrai composant de revue en état invité, pas une session inventée. Largeur 390 sans débordement ; bouton Se connecter y726–774. La route canonique conserve ses redirections d’authentification.
- Notifications : état invité réel revu desktop/mobile ; aucun contenu ou abonnement fictif. La liste connectée et ses actions restent non testées dans le navigateur.
- Search : requête réelle « Sacré » → HTTP 200, zéro résultat local. Ce résultat n’atteste pas que le catalogue est vide : l’environnement local n’a pas de base configurée. Aucun résultat artificiel injecté.
- Sidebar services : repli réel à 72 px, wordmark masqué et symbole existant visible ; réouverture et largeur habituelle restaurées après l’essai.

19 captures dans `artifacts/chambre-signature/captures/` et galerie `artifacts/chambre-signature/review.html`. Une capture Bibliothèque provisoire d’une taille incorrecte a été remplacée par une capture 1440×900 après confirmation des dimensions réelles du nouvel onglet. Les viewports mobiles sont mesurés à 390×844 ; l’outil exporte ici leur PNG à 390×843 (arrondi natif d’un pixel), sans retouche. Les onglets de connexion utilisateur sont exclus des captures et des manipulations de revue. Les tailles temporaires ont été réinitialisées.

L’ouverture automatisée de la galerie `file://` a été refusée par la politique du navigateur. Aucun contournement par serveur, autre navigateur ou protocole n’a été tenté. Le fichier HTML est livré comme artefact local ; son affichage global n’est donc pas revendiqué comme vérifié dans le navigateur. Les captures qui le composent ont été contrôlées individuellement.

## Compte E2E : tentative autorisée par l’utilisateur

Les variables `SYNAURA_E2E_EMAIL` et `SYNAURA_E2E_PASSWORD` existent dans `.env.local`. Elles ont été lues uniquement pour remplir le formulaire local, sans être affichées, ajoutées au code, copiées dans ce rapport ou capturées. Une seule soumission du formulaire a été faite. Les champs ont ensuite été vidés.

Résultat : POST credentials **401** ; côté serveur, `[auth] echec de connexion PostgreSQL` et `DATABASE_URL est requise pour acceder a PostgreSQL`. `.env` et `.env.local` ne déclarent pas DATABASE_URL. L’écran affiche son message générique « Email ou mot de passe incorrect » : ce n’est pas une preuve que les identifiants fournis sont invalides. Aucun changement d’authentification, reset de mot de passe ou branchement à la production pour contourner ce problème.

## Réserves

Lors des 19 captures ci-dessus, aucune base n’était raccordée. Le raccordement réel décrit dans l’addendum suivant permet désormais la revue connectée ; il ne vaut pas validation complète des profils, playlists/albums peuplés, versions IA, génération/upload, notifications réelles et continuité audio de bout en bout. Aucun achat, publication, tirage ou suppression pendant la revue. Android/Gboard, NVDA et zoom OS/navigateur 200 % réels non testés. Reduced motion vérifié en source, pas revendiqué comme scénario OS exécuté.

## Addendum — accès connecté rétabli après autorisation explicite

13 septembre 2026 : l’utilisateur autorise explicitement le rétablissement du tunnel vers les données réelles de production pour l’aperçu local. Le problème était déjà documenté en Phase 4B.6 : l’ancien lancement injectait DATABASE_URL uniquement dans le processus ; une relance standard ne conservait pas cette configuration. Les sources d’authentification et PostgreSQL sont inchangées.

- SSH par clé, identité d’hôte vérifiée ; tunnel limité à `127.0.0.1:15433`. Serveur Next dev limité à `127.0.0.1:3000`. Prototype 3100 conservé intact.
- URL DB récupérée en mémoire et transmise uniquement au processus Next. Aucun changement de `.env`, `.env.local`, configuration distante, service distant ou schéma DB. Aucun déploiement.
- Lanceur local reproductible : `node artifacts/chambre-signature/connected-preview.mjs`, uniquement depuis le workspace et après arrêt du précédent serveur 3000. Il refuse des ports déjà occupés. Il ne contient aucun identifiant et arrête son propre arbre Next et son tunnel à la fermeture ; les journaux sont limités aux lignes opérationnelles, secrets connus et query strings masqués.
- Une connexion avec le compte E2E autorisé : POST credentials **200** (238 ms), session **200**, arrivée sur `/live`. Aucun identifiant affiché ou capturé. La connexion standard actualise les métadonnées de connexion ; Live a également envoyé son impression automatique (**200**). Ce raccordement n’est donc pas présenté comme une session DB strictement read-only.
- Route canonique `/library` **200**, vrai menu de compte, collections et reprise d’écoute visibles, **40 récents** ; `/api/tracks`, `/api/playlists`, `/api/user/preferences`, `/api/notifications` et session **200**. Aucun Play, achat, création, édition, publication ou suppression déclenché par la revue.
- L’ancien onglet conservait un runtime de développement antérieur à la relance : deux erreurs webpack/RSC ont précédé la navigation complète de récupération. Après celle-ci, connexion et bibliothèque fonctionnent ; aucune erreur supplémentaire dans le relevé console de ce parcours. Aucune modification du code applicatif pour contourner le chargement. Le nouvel onglet de test resté sur l’attente n’est pas utilisé comme preuve de connexion.
- Session laissée ouverte dans l’aperçu local. Les 19 captures antérieures restent des preuves de leur état invité, pas des captures rétroactivement déclarées authentifiées. Les autres parcours connectés restent à revoir.

## Gate global

- Suite complète **533 tests PASS**, 0 échec, 0 skip (`artifacts/chambre-signature/test-suite.log`). Ce total comprend des tests importés par les suites additionnelles, pas 533 scénarios navigateur indépendants.
- `git diff --check` **PASS**, index vide, HEAD inchangé `d0ac45379227b4ad86042b6b8eb2156535f1b817`.
- Inventaire : 103 routes, 109 sources de présentation différentes des copies du chantier ; 356 fichiers protégés, aucune différence inattendue ; unique exception `/publish` antérieure toujours vérifiée.
- Scan heuristique sur 146 fichiers recensés : aucune alerte. Ce scan n’est pas une certification des fichiers historiques/utilisateur hors périmètre.
- Revue source indépendante de la fondation : aucun défaut confirmé, avec limites de QA physique et performances mesurées explicites.
- Build de production **PASS** (exit 0, `artifacts/chambre-signature/build.log`) ; type-check séparé **PASS** (exit 0, `artifacts/chambre-signature/type-check.log`). Le serveur dev a été arrêté pendant le build puis relancé, sans toucher au prototype sur 3100.
- Smoke du build avec `next start` sur le port local 3010 : `/`, `/create`, `/publish`, `/support`, `/search`, `/community`, `/notifications` **HTTP 200** ; `/dev/v2` et `/dev/v2/rewards` **HTTP 404** attendu en mode production. Le journal de ce smoke HTTP ne contient aucune erreur (`artifacts/chambre-signature/production-local.log`). Ce contrôle serveur ne certifie ni les données connectées ni l’absence d’erreur console dans tous les parcours. Le serveur temporaire 3010 a ensuite été arrêté.
- Aucun staging, commit, push, tag ou déploiement. La production distante n’a pas été modifiée ni présentée comme validée par ce smoke local.
