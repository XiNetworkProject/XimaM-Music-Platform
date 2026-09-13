# AI Generator / Studio — responsive layout correction

Local candidate only. No commit, deployment, paid generation, API, entitlement or audio changes.

## Observed issues

- Studio at 1367×768: the fixed player started at y=667 while the canvas ended at y=695, covering 28 px of the workspace.
- Studio mobile at 390×844: the workspace continued behind the player and the bottom tabs.
- Project management, announcements and repeated headings pushed the intention field below the initial viewport.
- AI Generator mobile: filters consumed most of the fixed-height library, leaving too little room for tracks.

## Changes

- Reserve space inside Studio for the mounted player and, on mobile, the existing tabs and safe area. Do not reposition or mutate the player.
- Compact editor headings and present four preparation tabs on one row.
- Keep project management and V6 news in native keyboard-accessible disclosures after the Studio form. Model settings remain available in the Project accordion, initially collapsed.
- Group AI news and challenge brief into two compact disclosures; remove the redundant visual status strip. Existing brief callback is unchanged.
- Compact the AI composer heading/footer while retaining cost, generation control and explanatory note.
- On mobile, allow the library workspace to scroll past its filters, with an adequate track-list height. The creation sheet keeps its own scrolling area and fixed action footer.

## Validation

- Browser checks: 1367×768, 1440×900 and 390×844 CSS viewports. Screenshots under `artifacts/studio-responsive/captures/`.
- Studio mobile intention field: y=464–589, entirely inside its scroll viewport ending at y=669; player begins at y=691.
- Studio desktop canvas ends at y=587, before the player at y=667; console also remains above the player.
- AI mobile open composer: scrollable content y=102–719, action footer y=719–843. It remains above the sibling player through the preexisting stacking guard.
- AI mobile library: real browser scroll advanced the workspace by 234 px; both existing tracks and their actions became visible above the player.
- No document-wide horizontal overflow at measured sizes. No console errors in the final inspected browser log.
- 656 tests PASS (655 existing plus one responsive regression test); TypeScript PASS. Player-preservation test extended to assert only the exact workspace padding/floor declarations, not permit styling the player.
- Real phone OS keyboard, NVDA and new music generation have NOT been tested in this pass.

Production build PASS (exit 0), recorded in `artifacts/suno-v6/build.json`. `git diff --check` PASS; index empty. Connected local preview restarted on port 3000. Existing unrelated work remains untouched and unstaged.
