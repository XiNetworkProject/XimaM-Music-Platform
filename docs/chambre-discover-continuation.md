# Chambre Sonore — reprise Discovery après le hero

Statut : implémentation locale et tests source terminés ; revue navigateur centralisée par l’agent principal, pas de validation visuelle anticipée.

## Périmètre et sauvegarde

Trois sources modifiées : `app/discover/DiscoverClient.tsx`, `app/discover/DiscoverMoodTiles.tsx`, couche **CHAMBRE DISCOVERY CONTINUATION** ajoutée à `components/v2/music-v2.css`.

Copies exactes de l’état précédent : `artifacts/chambre-continuation/before/discover/`, chemins sources conservés. Les sauvegardes des lots précédents n’ont pas été écrasées.

L’entrée approuvée, le hero Discovery compact déjà revu, Track, Live, le lecteur développé, les routes serveur, les endpoints, les composants natifs `DiscoverTiles`, les hooks et AudioCore sont inchangés par ce lot.

## Composition effectivement changée

- **Ambiances** : introduction latérale et index de portes tactiles, avec les couvertures réelles disposées en fragments ; les huit ambiances, leurs promesses, leur classement personnalisé et les genres sous-jacents sont conservés. Sur mobile, chaque porte garde une surface de lecture indépendante des images.
- **Sorties** : un disque principal et trois entrées latérales forment le journal des sorties. L’ordre est strictement celui des données reçues, sans tri supplémentaire.
- **Pépites** : quatre disques en galerie décalée sur grand écran ; entrées compactes sur mobile.
- **Plébiscités** : six entrées en liste de lecture à deux colonnes sur grand écran, une sur mobile. Les numéros indiquent leur position dans la sélection reçue, sans fabriquer de score.
- **Suites** : une disclosure native `details/summary` donne accès à tous les morceaux restants de chacune des trois sélections. Le nombre annoncé est calculé sur le tableau réel. Aucun morceau n’est supprimé, dupliqué, substitué ou réordonné. Il n’y a ni pagination réseau ni nouvelle query à l’ouverture : les mêmes `TrackTile` restent montés et conservent Play, favoris, Actions, création/remix autorisé et « Ensuite ».
- **Artistes** : galerie de portraits étagés, aperçu de profil explicite, identité lisible et morceau réel toujours jouable. Les dix artistes éventuels restent dans le scroller natif ; aucun faux portrait ajouté.
- **Collections, clubs et événements** : composition et espacement raccordés. Les composants, liens, catégories historiques et conditions d’affichage restent ceux de la candidate précédente. La limite existante de `CollectionSpotlight` (une collection principale et au plus trois secondaires) n’est pas modifiée.

Les textes, genres et badges des morceaux restent accessibles ; aucun élément essentiel n’est masqué par la couche CSS. Les petits contrôles des trois sélections disposent de cibles d’au moins 44 px. Les suites possèdent leur focus clavier natif et un `:focus-visible` explicite. Aucun moteur d’animation, aucune boucle audio ni aucun contenu synthétique n’ont été ajoutés.

## Vérifications exécutées

**62 tests ciblés PASS, 0 échec** :

- `tests/chambre-discover-continuation.test.mjs` : 5 nouveaux tests ;
- les 57 tests musique/lecteur, Profile Peek, Comments/Moments et Actions déjà présents.

Les nouveaux tests extraient et exécutent les **vrais composants source** avec des éléments React simulés ; ils ne recopient pas leur algorithme. Les trois éditions sont exercées sur 0, 1, 3, 4, 5, 6, 7, 16 et 31 morceaux. Identité des objets, ordre, absence de doublon, seuils visibles, suite complète et numérotation native sont vérifiés. Le vrai composant page est également exécuté pour vérifier les huit ambiances, les préférences, les trois ensembles musicaux, Radar, artistes, collections, clubs et événements.

Empreintes strictes capturées **avant modification** : logique des effets/hook et sélection/lecture des quatre composants fonctionnels, composant `DiscoverLeadCard`, JSX de l’ouverture, contenu exact de `DiscoverTiles.tsx` et intégralité de la CSS préexistante. Aucune exception ajoutée. L’audit historique des **420 handlers et 212 appels protégés** reste PASS sans modification ; sa seule exception reste le correctif StrictMode du lecteur déjà documenté.

TSX et CSS parsables ; `git diff --check` ciblé PASS (avertissements habituels LF/CRLF uniquement).

## Réserves et limites

- Captures et interactions réelles 1440/390, ouverture/fermeture clavier des suites, absence d’overflow, favoris/Actions, sélection d’ambiance et retour, Profile Peek puis écoute : revue confiée à l’agent principal après livraison source, non déclarée PASS ici sans ses preuves.
- Les données de production et les disponibilités des images/vidéos ne sont ni modifiées ni simulées par cette reprise ; le backend et les anciennes erreurs externes restent hors périmètre.
- Aucun navigateur, serveur, build, type-check global, commit, staging, push ou déploiement lancé par ce sous-lot. Ces vérifications générales sont centralisées par l’agent principal.
- Ce livrable ferme uniquement la recomposition Discovery au-delà du hero en source. Il ne déclare pas achevée la refonte entière de Synaura et n’anticipe pas l’acceptation visuelle utilisateur.
