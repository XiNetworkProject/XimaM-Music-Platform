# Phase 4B.3 — Profile Peek

Date : 12 septembre 2026
Statut : baseline 4B.3 validée visuellement et techniquement pour production

## Socle 4B.2 validé et déployé

- Commit : `949ef16c48321d6523cb7eca58663f661ed3e069` — `feat(ui): add context surface controller`.
- Branche : `migration/freebox-storage`, synchronisée avec `origin/migration/freebox-storage` au début de 4B.3.
- Release active : `/srv/apps/synaura/releases/949ef16c48321d6523cb7eca58663f661ed3e069`.
- `synaura.service` : `active/running`, zéro restart ; `synaura-deploy.timer` et `synaura-health.timer` actifs.
- `last-successful-sha` : `949ef16c48321d6523cb7eca58663f661ed3e069`.
- Santé publique : `/healthz`, `/`, `/live`, `/discover` et `/search` répondent 200.
- La candidate 4B.3 n'a modifié ni cette release ni l'infrastructure.

## Architecture

Profile Peek est le premier renderer métier du Context Surface Controller 4B.2. `ProfilePeekRegistration` enregistre globalement le type `profile-peek`, mais charge son renderer par `next/dynamic`, `ssr: false`. Les écrans consommateurs n'importent donc jamais la page Profile complète.

La chaîne est volontairement courte :

1. `useProfilePeek(origin)` rejette un username vide et le profil canonique déjà ouvert, puis délègue l'ouverture au contrôleur 4B.2 avec son déclencheur logique.
2. `ProfilePeekRegistration` charge à la demande `ProfilePeekSurface`.
3. `useProfilePeekData` interroge l'endpoint profil existant, normalise le contrat et le conserve dans un cache client borné.
4. `ProfilePeekSurface` rend exclusivement dans `SynauraOverlay` : drawer droit desktop, bottom sheet mobile.

Entrées branchées :

- Live : clip (avatar/identité), post (avatar et nom), morceau (nom d'artiste), spotlight (avatar, nom et CTA) ;
- Discover : identité et CTA des cards artiste ;
- Search : suggestions artiste et résultats profil.

Les deep links `/profile/[username]` restent des pages normales. Aucun clic global de profil n'est intercepté.

## Endpoint et données réutilisés

- Lecture : `GET /api/users/[username]`.
- État de suivi : `GET /api/users/[username]/follow` uniquement si le profil n'a pas déjà fourni cet état.
- Mutation existante : `POST /api/users/[username]/follow`.
- Lecture explicite : façade globale `useAudioPlayer().playTrack`.

Le Peek affiche uniquement l'identité publique réellement fournie : avatar, display name, handle, badge vérifié, rôle utile, bio courte, followers, nombre de titres, écoutes et jusqu'à trois morceaux publics récents. Aucune Aura ou statistique inventée n'est ajoutée. Les URLs média historiques Cloudinary sont normalisées vers le domaine public Synaura existant.

Les statuts couverts sont `loading`, `loaded`, `missing`, `inaccessible` et `error`. Un profil absent ou inaccessible ne démonte jamais Live. Le contrat backend ne fournit pas actuellement d'état public `private/limited` distinct ; la candidate ne l'invente pas et traite correctement un éventuel 401/403 comme inaccessible.

## Cache et chargement lazy

- Cache en mémoire par username normalisé et par ID.
- TTL : 5 minutes.
- Déduplication des requêtes simultanées par clé.
- Première ouverture : une requête profil.
- Card inactive : zéro requête profil.
- Réouvertures chaudes : zéro requête profil supplémentaire sur 20 cycles.
- Le cache est mis à jour après une mutation follow.

Le renderer détaillé constitue un chunk lazy d'environ 9,7 kB non chargé avant ouverture. Il n'importe pas `app/profile/[username]/page.tsx`.

## Synchronisation follow

`profilePeekClient.ts` fournit un external store commun basé sur `useSyncExternalStore`. `FollowButton`, la route Profile complète et le Peek lisent et mutent la même entrée normalisée par username. La mutation n'est pas optimiste : l'état et le compteur sont publiés seulement après succès du POST existant, ce qui évite une divergence en cas d'échec réseau.

Après une mutation dans le Peek, les consommateurs déjà montés reçoivent immédiatement le nouvel état. À l'ouverture ultérieure de la route Profile, le même store reste la source de vérité sans refresh complet.

## AudioCore

Ouvrir, fermer, Escape et Back n'appellent aucune commande audio. La gate Live a confirmé, avant/après : même `instanceId`, même `trackId`, même playback state, même position, même autorité secondaire et aucune lecture implicite.

Chaque ligne de morceau expose un bouton nommé `Écouter …`. Cette action explicite appelle uniquement `playTrack` sur l'Audio Core global. La gate a remplacé la piste active par la piste choisie, puis confirmé que fermer le Peek n'annule ni la piste ni sa lecture. Aucun `Audio`, lecteur secondaire, queue locale, seek ou pause n'est créé dans le Peek.

## Continuité Live et history

Scénario automatisé sur le composant Live réel avec réponses publiques de production :

- ouverture depuis `live-clip-profile-*` ;
- même `activeItemId`, filtre `Clips`, `scrollTop` et état Audio Core pendant l'ouverture et après Escape ;
- restitution du focus au déclencheur Live exact ;
- aucune erreur console, proxy ou requête échouée pendant l'ouverture/fermeture du Peek ;
- CTA vers `/profile/ximamoff` après suppression de la pile contextuelle ;
- Back vers Live avec le même item et le même filtre via le contrat 4B.1.

Tant que le Peek reste au-dessus de Live, aucun snapshot de route 4B.1 n'est créé. Le snapshot existant est enregistré uniquement lorsque le CTA quitte réellement Live.

## Responsive et accessibilité

| Cas | Mesure |
|---|---:|
| Mobile 390×844 | sheet 390 × 692,1 px (82 vh), scroll interne, safe area |
| Desktop 1440×900 | drawer 432 px |
| Desktop 1920×1080 | drawer 480 px |
| Plus petit touch target | 44 px |

Le dialog est nommé par son `h2`. Après le skeleton, le focus initial va à la région d’identité sans afficher de ring artificiel ; les vrais `:focus-visible` clavier restent présents sur les contrôles. Tab/Shift+Tab restent piégés par la primitive, Escape et Back ferment la surface, puis le focus revient au déclencheur logique. La primitive 4B.2 conserve le zoom 200 %, reduced motion, scroll lock et fallback vers le conteneur Live pour un trigger virtualisé. Le CTA reste visible dans un footer fixe et le contenu défile indépendamment.

La passe 4B.3.1 conserve le CTA secondaire supérieur uniquement sur desktop et le CTA sticky inférieur uniquement sur mobile. Le backdrop reste sombre avec un blur réduit à 1 px. À 390×844, le scroll container réserve 144 px plus la safe area ; au scroll maximal, le dernier morceau reste 68,1 px au-dessus du footer.

Le harness 4B.2 demeure neutre. Les routes `/dev/profile-peek`, `/dev/live` et `/dev/discover-profile-peek` sont des outils de mesure séparés, tous protégés par `notFound()` dans un build production.

## Performance

Mesure reproductible : `npm run test:profile-peek:perf`, Chromium avec mémoire précise, profil public de production, réseau froid contrôlé à 650 ms et 20 cycles chauds.

| Mesure | Résultat |
|---|---:|
| Ouverture du shell | 71,3 ms |
| Chargement froid, délai réseau 650 ms inclus | 1 494,5 ms |
| Réouverture chaude p50 | 15,3 ms |
| Réouverture chaude p95 | 43,5 ms |
| Requêtes profil première ouverture | 1 |
| Requêtes profil sur 20 réouvertures | 0 |
| DOM fermé / ouvert / après 20 cycles | 237 / 329 / 237 |
| Delta DOM après fermeture | 0 |
| Heap après GC, delta 20 cycles | +532 184 octets (+0,51 MiB) |
| Transfert supplémentaire pendant 20 cycles | 30 300 octets |
| First Load JS partagé | 334 kB, inchangé |
| `/live` First Load JS | 420 kB, +7 kB (+1,7 %) vs 4B.2 |

Le delta de ressources du harness correspond à des revalidations de session/Next en mode développement ; aucune requête profil supplémentaire n'est émise. La fenêtre de slides Live demeure virtualisée à ±5 selon la suite 4B.1.

## Captures

- `docs/profile-peek-phase4b3-captures/desktop-live-context-1440x900.png`
- `docs/profile-peek-phase4b3-captures/desktop-live-context-1920x1080.png`
- `docs/profile-peek-phase4b3-captures/desktop-discover-context-1440x900.png`
- `docs/profile-peek-phase4b3-captures/desktop-search-context-1440x900.png`
- `docs/profile-peek-phase4b3-captures/mobile-closed-390x844.png`
- `docs/profile-peek-phase4b3-captures/mobile-loading-390x844.png`
- `docs/profile-peek-phase4b3-captures/mobile-open-390x844.png`
- `docs/profile-peek-phase4b3-captures/mobile-scrolled-390x844.png`
- `docs/profile-peek-phase4b3-captures/mobile-live-context-390x844.png`

Les captures montrent le même renderer sur un clip Live, une card Discover, une suggestion Search et le harness mobile. Le drawer reste adjacent au contenu ; la sheet garde identité, follow, morceaux et CTA dans la hiérarchie Synaura.

## Validation

- `npm run type-check` : OK.
- `npm run test:profile-peek` : 12/12.
- `npm run test:profile-peek:perf` : PASS, aucune erreur console.
- `npm run test:profile-peek:live` : PASS ; Live, route canonique, Back, Search, Discover, lazy queries et explicit play couverts.
- `npm run test:context-surfaces` : 14/14.
- `npm run test:live-continuity` : 14/14.
- `npm run test:audio-core` : 35/35.
- `npm run test:frontend-foundation` : 9/9.
- `npm run build` : OK.
- `git diff --check` : OK.

## Périmètre de la candidate

La baseline 4B.3 n’inclut aucun fichier natif, contrat DB, Comments, waveform ou redesign du feed. Les modifications utilisateur préexistantes et les artefacts hors périmètre restent intacts et hors de toute opération Git.
