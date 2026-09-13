# Chambre creation experience — local redesign

## Recomposition

- AI Generator now has a dedicated scrolling editor, native disclosures for sound colors and inspirations, and a persistent generation action showing the existing credit cost. Its listening desk reads the real generation state and collection size. The signed-out entry uses the same approved Chambre material.
- Studio keeps its existing form, queue, library, comparison and inspector contracts. The three working areas now have distinct hierarchy; the queue is an accessible disclosure; empty sources, history, library and inspector provide useful guidance. Existing mobile store tabs and inspector drawer remain intact.
- Publish is a release desk: audio opens `/upload`, Clip opens `/clips/new`, and post opens `/posts?compose=true`. Its sleeve is explicitly an illustration to personalize in the actual upload flow. Existing account, preparation, booster, library and FAQ destinations remain.
- Version rows expose selection and playback more clearly. Loading, error, empty-library, filtered-empty and generation-pending states use actual existing state.

## Scope and evidence

Edited source: `app/ai-generator/page.tsx`, `app/studio/StudioClient.tsx`, `app/publish/page.tsx`, `components/ai-studio/LibraryMiddlePanel.tsx`, `components/studio/Center/StudioTimeline.tsx`, `components/studio/RightDock/Inspector.tsx`, `components/studio/LeftDock/LeftDock.tsx`, and `components/studio/Library/LibraryPanel.tsx`.

Styles: `components/v2/experience-creation.css`, imported by the integration owner. All new colors derive from the established `--v2-*` palette. Added decorative motion is finite and disabled under reduced motion. Independent scroll containers preserve the generation action and mobile safe areas.

Each pre-edit source is preserved with `Copy-Item` under `artifacts/chambre-experience/before/creation/`, without replacing existing snapshots.

`tests/experience-creation.test.mjs` parses all eight TSX files and the CSS; compares all existing imports, event handlers, boundary calls, constructors and form contracts against those local snapshots; checks exact route additions; and checks persistent-action placement, state-driven empty/error behavior, palette and motion.

No dependency, backend, pricing, quota, generation, upload, publishing, authentication or AudioCore implementation was changed. No paid generation, media upload, purchase or publication was triggered. No server, production build, remote write, commit or deploy was performed by this workstream.

## Validation limits

Focused local tests: **7/7 PASS**. Combined creation redesign, signature creation, creation handoff, V2 presentation, French encoding and experience suites: **54/54 PASS**.

The signature suite now permits exactly the three user-authorized Publish navigation additions: `/clips/new` at the exact `experience-release-path experience-release-clip` marker, `/posts?compose=true` at `experience-release-path experience-release-post`, and the extra `/ai-library` shortcut at `experience-release-library`. Each must be a unique `Link` directly inside `section.experience-release-paths`, with its exact literal destination. Only those three `href` attributes are omitted from the historical fingerprint. Negative checks reject changed destinations, missing markers, duplicate links and incorrect parent placement. No import, handler, call, constructor or other control receives an exemption.

Publish’s existing account links now sit immediately after the audio card, restoring the original keyboard/DOM order of the existing destinations. The original aggregate counts (106 imports, 339 handlers, 372 historical controls, 2636 non-JSX calls, 101 constructors) and original SHA-256 hash remain unchanged and pass. The pre-edit signature test is preserved under `artifacts/chambre-experience/before/creation/tests/`.

Browser sizing, connected sessions and integrated type checking belong to the integration owner. No claim is made that paid workflows or publication were executed. Intentional differences in new routes and UI markup must be reviewed explicitly, not erased by broad exemptions.
