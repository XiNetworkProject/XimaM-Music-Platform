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

## Chorégraphie sonore et signature visuelle GPU — candidate V3.1

Le fichier fourni est copié sans transformation dans `public/audio/synaura-sonic-logo.wav` : RIFF PCM stéréo, 48 kHz, 16 bits, 3,2 secondes. Une analyse par fenêtres RMS de 20 ms, pas de 5 ms, a identifié le corps audible de 0,010 à 2,840 s et des transitoires utiles à 0,190, 0,330, 0,485, 0,745, 1,000, 1,795, 1,930, 2,235, 2,945 et 3,170 s.

- 0–0,190 s : espace noir sans sol ; symbole presque imperceptible.
- 0,190–0,745 s : fuite optique au bord droit puis entrée du volume projectif, calées sur les trois premières attaques secondaires.
- 0,745 s : premier contact du cône avec la matière du symbole.
- 1,000 s : révélation colorée persistante, alignée sur la dernière attaque du motif d'ouverture.
- 1,100–1,710 s : bande spéculaire fine, continue et localisée ; le cœur reste blanc chaud et ses franges décomposent discrètement la lumière en corail, violet et cyan.
- 1,655–2,280 s, rendu normal : allumage cumulatif des cinq barres, avec la grande barre au pic de l'impact à 1,795 s, puis propagation interne colorée vers les deux arcs à partir de 1,960 s. L'Aura ne commence qu'à 2,280 s.
- 2,235–2,750 s : sortie du projecteur et extinction de la poussière, sur la transitoire de décroissance.
- 2,650–3,200 s : résolution sur le symbole coloré et son Aura, puis fin exacte de la timeline.

Le rendu normal est une scène React Three Fiber montée dynamiquement côté client. Elle utilise explicitement `THREE.WebGLRenderer`, une caméra perspective avec un dolly discret, une source optique hors champ à droite, un `SpotLight` orienté en trois dimensions, un cône volumétrique et une nappe projective en `ShaderMaterial`. Il n'existe aucun plan de sol ni ligne d'horizon. Le projecteur a un cœur blanc légèrement chaud, une couche secondaire presque blanche et froide, puis seulement de très faibles franges Synaura. L'extinction exponentielle, les bords larges, le dither, le noise, les striations et les poussières empêchent de lire la géométrie du cône et laissent le noir visible à travers la lumière.

Le PNG canonique est échantillonné par un shader de matière dédié : son alpha fournit la géométrie visible, une pseudo-normale douce et un faux bevel, tandis que la position relative de la lumière calcule réponse satinée, roughness variable, fresnel discret et rim directionnelle. Le logo reste presque noir hors lumière, puis réfracte localement le blanc en corail, violet et cyan. Une compression douce conserve les gradients avant le tone mapping et évite les aplats blancs. Le logo n'est donc ni redessiné ni révélé par un masque DOM. La signature secondaire est également calculée dans ce shader : passage séquentiel aligné sur les cinq barres réelles du PNG, puis onde radiale colorée dans les arcs du S.

La chaîne de post-traitement reste HDR jusqu'au dernier effet : `GodRays`, `Bloom`, vignette, puis `ToneMappingMode.ACES_FILMIC`. L'exposition du renderer est fixée à 0,86 et la sortie à `SRGBColorSpace`. Le bloom (seuil 0,82, lissage 0,08) ne réagit ainsi qu'aux zones réellement lumineuses. L'Aura WebGL et son fallback CSS sont asymétriques, diffus et presque invisibles sur leurs bords.

Une seule horloge maîtresse R3F de 3,2 secondes avance la timeline GSAP et les labels `start`, `lightEnter`, `pulseOne`, `pulseTwo`, `logoContact`, `logoReveal`, `impact`, `lightExit` et `resolve` aux temps audio ci-dessus. Dans la même frame, ce temps dérive la cible du projecteur, son intensité et son ouverture, les opacités des volumes, le spéculaire, la séquence des barres, l'onde radiale, Aura et le dolly caméra. Il alimente aussi le noise des shaders ; aucun minuteur visuel parallèle n'est utilisé.

En `prefers-reduced-motion`, les mouvements et intensités sont atténués mais la lecture causale reste séquentielle : barres de 1,500 à 2,080 s, arcs de 2,080 à 2,440 s, puis Aura à partir de 2,450 s.

Le premier visiteur voit un dialogue cinématique. Le son ne peut démarrer qu’après le bouton **Découvrir avec le son**. **Continuer sans le son** joue la chorégraphie complète sans audio ; **Passer** ferme immédiatement. Une visite suivante saute l’intro, tandis que le contrôle du header permet de la rejouer volontairement. Un membre authentifié continue d’être redirigé côté serveur vers `/live`, sans intro longue.

## Pile et profils de qualité

- React et ReactDOM restent en 18.2.0 et Next en 14.2.30. Dépendances dédiées : `three@0.175.0`, `@types/three@0.175.0`, `@react-three/fiber@8.18.0`, `@react-three/postprocessing@2.19.1`, `postprocessing@6.39.5` et `gsap@3.15.0`.
- Le chunk `sonic-3d` est asynchrone : l'accueil ne charge pas Three.js avant l'ouverture de l'intro.
- HIGH : DPR 1–1,5, antialiasing, 156 poussières, 46 samples God Rays, resolution scale 0,58, bloom 0,36.
- LOW : DPR 1, 58 poussières, 24 samples God Rays, resolution scale 0,38, bloom 0,28 et blur des rayons désactivé. Le mouvement et la vraie lumière sont conservés avec un symbole plus petit et davantage d'espace négatif.

## Contraintes techniques et fallbacks

- Un seul élément `<audio preload="metadata">`, local au composant et toujours arrêté au démontage.
- Aucun branchement au store ou au moteur Audio Core.
- Focus initial, boucle de focus, Échap, `aria-modal`, contenu sous-jacent masqué aux technologies d’assistance.
- La timeline visuelle ne démarre qu'après résolution de `audio.play()` lorsque le son est demandé ; un échec audio lance la même scène en silence.
- `prefers-reduced-motion` conserve WebGL mais remplace le grand balayage par un phare diffus et une illumination lente ; barres, arcs puis Aura restent distincts et atténués.
- Si WebGL est indisponible ou si le contexte est perdu, seul un fallback CSS minimal noir + logo canonique + fade est utilisé.
- En développement, `sonicPreview=1` rejoue l'intro, `sonicTime=<seconde>` fige une frame, `sonicReduced=1` force reduced motion et `sonicFallback=1` force le fallback. Ces branches sont éliminées du comportement de production.

## Validation locale de la révision GPU

- Profil HIGH : 142,7 FPS mesurés, soit 7,01 ms par frame, dans le navigateur desktop local (46 samples God Rays, 156 poussières).
- Profil LOW avec viewport CSS 390 × 844 : 140,3 à 143,6 FPS mesurés, soit 6,97 à 7,13 ms par frame (24 samples, 58 poussières). Le backend de capture encode les images en 390 × 843.
- Build production : accueil inchangé à 344 kB First Load JS. La scène reste chargée à la demande : runtime `sonic-3d` 903 334 octets bruts / 236 041 gzip et code de scène V3.1 26 873 octets bruts / 7 832 gzip, soit 930 207 octets bruts / 243 873 gzip additionnels uniquement lorsque l'intro est ouverte.
- Frames de contrôle V3 produites aux onze temps imposés dans `.tmp/frontend-logo-webgl-v3-visuals/`, complétées par les principaux moments mobile avec viewport CSS 390 × 844, les étapes reduced-motion et des frames intermédiaires de la propagation centrale. Les copies de livraison portent l'extension `.jpg`, conforme à leur encodage JPEG/JFIF.
- Reduced motion et fallback WebGL contrôlés séparément ; aucune erreur ni aucun avertissement console après alignement de Three.js.
- Cette révision reste une candidate locale tant que la direction créative ne l'a pas validée ; elle n'est ni commitée ni déployée automatiquement.

## Validation temporelle V3.1

La V3 utilisait deux boucles de progression : le ticker autonome de GSAP modifiait la timeline tandis que `useFrame` recalculait géométrie, direction et uniforms sur l'horloge R3F. Le phare pouvait donc être reconstruit avec un état GSAP décalé d'une frame. Ses trois tweens de cible se chevauchaient en outre à 0,580–0,610 s, 0,780–1,080 s et 2,235–2,260 s ; intensité et dolly caméra avaient des recouvrements similaires.

La V3.1 conserve une seule boucle maîtresse : l'horloge monotone R3F calcule le temps de scène, avance explicitement une timeline GSAP maintenue en pause, puis dérive dans la même frame cible, quaternion du cône, nappe lumineuse, direction des poussières, spotlight, caméra et tous les uniforms temporels. Aucun `setState` React n'est appelé à chaque frame ; le seul état de métrique existant reste publié une fois après l'échantillon de performance.

Le déplacement du phare suit désormais une unique courbe de Bézier cubique de 0,120 à 2,715 s. L'intensité, l'angle et le dolly utilisent des enveloppes `smootherstep` sans recouvrement. La nappe lumineuse conserve ses quatre instants proches et ses poids 0,68 / 0,19 / 0,09 / 0,04. Le highlight utilise quatre échantillons espacés de 1/320 s et pondérés 0,66 / 0,20 / 0,09 / 0,05. Sa composante douce passe de 17,0 à 15,8 tandis que le cœur lumineux reste strictement à 48,0. Cette persistance est limitée au reflet ; le logo et la scène restent nets.

Échantillonnage déterministe de la trajectoire desktop 1280 × 720 :

| Cadence | Intervalle | Angle du phare p95 / max | Cible p95 / max | Highlight initial → ajusté, p95 / max |
| --- | ---: | ---: | ---: | ---: |
| 60 Hz | 16,667 ms | 0,096° / 0,098° | 7,07 / 7,10 px | 20,34 / 21,29 px → 15,82 / 16,33 px |
| 120 Hz | 8,333 ms | 0,048° / 0,049° | 3,53 / 3,55 px | 10,14 / 10,65 px → 7,93 / 8,17 px |
| 144 Hz | 6,944 ms | 0,040° / 0,041° | 2,95 / 2,96 px | 8,48 / 8,87 px → 6,61 / 6,81 px |

À 60 Hz, le déplacement maximal du highlight passe explicitement de 21,29 à 16,33 px par image, soit une réduction de 23,30 %. Sa fenêtre normale est étendue de 0,88–2,00 s à 0,72–2,18 s autour du même impact, sans modifier le climax ni les timestamps audio. Le cœur lumineux garde sa largeur ; seule la composante douce est légèrement élargie et les trois échantillons historiques reçoivent un peu plus de poids. Les cadences simulées ont par construction p50 = p95 = p99 = maximum à 16,667 / 8,333 / 6,944 ms, sans frame au-dessus de 16,7, 25 ou 33 ms.

Sur un passage HIGH à chaud mesuré dans le navigateur local : 142,8 FPS, p50 6,9 ms, p95 7,1 ms, p99 7,3 ms, maximum 9,3 ms et zéro frame au-dessus de 16,7, 25 ou 33 ms. Les passages immédiatement après rechargement ont parfois isolé un unique spike de 27,7 à 40,5 ms pendant le chargement de page et les tâches d'arrière-plan ; il disparaît une fois les chunks et la page stabilisés et ne se répète pas pendant le balayage.

Les onze frames desktop et les quatre moments mobiles ont été reproduits dans `.tmp/frontend-logo-webgl-v3-1-visuals/`. La différence absolue moyenne avec la V3 reste comprise entre 0,001 % et 0,603 % selon la frame, ce qui confirme la conservation de la direction artistique. Le micro-réglage du highlight est contrôlé séparément à 0,80, 1,20, 1,40, 1,80 et 2,10 s dans `.tmp/frontend-logo-webgl-v3-1-highlight-visuals/`. Aucune instrumentation temporelle temporaire n'est conservée. La surface de test disponible ne fournissant pas d'enregistrement vidéo natif, le livrable reste le jeu de captures horodatées et les mesures de pacing.

## Mise en scène et rythme V3.2

La V3.2 conserve intégralement Three.js, R3F, GSAP, les shaders V3.1, la matière et la palette du logo, l'horloge maîtresse, Audio Core et le sonic logo. La passe porte uniquement sur la composition de la scène : la source desktop est placée à la limite haute droite, puis une Bézier unique conduit le faisceau jusqu'au bord bas gauche. Le profil LOW utilise une Bézier portrait distincte, plus verticale, sans réduire mécaniquement le cadrage desktop.

Les six transients pilotent des enveloppes très courtes sur les paramètres déjà disponibles : allumage hors champ à 0,190 s, variations d'intensité et d'angle à 0,330 et 0,485 s, contact à 0,745 s, révélation à 1,000 s, puis climax à 1,795 s. Au climax, les cinq barres progressent sur 240 ms, l'onde des arcs démarre 75 ms plus tard, Aura s'ouvre puis se résorbe, les bords et le fond reçoivent un halo très faible, et la caméra effectue un dolly maximal de 0,135 unité. Le groupe logo réalise un hit de 1,5 %, sans modification de géométrie ni de shader.

Le faisceau commence à sortir à 2,235 s et ses couches visibles atteignent zéro entre 2,535 et 2,615 s. À 2,650 s, seuls le logo et une Aura faible restent présents ; la respiration finale est limitée à ±4 % de l'opacité d'Aura.

Comparaison déterministe V3.1 / V3.2 à 1280 × 720, avec un pixel considéré éclairé au-dessus de 6/255 de luminance :

| Moment | Temps comparés | Couverture éclairée V3.1 | Couverture éclairée V3.2 | Évolution |
| --- | ---: | ---: | ---: | ---: |
| Anticipation / contact | 0,750 / 0,745 s | 1,93 % | 2,94 % | +52,3 % |
| Found | 1,200 / 1,200 s | 2,89 % | 6,73 % | +132,9 % |
| Climax | 1,800 / 1,795 s | 8,72 % | 11,17 % | +28,1 % |
| Résolution | 2,650 / 2,650 s | 16,71 % | 5,91 % | −64,6 %, sortie plus propre |

À 60 Hz, la cible du grand balayage passe de 7,07 à 11,94 px maximum par image, vitesse volontairement plus cinématographique mais toujours inférieure à 12 px/image. Le front spéculaire reste sur la fenêtre V3.1 de 0,72 à 2,18 s, avec un départ ramené à 0,72 dans l'espace UV pour rendre le contact lisible ; sa vitesse maximale descend de 16,33 à 10,44 px/image. Les captures V3.2 couvrent tous les transients, le found, la sortie et le final dans `.tmp/frontend-logo-webgl-v3-2-visuals/`, ainsi que les principaux moments portrait en 390 × 844 CSS.

La build production conserve l'accueil à 344 kB First Load JS. Le runtime asynchrone `sonic-3d` reste inchangé à 903 334 octets bruts / 236 041 gzip ; le code de scène V3.2 atteint 30 548 octets bruts / 8 677 gzip, soit 933 882 octets bruts / 244 718 gzip chargés uniquement lors de l'ouverture de l'intro.

Cette V3.2 reste une candidate locale non commitée et non déployée jusqu'à validation créative.
