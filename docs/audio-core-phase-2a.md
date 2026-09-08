# Phase 2A — Audio Core

## Périmètre et point de retour

- Point de départ vérifié : `c744b4fbdc1b83544a55d1975bfcd1e03761ca3c`.
- Tag local de rollback : `pre-audio-core`, resté sur ce commit.
- Branche : `migration/freebox-storage`.
- Aucun fichier natif ou changement utilisateur préexistant n'est modifié par cette phase.
- La phase ne change ni le design, ni le feed, ni les profils, ni la navigation, ni l'application native.

## Cartographie audio avant modification

| Surface | Classe | Moteur / instance avant | Ownership avant | Double lecture possible | Décision Phase 2A |
|---|---|---|---|---|---|
| Feed, Discover, profils, albums, playlists, bibliothèque, mini-player, player complet, AI Generator, Studio web | A — musique principale | `useAudioService`, son `new Audio()` et la façade `AudioPlayerProvider` | moteur dans le hook, état recopié dans le provider | non en principe, mais état et retries pouvaient diverger | rejoint l'autorité `AudioCore` |
| Préchargement de la prochaine piste | A — support | un second `Audio` dans `useAudioService` | hook | non audible | remplacé par `<link rel="preload" as="audio">` |
| Préchargement applicatif | F — support | plusieurs `new Audio()` de métadonnées dans `useAppPreload` | preloader | non audible | remplacés par des liens preload temporaires |
| Player natif de détail de piste | B — preview musicale | `<audio controls>` dans `TrackPageClient` | composant DOM | oui | reste secondaire, politique globale automatique |
| `TracksList`, landing, inscription Star Academy, admin Star Academy | B — preview musicale | `<audio>` local | composant DOM | oui | reste secondaire, politique globale automatique |
| Embed | F — player embarqué | `<audio>` local | page embed | oui si rendu dans la même application | reste indépendant fonctionnellement, mais coordonné dans le document |
| Upload principal | B — preview musicale | `new Audio(blob:)` | page upload | oui | secondaire explicite, pause/reprise du global |
| Éditeur multi-track upload | B — preview musicale | `new Audio(blob:)` | `TrackListEditor` | oui | secondaire explicite, pause/reprise du global |
| Upload Confirm AI Studio | F — sonde métadonnées | `new Audio(blob:)`, sans `play()` | modal | non | reste une sonde non audible |
| Calculs de durées upload | F — sonde métadonnées | `new Audio(blob:)`, sans `play()` | page upload | non | reste une sonde non audible |
| Messages vocaux reçus | C — message vocal | `new Audio(url)` détaché | conversation | oui | secondaire explicite, pause/reprise du global |
| Preview de l'enregistrement vocal | C — message vocal | `<audio controls>` | conversation | oui | politique globale automatique |
| Création de Clip | B — preview musicale | `new Audio(url)` détaché | compositeur Clip | oui | secondaire explicite, pause/reprise du global |
| Studio web | E — édition/création | utilise déjà `useAudioPlayer`; pas de moteur de mixage audible séparé trouvé | façade globale | non | reste sur Audio Core ; les previews locales suivent la politique secondaire |
| AI Generator | A/E | utilise `useAudioPlayer` pour la lecture ; `AudioContext` seulement pour analyse/décodage | façade globale + analyse locale | non | lecture sur Audio Core, temps via abonnement spécialisé |
| Waveform upload / `lib/waveform.ts` | F — analyse | `AudioContext`/`webkitAudioContext` pour `decodeAudioData` | fonction d'analyse | non | reste hors Audio Core car non audible |
| Sons UI / notification | D | aucune source audible dédiée trouvée | — | — | aucune politique supplémentaire nécessaire |
| Pages `test-audio`, `test-direct`, `test-mobile`, copies historiques | F — debug/legacy | façades globales, plus une sonde `new Audio()` dans `test-mobile` | pages legacy | possible sur la sonde de test | laissées legacy ; routes de debug protégées par les travaux précédents |
| Application native `synaura-app` | A/C natif | React Native Track Player / lecteurs natifs | application native | indépendant du web | explicitement hors périmètre |

Les éléments `<audio>` attachés au DOM sont interceptés en capture par Audio Core. Les lecteurs créés avec `new Audio()` mais non attachés au document doivent appeler explicitement `coordinateSecondaryAudioElement` s'ils deviennent audibles. Les sondes de métadonnées ne prennent pas de lease, puisqu'elles ne jouent aucun son.

## Architecture avant

1. `useAudioService.ts` créait l'élément musical principal et portait lecture, queue, autoplay, persistance, retries et watchdog.
2. `AudioPlayerProvider` conservait sa propre représentation de la queue et recopiait l'état du hook.
3. Le provider ajoutait cinq listeners audio (`timeupdate`, metadata/duration, seeking/seeked) et un polling toutes les 250 ms.
4. Le hook ajoutait ses listeners permanents, plus des listeners temporaires pendant certains chargements/retries.
5. `useMediaSession` et `useCapacitorMediaSession` ajoutaient chacun sept listeners supplémentaires selon la plateforme.
6. Le retry de `playImmediate` lançait des timers à 250, 1 200, 3 000 et 6 000 ms sans invalidation de génération.
7. Le watchdog tournait toutes les 3 secondes, mais son effet dépendait de `currentTime`; il pouvait donc être recréé à chaque progression.
8. La persistence était répartie entre `audioPlayerState`, `synaura.lastTrack`, `queue.upnext`, les caps de publicité et d'autres clés historiques.

La waveform principale était déjà saine : un RAF local lit directement l'élément avec des refs DOM, sans exiger un rerender global à chaque frame.

## Architecture après

`lib/audio/AudioCore.ts` est l'unique propriétaire du `HTMLAudioElement` musical principal. Le singleton navigateur vit au-dessus des routes, via l'unique `AudioPlayerProvider` placé dans le layout racine.

Le moteur expose les commandes :

- charger/jouer une piste, jouer, pause, toggle, stop et seek ;
- volume, mute et vitesse ;
- queue, ajout, suppression, reorder, next et previous ;
- up-next, shuffle et repeat.

Il expose un snapshot stable :

- piste et état de playback ;
- durée, buffer, volume, mute et vitesse ;
- queue canonique, index, shuffle, repeat ;
- erreur typée, loading et génération.

Le temps est volontairement séparé dans `AudioTimeSnapshot`. `useAudioTime()` / `useAudioCoreTime()` souscrivent uniquement les composants qui en ont besoin. Le provider global ne reçoit plus de tick toutes les 250 ms.

`useAudioService` est maintenant une façade React de compatibilité. `useAudioPlayer` reste l'API consommée par le produit. Le provider garde uniquement les données UI qui lui appartiennent (`showPlayer`, minimisation, contexte album et projection temporaire de la liste), tandis que les champs de lecture et la queue exposés viennent du core.

## Garanties de fiabilité

### Opérations, retries et watchdog

- Chaque changement de piste incrémente une génération et remplace l'`AbortController` courant.
- Tous les timers de retry sont centralisés et annulés au changement de génération.
- Un résultat async tardif vérifie encore la génération avant toute mutation.
- Les événements dont `currentSrc` ne correspond plus à la source attendue sont ignorés.
- Les retries sont bornés à 250, 1 200 et 3 000 ms, avec deadline à 6 000 ms ; aucune boucle infinie.
- Le watchdog unique tourne toutes les 3 secondes. Il corrige uniquement une pause inattendue ou une progression réellement bloquée, ignore les onglets cachés et vérifie la génération avant reprise.
- Le watchdog et les listeners sont installés une fois à `initialize()` et supprimés par `destroy()`.

### Listeners

Quatorze événements sont centralisés : `play`, `playing`, `pause`, `timeupdate`, `progress`, `durationchange`, `loadedmetadata`, `canplay`, `waiting`, `stalled`, `ended`, `error`, `volumechange`, `ratechange`.

Media Session souscrit au store temporel et n'ajoute plus de listeners au média principal. Son metadata est remplacé à chaque piste et explicitement vidé en absence de piste.

### Queue

- `AudioCoreSnapshot.queue` est la queue canonique.
- `currentIndex` est maintenu avec la piste réellement chargée.
- Up-next reste un canal prioritaire explicite, injecté au moment de l'avance sans devenir un second moteur.
- L'autoplay/recommandation reste fourni par la façade au callback de fin de queue.
- Le shuffle maintient une liste d'identifiants dérivée et ne modifie jamais l'ordre de la queue canonique.
- Les annonces audio configurées restent intercalables avant une avance automatique avec leur frequency cap historique. Elles sont actuellement non configurées en production.

### Persistance

La session canonique utilise `synaura.audioSession:v1` et contient : version, date, ID courant, position, intention précédente, metadata minimale de la queue, volume, mute, repeat et shuffle.

- rétention maximale : 7 jours ;
- 100 pistes maximum ;
- URLs invalides, pistes expirées AI et schémas inconnus sont rejetés ;
- une session invalide est supprimée sans casser le player ;
- la position est bornée à la durée ;
- la restauration charge la piste et la position sans forcer un autoplay bloqué par le navigateur ;
- les anciennes clés sont lues une fois par la façade pour une migration compatible ;
- les annonces temporaires ne sont pas persistées.

### Lecteurs secondaires et Studio

La politique choisie est une lease : le premier lecteur secondaire audible pause le global et mémorise s'il jouait. Quand la dernière lease se termine, le global reprend uniquement si la génération et la piste sont inchangées. Une action utilisateur sur une autre piste empêche donc toute reprise obsolète.

Cette politique s'applique explicitement aux messages vocaux, previews upload, éditeur multi-track et compositeur Clip, et automatiquement aux `<audio>` DOM. Studio ne possède actuellement aucun second moteur audible permanent : sa lecture musicale reste globale et ses sondes/previews temporaires suivent la politique ci-dessus.

## Routing et visibilité

Le moteur reste monté dans le provider racine pendant les transitions. Le mini-player est volontairement masqué sur `/`, `/swipe`, `/notifications`, les conversations `/messages/[id]`, `/upload`, `/clips/new`, `/create`, `/auth` et `/onboarding`. Cette décision ne stoppe pas le moteur.

Les routes demandées (`/`, détail piste, profil, bibliothèque, playlist, messages, AI Generator et Studio) utilisent toutes le même provider racine. Le test statique vérifie ce placement ; le harness navigateur vérifie une transition réelle aller-retour avec la même génération de moteur, la même piste et une position croissante.

## Mesure avant / après

| Mesure | Avant | Après |
|---|---:|---:|
| Rerender global lié au temps | polling provider 4 Hz + updates `timeupdate` du hook | 0 Hz dans le provider ; environ 4,17 Hz maximum seulement dans les abonnés spécialisés |
| Listeners permanents du moteur | 7 dans le hook + 5 provider, puis 7 Media Session web ou natif ; listeners temporaires supplémentaires | 14 centralisés ; 0 listener média dans provider et Media Session |
| Watchdogs | interval 3 s recréé avec `currentTime` | 1 interval pour le lifecycle du core |
| Retries d'un play | timers non centralisés 250/1200/3000/6000 + listener ponctuel | 3 retries + 1 deadline centralisés, génération-aware et annulables |
| Élément musical principal | 1, mais ownership dans un hook React | 1, ownership exclusif Audio Core |
| Préchargeurs `Audio` | 1 dans le hook + N dans le preloader | 0 ; liens preload temporaires |
| RAF waveform | 1 local | inchangé, 1 local |
| `useAudioService.ts` | environ 1 900 lignes mêlant moteur et React | 458 lignes de façade ; moteur testable isolé dans `AudioCore.ts` |
| `app/providers.tsx` | environ 1 550 lignes avec polling et listeners | 1 278 lignes, sans polling/listeners audio ni debug de commande global |

## Harness et observabilité

- `/audio-core-harness` et `/audio-core-harness/route` n'existent qu'en mode development ; en build production elles répondent 404.
- Le harness génère localement des WAV synthétiques et ne dépend d'aucun média externe.
- `window.__synauraAudioCore()` est compilé uniquement en développement et ne retourne que : ID piste, état, position, durée, IDs de queue, index, génération, compte de listeners/retries et nombre de lecteurs secondaires. Aucune URL ni donnée privée.
- L'ancien objet global `window.audioService` avec commandes mutantes a été retiré.

## Taxonomie d'erreurs

`network`, `media-unsupported`, `missing-file`, `decode`, `timeout`, `autoplay-blocked`, `aborted`, `stale`, `unknown`.

Une erreur appartient à une génération et à un ID de piste. `NotAllowedError` arrête immédiatement les retries et attend une nouvelle action utilisateur. Une source non supportée essaie la source de secours de la même piste avant de produire une erreur.

## Validation waveform et commentaires temporels

- seek et progression sont couverts par le test unitaire et le harness navigateur ;
- `Waveform` conserve son RAF direct sur `getAudioElement()` ;
- `FullScreenPlayer`, `SynauraScrollFeed`, AI Generator, Right Panel Studio et le player historique qui lisent le temps utilisent l'abonnement spécialisé ;
- aucune logique de commentaire/réaction ni calcul de peaks n'a été modifié.

## npm audit diagnostic au début de phase

`npm audit` signale 67 vulnérabilités, dont 5 critiques. Aucun fix/upgrade n'a été exécuté.

| Critique | Classe | Exposition constatée |
|---|---|---|
| `next-auth` | runtime web direct | runtime exposé, mais l'avis critique de normalisation d'adresse concerne l'EmailProvider ; la configuration actuelle utilise Credentials + Google, sans EmailProvider. Pas de chemin critique directement exploitable démontré, mise à niveau prioritaire en suivi sécurité. |
| `basic-ftp` via Puppeteer/proxy-agent/get-uri | transitive tooling/runtime | Puppeteer est une dépendance racine mais aucun usage applicatif trouvé ; chaîne legacy/outillage dans ce dépôt. |
| `fast-xml-parser` via types Nodemailer/AWS SES | tooling/build | chaîne de types/dev, non chargée par le runtime web constaté. |
| `handlebars` via Capacitor Assets | native/tooling | génération d'assets et changelog natifs. |
| `tar` via Capacitor CLI/Assets | native/tooling | CLI/build natif. |

Cette classification ne remplace pas une remédiation dédiée. `next-auth` reste le risque prioritaire ouvert.

## Limites restantes

- Les lecteurs legacy `<audio>` restent des instances secondaires au lieu d'être migrés un par un ; ils sont désormais coordonnés, ce qui suffit pour l'autorité A.
- La queue persistée conserve une metadata minimale plutôt que de revalider chaque ID auprès du serveur ; les URLs AI connues comme expirées sont filtrées, mais une suppression serveur ordinaire est détectée seulement au chargement.
- Le harness E2E est ciblé et local, pas une suite Playwright persistante en CI.
- L'application native garde son moteur propre, conformément au périmètre.
- Les vulnérabilités npm ne sont pas corrigées dans cette phase.
