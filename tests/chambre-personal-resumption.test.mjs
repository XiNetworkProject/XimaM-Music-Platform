import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import postcss from 'postcss';
import { behaviorFingerprint } from './chambre-personal-redesign.test.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const paths = ['components/NotificationCenter.tsx', 'app/library/LibraryClient.tsx', 'app/messages/page.tsx'];
const notifications = read(paths[0]);
const library = read(paths[1]);
const messages = read(paths[2]);
const css = read('components/v2/personal-v2.css');
const reprise = css.slice(css.indexOf('/* Chambre resumption:'));

test('resumption is syntax-valid and all new styles have an explicit Chambre boundary', () => {
  for (const path of paths) {
    const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.deepEqual(source.parseDiagnostics, [], path);
  }
  assert.ok(reprise.startsWith('/* Chambre resumption:'));
  postcss.parse(reprise).walkRules((rule) => assert.ok(rule.selector.startsWith('.synaura-chambre'), rule.selector));
  assert.match(reprise, /prefers-reduced-motion: reduce/);
  assert.match(reprise, /:focus-visible/);
});

test('strict original AST fingerprint proves unchanged non-JSX code and behavioral expressions', (context) => {
  const backupRoot = new URL('artifacts/chambre-resumption/before/personal/', root);
  if (!existsSync(backupRoot)) return context.skip('Local before snapshots unavailable; no behavioral or browser result inferred.');
  for (const path of paths) {
    const before = readFileSync(new URL(path, backupRoot), 'utf8');
    assert.equal(behaviorFingerprint(read(path), path), behaviorFingerprint(before, path), path);
  }
});

test('notification panel has dedicated states, name, filters and footer without inherited cream classes', () => {
  const panel = notifications.slice(notifications.indexOf('function DBNotifItem'));
  for (const name of ['chambre-notifications', 'chambre-notification-header', 'chambre-notification-scroll', 'chambre-notification-filters', 'chambre-notification-list', 'chambre-notification-empty', 'chambre-notification-footer']) assert.ok(panel.includes(name), name);
  assert.match(panel, /aria-expanded=\{showPanel\}/);
  assert.match(panel, /aria-labelledby="chambre-notification-heading"/);
  assert.match(panel, /aria-pressed=\{category === c.key\}/);
  assert.match(panel, /aria-label="Tout marquer comme lu"/);
  assert.match(panel, /aria-label="Tout supprimer"/);
  assert.doesNotMatch(panel, /#fff7ec|#fff8ee|#efe4d4|#171313|#7c5cff|#4d3aa0|text-black\//);
  for (const marker of ["pushStatus === 'unknown'", "pushStatus === 'denied'", "pushStatus === 'unavailable'", 'onClick={handleEnablePush}', 'onClick={markAllRead}', 'onClick={clearAll}', 'href="/notifications"', 'href="/settings?tab=preferences"']) assert.ok(panel.includes(marker), marker);
});

test('notification opening is native keyboard activation and deletion is a separate visible button', () => {
  const item = notifications.slice(notifications.indexOf('function DBNotifItem'), notifications.indexOf('export default function'));
  assert.match(item, /<button\s+type="button"\s+className="chambre-notification-open"\s+onClick=\{\(\) => \{\s+if \(!n.is_read\) onMarkRead\(n.id\);\s+if \(n.action_url\) router.push\(n.action_url, \{ scroll: false \}\);/);
  assert.match(item, /<\/button>\s+<button\s+onClick=\{\(e\) => \{ e.stopPropagation\(\); onDelete\(n.id\); \}\}/);
  assert.doesNotMatch(item, /opacity-0|group-hover|line-clamp/);
  assert.match(reprise, /\.chambre-notification-scroll \{[^}]*min-height: 0;[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;/);
  assert.match(reprise, /\.chambre-notification-footer \{[^}]*flex: none;[^}]*safe-area-inset-bottom/);
});

test('all three existing library portals have separately scrollable bodies and safe-area footers', () => {
  assert.equal((library.match(/className="chambre-library-backdrop /g) || []).length, 3);
  assert.equal((library.match(/className="chambre-library-dialog-body /g) || []).length, 3);
  assert.equal((library.match(/className="chambre-library-dialog-footer"/g) || []).length, 3);
  for (const id of ['create', 'actions', 'edit']) {
    assert.ok(library.includes(`aria-labelledby="chambre-library-${id}-title"`));
    assert.ok(library.includes(`id="chambre-library-${id}-title"`));
  }
  assert.match(reprise, /\.chambre-library-dialog \{[^}]*max-height: calc\(100dvh[^}]*safe-area-inset/);
  assert.match(reprise, /\.chambre-library-dialog-body \{[^}]*min-height: 0;[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;/);
  assert.match(reprise, /\.chambre-library-dialog-footer \{[^}]*flex: none;[^}]*safe-area-inset-bottom/);
});

test('library fields, close controls and public switches expose names and selected state', () => {
  for (const action of ['create', 'edit']) {
    for (const field of ['name', 'description']) {
      assert.ok(library.includes(`htmlFor="chambre-library-${action}-${field}"`));
      assert.ok(library.includes(`id="chambre-library-${action}-${field}"`));
    }
  }
  assert.match(library, /aria-label="Fermer la création de dossier"/);
  assert.match(library, /aria-label="Fermer les options du dossier"/);
  assert.match(library, /aria-label="Dossier public"\s+aria-pressed=\{newPl.isPublic\}/);
  assert.match(library, /aria-label="Dossier public"\s+aria-pressed=\{editPl.isPublic\}/);
});

test('playlist Play is visible without hover and retains explicit existing click owner', () => {
  assert.match(library, /onPlay\(\);\s+\}\}\s+className="chambre-library-play [^"]*"\s+aria-label="Lire"/);
  const playClass = library.match(/className="(chambre-library-play [^"]*)"/)?.[1];
  assert.ok(playClass);
  assert.doesNotMatch(playClass, /opacity-0|group-hover/);
  assert.match(reprise, /\.chambre-library-play \{[^}]*width: 44px; height: 44px; opacity: 1;/);
});

test('guest Messages keeps the original guard/login and uses existing product return/navigation', () => {
  const guest = messages.slice(messages.indexOf('if (!session?.user)'), messages.indexOf('const tabs:'));
  assert.match(guest, /^if \(!session\?\.user\)/);
  for (const node of ['<SynauraAppShell', '<SynauraTopBar />', '<SynauraRouteNav />', 'chambre-messages-guest-context']) assert.ok(guest.includes(node), node);
  assert.match(guest, /onClick=\{\(\) => router.push\("\/auth\/signin"\)\}/);
  assert.doesNotMatch(guest, /fetch\(|setSession|mock|demo|fake/i);
  const shell = read('components/synaura/SynauraShell.tsx');
  assert.match(shell, /<HandoffReturn /);
  assert.match(shell, /href="\/live" className="v2-topbar-brand"/);
  assert.match(reprise, /max-width: 767px[\s\S]*\.chambre-messages-guest \{ grid-template-columns: minmax\(0, 1fr\)/);
});

test('new primary controls use the shared AA-safe filled token, not the pale accent', () => {
  for (const selector of ['chambre-notification-enable', 'chambre-library-primary', 'chambre-library-play', 'chambre-messages-guest-signin']) {
    assert.match(reprise, new RegExp(`\\.${selector} \\{[^}]*background: var\\(--v2-accent-fill\\); color: white;`), selector);
  }
  const hex = read('app/v2.css').match(/--v2-accent-fill:\s*#([\da-f]{6})/i)?.[1];
  assert.ok(hex);
  const linear = hex.match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  assert.ok(1.05 / (.2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2] + .05) >= 4.5);
});
