# Chambre Sonore — abonnements et réglages

Local account experience redesign. Application source is limited to `app/subscriptions/page.tsx`, `app/settings/SettingsClient.tsx` and the scoped `components/v2/experience-account.css`. The root agent owns the stylesheet import and browser/build verification. Before snapshots are retained in `artifacts/chambre-experience/before/account/`.

## Result

Subscriptions opens with a sculptural, compact editorial introduction, followed by the actual current plan, billing period, credit reserve and usage. Monthly/annual selection is adjacent to the offers and announces its selected state. Free, Starter and Pro are distinct passes with decorative CSS forms, their real prices, accessible selection buttons, quotas and canonical benefits. Selection appears before the long feature list. The comparison is a semantic table with column and row headings and an independently scrollable region on mobile. FAQ content and all payment/proration/success/credit-modal owners remain.

Two display corrections accompany the redesign: the hardcoded `-20%` and unverified popularity badge are removed, and the canonical unlimited value `-1` renders as “Illimité” for Pro tracks and current usage. Prices, annual billing totals, credits, plan names, quotas and conditions are unchanged.

Settings opens directly on the selected section. Its compact account identity links to the existing public profile. The desktop section index becomes a horizontal, labeled mobile index; it exposes all seven original destinations. Profile editing presents the actual fields before media and preview on smaller screens, with save/reset controls at the section start. Public identity, musical identity, appearance, listening and notifications have distinct sections. Preference shortcuts jump to existing sections. Switches announce their contextual labels, upload inputs remain keyboard reachable, and the account-deletion field has an explicit name.

The limits widget is still mounted exactly once, with its original effects, and is presented under Compte using the native `hidden` attribute outside that section. Personal tool links and sign-out move to the footer. Form values, local storage, notification preferences, event preferences, messaging/privacy settings, media upload, referral operations, account security and deletion handlers are retained.

## Verification

- `node --test tests/experience-account.test.mjs`: focused checks pass, including actual pure `PeriodToggle`, `PlanCard` and `Toggle` markup/callback execution. Tests do not mount application effects or invoke real product operations.
- The current main component bodies match the saved before versions exactly after replacing JSX, except for the explicit `useReducedMotion` declaration. Every distinct original event and controlled-input binding matches.
- Scoped CSS and both TSX files parse. Layout rules cover 390px mobile, desktop and reduced motion; decorative geometry uses existing tokens and no external assets.
- `node --test --test-concurrency=1 tests/chambre-personal-redesign.test.mjs` passes, including its historical snapshots, after an account-only adapter described below.
- Scoped ESLint could not run because the repository has no ESLint configuration. No configuration was added.

Browser screenshots, authenticated settings interactions, 390/1440 layout, loading/error states, pointer/keyboard behavior and full build are verified by the root agent separately. At this handoff they are not claimed as validated by this subtask. No saves, purchases, cancellation, credit purchases, subscription changes, account deletions, API/schema/environment changes, dependencies, commits or deployment were performed.

## Historical contract adapter

The old historical fingerprint was order-sensitive to every JSX expression. An entire page recomposition intentionally changes that order, duplicated navigation controls, visual helpers and text formatting. Only the Settings and Subscriptions branches in `tests/chambre-personal-redesign.test.mjs` delegate to `accountBehaviorFingerprint` from the focused account suite; every other route retains its strict original check, including the Library agent’s separate adapter.

The account adapter preserves complete normalized module and business code, distinct event/control bindings, conditions guarding actionable UI, canonical pricing expressions, image sources, refs and link destinations. It narrowly permits the exact changed decorative icon imports, unused panel import, `useReducedMotion`, two extra presentation-only helper parameters, and replacement of the old pure comparison cell wrapper with native table cells. It normalizes only the two documented `-1` display corrections and drops the removed popularity badge expression. Static local preference/photo anchors are allowed individually. It does not reset a source hash or skip entire application files.

Negative tests demonstrate that changing an endpoint, event handler, refresh effect, rendered canonical price source, checkout guard or service import changes the fingerprint. Actual rewritten helper tests separately verify selected/disabled states and callback forwarding.
