# Synaura — La Chambre Sonore

Prototype interactif isolé, lancé à la demande « lets go » après validation de la nouvelle direction. Ce n’est **ni une nouvelle candidate du site entier, ni une livraison en production**.

## Voir la scène

Depuis la racine du projet :

```powershell
node prototypes/chambre-sonore/server.mjs
```

Ouvrir <http://127.0.0.1:3100/>. Le serveur écoute uniquement sur la boucle locale. `CHAMBER_PORT` permet de choisir un autre port. Aucune dépendance supplémentaire à installer si les dépendances existantes du projet sont présentes.

- Scroller naturellement, ou choisir **Ressentir → Explorer → Créer**.
- Bouger le pointeur pour déplacer légèrement la matière et sa lumière.
- Toucher la matière ou activer son bouton pour émettre une onde.
- **Activer le son** joue la signature Synaura existante, intégrale et inchangée : 3,2 secondes. Une nouvelle activation permet de l’arrêter ou de la rejouer.
- Le bouton de mouvement arrête les animations. La navigation reste utilisable.

## Ce qui est réellement implémenté

- Typographie révélée en séquence à l’arrivée, sculpture cobalt/titane, profondeur de fond, reflet au sol et micro-relief.
- Déformation de maillage et d’UV sur GPU, respiration, lumière mobile, parallaxe amortie.
- Trois cadrages reliés au défilement natif, avec changement de texte et d’échelle de la matière.
- Quatre ondes transitoires au maximum ; un glissement tactile n’est pas traité comme un clic.
- Réaction à l’amplitude de la vraie signature via un analyseur Web Audio. Aucun son synthétisé ou faux morceau.
- **Rendu 2,5D à partir d’un visuel généré**, pas une simulation volumétrique 3D de tissu. Le visuel reste reconnaissable durant les déformations.
- `prefers-reduced-motion`, pause manuelle, arrêt de la boucle dans un onglet masqué, image de secours sans WebGL.
- Contrôles natifs nommés, focus clavier visible, chapitres inactifs `inert`, annonces de statut.
- Résolution GPU plafonnée : DPR 1,75 desktop / 1,5 mobile. Une seule texture, un seul maillage, une seule instance audio.

## Isolation

Les nouveaux fichiers sont dans ce dossier, ainsi que les tests dédiés dans `tests/chambre-sonore*.test.mjs`. Les captures de travail sont dans `artifacts/chambre-sonore/`.

Aucune modification des routes de l’application, AudioCore, contrats DB, API, données, applications natives ou infrastructure. Aucune reprise de la précédente refonte V2. Aucun staging, commit, push, tag ou déploiement.

Le serveur n’expose que les ressources de ce prototype et une liste exacte de modules Three.js déjà installés et de la signature existante. Les fichiers cachés, chemins traversants, routes API et méthodes d’écriture sont refusés. Aucun environnement n’est chargé et aucun CDN ou service externe n’est appelé par la scène.

## Visuel

`assets/membrane-cobalt.png` — 1536 × 1024, 2 255 524 octets. Copie locale du résultat de l’outil intégré de génération d’images, sans modification de l’original. La demande initiale de transparence a produit un damier opaque : cette sortie n’est pas utilisée. Une édition ciblée a remplacé le damier par du noir ; le shader rend le fond presque noir transparent au moment du rendu.

Source approuvée : `exec-683ea3ac-30ac-4f0c-8dc2-8db60c38de05.png`.
Asset sélectionné : `exec-add2f437-902b-4e6b-aaf4-c3294e5bef32.png`.

Prompt de préparation :

> Extract only the sculptural folded metallic sound membrane. Preserve its asymmetrical wave shape, deep electric cobalt folds, silvery titanium highlights and fine ribbing. Remove typography, buttons, navigation, people, floor, reflections, architecture and background. Reconstruct metal ribs naturally where typography covered them. No letters, no new objects.

Correction ciblée du fond :

> Change only the checkerboard background to uniform pure black RGB 0,0,0. Keep the complete sculpture unchanged: folds, texture, composition, viewpoint and light. Remove all checkerboard from the holes and silhouette. No floor, reflection, letters or objects.

## Vérification locale

```powershell
node --test tests/chambre-sonore.test.mjs tests/chambre-sonore-behavior.test.mjs
node --check prototypes/chambre-sonore/chamber.js
node --check prototypes/chambre-sonore/server.mjs
```

Résultat : **14 tests dédiés PASS**, vérification syntaxique PASS, aucun espace final dans les nouveaux fichiers texte. Scan ciblé de secrets : aucune occurrence détectée. Index Git laissé vide ; fichiers préexistants conservés.

Vérifications dans le navigateur intégré :

- Rendu WebGL actif ; trois chapitres accessibles, navigation et impulsion fonctionnelles.
- À l’arrivée : un audio, `paused=true`, temps zéro, aucun autoplay.
- Clic son : un audio en lecture, durée 3,2 s, bouton pressé ; fin naturelle observée à 3,2 s et retour à l’état arrêté.
- Pause puis changement de chapitre : navigation conservée, scène sans déplacement autonome.
- Dimensions CSS contrôlées : 1440 × 900, 390 × 844, 360 × 800 et 844 × 390. Aucun débordement horizontal ; commandes présentes dans le cadre court.
- Bug corrigé : `overflow:hidden` du cadre fixe autorisait un scroll interne de 84,8 px lors du focus. `overflow:clip` maintient désormais `scrollTop=0` ; à 390 × 844, le footer termine bien à 844 px après focus/navigation.
- Bug corrigé : garde contre le toucher de la matière avant son chargement et en mode image.
- Lisibilité corrigée : sculpture derrière le texte essentiel, description séparée du CTA, commandes maintenues en paysage court.
- Aucune erreur ou avertissement navigateur relevé pendant les parcours vérifiés.

Les captures du panneau intégré sont des aperçus : leur raster peut être recadré par le panneau malgré les dimensions CSS imposées. Elles ne constituent pas des golden captures pixel-exactes.

Limites : aucun téléphone physique, aucun lecteur d’écran réel, aucune certification d’un framerate constant sur tous les GPU. La préférence de mouvement réduit et les scénarios de fallback sont aussi couverts par les tests de comportement dédiés, sans prétendre remplacer une QA matérielle. Pas de build du site complet requis pour ce prototype autonome.
