# Synaura V2 — personal, social and service implementation

Local candidate only. Baseline: `d0ac45379227b4ad86042b6b8eb2156535f1b817`.
This addendum describes source changes and source checks, not visual approval or production validation.

## Compositions and retained contracts

| Destination | V2 presentation | Existing functions retained |
|---|---|---|
| Library | Personal index, search and listening resume beside collections | Playlists, favourites, recent listening, downloads, queue, offline management and existing playback/actions owners |
| Search | Dedicated search form and readable result collection | Track/Post/Artist/Playlist results, request cancellation, Profile Peek and Track Actions |
| Messages | Inbox index and conversation workspace | Conversations/requests/contacts, search, groups, attachments, conversation scroll, return routing, secondary audio coordination |
| Notifications | Activity index and chronological groups | All filters, destination handoffs, mark-all-read action and accessible `Tout lire` name |
| Community | Editorial club doorways, actual latest posts/authors and direct destinations | Club aggregates, historical categories, forum list/detail/composition, replies and existing moderation contracts |
| Profile-related social pages | Calmer Post, Clip and Challenge presentations | Existing Post actions, Comments surface, actual Clip identity/video with an explicit source Track link, challenge submissions and ranking |
| Account | Settings index plus open forms, calmer Stats/Boosters/Subscriptions | All settings tabs, privacy/blocked accounts, real statistics, booster actions, existing plans and checkout/success contracts |
| Auth/onboarding | Shared brand, quieter canvas and onboarding hierarchy | Existing auth/onboarding state, return targets, selections and submission contracts |
| Support/legal | Service navigation, help index/contact and document hierarchy | Existing support form, revealed contact mechanism and legal text |
| Download | Editorial Android hero, real device screenshots and installation section | Unchanged screenshot/feature arrays, `AndroidDownloadCard`, manifest/API/native configuration and install flow |
| Referral invitation | Actual invitation identity and clear signup/signin actions, no decorative fake activity cards | Existing code validation, `synaura_referral_code` storage, signup/signin return targets, bonus copy and invalid-code message |
| Partnerships | Eligibility/boundaries beside the actual contact mechanism | Both eligibility lists, revealed contact email and Publish destination |
| Secondary reset-password route | Account recovery introduction and accessible labelled form | Same endpoint, method, token/code/email/password payload, loading/error/success states and return destinations |
| Radar | Featured actual track followed by a readable collection; compact Discover variant retained | Same server ranking/liked flags, computed metadata, follow/like handlers, queue/play mapping, full-player action, `compact` and `showViewAll` |
| Embed | Tokenized autonomous player, image fallback and canonical brand | Exactly one existing audio element, same `audioRef`, listeners, `togglePlay`, seek calculation and Track destination; no AudioCore integration added |

The Settings link to `/meteo` is labelled **Météo**: the destination is a real weather service, not a new musical recommendation feature.

## Exact files in this presentation area

Shared presentation files created:

- `components/v2/PersonalRouteFrame.tsx`
- `components/v2/ServiceFrame.tsx`
- `components/v2/personal-v2.css`
- `tests/synaura-v2-personal.test.mjs`

Route presentation boundaries created:

- `app/boosters/layout.tsx`
- `app/challenges/layout.tsx`
- `app/city/layout.tsx`
- `app/clips/[id]/layout.tsx`
- `app/community/layout.tsx`
- `app/legal/layout.tsx`
- `app/library/layout.tsx`
- `app/messages/layout.tsx`
- `app/notifications/layout.tsx`
- `app/posts/layout.tsx`
- `app/search/layout.tsx`
- `app/settings/layout.tsx`
- `app/subscriptions/layout.tsx`
- `app/support/layout.tsx`

Existing route/component sources changed:

- `app/auth/layout.tsx`
- `app/boosters/BoostersClient.tsx`
- `app/challenges/[id]/page.tsx`
- `app/clips/[id]/page.tsx`
- `app/community/page.tsx`
- `app/community/[club]/page.tsx`
- `app/community/faq/page.tsx`
- `app/community/forum/page.tsx`
- `app/community/forum/[id]/page.tsx`
- `app/community/forum/new/page.tsx`
- `app/download/page.tsx`
- `app/error.tsx`
- `app/embed/[trackId]/EmbedPlayerClient.tsx`
- `app/global-error.tsx`
- `app/join/[code]/page.tsx`
- `app/legal/page.tsx`
- `app/library/LibraryClient.tsx`
- `app/messages/page.tsx`
- `app/messages/[conversationId]/page.tsx`
- `app/notifications/page.tsx`
- `app/not-found.tsx`
- `app/partnerships/page.tsx`
- `app/posts/page.tsx`
- `app/posts/[id]/page.tsx`
- `app/radar/page.tsx`
- `app/reset-password/page.tsx`
- `app/search/page.tsx`
- `app/settings/SettingsClient.tsx`
- `app/stats/layout.tsx`
- `app/stats/page.tsx`
- `app/subscriptions/page.tsx`
- `app/subscriptions/success/page.tsx`
- `app/support/page.tsx`
- `components/city/SynauraCityPage.tsx`
- `components/BoosterOpenModal.tsx`
- `components/DailySpinModal.tsx`
- `components/home/HomeFlowPrelude.tsx`
- `components/mobile/AndroidAppPrompt.tsx`
- `components/onboarding/OnboardingFlow.tsx`
- `components/radar/RadarSection.tsx`
- `components/synaura/SynauraCountdownBanner.tsx`

Unchanged page entrypoints may inherit these layouts or delegate to these clients. `/contact` still redirects to `/support`; `/requests` still redirects to the requests tab in Messages. Neither alias needs a second implementation.

## Image failure presentation

The final image pass added `SynauraImage` to 15 standard images across these 10 sources:

- `app/posts/[id]/page.tsx`: 2 images.
- `app/community/[club]/page.tsx`: 1 cover.
- `app/community/forum/[id]/page.tsx`: 1 cover.
- `app/settings/SettingsClient.tsx`: 1 banner and 2 avatars.
- `app/challenges/[id]/page.tsx`: 1 cover.
- `app/boosters/BoostersClient.tsx`: 1 cover.
- `app/messages/[conversationId]/page.tsx`: 1 shared image and 1 shared cover.
- `app/stats/page.tsx`: 1 Post image.
- `components/radar/RadarSection.tsx`: 1 avatar and 1 cover branch.
- `app/embed/[trackId]/EmbedPlayerClient.tsx`: 1 cover.

Original source, alternative text, classes/styles, loading and link behavior remain intact. Avatar branches use `/default-avatar.png`. Existing explicit image error handlers, videos and server-rendered Open Graph image documents were intentionally left alone. The fallback does not repair Cloudinary authorization or hide the original failed request from monitoring.

## Read-only route inventory review

- Exactly **100** page files were found; every route is represented in `docs/synaura-v2-route-coverage.md`.
- That document was not changed by this subtask. Its initial `À vérifier` / `NON TESTÉ` entries must not be interpreted as a completed visual gate.
- `/live`, `/enter`, `/`, `/landing` and `/swipe` delegate to shared presentation/entry components. In particular `/swipe` uses the same `SynauraScroll` as Live.
- `/feed` describes itself as a historical TikTok-like prototype; `/for-you` and `/trending` remain historical listening views.
- `/arret`, `/fermeture`, the 4 `/meteo` pages and the 5 `/star-academy-tiktok` pages remain historical destinations; their functions were not removed or reclassified here.
- The 7 Admin pages and 15 Dev/test/harness pages remain functional/technical destinations. Their source is not artistically recomposed by this subtask; global compatibility and final route status belong to the main V2 gate.
- Native applications, API endpoints, database contracts, assets/manifest contents, historical Community taxonomy and Cloudinary 401 remediation are not changed by this presentation work.

## Checks and limits

- `node --test tests/synaura-v2-personal.test.mjs`: **17/17 PASS** after the targeted contrast, secondary-logo and error-screen review.
- `npm run type-check`: **PASS** after the final secondary-logo and error-screen changes.
- Read-only comparison to `HEAD`: referral validation/storage, reset submission/state, embedded audio handlers and Radar's playback function are textually unchanged; `AndroidDownloadCard.tsx` has no diff.
- `git diff --check` for the touched route sources: **PASS** (only normal Windows line-ending warnings).
- Git index remained empty. No staging, commit, push, deploy or production write was performed by this subtask.
- No browser interaction was performed in the final image/secondary-route pass. Desktop/mobile captures, genuine authenticated journeys, console/network inspection and production checks are not claimed here; the main agent owns the local visual and functional gate.
- No NVDA or real Android/Gboard validation is claimed.

## Final targeted contrast source review

No full WCAG or browser validation is implied by this source-only pass.

- Notifications `Non lues` and the two selected onboarding icon styles now use the existing `--v2-accent-fill`, not the pale accent: white contrast **2.21:1 → 6.67:1**.
- The selected Stats metric uses the same existing fill: **2.73:1 → 6.67:1** compared with its previous coral background. Coral Stats summary cards were not changed: their background was already neutralized by `.v2-stats-metric`.
- Small Stats and active-subscription success labels use `--syn-success` instead of `emerald-700`: **3.36:1 → 10.18:1** on the defined night surface. The Stats warning icon uses the existing warning token.
- Three City foregrounds (gold trophy/medal and rose selected vote) now explicitly use `--v2-bg`; their existing bright background is retained, avoiding the generic legacy `text-[#171313]` remapping to light text.
- The exact `.bg-white/72` presentation fallback now covers the existing plan/payment/success blocks and City link. Community form fields using `.bg-white` regain the intended night input colors with sufficient selector precedence; `--v2-faint` placeholder contrast is **6.75:1** on that surface rather than **2.42:1** on the light button color.
- Challenge and Stats missing-cover placeholders no longer display the previous brand symbol; they use the existing neutral cover asset. Real cover sources are unchanged.
- Existing scoped `text-black/…` compatibility and the shared selected waveform-cluster rule were checked before rejecting those apparent matches as false positives.
- Separate shared-owner findings were sent to the main agent: Comments submit/fallback surface buttons and active historical logos. The five logo components were subsequently assigned to this subtask and corrected as documented below; the Comments/fallback buttons remain owned by the main agent.

## Secondary web identity and error screens

- AndroidAppPrompt, HomeFlowPrelude, DailySpinModal, BoosterOpenModal and SynauraCountdownBanner now render `SynauraLogo` for the six previously coloured brand marks. Sizes, decorative accessibility, opacity and surrounding motion are preserved; the two light logo backplates now use the existing night raised surface to keep the exact white mark visible.
- No native code, download manifest, timeout, referral/account state, playback, spin/open action or countdown handler was modified.
- `app/error.tsx` and `app/not-found.tsx` now use the same restrained V2 hierarchy and canonical brand. Retry/home destinations are retained. Existing page-error logging is retained.
- Technical messages/stacks remain available in native `details` disclosures on both error boundaries; they no longer occupy the default error screen.
- `app/global-error.tsx` remains a complete `html`/`body` document using inline styles and the local `/brand/v2/reference-symbol.svg` asset. It imports no component, provider, stylesheet or client service and references no CSS variable. Retry and the native home link work without the application shell. A missing logo asset cannot remove the text or recovery controls.
