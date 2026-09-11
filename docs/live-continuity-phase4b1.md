# Phase 4B.1 — Live Continuity Contract

Date : 11 septembre 2026
Révision de départ : `15f873a2` (`migration/freebox-storage`)
Statut : candidate locale, non commitée et non déployée

## Résultat

Le retour navigateur vers Live est désormais ancré par `activeItemId` et restitue avant toute reprise automatique le filtre, la sous-source, le préfixe hybride déjà vu, le curseur, `hasMore`, la frontière vue, le décalage de scroll et le draft temporel éventuel. AudioCore n'est ni modifié ni repersisté par ce mécanisme.

Le feed canonique reste `components/home/SynauraScroll.tsx`. Aucun feed historique, écran natif, design de card, intro, Discover ou système de commentaires n'a été étendu.

## Baseline authentifiée avant modification

Environnement : application Next locale avec le compte E2E existant, reliée par tunnel à la base de production faute de base de test disponible. Les seules écritures produites sont l'activité normale et bornée de ce compte de test (impressions/lectures); aucun contenu métier n'a été créé. Aucun secret n'a été affiché ou écrit dans le dépôt.

| Viewport | Parcours | État avant |
|---|---|---|
| 1440×900 | Live, item hybride post → Track → Back | retour au prélude après 11 841 ms, item et ordre perdus |
| 390×844 | Live, filtre Clips, clip `Dans mon univers (1)` → Track → Back | retour au prélude après 11 831 ms, filtre et clip perdus |
| desktop/mobile | Library, Notifications, Messages, Profile, Track | routes authentifiées réellement ouvertes; AudioCore survivait aux transitions SPA mais Live ne savait pas se reconstruire |

La baseline a aussi confirmé la présence réelle de tracks, posts et clips dans le même univers de navigation. Le défaut n'était donc pas déduit du code seul.

## Architecture

Le contrat est contenu dans `lib/liveContinuity.ts` et reste volontairement spécialisé à Live.

```text
entrée history Live
  └─ synauraLiveSnapshotId
       ├─ LiveNavigationSnapshot (petit contrat, session courte)
       └─ LiveFeedCache (objets nécessaires au rendu immédiat, cache séparé)

Live → route plein écran
  1. sauvegarde synchrone du contexte Live
  2. router.push / Link normal
  3. AudioCore global continue indépendamment

Back → Live
  1. lecture de l'association history.state
  2. validation version + TTL
  3. reconstruction du préfixe vu depuis le cache
  4. recherche de activeItemId
  5. montage de la fenêtre ±5
  6. scroll `auto` + offset + focus
  7. tracking, pagination, reranking et autoplay débloqués
```

Il n'existe ni pile artificielle ni store global générique. `history.replaceState` enrichit l'état Next existant sans l'écraser. Le clic, `pagehide` et un debounce de 80 ms couvrent les navigations issues du composant ou de ses enfants.

## État sauvegardé

| Champ | Rôle |
|---|---|
| `snapshotId`, `historyKey` | association exacte à l'entrée Live |
| `feedMode`, `version` | compatibilité du contrat |
| `filter`, `source` | filtre et sous-source track/clip |
| `exactItemOrder` | ordre des IDs connu au départ |
| `activeItemId` | ancre principale; l'index n'est jamais l'identité |
| `scrollOffsetWithinItem` | restitution fine autour de l'ancre |
| `cursors.tracks`, `hasMore.tracks` | reprise de pagination |
| `frozenSeenBoundary` | préfixe déjà consommé non rerankable |
| `draftRefs` | références vers les drafts bornés user+entity |
| `contextSurface` | prélude ou feed |

Les snapshots expirent après 30 minutes et quatre contextes maximum sont conservés. Les accès `sessionStorage` sont protégés contre indisponibilité/quota : la navigation immédiate continue grâce au cache mémoire et ne peut pas être bloquée par une exception de stockage.

Le cache de rendu complet est séparé du snapshot. Ce compromis évite d'alourdir le contrat tout en permettant une première frame exacte avant les réponses réseau. Lors de la réconciliation, seul le préfixe jusqu'à `frozenSeenBoundary` reste gelé; le tail frais peut ensuite être reranké.

## État volontairement non sauvegardé

- état AudioCore, queue, temps, pause/play : AudioCore en reste l'unique autorité;
- réponses React Query ou cache réseau générique : pas de seconde vérité;
- objets feed dans le snapshot : ils vivent dans `LiveFeedCache` séparé;
- résultats Search, tabs Library/Notifications et état interne Messages : états propres à leurs routes;
- overlays futurs : Phase 4B.2, hors périmètre;
- likes/follows optimistes : contrats métier existants, pas état de navigation Live.

## AudioCore

La restauration pose `suppressRestoredAutoplayRef` avant le premier rendu utile. Elle ne contient aucun appel à `setQueueAndPlay`, `playIndex`, `seek`, `play` ou `pause`. L'effet d'autoplay, le seek d'offset clip, les impressions, la pagination et le reranking attendent `continuitySettled`.

La première interaction utilisateur qui change réellement d'item libère l'autoplay normal. Un clic explicite sur la card restaurée reste autorisé. Les fichiers de `lib/audio`, le provider et les hooks AudioCore ne sont pas modifiés.

Observations E2E :

- mobile Track → Back : `Papa t'es ou`, 0:50 → 1:15, même ID;
- desktop Profile → Back : `Sébastien et Yve à Espace Centre`, 0:12 → 0:24, même ID;
- desktop Library → Back : 0:33 → 0:45, même ID;
- desktop Messages → Back : 0:53 → 1:04, même ID;
- scénarios de mesure finale : 0:35 → 0:46 mobile et 0:57 → 1:08 desktop;
- aucun changement de piste, reset de queue, seek ou nouvel événement play attribuable au chemin de restauration n'a été observé dans la trace finale.

Les doubles appels `/plays` observés pendant le défilement rapide de la baseline concernent le parcours autoplay historique, avant Back; le chemin de restauration est bloqué avant autoplay et n'en émet pas. Leur refonte éventuelle reste hors du contrat 4B.1.

## Stale, miss et restauration partielle

- sans association history : `restore-miss`, feed frais;
- version invalide ou TTL expiré : purge puis `restore-miss`;
- cache absent/incomplet : `restore-partial`, revalidation réseau et recherche de l'ID;
- ancre réellement disparue : fallback propre sur l'item 0, sans exception;
- succès : `restore-success`.

La télémétrie développement ne contient que le type d'événement et une raison bornée, jamais d'ID utilisateur, contenu, draft ou URL signée. Une garde d'initialisation évite le double reporting sous React Strict Mode.

## Mini-player

| Route | Visible | Justification |
|---|---:|---|
| Live, Swipe | non | player immersif équivalent |
| Notifications | oui | correction 4B.1 : aucun conflit média |
| Messages inbox | oui | aucun média secondaire permanent |
| Conversation | non | notes vocales/média secondaire coordonné |
| Upload | non | preview audio secondaire réelle |
| Clip create | non | édition vidéo/audio secondaire |
| Create / variation | non | workflow de création avec média secondaire |
| AI Generator, Studio | oui | AudioCore global et previews déjà coordonnés |
| Track, Profile, Library, Search | oui | contrôle compact requis pendant la lecture globale |

Seule l'exclusion clairement incorrecte de Notifications a été retirée.

## Performance et accessibilité

| Mesure | Avant | Candidate |
|---|---:|---:|
| première frame correcte desktop | item perdu après 11 841 ms | 96 ms, premier ID observé déjà correct |
| première frame correcte 390×844 | item perdu après 11 831 ms | 147 ms, premier ID observé déjà correct |
| slides montées item 9 | non mesuré | 11, soit l'ancre ±5 |
| slots feed item 9 | non mesuré | 14 à 20 selon revalidation/pagination |
| nœuds DOM item 1 / item 9 | non mesuré | 578 / 865 dans la session locale |
| requêtes par card inactive | follow/waveform déclenchés par slides tampon | 0 pour FollowButton et waveform post inactifs |
| appels queue AudioCore au restore | non contractualisé | 0 par construction et test ciblé |
| mauvais ID avant l'ancre | item 0/prélude | aucun dans l'échantillonnage 20 ms |

Le temps total retourné par l'opération `goBack` du harness local reste proche de 10 s sur certaines routes à cause de son attente de stabilisation et des compilations Next dev; il ne représente pas la frame utilisateur. La mesure concurrente ci-dessus isole la première apparition DOM correcte.

La mémoire JS et un compteur fiable de dropped frames ne sont pas exposés par ce harness navigateur. Aucun chiffre n'est inventé. Les contrôles indirects disponibles sont : DOM borné, absence de nouvelle dépendance, aucun contenu inactif monté hors ±5, première frame à 96/147 ms et console sans erreur après la candidate.

Après restauration, le conteneur Live reçoit le focus avec `preventScroll`, porte un nom accessible et conserve les commandes clavier. Le repositionnement utilise toujours `auto`, indépendamment de reduced motion. Un écran neutre `aria-busy` empêche le lecteur d'écran ou l'œil de rencontrer brièvement l'item 1. Les boutons desktop précédent/suivant et ouvrir le morceau ont désormais un nom accessible.

## Tests

### Automatisés

`npm run test:live-continuity` couvre :

- save/restore;
- les cinq filtres;
- ancre par ID;
- ordre hybride et tail frais;
- curseur/`hasMore`;
- stale/miss;
- cache/ancre manquants;
- stockage indisponible;
- association history et route → Back;
- borne de quatre snapshots;
- draft user+entity;
- restauration avant autoplay;
- AudioCore/queue inchangés;
- absence de transient item 0;
- buffer ±5 et ancre E2E;
- matrice mini-player.

Résultat : 14/14 scénarios ciblés passés. `npm run test:audio-core` passe également 35/35. TypeScript et `git diff --check` passent.

### E2E navigateur authentifié

| Scénario | Résultat |
|---|---|
| mobile, item track 9 → Track → Back | même ID, préfixe vu identique, audio continu |
| mobile, filtre Clips item 4 → Track → Back | même clip, filtre `Clips`, préfixe identique |
| desktop, item track 9 → Profile → Back | même ID, filtre, préfixe et focus |
| desktop, item track → Library → Back | même ID, audio continu |
| desktop, item track → Messages → Back | même ID, audio continu |
| Search / Notifications / Create / AI Generator | routes authentifiées ouvertes pendant baseline; sauvegarde avant toute intention de navigation et cas history couverts automatiquement |

Le navigateur d'audit avait une pile très polluée après les navigations directes de baseline; son action Back peut sauter certaines entrées SPA imbriquées. Les preuves déterministes finales reposent donc sur les parcours SPA Track/Profile/Library/Messages, les scénarios mobile/desktop et le test pur de l'association `history.state`. Aucun échec applicatif n'a été masqué comme succès.

Captures authentifiées :

- [desktop, retour item 9](./live-continuity-phase4b1-captures/desktop-return-item-9.png)
- [mobile 390×844, retour item 9](./live-continuity-phase4b1-captures/mobile-return-item-9.png)

## Fichiers Phase 4B.1

- `lib/liveContinuity.ts`
- `components/home/SynauraScroll.tsx`
- `components/home/ScrollPostSlide.tsx`
- `lib/routeChrome.ts`
- `tests/live-continuity-phase4b1.test.mjs`
- `tests/audio-core-routing.test.mjs`
- `package.json`
- ce document et ses deux captures

Les modifications natives, Play Store, Capacitor, `.claude`, `supabase/.temp` et les artefacts antérieurs restent hors périmètre et intacts.

PHASE 4B.1 LIVE CONTINUITY CANDIDATE READY
