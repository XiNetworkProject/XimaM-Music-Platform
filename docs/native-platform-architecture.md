# Synaura native platform architecture

This document covers the Next.js application at the repository root and the Expo application in `synaura-app`. `synaura-mobile` is legacy and must not receive product changes.

## Product invariants

- Web and native use the same API data and recommendation logic.
- Counts, profiles, tracks, posts, clips, and engagement signals always come from persisted data.
- Audio playback remains owned by `PlayerProvider` and `react-native-track-player` on native.
- The primary native dock contains exactly: Home/Flow, Discover, Create, Library, Profile.
- Secondary screens are root stack routes, not hidden tab routes.
- Synaura moments are real waveform peaks when available. A plain timeline is shown when peaks are absent.

## Mobile authentication

1. `/api/auth/mobile/login` creates a Supabase session and returns access token, refresh token, expiry, and the existing profile.
2. Access and refresh tokens are stored in Expo SecureStore. The non-sensitive user snapshot stays in AsyncStorage for instant rendering.
3. The API client retries one request after a `401` only when `/api/auth/mobile/refresh` succeeds.
4. Refresh runs before expiry and when the application returns to the foreground.
5. Logout unregisters the native push token, revokes the Supabase session, and clears local credentials.
6. API routes accept Bearer headers. Tokens in URL query parameters are rejected.

Diagnostic API routes are disabled in production unless `ENABLE_DIAGNOSTIC_ROUTES=true` is explicitly configured.

## Data and media cache

- TanStack Query owns short-lived profile, clip, and post request caches.
- Existing AsyncStorage snapshots provide stale-while-refresh rendering for Discover and Flow after a cold start.
- `SynauraImage` uses Expo Image with a memory/disk cache for remote artwork and avatars.
- Lists render bounded initial batches. Long music catalogs expand progressively and comments use a virtualized list.
- Personalized API responses use `private, no-store`; anonymous shared discovery responses can use short CDN caching.

## Flow and playback contract

- One gesture settles on at most one adjacent Flow item, regardless of fling velocity.
- A settled page emits one playback activation. Duplicate activation requests for the same track are coalesced.
- Posts with an attached track remain post pages; starting their audio must not navigate to a separate track page.
- Restored recommendation sessions retain seen IDs and the last stable Flow position.
- Playback service recovery retries transient interruptions before advancing the queue, including background playback interruptions.

## Recommendation and Radar

- Candidate loading combines recent, popular, rotating catalog, quality-signal, and optional AI pools.
- Ranking uses persisted listening events, completion, likes, saves, follows, recent exposure, creator diversity, and session exclusions.
- Early pages limit creator repetition more aggressively than later pages.
- Discover's newest rail is strictly chronological.
- Radar keeps its dedicated low-play/freshness/quality score; it is not replaced by raw popularity.
- `Server-Timing` headers on ranking and mobile discover responses expose backend stage duration without storing personal telemetry.

## Waveform moments

- Timestamped comments and moment reactions are loaded in parallel with cached waveform peaks.
- Dense events are clustered by time and capped to a readable number of markers without dropping their aggregate counts.
- Cluster calculation is isolated in `synaura-app/src/waveform/momentClustering.ts` and covered by density tests.
- Comment lists are paginated, deduplicated, and virtualized.

## Responsive contract

`useResponsiveLayout` is the single source for safe-area gutters, content width, dock clearance, overlay width, compact controls, and grid columns. Run `npm.cmd run check:responsive` in `synaura-app` to validate the supported viewport matrix.

## Release validation

From the repository root:

```powershell
npm.cmd run type-check
npm.cmd run test:recommendation
npm.cmd run test:city
npm.cmd run test:scroll-feed
npm.cmd run test:related-tracks
npm.cmd run test:mobile-flow
npm.cmd run test:mobile-moments
npm.cmd run test:mobile-navigation
```

From `synaura-app`:

```powershell
npm.cmd run type-check
npm.cmd run check:responsive
```

No emulator run is required for this static validation. Before publishing an APK, also verify signing inputs, version code, release manifest version, and background playback on one physical Android device.
