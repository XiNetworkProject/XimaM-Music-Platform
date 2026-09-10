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

- 0–0,35 s : écran noir, tension et profondeur à peine perceptible.
- 0,35–0,65 s : une vague volumétrique apparaît à droite ; son front blanc-violet rejoint le logo au pic RMS du sonic logo, autour de 0,60 s.
- 0,65–1,80 s : la vague traverse l’écran de droite à gauche. Le calque matériel du symbole canonique est révélé par un `clip-path` dont le bord gauche recule de 100 % à 0 %. Un second masque étroit suit ce bord pour produire le reflet lumineux, sans fondu d’opacité global.
- 1,70–2,40 s : le reveal se ferme, une onde courte ouvre l’Aura derrière le symbole et le reflet frontal disparaît.
- 2,40–3,20 s : la traînée quitte l’écran ; seul le symbole net, sa safe zone et une respiration très faible restent visibles.
- 3,20–3,60 s : stabilisation silencieuse puis retour à Discover.

La scène superpose un fond noir, une Aura arrière, une brume de profondeur, quatre couches de vague, trois rendus masqués du même asset canonique, une onde d’impact et un reflet de sol. Le geste principal reste calculé en CSS et ne dépend ni d’une vidéo ni de WebGL.

Le premier visiteur voit un dialogue cinématique. Le son ne peut démarrer qu’après le bouton **Découvrir avec le son**. **Continuer sans le son** joue la chorégraphie complète sans audio ; **Passer** ferme immédiatement. Une visite suivante saute l’intro, tandis que le contrôle du header permet de la rejouer volontairement. Un membre authentifié continue d’être redirigé côté serveur vers `/live`, sans intro longue.

## Contraintes techniques

- Aucun `autoplay`, canvas, vidéo, particule lourde, Lottie ou nouvelle dépendance.
- Un seul élément `<audio preload="metadata">`, local au composant et toujours arrêté au démontage.
- Aucun branchement au store ou au moteur Audio Core.
- Focus initial, boucle de focus, Échap, `aria-modal`, contenu sous-jacent masqué aux technologies d’assistance.
- `prefers-reduced-motion` remplace le balayage rapide par une illumination horizontale de 2 secondes et un reveal spatial lent.
- Mobile : même vague et même masque, avec moins de blur et un symbole borné à 61 vw ; safe areas respectées.
