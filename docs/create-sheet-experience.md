# Créer — tiroir contextuel local

## Demande et périmètre

Remplacer la page `/create` par un dialogue qui arrive du bas, sans quitter la page
consultée. Candidate locale uniquement : aucun commit, push ou déploiement.

- Les liens Créer utilisant `HandoffLink` ouvrent le contrôleur de surfaces existant.
- Quatre accès directs : Studio IA, import audio, Clip et collaboration.
- Variation, post, avis et défi remix restent accessibles dans une section repliable.
- Fermeture, verrouillage du fond, focus et historique réutilisent les mécanismes existants.
- Le choix d'un outil remplace l'entrée temporaire du tiroir dans l'historique.
- Un accès direct à `/create` ouvre le tiroir au-dessus de Live. Les URL avec source
  Clip/remix gardent leurs destinations et paramètres ; le contexte défi/retour Live est conservé.
- Aucun changement au moteur audio, aux données, aux endpoints ou à l'accueil interactif.
- Les autres modifications locales antérieures sont conservées ; leur design n'est pas validé par cette passe.

## Vérifications de la première passe fonctionnelle

- TypeScript : PASS.
- Suite complète : 694/694 PASS.
- Build production local : PASS. `git diff --check` : PASS. Rien de staged.
- Desktop 1440×900 CSS et mobile 390×844 / 320×710 CSS : pas de débordement horizontal.
- À 390 px, les quatre actions sont visibles sans défilement initial. Le contenu
  secondaire ouvert défile dans le tiroir, limité à 82dvh, avec espace safe-area.
- Fermeture avec X et restitution du focus au déclencheur : vérifiées.
- Parcours Créer → Studio → Retour au Live : vérifié, sans génération.
- Accès direct `/create` : vérifié après correction d'une course entre l'ouverture
  initiale et le nettoyage de changement de route du contrôleur. L'ouverture est
  maintenant différée d'une frame et annulée si le composant quitte la route.
- Aucune erreur console relevée sur le parcours contrôlé. Aucun fichier secret ajouté
  dans cette candidate ; scan ciblé des fichiers applicatifs concernés sans détection.
- Les anciennes empreintes comportementales des cinq autres espaces de création sont
  conservées. Seule la page Créer intentionnellement retirée sort de cette comparaison.
- Les tests ciblés couvrent liens directs, URL externes, clics modifiés, destinations,
  contexte défi/Live, relecture d'effet, absence d'appel audio/données et CSS limitée au tiroir.

Contrôle mobile effectué dans un navigateur redimensionné, pas sur téléphone physique.
Pas de génération payante ou de publication de contenu pendant les contrôles.
Validation créative du tiroir encore attendue.

## Révision de style après rejet du premier habillage

- Changement limité au rendu de `CreateSurface` et à sa feuille de style ; destinations,
  paramètres, inscription au contrôleur, fermeture, historique et données inchangés.
- Fond noir encré, titre plus aéré, accès IA illustré d'un ruban lumineux vectoriel.
  Les trois autres accès quittent les gros blocs pour des actions sur fond ouvert.
- Le ruban réutilise le mouvement au pointeur et les préférences Ambiance existantes.
  Vingt-et-un tracés SVG déterministes, aucun canvas, timer ou appel réseau ajouté.
- La pause, l'économie de données et les mouvements réduits restent respectés.
- TypeScript PASS ; suite complète 695/695 PASS ; `git diff --check` PASS.
  Revue navigateur desktop 1440×900 et mobile
  390×844 : aucune largeur inaccessible, quatre actions visibles sans scroll initial.
- Petit écran 320×710 : options secondaires accessibles au clavier dans le scroll
  interne ; focus maintenu dans le dialogue. Aucune erreur console relevée.
- Le build réussi ci-dessus concerne la passe précédente ; il n'a pas été rejoué pour
  cette révision uniquement visuelle. Aucun commit ni déploiement.

Nouvelle proposition visuelle à revoir par l'utilisateur, pas une validation créative.
