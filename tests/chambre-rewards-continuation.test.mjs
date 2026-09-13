import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import postcss from 'postcss';
import { behaviorFingerprint } from './chambre-personal-redesign.test.mjs';

const root = new URL('../', import.meta.url);
const backupRoot = new URL('artifacts/chambre-continuation/before/rewards/', root);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const paths = ['components/BoosterOpenModal.tsx', 'components/DailySpinModal.tsx', 'components/BoosterPackOpenModal.tsx', 'app/boosters/BoostersClient.tsx'];
const css = read('components/v2/personal-v2.css');
const rewardCss = css.slice(css.indexOf('/* Chambre rewards continuation:'));
const parse = (path, source = read(path)) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });

test('rewards markup and isolated styles parse without touching the approved entry', () => {
  for (const path of paths) assert.deepEqual(parse(path).parseDiagnostics, [], path);
  assert.ok(rewardCss.startsWith('/* Chambre rewards continuation:'));
  postcss.parse(rewardCss).walkRules((rule) => assert.ok(rule.selector.startsWith('.synaura-chambre'), rule.selector));
  assert.doesNotMatch(rewardCss, /\.chamber-product|\.chamber-material|prototypes\//);
});

test('exact original AST fingerprint preserves every owner, request, guard and reward expression', (context) => {
  if (!existsSync(backupRoot)) return context.skip('Local before evidence absent; no behavioral result inferred.');
  for (const path of paths) {
    assert.equal(behaviorFingerprint(read(path), path), behaviorFingerprint(readFileSync(new URL(path, backupRoot), 'utf8'), path), path);
  }
});

test('inline animation timings and transforms are also unchanged, beyond the presentation fingerprint', (context) => {
  if (!existsSync(backupRoot)) return context.skip('Local before evidence absent.');
  const choreography = (source, path) => {
    const file = parse(path, source);
    const values = [];
    const visit = (node) => {
      if (ts.isPropertyAssignment(node) && /^(animation|animationDelay|transition|transform|transformOrigin|transformStyle)$/.test(node.name.getText(file))) values.push(printer.printNode(ts.EmitHint.Unspecified, node, file));
      ts.forEachChild(node, visit);
    };
    visit(file);
    return values;
  };
  for (const path of paths) assert.deepEqual(choreography(read(path), path), choreography(readFileSync(new URL(path, backupRoot), 'utf8'), path), path);
});

test('booster opening retains anticipation, explosion, foil, values and explicit open callback', () => {
  const source = read(paths[0]);
  for (const marker of ["setPhase('anticipation')", "setPhase('buildup')", "setPhase('explosion')", "setPhase('revealed')", 'onOpenBooster();', 'convergeParticles.map', 'particles.map', 'crackLines.map', 'bo-foil 3s', 'boosterData.multiplier?.toFixed(2)', 'boosterData.duration_hours', 'onClick={handleOpen}', 'disabled={isOpening}']) assert.ok(source.includes(marker), marker);
  assert.match(source, /className="chambre-booster-opening relative z-10"/);
  assert.match(source, /className="chambre-booster-result-copy"/);
  assert.doesNotMatch(source, /from-\[#0f0a20\]|to-\[#1a0a2e\]|from-violet-600 to-pink-600|aspect-\[3\/4\][^\n]*chambre-booster-result/);
  assert.match(rewardCss, /\.chambre-reward-stage \{[^}]*overflow-y: auto;[^}]*safe-area-inset-bottom/);
});

test('daily wheel keeps its natural GET, guarded POST, canvas order and four-second rotation', () => {
  const source = read(paths[1]);
  for (const marker of ["fetch('/api/daily-spin', { cache: 'no-store' })", "fetch('/api/daily-spin', { method: 'POST' })", 'if (!status?.canSpin) return;', 'SEGMENTS.forEach', 'r.index + 0.5', '}, 4200);', "'transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)'", 'disabled={loading || spinning || !status?.canSpin}', 'result.reward.label']) assert.ok(source.includes(marker), marker);
  assert.match(source, /className="chambre-spin-wheel relative"/);
  assert.doesNotMatch(source, /style=\{\{ width: 310, height: 310 \}\}/);
  assert.match(source, /aria-label="Récompenses de la roue"/);
  assert.match(rewardCss, /\.chambre-spin-wheel \{ width: min\(100%, 340px\); aspect-ratio: 1;/);
  assert.match(rewardCss, /\.chambre-spin-body \{[^}]*min-height: 0;[^}]*overflow-y: auto;/);
  assert.match(rewardCss, /\.chambre-spin-footer \{ flex: none;[^}]*safe-area-inset-bottom/);
});

test('pack revelation keeps sort/rank, auto/manual steps and received values without truncation', () => {
  const source = read(paths[2]);
  for (const marker of ['[...received].sort', 'RARITY_CFG[a.booster.rarity]?.rank', "setTimeout(() => setPhase('cards'), 1200)", 'revealed === 0 ? 500 : 600', 'setAuto(false); setRevealed(sortedReceived.length);', 'setAuto(v => !v)', 'setRevealed(r => Math.min(sortedReceived.length, r + 1))', 'it.booster.name', 'Number(it.booster.multiplier).toFixed(2)', 'it.booster.duration_hours']) assert.ok(source.includes(marker), marker);
  assert.match(source, /aria-pressed=\{auto\} aria-label="Révélation automatique"/);
  assert.doesNotMatch(source, /line-clamp|bg-\[#0f0a20\]|linear-gradient\(180deg, #0f0a20/);
  assert.match(rewardCss, /\.chambre-pack-result-body \{ min-height: 0;[^}]*overflow-y: auto;/);
  assert.match(rewardCss, /\.chambre-pack-result-footer \{[^}]*flex: none;[^}]*safe-area-inset-bottom/);
  assert.match(rewardCss, /\.chambre-pack-card-info h3 \{[^}]*overflow-wrap: anywhere;/);
});

test('entry buttons and both shop cards preserve plan/stock restrictions and original owners', () => {
  const source = read(paths[3]);
  for (const marker of ['onClick={() => setShowDailyModal(true)}', 'disabled={!canOpen || boostersLoading}', 'onClick={() => setShowSpinModal(true)}', "onClick={() => claimPack('starter_weekly')}", "onClick={() => claimPack('pro_weekly')}", "disabled={plan === 'free'", "disabled={(plan !== 'pro' && plan !== 'enterprise')", 'packs.starter_weekly.claimed >= packs.starter_weekly.perWeek', 'packs.pro_weekly.claimed >= packs.pro_weekly.perWeek']) assert.ok(source.includes(marker), marker);
  assert.equal((source.match(/className="chambre-reward-shop-pack relative"/g) || []).length, 2);
  assert.match(source, /onOpenBooster=\{openDaily\}/);
  assert.match(source, /<BoosterPackOpenModal isOpen=\{showPackModal\}/);
});

test('a single received pack card has a bounded desktop track while mobile retains two columns', () => {
  const rules = [];
  postcss.parse(rewardCss).walkRules('.synaura-chambre .chambre-pack-cards', (rule) => rules.push(rule));
  const desktop = rules.find((rule) => rule.parent.type === 'root');
  const mobile = rules.find((rule) => rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 639px)');
  const tiny = rules.find((rule) => rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 359px)');
  const value = (rule, property) => rule?.nodes.find((node) => node.prop === property)?.value;
  assert.equal(value(desktop, 'grid-template-columns'), 'repeat(auto-fit, minmax(min(170px, 100%), 220px))');
  assert.equal(value(desktop, 'justify-content'), 'center');
  // With one received item, collapsed auto-fit tracks cannot turn its occupied
  // track into a 910px 1fr banner: the CSS maximum remains a definite 220px.
  assert.doesNotMatch(value(desktop, 'grid-template-columns'), /\b1fr\b/);
  assert.equal(value(mobile, 'grid-template-columns'), 'repeat(2, minmax(0, 1fr))');
  assert.equal(value(tiny, 'grid-template-columns'), 'minmax(0, 1fr)');
});

test('motion is retained normally, limited for reduced motion, and keyboard controls keep focus', () => {
  for (const marker of ['bo-converge', 'bo-crack-pulse', 'bo-shake', 'bo-flash', 'bo-foil', 'bo-burst', 'bo-descend']) assert.ok(read(paths[0]).includes(`@keyframes ${marker}`), marker);
  for (const marker of ['ds-spin-glow', 'ds-pointer-bounce', 'ds-confetti-fall', 'ds-pulse-glow']) assert.ok(read(paths[1]).includes(`@keyframes ${marker}`), marker);
  for (const marker of ['pack-tear', 'pack-foil', 'card-flash']) assert.ok(read(paths[2]).includes(`@keyframes ${marker}`), marker);
  assert.match(css, /\[style\*="box-shadow"\]:not\(\.chambre-reward-overlay \*\)/);
  assert.match(rewardCss, /prefers-reduced-motion: reduce/);
  assert.match(rewardCss, /button:focus-visible \{ outline: 2px solid var\(--v2-focus\)/);
  assert.match(rewardCss, /max-width: 639px/);
  assert.match(rewardCss, /max-width: 359px/);
});

test('primary actions use the existing filled token with AA text contrast', () => {
  assert.match(rewardCss, /\.chambre-reward-primary \{[^}]*background: var\(--v2-accent-fill\);[^}]*color: white;/);
  const token = read('app/v2.css').match(/--v2-accent-fill:\s*#([\da-f]{6})/i)?.[1];
  assert.ok(token);
  const channels = token.match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  assert.ok(1.05 / (.2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] + .05) >= 4.5);
});
