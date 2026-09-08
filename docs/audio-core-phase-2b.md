# Phase 2B — intégration Audio Core

## API publique recommandée

Tout nouveau composant musical doit utiliser `useAudioPlayer()` et, uniquement s'il affiche le temps, `useAudioTime()`. `AudioCore` reste l'unique propriétaire du média musical.

- commandes : `playTrack`, `play`, `pause`, `toggle`, `stop`, `seek`, `setVolume`, `setMuted`, `next`, `previous`, `setQueue`, `addToQueue`, `removeFromQueue`, `reorderQueue`, `setRepeat`, `setShuffle` ;
- abonnements : `subscribe`/`getSnapshot` pour playback, piste, queue, buffering et erreurs ; `subscribeTime`/`getTimeSnapshot` pour position, durée et buffer ;
- coordination : `beginSecondaryPlayback()` pour une lease sans élément et `coordinateSecondaryAudioElement()` pour un média secondaire audible.

Créer un `new Audio()` audible sans coordination est interdit. Les sondes de métadonnées sans `play()` restent autorisées. Les éléments `<audio>` DOM sont capturés automatiquement, sauf politique `data-synaura-audio-policy="independent"` explicitement justifiée.

## Compatibilité legacy

| Élément | Classe | Décision |
|---|---|---|
| `useAudioService({ authority: true })` | A — nécessaire | adaptateur unique du provider : analytics, recommandations, publicités, restauration et notifications |
| `useAudioService()` direct | A/D | deprecated ; seul `app/test-direct` le conserve comme page diagnostic bloquée en production |
| `useAudioPlayer()` | C — future UI | façade produit conservée pour éviter une migration massive |
| `useAudioTime()` | A — nécessaire | abonnement temporel spécialisé recommandé |
| migration `audioPlayerState` / `synaura.lastTrack` | A — temporaire | lecture unique de compatibilité ; retrait après une fenêtre de migration produit |
| `queue.upnext` du provider | C — future UI | état d'édition « À suivre » conservé ; le core reste l'autorité de lecture |
| événements `trackChanged`, `trackPlayed`, `playsUpdated` | C — future UI/analytics | conservés pour consommateurs historiques, sans ownership média |
| `TrackCard`, `TrackCardImproved`, `PlaysTest` | B — supprimable | composants sans import ni rendu dans l'application, supprimés |
| `app/test-direct`, `app/debug-audio`, copies historiques | D — diagnostic | bloqués en production ; non utilisés par le produit |

## Frontière Studio

`StudioClient`, `StudioTimeline`, `Inspector` et `RightPanelImproved` pilotent la musique via `useAudioPlayer()`. `UploadConfirmModal` crée seulement une sonde de métadonnées et n'appelle jamais `play()`. Entrer ou sortir de Studio ne pause donc pas la piste globale et ne crée pas de moteur.

Un futur moteur Studio audible devra obtenir une lease `studio` avant tout son. La première lease suspend le global ; la dernière le reprend uniquement s'il jouait encore et si l'utilisateur n'a pas explicitement demandé une pause ou changé l'intention de lecture.

## Matrice E2E authentifiée

La commande `npm run test:audio-authenticated` lance Chromium via Puppeteer. Elle exige les variables non versionnées `SYNAURA_E2E_EMAIL` et `SYNAURA_E2E_PASSWORD`; `SYNAURA_E2E_BASE_URL` vaut `http://127.0.0.1:3000` par défaut. `SYNAURA_E2E_CONVERSATION_PATH` est optionnelle.

La suite démarre une piste sur Discover, mémorise `instanceId` et `trackId`, puis vérifie position croissante et identité stable sur accueil, Discover, piste, profil, bibliothèque, playlist disponible, messages, conversation disponible, AI Generator et Studio. Elle valide aussi le seek clavier. Le diagnostic et le pont de navigation utilisés par la suite sont absents en production.

## Guardrails et observabilité

- le test d'inventaire échoue si un nouveau `new Audio()` web apparaît sans classification ;
- Audio Core avertit en développement si deux leases secondaires se chevauchent ;
- un appel direct deprecated à `useAudioService()` avertit en développement ;
- les erreurs globales et secondaires envoient catégorie, ID interne, pathname sans query string, device générique, génération, contexte et événement ;
- aucune URL média, cookie, token ni donnée de profil n'est envoyé ;
- déduplication client : une minute par signature, 50 signatures maximum ; rate limit serveur : 30 événements par cinq minutes et identité réseau hachée.

## Persistance et Media Session

Au refresh, la session reste restaurée sans autoplay. La queue, position, volume, repeat et shuffle sont conservés. La piste courante est revalidée par son ID auprès de `/api/tracks/[id]` afin de rafraîchir une URL devenue ancienne ; un 404 purge la session, tandis qu'une panne réseau temporaire autorise le fallback local. Les sessions de plus de sept jours et schémas inconnus sont supprimés.

Media Session remplace les métadonnées à chaque piste, les efface sans piste et fournit play, pause, seek, next, previous et position state depuis l'abonnement temporel spécialisé.

## Audit RSC rapide

Les erreurs observées concernaient le prefetch invité de `/library` et des liens `/ai-generator?...`. Le middleware redirige ces routes protégées vers la connexion ; le client Next recevait donc une redirection au lieu du payload RSC attendu, puis utilisait sa navigation classique. Impact réel : bruit console et requêtes inutiles, sans rupture de navigation. Le prefetch est maintenant désactivé uniquement pour ces liens invités/protégés.

## Performance

Phase 2B n'ajoute aucun polling. Audio Core conserve un élément musical, 14 listeners média, un watchdog et zéro mise à jour temporelle du provider. Le diagnostic dev compte les abonnés, timers, leases et renders provider afin de vérifier 30 secondes de lecture, pause et player masqué.
