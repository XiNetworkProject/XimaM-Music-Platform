import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('Chambre tokens unify domains without changing semantic state colours', async () => {
  const css = await read('app/v2.css');
  for (const token of ['--v2-bg:#030508', '--v2-accent:#86afff', '--v2-accent-fill:#315fea', '--v2-font-display:Arial,Helvetica,sans-serif', '--v2-danger:', '--v2-success:', '--v2-warning:']) assert.ok(css.includes(token), token);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /v2-route-enter:has\(.chamber-product\)\{animation:none/);
});
test('approved public story replaces presentation only; server member routing survives', async () => {
  const [home, landing, entry] = await Promise.all([read('app/page.tsx'), read('app/landing/page.tsx'), read('components/enter/PublicChamberEntry.tsx')]);
  assert.match(home, /if \(!userId\) return <PublicChamberEntry/);
  assert.match(home, /memberHasCompletedOnboarding\(userId\)/);
  assert.match(home, /redirect\('\/live'\)/);
  assert.match(landing, /<PublicChamberEntry legacy/);
  assert.match(entry, /<ChamberProduct \/>/);
  assert.match(entry, /href="\/enter"/);
  assert.match(await read('components/GlobalQueueBubble.tsx'), /pathname === '\/landing'/);
  assert.match(entry, /recordEntryEvent\('discover_view'/);
  assert.doesNotMatch(entry, /new Audio|AudioContext|SessionProvider|fetch\(/);
});
test('shared shell retains complete primary navigation and specialist account exits', async () => {
  const [shell, dock] = await Promise.all([read('components/synaura/SynauraShell.tsx'), read('components/synaura/SynauraPrimaryDock.tsx')]);
  assert.match(shell, /PRIMARY_WEB_NAV_ITEMS\.map/);
  for (const route of ['/community','/ai-library','/stats','/boosters','/city']) assert.ok(shell.includes(`'${route}'`), route);
  assert.match(shell, /MessageInboxButton/); assert.match(shell, /NotificationCenter/); assert.match(shell, /SynauraUniversalSearch/);
  for (const route of ['/upload','/ai-generator','/clips/new','/posts','/create/variation']) assert.ok(dock.includes(`'${route}'`), route);
  assert.match(dock, /withCurrentHandoff/);
});
test('wordmark matches approved tight sans direction without replacing the existing S symbol', async () => {
  const logo = await read('components/brand/SynauraLogo.tsx');
  assert.match(logo, /data-chambre-wordmark/);
  assert.match(logo, /Arial, Helvetica, sans-serif/);
  assert.match(logo, />SYNAURA<\/span>/);
  assert.match(logo, /SYNAURA_V2_REFERENCE/);
  assert.match(logo, /aria-hidden=\{decorative \|\| undefined\}/);
});

test('observed player comment close icon has an accessible name without changing its action', async () => {
  const player = await read('components/TikTokPlayer.tsx');
  assert.match(player, /onClick=\{onClose\}[\s\S]{0,260}aria-label="Réduire les commentaires"/);
});

test('service chrome badges use the contrast-safe filled accent and guest account name matches its label', async () => {
  const [sidebar, bottomNav, css] = await Promise.all([read('components/AppSidebar.tsx'), read('components/BottomNav.tsx'), read('app/v2.css')]);
  assert.match(sidebar, /messagesUnread > 0[\s\S]{0,140}bg-\[var\(--v2-accent-fill\)\][\s\S]{0,260}\{messagesUnread > 99/);
  assert.match(bottomNav, /<span className="text-\[10px\] font-bold bg-\[var\(--v2-accent-fill\)\] text-white[^\"]*">\s*NEW/);
  assert.match(bottomNav, /aria-label=\{session \? 'Profil' : 'Connexion'\}/);
  assert.match(bottomNav, /onClick=\{\(\) => session \? setShowMore\(v => !v\) : go\('\/auth\/signin'\)\}/);
  const token = css.match(/--v2-accent-fill:\s*#([\da-f]{6})/i)?.[1];
  assert.ok(token);
  const linear = token.match(/../g).map(channel => parseInt(channel, 16) / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  assert.ok(1.05 / (luminance + .05) >= 4.5, 'White badge text must keep AA contrast on its actual shared token.');
});
