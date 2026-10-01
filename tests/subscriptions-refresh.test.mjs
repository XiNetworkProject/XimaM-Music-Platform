import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('app/subscriptions/page.tsx');
const css = read('app/subscriptions/membership.css');

test('billing period change clears the exact previous selection and proration without a request', () => {
  const file = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'PeriodToggle') {
      handler = node.attributes.properties.find((prop) => prop.name?.text === 'onChange')?.initializer.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(handler);
  const calls = [];
  const change = vm.runInNewContext(`(${handler.getText(file)})`, {
    setPeriod: (value) => calls.push(['period', value]),
    setSelectedPriceId: (value) => calls.push(['priceId', value]),
    setPreview: (value) => calls.push(['preview', value]),
  });
  change('year');
  assert.deepEqual(calls, [['period', 'year'], ['priceId', ''], ['preview', null]]);
  calls.length = 0;
  change('month');
  assert.deepEqual(calls, [['period', 'month'], ['priceId', ''], ['preview', null]]);
});

test('public pricing does not bypass subscription success, account or server payment authentication', () => {
  const gate = read('components/onboarding/OnboardingGate.tsx');
  assert.match(gate, /pathname === '\/subscriptions'/);
  assert.doesNotMatch(gate, /pathname.startsWith\('\/subscriptions'\)/);
  for (const route of ['app/api/billing/create-subscription/route.ts', 'app/api/subscriptions/my-subscription/route.ts']) {
    const source = read(route);
    assert.match(source, /getApiSession\(req\)/);
    assert.match(source, /status: 401/);
    assert.ok(source.indexOf('status: 401') < source.indexOf('stripe.customers') || !source.includes('stripe.customers'));
  }
});

test('offers precede account management, annual totals stay explicit and Free stays visible', () => {
  assert.ok(page.indexOf('ref={plansRef}') < page.indexOf('aria-labelledby="membership-current-heading"'));
  assert.ok(page.indexOf('title="Free"') < page.indexOf('title="Starter"'));
  assert.match(page, /Paiement annuel en une fois/);
  assert.match(page, /formatEuro\(PLANS.starter.priceYearly\)/);
  assert.match(page, /formatEuro\(PLANS.pro.priceYearly\)/);
  assert.match(page, /Taxes éventuelles et total confirmés avant paiement/);
  assert.match(page, /badge === 'Sans paiement' \? 'Free inclus avec un compte gratuit'/);
  assert.doesNotMatch(page, /offre limitée|dernière chance|plus populaire|best.seller/i);
  assert.match(page, /Un pack de crédits est un achat ponctuel, pas un abonnement/);
  assert.match(page, /label="Messagerie" free="Oui"/);
});

test('skin stays scoped, comparison fits mobile, motion follows pause and reduced-motion', () => {
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') return;
    assert.ok(rule.selector.startsWith('.synaura-chambre .membership-v3'), rule.selector);
  });
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /data-motion='false'.*animation-play-state: paused/);
  assert.match(css, /experience-membership-table \{ min-width: 0; table-layout: fixed;/);
  assert.match(css, /:focus-visible/);
  assert.match(page, /<ExperienceMotionFrame className="membership-resonance">/);
});

test('subscription discovery uses a quiet desktop link and existing mobile Menu, not another dock action', () => {
  const nav = read('components/navigation/AppNavigation.tsx');
  assert.match(nav, /href="\/subscriptions" prefetch=\{false\} aria-label="Abonnements"/);
  assert.match(read('components/synaura/ChambreSpacesMenu.tsx'), /<Link href="\/subscriptions" prefetch=\{false\} onClick=\{close\}>.*<strong>Abonnements<\/strong>/);
  const primarySpaces = nav.slice(nav.indexOf('const spaces ='), nav.indexOf('] as const;'));
  assert.doesNotMatch(primarySpaces, /subscriptions/);
});
