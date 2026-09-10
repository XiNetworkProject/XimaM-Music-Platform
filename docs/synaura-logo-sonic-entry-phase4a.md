# Synaura — logo canonique et entrée sonore (Phase 4A)

## Source de vérité

- `lib/brand.ts` définit les seuls chemins de marque utilisés par l’entrée web.
- `components/brand/SynauraLogo.tsx` rend le symbole 2026, le wordmark et le lockup.
- Le symbole officiel retenu est `public/brand/2026/synaura-symbol-2026.png` : PNG transparent, 1024 × 1024.
- L’asset natif courant `synaura-app/src/assets/synaura-symbol-2026.png` est une copie binaire identique du symbole officiel.
- Le composant central impose `object-contain`, une safe zone de 8 % et des conteneurs `overflow-visible`.

Le PNG est conservé comme master car aucun SVG vectoriel fidèle du logo 2026 n’est présent dans le dépôt. Les SVG existants dessinent une autre marque ; les convertir en source canonique aurait donc modifié le logo au lieu de le consolider.

## Inventaire et statut

### Autorisés

- `public/brand/2026/synaura-symbol-2026.png` — symbole transparent canonique web.
- `public/brand/2026/synaura-symbol-2026-white.png` — carré clair pour favicon, PWA et surfaces système.
- `public/brand/2026/synaura-brand-lockup-2026.png` — export horizontal historique de référence, conservé mais non utilisé par le chrome actif.
- `synaura-app/src/assets/synaura-symbol-2026.png` — master embarqué de l’application native courante, hash identique au canonique web.

### Redondants ou anciens, conservés mais non référencés par les surfaces actives

- `public/favicon.svg`, `public/synaura_symbol.svg`, `assets/icon.svg`, `assets/splash.svg` — ancien S abstrait animé ; mêmes données de base.
- `public/synaura_logotype.svg` — ancien symbole abstrait avec wordmark système.
- `public/synaura_logo2026.png` — export carré sans transparence sur fond noir.
- `public/brand/2026/synaura-logo.png` — export transparent 1254 × 1254 redondant.
- `public/brand/2026/synaura-logotype.png` — lockup placé dans un canevas carré très rembourré.
- `public/brand/2026/synaura-brand-lockup.png` — grand canevas carré opaque, précédemment recadré dans les pages de récupération.
- `public/favicon.ico`, les anciens PNG Android/Apple de 72 octets et `synaura-mobile/*` — placeholders ou application mobile historique. `synaura-mobile` conserve son ancien composant SVG mais n’est pas l’application native publiée ; la source native courante est `synaura-app`.

## Causes des défauts

1. Discover, Enter et Onboarding appelaient directement `favicon.svg`, c’est-à-dire l’ancien symbole et non le logo 2026.
2. Les pages de récupération forçaient un lockup carré 1024 × 1024 dans un cadre horizontal avec `object-cover`, ce qui rendait le crop dépendant du viewport.
3. Le shell forçait un export de logotype carré très rembourré dans un rectangle de 200 × 48.
4. Plusieurs conteneurs mélangeaient dimensions fixes, `overflow-hidden` et images déjà dotées de marges internes, sans safe zone partagée.

## Chorégraphie sonore et signature visuelle

Le fichier fourni est copié sans transformation dans `public/audio/synaura-sonic-logo.wav` : RIFF PCM stéréo, 48 kHz, 16 bits, 3,2 secondes. Le pic RMS principal se situe autour de 0,60 seconde.

- 0–0,30 s : écran presque noir, tension et brume centrale à peine perceptible.
- 0,30–0,75 s : la source d’un phare apparaît hors champ à droite. Son cône blanc chaud, violet et cyan entre en accélérant doucement.
- 0,75–1,70 s : le phare pivote et traverse le symbole de droite à gauche. Le symbole canonique est révélé par un large masque dégradé de 2,5 fois sa largeur, déplacé continûment par `mask-position` sur la seule surface du symbole. Le PNG reste immobile et les paliers de `clip-path` disparaissent.
- 1,55–2,15 s : un reflet spéculaire glisse sur la matière du symbole, puis une impulsion interne courte ouvre l’Aura et une onde très faible dans le fond.
- 2,15–2,85 s : le phare poursuit sa rotation vers la gauche. Le cône, la brume éclairée et les rares poussières s’effacent sans flash.
- 2,85–3,20 s : seul le symbole net reste visible avec une Aura et un reflet de sol très faibles.
- 3,20–3,60 s : stabilisation silencieuse puis retour à Discover.

La scène superpose un fond noir, deux profondeurs de brume, un rig de phare cohérent à six couches, un reveal organique, un reflet spéculaire du même asset canonique, une Aura, une onde de fond et un reflet de sol. Le phare suit deux interpolations continues — translation et rotation autour de la source hors champ — sans succession de paliers. Les cônes angulaires, leurs blurs et leurs masques radiaux sont statiques ; seules leurs propriétés `transform` et `opacity` changent. Le seul `mask-position` animé est borné au carré du logo. La scène ne dépend ni d’une vidéo ni de WebGL.

Le premier visiteur voit un dialogue cinématique. Le son ne peut démarrer qu’après le bouton **Découvrir avec le son**. **Continuer sans le son** joue la chorégraphie complète sans audio ; **Passer** ferme immédiatement. Une visite suivante saute l’intro, tandis que le contrôle du header permet de la rejouer volontairement. Un membre authentifié continue d’être redirigé côté serveur vers `/live`, sans intro longue.

## Contraintes techniques

- Aucun `autoplay`, canvas, vidéo, particule lourde, Lottie ou nouvelle dépendance.
- Un seul élément `<audio preload="metadata">`, local au composant et toujours arrêté au démontage.
- Aucun branchement au store ou au moteur Audio Core.
- Focus initial, boucle de focus, Échap, `aria-modal`, contenu sous-jacent masqué aux technologies d’assistance.
- `prefers-reduced-motion` remplace le balayage par une illumination horizontale diffuse de 2 secondes et un reveal spatial calme.
- Mobile : même phare et même masque, avec moins de blur, sans poussière ni source optique, et un symbole borné à 61 vw ; safe areas respectées.
