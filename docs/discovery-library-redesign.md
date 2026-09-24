# Découvrir — bibliothèque d’exploration

Candidate locale du 24 septembre 2026. Aucun commit, push ni déploiement dans cette tâche.

Publication autorisée le 24 septembre : livrer cette bibliothèque **avec** les correctifs Live/Studio du rapport `fixes/live-scroll-studio-player.md`. Les autres modifications natives et documentaires préexistantes restent hors livraison. Le contenu exact de l'index est exporté et retesté avant push ; le résultat de bascule est consigné dans le rapport opérateur `artifacts/release-discovery-20260924/` pour éviter une seconde livraison uniquement documentaire.

## Périmètre

La route publique `/discover` et son alias de prévisualisation utilisent maintenant une même bibliothèque. La navigation partagée, AudioCore, Live, le Studio, les endpoints et le schéma de données ne sont pas modifiés par cette refonte. Les corrections Live/Studio déjà présentes dans le répertoire de travail sont conservées, de même que les autres modifications préexistantes.

## Expérience

- Accueil éditorial avec vraies pochettes, sélection du morceau à la une et lecture volontaire.
- Six entrées : exploration, sons, nouveautés, artistes, posts, playlists.
- Huit ambiances existantes, sélection du moment, dernières sorties, artistes, publications, playlists et pépites.
- Recherche réelle par type de contenu ; genre, classement récent/populaire/pépites ; vue grille ou liste.
- Pagination réelle des sons et artistes, curseurs des posts, dédoublonnage et fin de sélection explicite. Après une première demande, trois pages au maximum peuvent se charger automatiquement à l’approche du bas ; une nouvelle action relance ce budget. Le pied de page reste accessible.
- Profils, commentaires et options utilisent les panneaux partagés existants. Les publications conservent leur image et la pochette du morceau associé.
- Halo, lumière lente, particules peu nombreuses, parallaxe à la souris et micro-animations. Pause globale, préférence de mouvement réduit, mise en pause du décor hors écran et pochettes animées seulement au survol/focus ou en lecture.
- Une seule zone de défilement vertical. Catégories horizontalement accessibles sur mobile, grilles adaptatives, marges pour la navigation, le lecteur et la safe area.

## Données et coûts

APIs existantes exclusivement : `/api/discover`, `/api/discover/moods`, `/api/search`, `/api/posts`, `/api/playlists/popular`.

Cache isolé par compte, fraîcheur cinq minutes, conservation quinze minutes, pas de rechargement à chaque focus, requêtes annulables. Nouveautés/posts/playlists de l’accueil sont montés à l’approche de leur section. Aucune requête métier par carte inactive, aucun polling ajouté. Les notifications globales continuent leur fonctionnement préexistant.

Les résultats sont réels et finis, sans répétition artificielle : l’API de recherche expose jusqu’à 48 résultats par catégorie, les ambiances jusqu’à 60 sons, et la sélection de playlists jusqu’à 50 entrées. Ces endpoints n’ont pas de curseur ; la candidate n’en invente pas. La pagination du catalogue respecte les indicateurs serveur et le corpus public réellement fourni, pas une promesse de contenu infini.

Les compteurs de playlist absents ou retournés à zéro par les anciennes listes ne sont pas présentés comme une preuve de playlist vide. Les anciennes métadonnées éditoriales intégrées aux descriptions sont retirées de l’affichage.

## Validation

Tests automatisés dédiés : URL et composition de gestes rapides, pagination sons/artistes, curseurs stagnants, dédoublonnage, médias de posts, URLs de playlists, métadonnées héritées, lecture/queue explicite, cache/session/annulation, erreur récupérable, budget de chargement et styles accessibles.

Les résultats finaux du build et des contrôles navigateur sont consignés ci-dessous après exécution. Les vérifications navigateur utilisent le compte E2E existant et les contenus réels ; elles ne créent ni publication, commentaire, like ni génération IA.

### Contrôles exécutés

- Suite : 775 tests PASS, dont 13 spécifiques à cette bibliothèque. Les tests de non-régression du pilot conservent les mêmes assertions sur le cache et l’isolation de la route.
- TypeScript et build de production local final : PASS, y compris après les ajustements de lisibilité mobile. La suite finale reste à 775 tests PASS.
- Navigateur, build local optimisé : lecture explicite d’un morceau, progression visible du curseur, changement vers Nouveautés sans changement de morceau ; pause explicite à la fin du test.
- Pagination réelle vérifiée : 24 puis 48 morceaux, 48 identifiants distincts. Pas de recyclage artificiel des cartes.
- Recherche « Synaura » : résultats de sons, artiste et playlists ; aucune métadonnée éditoriale brute à l’écran. Recherche inexistante : état vide et retour à l’exploration fonctionnels.
- Ambiance Nuit & nostalgie : neuf morceaux retournés lors du contrôle, pas de contenu fabriqué.
- Profils : ouverture/fermeture du Profile Peek avec les données réelles. Posts : images/pochettes visibles et ouverture du panneau Conversation existant, sans publication de commentaire.
- Formats contrôlés dans le navigateur : 1440×900, 768×1024, 390×844. Largeur du document égale à celle du viewport à chaque format, aucun débordement horizontal de page. Le mobile est une simulation de viewport, pas un test sur téléphone réel.
- Aucun message console warn/error observé pendant le parcours de développement avant interruption volontaire du serveur pour le build.
- Après compilation finale : contrôle mobile répété sans débordement (390 px). Filtres à 168,5 px chacun, taille de texte 16 px préservée ; titre d’accueil compacté. Pause des animations testée dans l’interface : `data-motion=false` et `animation-name:none`, puis préférence initiale rétablie.
- Les erreurs réseau/session et RSC enregistrées pendant les interruptions volontaires du serveur local sont distinguées du parcours final ; aucune nouvelle erreur warn/error relevée après son redémarrage final.
- Scan ciblé des dix fichiers de la candidate : aucun motif de clé privée, token fournisseur ou URL de connexion avec mot de passe ; aucune ligne avec espaces de fin. `git diff --check` PASS ; aucun staging.

Captures : `artifacts/discovery-library/`. Les limites des API existantes décrites plus haut restent explicites. Aucun écran de chargement ne crée un deuxième élément musical et aucune migration n’est ajoutée.
