# Chambre Sonore — huit expériences produit

Candidate locale, sans commit ni déploiement. Cette passe répond à la demande de recomposition de Scroll/Live, Studio IA, Discover, Library, Abonnements, Paramètres, navigation et Publier. L’entrée Chambre et son prototype approuvés ne sont pas retouchés.

## Traitement par usage

| Espace | Recomposition |
|---|---|
| Scroll / Live | Pochette réelle dans une scène lumineuse, hiérarchie morceau/artiste, waveform existante, commandes regroupées ; prélude en station d’écoute avec pistes de découverte. |
| Navigation | Recherche et compte mieux séparés, destinations segmentées sur desktop, dock mobile et accès Créer conservés. |
| Discover | Choix d’écoute immédiats, une sélection éditoriale issue du catalogue réel, carte compacte de huit ambiances et sections différenciées. |
| Library | Recherche, reprise et cinq onglets comptés ; dossiers en pochettes, titres récents et vrais états vides. |
| Studio IA / IDE | Éditeur et action de génération persistante, coût réel visible, réglages secondaires repliables ; versions, écoute et inspection identifiables. |
| Abonnements | Pass distincts avec prix/quota réels, choix mensuel/annuel près des offres, comparaison sémantique. Suppression des badges promotionnels non vérifiés et affichage exact « Illimité ». |
| Paramètres | Section active immédiatement accessible, index mobile, champs et préférences regroupés, commandes nommées. |
| Publier | Bureau de sortie audio/clip/post, préparation et destinations existantes ; aucune publication automatique. |

Quatre feuilles de style ciblées, importées après les styles précédents. Effets décoratifs CSS, transitions finies, respect du mouvement réduit ; aucun nouveau canvas, moteur audio, abonnement de données ou dépendance. Ceci n’est pas une mesure comparative de performance.

## Préservation et tests

Les snapshots avant modification sont sous `artifacts/chambre-experience/before/`. Le worktree préexistant et les modifications natives sont conservés. Aucun staging.

Les nouveaux tests comparent les contrôleurs, événements, contrats de formulaires, routes, appels et conditions critiques avec les snapshots. Les contrôles historiques dépendant de l’ancienne composition JSX sont adaptés explicitement : trois nouveaux liens Publier, présentation Library, recomposition des deux pages Compte et quatre imports CSS. Les exceptions et tests négatifs sont détaillés dans `experience-creation.md`, `experience-collection.md` et `experience-account.md`. Aucun changement arbitraire des hashes historiques.

La revue indépendante et le navigateur ont identifié des défauts CSS corrigés :

- Rail Live tronqué en faible hauteur : disposition latérale et rail défilant, sans compression des boutons.
- Lien Connexion comprimé sur mobile : largeur libre pour les liens texte.
- L’ancien `translate: 0 0` persistant sur le wrapper de route changeait le repère du dock fixe : fondu sans déplacement. Le dock Library, auparavant à y=4191, revient à y=775–844 dans le viewport 390×844.
- La focalisation du bouton Pause puis la rotation pouvaient faire défiler la carte `overflow:hidden` elle-même : seul le conteneur de carte musicale est désormais `overflow:clip`, le feed et les textes gardent leur propre scroll. Carte à scrollTop=0 et scène à y=0 après correction.
- Le lecteur couvrait le coût et l’action IA : espace réservé sur desktop lorsqu’il est présent ; composer ouvert au-dessus du lecteur sur mobile et sous les vrais overlays. Le raccourci flottant File est masqué uniquement durant l’ouverture du composer, puis revient à la fermeture. Audio et file inchangés.

Ces cas disposent de tests de non-régression ciblés.

## Environnement de revue

Le serveur local connecté utilise le runner existant `artifacts/chambre-signature/connected-preview.mjs` et son tunnel SSH local. Les secrets restent en mémoire, pas dans les rapports ou captures. Aucun changement des fichiers d’environnement, de l’infrastructure ou de la production.

Les opérations d’achat, génération payante, publication, suppression et sauvegarde des réglages ne font pas partie de cette revue. L’application connectée peut émettre sa télémétrie habituelle de lecture ; elle n’est donc pas décrite comme un environnement DB strictement read-only. Les éventuelles actions effectuées par l’utilisateur dans ses propres onglets ne sont pas des scénarios de test de l’agent.

## Résultats intégrés

- Suite complète locale : **601/601 PASS**, zéro test ignoré (`artifacts/chambre-experience/tests.log`).
- TypeScript : **PASS**, rejoué après le build final. Build optimisé final après corrections visuelles : **PASS** (`artifacts/chambre-experience/build.log`), 93 pages statiques traitées. Avertissements existants : Browserslist ancien et route edge non pré-rendue ; aucune dépendance mise à jour hors périmètre.
- Revue connectée à 1440×900 et 390×844 : Live/prélude, Discover, Library, IA, IDE, abonnements, préférences et Publier. Pas de débordement horizontal du document observé dans les vues mesurées. Cela ne valide pas chaque modal/état ou un clavier OS réel.
- Library : ouverture réelle Récents, 40 morceaux, compteurs et dock vérifiés. Discover : vrai catalogue public et vraies pochettes. IA/IDE : deux versions existantes, aucun nouveau contenu créé.
- Abonnements : annuel → mensuel met à jour les prix affichés, sans checkout. Préférences : lecture seule, aucun switch ni bouton de sauvegarde activé. Publier : trois destinations exactes vérifiées dans le DOM, aucune soumission.
- IA : à 1440×900, footer de génération terminé à y≈791 et lecteur commencé à y≈799. À 390×844, footer jusqu’à y≈843 ; bouton Générer réellement au premier plan selon `elementFromPoint`. Ouverture/fermeture sans génération ; raccourci File rétabli à la fermeture.
- Live : lecture réelle puis pause explicite ; vague réelle et contrôles existants. Tests de contrôleurs inchangés et périmètre audio protégé, mais pas de nouveau comptage instrumenté des appels play/seek/queue.
- Navigation : Tab et Shift+Tab parcourus depuis la recherche, `:focus-visible` vérifié. Faible hauteur 844×390 : rail y=142–314, avant le dock y≈322 ; texte et rail restent défilants.
- Inventaire : **356 fichiers protégés**, zéro modification protégée inattendue ; seule l’ancienne exception de présentation `routeChrome` reste explicitement contrôlée. **163 fichiers scannés**, aucun secret détecté par l’heuristique. Ce n’est pas une garantie sur les changements utilisateur antérieurs.
- `git diff --check` : **PASS** ; index vide, aucun commit/push/déploiement.

Console : erreur de session attendue pendant l’arrêt volontaire du serveur ; un chargement `vendors.js` a échoué pendant les changements dev/HMR, résolu par rechargement normal de Settings. Aucun nouvel échec observé ensuite dans les vues parcourues. Avertissement Stripe HTTP local attendu. Ce constat ne prétend pas couvrir les erreurs historiques ni toutes les actions du produit.

Les **21 captures sélectionnées** sont dans `artifacts/chambre-experience/capture-review.json` et la galerie locale `review.html`. Seuls les clichés inspectés sont inclus ; les premiers essais mal cadrés restent hors galerie. La dernière capture Live 390×844 confirme scène y=0, hauteur=844, carte scrollTop=0 et lecture en pause. Le navigateur intégré n’a pas exécuté la galerie `file:` : restriction d’ouverture de fichiers respectée, aucun hébergement de contournement. Les captures du navigateur applicatif ont été inspectées individuellement.

L’aperçu connecté a été relancé après le build final, à `http://127.0.0.1:3000`. Les dimensions de revue forcées ont été réinitialisées. HEAD inchangé `d0ac45379227b4ad86042b6b8eb2156535f1b817`.

## Limites

Candidate à revoir créativement par l’utilisateur. Pas de certification de l’ensemble du site ni de recette transactionnelle complète. Android/Gboard réel, NVDA réel et performance production ne sont pas validés par cette passe. Les bugs externes historiques restent séparés. Aucun commit ni déploiement autorisé ou réalisé ici.
