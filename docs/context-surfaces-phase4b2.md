# Phase 4B.2 — Context Surface Controller

Date : 11 septembre 2026
Statut : candidate validée par la gate finale, prête au commit et au déploiement

## Checkpoint Phase 4B.1 déployé

- Commit : `b1a1125b56b2b67c22648181807d413efa0a0b92` — `feat(live): preserve navigation continuity`.
- Branche canonique : `migration/freebox-storage`.
- Release active : `/srv/apps/synaura/releases/b1a1125b56b2b67c22648181807d413efa0a0b92` via le symlink atomique `current`.
- Déploiement : timer et service Freebox canoniques, build et preflight réussis, `APPLICATION SAINE` dans le journal.
- Santé : service `synaura.service` actif, timer actif, HTTP local 200 et HTTPS public 200.
- Console du parcours authentifié : aucune erreur relevée.

### Matrice de continuité production authentifiée

| Viewport | Parcours | Résultat |
|---|---|---|
| Desktop 1440×900 | Track → Back | `track-track_1760177722242_ncxnxarlh` restauré en 120 ms ; item 11, pas item 0 ; audio 0:34 → 1:15 |
| Desktop 1440×900 | Profile → Back | même item 11 ; même piste `Ain't in Kansas Anymore` ; audio 0:01 → 0:23 |
| Desktop 1440×900 | Library → Back | même item 11 ; même piste et queue ; audio 0:23 → 0:47 |
| Desktop 1440×900 | Messages → Back | même item 11 ; même piste et queue ; audio 0:47 → 1:14 |
| Mobile 390×844 | filtre Clips → Profile → Back | même `clip-ef95a5d4-d7e9-4ef6-bbc2-26512627e9ed` ; filtre Clips toujours pressé |

Le tail frais du feed est passé de 14 à 21 entrées sans déplacer l’ancre restaurée. Aucun reset de queue, replay item 0 ou erreur console n’a été observé. AudioCore n’a pas été modifié par 4B.1.

## Architecture 4B.2

Le moteur se compose de trois couches volontairement petites :

1. `lib/contextSurfaces.ts` porte le contrat sérialisable, la validation, les transitions de pile et la politique URL.
2. `ContextSurfaceProvider` conserve uniquement la pile courante, les déclencheurs de focus et un registre de renderers. Il est monté au-dessus des transitions de page, sans entrer dans `app/providers.tsx` ni dans AudioCore.
3. `ContextSurfaceHost` rend exactement un `SynauraOverlay`. Le contenu métier est enregistré séparément et ne connaît pas la présentation responsive.

La surface de démonstration `context-surface-demo` est disponible uniquement dans `/dev/ui`. Cette route appelle `notFound()` en production. Aucun Profile Peek, Comments unifié ou faux produit n’est exposé.

## Contrat d’état

```ts
type ContextSurfaceEntry = {
  surface: string;
  entityType: string;
  entityId: string | null;
  origin: 'live' | 'discover' | 'search' | 'other';
  presentation: 'auto' | 'drawer-right' | 'sheet' | 'modal';
  returnSnapshotId: string | null;
  historyKey: string;
};
```

Les tokens sont bornés avant lecture depuis `history.state`. La pile est limitée à trois niveaux. Une ouverture identique et une ouverture au-delà de cette limite remplacent le sommet au lieu de créer une boucle.

## Modèle history et background location

- Une ouverture normale pousse une entrée avec la même URL et conserve intégralement l’état Next existant.
- `replaceSurface` remplace le sommet et conserve son `historyKey` ainsi que le déclencheur d’origine.
- Back retire d’abord le sommet contextuel. Deux surfaces justifiées reviennent donc niveau par niveau avant toute navigation normale.
- Un changement réel de pathname vide le contrôleur ; la route canonique reste la vérité pour un deep link direct.
- Le marqueur inclut `backgroundPath`. Un état stale, mal formé ou appartenant à un autre pathname est ignoré sans crash.
- Aucune ouverture contextuelle n’appelle `router.push`, ne change de query/hash et ne crée un snapshot Live complet.

Politique URL de cette phase : les interactions transitoires ne modifient jamais l’URL. Une entité partageable conserve une route canonique (`/profile/:id`, `/track/:id`, `/playlists/:id`, `/posts/:id`) mais la surface courte ne l’intercepte pas encore.

## Présentations responsive

| Largeur | Présentation | Mesure réelle |
|---|---|---|
| 390×844 | bottom sheet, safe area, scroll interne | 390 px de large, 743 px de haut |
| 768–1439 | drawer droit | `clamp(380px, 30vw, 480px)` |
| 1440×900 | drawer droit | 432 px |
| 1920×1080 | drawer droit | 480 px |

`SynauraOverlay` reste propriétaire du backdrop, de la sémantique dialog, des animations et de la pile d’overlays. Aucun backdrop parallèle n’a été ajouté. Le panneau métier ne reçoit aucune information de breakpoint.

## Intégration Live 4B.1

Le provider global laisse Live, Discover ou Search monté derrière une surface ouverte. Live expose seulement un point de repli focus `data-context-surface-origin="live"`. Le contrôleur ne lit ni ne modifie `activeItemId`, le filtre, le scroll ou le buffer virtualisé.

Si une action future quitte réellement Live, elle continuera d’utiliser le snapshot 4B.1 existant ; `returnSnapshotId` est transporté dans le contrat, sans duplication de la logique de persistance.

## Invariants AudioCore

Le contrôleur n’importe ni `AudioCore`, ni `useAudioPlayer`, ni aucune commande audio. Open, replace, close, Back et Escape ne font aucun `play`, `pause`, `seek`, `setQueue` ou remplacement de source. Le build candidat laisse `/live` à 413 kB First Load JS et le bundle partagé à 334 kB, identiques à la release 4B.1.

## Focus et scroll

- Le premier focus entre dans le dialog ; la fermeture explicite, Escape et Back reviennent au déclencheur exact.
- Après `replace`, le niveau conserve le même `historyKey`, donc le focus final revient au déclencheur initial et non à une commande interne devenue stale.
- Après Back d’une surface imbriquée, le focus revient au déclencheur logique recréé dans la surface précédente.
- Si le déclencheur Live a été virtualisé, le focus retombe sur le conteneur `data-testid="synaura-scroll-feed"`.
- Tab depuis le dernier contrôle boucle sur Fermer ; Shift+Tab depuis Fermer boucle sur le dernier contrôle.
- Le body, `.app-scroll-container` et le feed Live sont verrouillés par la primitive Phase 3. Les valeurs inline précédentes sont restaurées au dernier close.
- Le drawer/sheet a un scroll interne unique et `overscroll-contain`; le sheet inclut `env(safe-area-inset-bottom)`.

## Performance

Mesure reproductible : `npm run test:context-surfaces:perf`, Chromium headless précis, 20 cycles, build/dev local chaud.

| Mesure | Résultat |
|---|---:|
| Ouverture DOM p50 | 13,6 ms |
| Ouverture DOM p95 | 62,2 ms |
| Nœuds fermé / ouvert / après 20 cycles | 389 / 445 / 389 |
| Delta nœuds après fermeture | 0 |
| Requêtes avant / après | 30 / 30 |
| Delta requêtes | 0 |
| Heap après GC, delta 20 cycles | +769 539 octets (+0,73 MiB) |
| First Load JS partagé | 334 kB, inchangé |
| `/live` First Load JS | 413 kB, inchangé |

La démo ajoute 56 nœuds uniquement lorsqu’elle est ouverte. Aucun import Profile, Comments, AI Generator ou Library n’entre dans le contrôleur. Le test 4B.1 confirme toujours la fenêtre virtualisée ±5.

## Accessibilité

Validé automatiquement et dans le harness :

- `role="dialog"`, `aria-modal`, nom accessible et titre ;
- focus initial dans la surface ;
- Tab, Shift+Tab, Escape, bouton de fermeture et Back ;
- restauration exacte du focus, y compris après replace et Back imbriqué ;
- reduced motion hérité de `useReducedMotion` ;
- touch targets canoniques ;
- bottom sheet 390×844, safe area et scroll indépendant.

La gate finale reproductible a validé Tab, Shift+Tab, Escape, Back, focus exact, replace, pile imbriquée, reduced motion et zoom navigateur à 200 %. À 200 %, la surface reste visible sans overflow horizontal. La simulation du visual viewport réduit à 390×520 confirme que la sheet et son contrôle de fermeture restent accessibles ; le harness ne comporte pas de champ métier permettant de déclencher un vrai clavier iOS/Android. L’annonce VoiceOver/NVDA sera complétée avec le premier contenu métier réel.

## Tests

- `npm run type-check` : OK.
- `npm run test:context-surfaces` : 14/14.
- `npm run test:context-surfaces:gate` : OK ; 0 erreur console, 0 appel média play/pause, scroll stable.
- `npm run test:frontend-foundation` : 9/9.
- `npm run test:audio-core` : 35/35.
- `npm run test:live-continuity` : 14/14.
- `npm run build` : OK.
- `git diff --check` : OK dans la passe finale.

Scénarios navigateur validés : open, replace, close, Back imbriqué, Escape, Tab/Shift+Tab, focus restore, fond monté, verrouillage du scroll, sheet mobile 390×844, drawer 1440 et 1920. Les tests contractuels couvrent aussi stale state, direct route, politique URL, limite de pile, reduced motion, absence de commandes AudioCore et absence de snapshot Live dupliqué.

## Captures

- `docs/context-surfaces-phase4b2-captures/desktop-drawer-1440x900.png`
- `docs/context-surfaces-phase4b2-captures/mobile-sheet-390x844.png`

La candidate 4B.2 reste locale jusqu’au commit contrôlé. Aucun contenu métier Profile ou Comments n’est inclus dans ce checkpoint.
