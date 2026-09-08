# Synaura Frontend Foundation — Phase 3

Ce document est le contrat de construction des interfaces Synaura. Il décrit le socle adopté pendant la Phase 3, pas le redesign final des expériences produit.

## Direction et principes

Synaura utilise une profondeur sombre ou chaude, le violet comme accent principal, le cyan pour l'énergie et le corail avec parcimonie. Les surfaces doivent rester musicales, tactiles et respirantes : hiérarchie nette, peu de variantes, contraste lisible, mouvement expressif seulement quand il explique un changement.

Principes :

- une seule grammaire sémantique `--syn-*` ;
- le contenu musical domine le chrome ;
- les actions principales sont évidentes mais peu nombreuses ;
- chaque écran conserve un état utile en chargement, vide, erreur ou hors ligne ;
- desktop et mobile partagent la hiérarchie produit, avec des représentations adaptées ;
- l'audio persistant reste au niveau des providers globaux et ne dépend jamais d'une transition de page.

## Inventaire et décision

| Système | Classement | Décision |
| --- | --- | --- |
| `syn-*` + `SynauraShell` | A — cible | Fondation canonique web musicale |
| Atmosphères, violet/cyan/corail, Aura, motion musicale | B — intégrer | Conservés via tokens et primitives |
| Variables Suno, `panel-suno`, couleurs brutes historiques | C — legacy | Compatibilité maintenue, migration au fil des pages |
| `UnifiedUI` de l'AI Generator | C — façade de compatibilité | API conservée ; overlays redirigés vers le socle commun |
| Meteo, Star Academy, campagnes | D — sous-produits | Identité visuelle autonome, fondations techniques partagées au besoin |
| Admin | D — outil fonctionnel | Pas d'habillage immersif forcé |

L'audit a trouvé des couleurs/surfaces/radii codés localement, plusieurs implémentations de modales et des z-index arbitraires. Les suppressions massives sont volontairement reportées.

## Tokens

Les tokens vivent dans `app/globals.css` et sont exposés à Tailwind par `tailwind.config.js`.

- surfaces : `background`, `surface`, `surface-muted`, `elevated-surface`, `soft`, `soft-strong` ;
- texte : `text-primary`, `text-secondary`, `text-translucent` ;
- action : `accent`, `accent-blue`, `accent-coral`, `accent-gold`, `selected` ;
- statut : `success`, `warning`, `destructive`, `focus` ;
- structure : border, spacing 1–6, radii sm–xl, trois niveaux d'ombre et glow ;
- mouvement : fast 150 ms, standard 220 ms, expressive 360 ms, easing standard/exit ;
- couches : header 40, dock 60, popover 80, overlay 200, toast 300.

Les thèmes clair et sombre redéfinissent les rôles, pas les composants. Une nouvelle page ne doit pas créer une seconde palette.

## Typographie

Inter reste la police UI et JetBrains Mono la police de temps, waveform et valeurs techniques. Échelle recommandée : 12 px pour métadonnées, 14–16 px pour corps/contrôles, 18–24 px pour sections, 32–40 px maximum pour titres de page. Les titres et identités utilisent `font-black`, le corps une hauteur de ligne d'environ 1,5. Toujours prévoir troncature ou retour à la ligne pour français, titres et usernames longs ; jamais dimensionner une carte à partir de la longueur du texte.

## Arbre applicatif et shell

```text
Root layout
├── Theme + global providers
│   ├── session / query / audio persistant
│   └── route content
│       └── PageTransition
├── #synaura-overlay-root
└── SynauraToastViewport
```

`SynauraAppShell` porte le fond, l'atmosphère, le contenu borné, les safe areas et le dock. `SynauraTopBar` et `SynauraRouteNav` sont les chromes canoniques. Les pages ne doivent plus recréer un host de toast, un portal ou un lecteur global.

## Navigation et chrome de route

La navigation primaire est Home, Discover, Create, Library, Profile. Desktop et mobile consomment `PRIMARY_WEB_NAV_ITEMS`. Messages, Notifications, Clips et Community sont secondaires. Les destinations du compte sont centralisées dans `ACCOUNT_WEB_NAV_ITEMS`.

`getRouteChrome()` classe chaque route : `immersive`, `standard`, `wide`, `studio`, `auth-public`, `subproduct` ou `admin`. Ce contrat décide sidebar, recherche, dock, padding joueur et notice globale. Une exception doit être ajoutée ici, pas dispersée dans plusieurs layouts.

Le dock mobile conserve des cibles tactiles compactes et réserve l'espace du mini-player et de `env(safe-area-inset-bottom)`. Les vues studio/immersives peuvent masquer certains éléments, mais pas reconstruire la hiérarchie produit.

## Primitives

- `SynauraPrimitives.tsx` : Button, IconButton, Input, Textarea, Select, Checkbox, Switch, Slider, Tabs, Badge, Surface ;
- `SynauraContentCard.tsx` : frame média et surface générique pour track, playlist, creator, album, post, clip, recommendation et statistic ;
- `SynauraStates.tsx` : page/inline loading, skeletons card/track/profile, états empty/error/offline/permission/auth/deleted/partial ;
- `SynauraOverlay.tsx` : modal, drawer, sheet, responsive overlay et confirmation ;
- `SynauraPopover.tsx` : popover et context menu légers, avec fermeture extérieure/Escape ;
- `lib/ui/notifications.ts` + `SynauraToastViewport.tsx` : store léger de feedback, rendu par un seul viewport global ; le centre de notifications conserve une réexportation compatible.

Les variants d'action sont limités à primary, accent, secondary, ghost et danger. Un bouton icon-only exige un libellé. Un champ reçoit label, hint et error plutôt qu'un message voisin non relié.

## Overlays

Tous les overlays utilisent le portal racine et la même pile. Ils gèrent : dialog ARIA, focus initial, piège de focus, Escape uniquement sur l'overlay supérieur, restauration du focus, backdrop, scroll lock imbriqué et retour navigateur optionnel. Desktop privilégie modal/drawer ; mobile privilégie sheet. `UnifiedUI` et le drawer du Studio passent par ce socle sans changer leur logique métier.

Pour un nouvel overlay, fournir un `SynauraOverlayTitle` et, si utile, une `SynauraOverlayDescription`. Ne jamais ajouter un `document.body.style.overflow` ou un écouteur Escape page par page.

## États et dégradation partielle

`loading`, `empty`, `error` et `offline` sont quatre états distincts. Un échec secondaire doit rendre un `SynauraState compact` dans sa section et laisser le reste de la page fonctionner. Les CTA expliquent l'étape suivante : découvrir, créer, réessayer ou se connecter. Les spinners fonctionnels portent `data-motion-essential="true"`.

## Responsive et médias

La grille doit être vérifiée à 320, 390, 430, tablette, 1024, 1440 et 1920 px. Préférer `min-w-0`, grilles fluides et overflow local explicite. Les éléments fixed réservent la safe area ; dock et mini-player ont des espaces dédiés. Les overlays utilisent `dvh` et restent scrollables.

Les nouvelles images de contenu passent par `SynauraMediaFrame` ou `next/image` avec dimensions/sizes, `object-cover`, alt utile et fallback. Les avatars décoratifs utilisent un alt vide. Le chantier de transcoding reste hors Phase 3.

## Accessibilité

Le zoom navigateur est autorisé. Le focus visible global utilise `--syn-focus`. Les contrôles tactiles visent 44 px, les navigations ont un landmark/libellé, les dialogs une identité accessible et les statuts `status` ou `alert`. Tester au clavier : Tab/Shift+Tab, Enter/Espace, Escape, fermeture/restauration du focus et absence de focus derrière un overlay.

`prefers-reduced-motion` retire les déplacements et transitions décoratives presque instantanément, mais conserve les indicateurs de progression essentiels. `SYNAURA_MOTION` centralise les valeurs utilisées en JavaScript ; les tokens CSS couvrent les interactions simples.

## Transitions et performance

`PageTransition` applique une entrée subtile de 6 px/220 ms et reste sous le provider audio. Il ne remonte donc ni lecteur ni providers. Éviter Framer Motion pour un simple hover CSS ; il est réservé aux overlays et séquences structurantes. La Phase 3 ajoute un seul host de toast et aucun provider global.

Mesure de contrôle : le nombre de fichiers important Framer Motion reste stable à 92 avant/après, les providers globaux restent inchangés, et le CSS global passe de 112 555 à 112 998 caractères (net +443). Le build Phase 3 produit un chunk partagé de 301 kB ; Home 376 kB, Messages 350 kB, AI Generator 398 kB et Studio 362 kB au premier chargement. Le viewport de toast est séparé du centre de notifications lourd afin de ne pas l'ajouter au shell global.

## Créer une nouvelle page

1. Choisir le type de route dans `routeChrome` seulement si le comportement existant ne convient pas.
2. Utiliser `SynauraAppShell`, puis TopBar/RouteNav selon le contrat.
3. Construire avec les tokens et primitives ci-dessus.
4. Définir loading, empty, error et dégradation de section avant de brancher les données.
5. Vérifier clavier, zoom, thème sombre/clair, 320 px et 1440 px.
6. Ajouter un exemple au laboratoire `/dev/ui` si une primitive change. Cette route renvoie 404 en production.

## Exceptions et dette restante

L'AI Generator, le Studio et les grandes pages historiques conservent encore des styles bruts ; seule l'intégration fondation nécessaire a été faite. TikTokPlayer, Profile, Library, Upload et les conversations ne sont pas découpés artificiellement. Les systèmes Meteo/Star Academy/admin restent distincts. Les z-index et `<img>` legacy seront migrés au fil des redesigns.

Storybook n'est pas retenu : le laboratoire interne est plus léger et suffit à cette étape. ESLint est reporté : la commande Next actuelle est interactive et activer une configuration globale sans campagne de correction créerait un signal rouge peu exploitable. Les tests Phase 3 contrôlent les contrats critiques sans ajouter axe-core ni infrastructure lourde.
