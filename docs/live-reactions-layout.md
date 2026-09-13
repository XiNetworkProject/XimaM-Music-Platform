# Live — interaction area and reaction feedback

Local candidate; no commit or deployment.

## Scope

- Removed the metadata height cap and nested scrolling at every breakpoint of the active Live styling. The waveform, moment comment button and reaction button now participate in normal card layout.
- No artwork CSS, feed navigation, waveform data, reaction endpoint or AudioCore changes. The existing grid naturally distributes the available space.
- Live opts into a decorative burst of the selected emoji: six staggered particles rise from the bottom, then disappear. The existing reaction callback is still invoked once per selection. This is local selection feedback, not fabricated reactions from other listeners.
- Corrected the Live emoji palette's compressed width and anchored it to the full moment-action row. Other picker consumers do not opt into the new visual behavior.
- Maximum four concurrent bursts (24 particles), bounded cleanup timers, unmount cleanup, pointer-events disabled, decorative accessibility semantics. Reduced-motion uses a stationary fade instead of upward movement.

## Verification

- Browser inspected at 1440×900 and 390×844 CSS viewports. At 390×844, metadata was capped at 287 px with 354 px of content before the change. Afterward it is 354 px with visible overflow, and both moment buttons fit at y=620–664, before the bottom action rail and dock.
- Desktop metadata also reports `max-height: none` and `overflow-y: visible`.
- Isolated `/dev/live-reactions` page tested without persisting reactions: one selection displayed six copies of the chosen heart, with the rising animation active and pointer-events disabled. The route returns not-found in production.
- Unit tests exercise 40 rapid selections, bounded particles/timers, expiry, unmount cleanup, one callback per choice, reduced-motion CSS, and unchanged feed/audio behavior.
- TypeScript and `git diff --check` PASS. Full suite result is in `artifacts/suno-v6/tests.json` and its adjacent log.
- No new production build or deployment in this pass. Real phone OS interaction and extreme landscape sizes not validated. Browser connection became unavailable at the final capture/export step; earlier visual inspections completed successfully.
