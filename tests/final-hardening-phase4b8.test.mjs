import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mobile Notifications retains its action and a name independent of hidden text', async () => {
  const source = await readFile(new URL('../app/notifications/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /onClick=\{markAllRead\}\s+aria-label="Tout lire"/);
  assert.match(source, /hidden sm:inline">Tout lire/);
});

test('confirmed small purple accents use existing theme tokens, not a new palette', async () => {
  for (const file of ['components/profile/ProfilePeekSurface.tsx', 'components/comments/CommentsSurface.tsx', 'components/actions/ActionsSurface.tsx', 'app/profile/[username]/page.tsx', 'app/ai-generator/page.tsx', 'app/messages/page.tsx', 'components/create/CreateArrivalBanner.tsx']) {
    const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    assert.ok(source.includes('color-mix(in_srgb,var(--syn-accent)_65%,var(--syn-text-primary))'), file);
  }
});

test('inactive Live slides cannot receive focus or expose duplicate controls', async () => {
  const source = await readFile(new URL('../components/home/SynauraScroll.tsx', import.meta.url), 'utf8');
  assert.match(source, /aria-hidden=\{index !== activeIndex\}/);
  assert.match(source, /toggleAttribute\('inert', index !== activeIndex\)/);
});

test('observed icon-only controls have names and Queue text uses the theme foreground', async () => {
  const profile = await readFile(new URL('../app/profile/[username]/page.tsx', import.meta.url), 'utf8');
  const discover = await readFile(new URL('../app/discover/DiscoverTiles.tsx', import.meta.url), 'utf8');
  const queue = await readFile(new URL('../components/QueueBubble.tsx', import.meta.url), 'utf8');
  assert.match(profile, /aria-label="Partager le profil"/);
  assert.match(profile, /aria-pressed=\{isFollowing\}/);
  assert.match(discover, /aria-label=\{`Écouter \$\{track.title\}`\}/);
  assert.match(queue, /text-\[var\(--syn-text-primary\)\] sm:inline">File/);
});

test('overlay Tab trap excludes roving, disabled, hidden and inert controls', async () => {
  const source = await readFile(new URL('../components/ui/SynauraOverlay.tsx', import.meta.url), 'utf8');
  assert.match(source, /element\.tabIndex >= 0/);
  assert.match(source, /!element\.matches\(':disabled'\)/);
  assert.match(source, /!element\.closest\('\[inert\], \[aria-hidden="true"\]'\)/);
  assert.match(source, /element\.getClientRects\(\)\.length > 0/);
  assert.match(source, /getComputedStyle\(element\)\.visibility !== 'hidden'/);
  assert.match(source, /!focusable\.includes\(document\.activeElement as HTMLElement\)/);
  assert.match(source, /!event\.shiftKey && \(document\.activeElement === last \|\| !focusable\.includes/);
});

test('4B.8 runner exercises real Tab and Shift+Tab without treating AX as NVDA', async () => {
  const source = await readFile(new URL('../scripts/live-final-hardening.mjs', import.meta.url), 'utf8');
  assert.match(source, /keyboard\.down\('Shift'\)/);
  assert.match(source, /keyboard\.press\('Tab'\)/);
  assert.match(source, /NVDA réel non testé/);
  assert.match(source, /long session >=10min/);
});
