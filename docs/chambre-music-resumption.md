# Reprise musicale — lecteur et premier écran mobile

Candidate locale uniquement ; pas de validation visuelle déduite des tests source.

## Périmètre réellement modifié

- `components/TikTokPlayer.tsx` : classes et calques décoratifs de la salle d’écoute. Source Aura image/vidéo, options, activité, reduced-motion et handlers conservés. Les anciennes dominantes vert/brun/rose sont remplacées par noir/cobalt/matière ; le média Aura réel reste une texture monochrome discrète. Aucun nouveau moteur audio ou GPU.
- `components/v2/music-v2.css` : composition dédiée du lecteur développé, variantes mobile/tablette/hauteur courte. Sur Track mobile : pochette et identité en grille, commandes existantes sur toute la largeur. Sur Discovery mobile : premier vrai morceau dans une composition compacte, au lieu d’une pochette pleine largeur avant son Play.
- `app/track/[id]/TrackPageClient.tsx` : une classe de présentation ajoutée au groupe artiste, aucun déplacement ou duplication de handler.

Copies de l’état antérieur sous `artifacts/chambre-resumption/before/music/`. Les copies du premier lot n’ont pas été écrasées. `FullScreenPlayer.tsx` sauvegardé mais **non modifié** durant cette reprise. HomeFlowPrelude, SynauraScroll, header commun, entrée approuvée et `components/chamber/` non touchés.

## Préservation

Aucune exception fonctionnelle supplémentaire : le test AST conserve les empreintes des **420 handlers** et **212 appels protégés**, avec pour seule exception le correctif de loader StrictMode déjà documenté. Ni queue, AudioCore, données, API, routes, régions de gestes ou waveform modifiés. Les mêmes boutons Play sont présents une seule fois.

## Contrôles

- 53 tests musicaux existants du lot + 3 tests de reprise : **56 PASS**.
- Parse CSS et TSX : PASS. `git diff --check` des deux TSX modifiés : PASS.
- Pas de navigateur, build ou processus lancé par ce lot.
- **QA visuelle à effectuer par le principal** : lecteur desktop/mobile, Aura activé/désactivé, couverture vidéo si disponible, contrôles de lecture et actions ; première commande Track/Discovery à 390×844. Les règles CSS visent la visibilité immédiate mais ne prouvent pas la position pixel dans le navigateur.

La critique portant sur le deuxième sas Live, les multiples présentations du mini-player/navigation et la composition de Discovery sous le hero reste ouverte et hors de cette correction bornée.

## Défaut observé pendant la revue centrale

L’animation `synauraAuraDrift` réimposait une opacité de .42/.52 au décor pendant la lecture et écrasait les valeurs discrètes de la nouvelle présentation. Seules ces deux déclarations d’opacité ont été retirées ; transformations et durée de 14 secondes conservées. Un quatrième test de reprise vérifie directement les keyframes réelles : **57 tests musicaux PASS** après correction.

La revue centrale a exercé le lecteur desktop/mobile, Aura off/on et le premier écran Track mobile. Les captures du lecteur sont explicitement nommées `before-opacity-fix` : la dernière correction n’est pas présentée comme revue visuellement. Discovery et les parcours connectés restent à vérifier. Voir `docs/chambre-redesign-resumption.md` pour les preuves et limites du gate central.
