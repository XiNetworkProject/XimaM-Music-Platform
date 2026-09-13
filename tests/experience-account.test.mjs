import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const paths = ['app/subscriptions/page.tsx', 'app/settings/SettingsClient.tsx'];
const subscription = read(paths[0]);
const settings = read(paths[1]);
const css = read('components/v2/experience-account.css');
const parse = (text, path = 'account.tsx') => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });

function normalize(node, file) {
  const transformed = ts.transform(node, [(context) => {
    const visit = (current) => {
      if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current) || ts.isJsxFragment(current)) return ts.factory.createNull();
      return ts.visitEachChild(current, visit, context);
    };
    return visit;
  }]);
  const result = printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], file);
  transformed.dispose();
  return result;
}

function businessBody(text, name) {
  const file = parse(text);
  const component = file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(component?.body, name);
  return component.body.statements
    .filter((node) => !/^const reduceMotion = useReducedMotion\(\);$/.test(printer.printNode(ts.EmitHint.Unspecified, node, file).trim()))
    .map((node) => normalize(node, file)).join('\n');
}

function controlContracts(text) {
  const file = parse(text);
  const contracts = new Set();
  function visit(node) {
    if (ts.isJsxAttribute(node) && /^(on[A-Z]|value$|checked$|disabled$|priceId$|open$|isOpen$)/.test(node.name.getText(file))) {
      // Kpi and MetricCard receive display text, not controlled input values.
      const element = node.parent.parent;
      if (node.name.getText(file) === 'value' && ['Kpi', 'MetricCard'].includes(element.tagName?.getText(file))) return;
      if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        contracts.add(`${node.name.getText(file)}=${normalize(node.initializer.expression, file)}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...contracts].sort();
}

// Historical account checks may ignore the authorized ordering of entire JSX
// sections, but not their business bodies, imports, controls, guard conditions,
// pricing expressions, sources or destinations. This adapter only accepts these
// two files. The live helper tests below cover their actual rewritten markup.
export function accountBehaviorFingerprint(text, path) {
  assert.ok(paths.includes(path), `Not an account route: ${path}`);
  const isMembership = path === paths[0];
  const file = parse(text, path);
  const signatureFields = new Map([['SettingsNavItem', 'description'], ['InnerCard', 'id']]);
  const presentationIcons = isMembership ? ['ArrowUpRight', 'Shield', 'Zap'] : ['ArrowUpRight'];
  const normalized = ts.transform(file, [(context) => {
    const visit = (node) => {
      if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        const module = node.moduleSpecifier.text;
        const omitted = module === 'lucide-react' ? presentationIcons : module === 'framer-motion' ? ['useReducedMotion'] : module === '@/components/synaura/SynauraShell' ? ['SynauraInkPanel'] : [];
        const bindings = ts.factory.updateNamedImports(node.importClause.namedBindings, node.importClause.namedBindings.elements.filter((item) => !omitted.includes(item.name.text)));
        return ts.factory.updateImportDeclaration(node, node.modifiers, ts.factory.updateImportClause(node.importClause, node.importClause.isTypeOnly, node.importClause.name, bindings), node.moduleSpecifier, node.attributes);
      }
      if (ts.isFunctionDeclaration(node)) {
        if (isMembership && node.name?.text === 'CompareCell') {
          // This former formatting wrapper only returned JSX and is now native td/th.
          assert.equal(normalize(node.body, file).replace(/\s+/g, ''), '{return(null);}');
          return undefined;
        }
        let parameters = node.parameters;
        const field = !isMembership && signatureFields.get(node.name?.text);
        if (field) parameters = node.parameters.map((parameter) => {
          const binding = ts.isObjectBindingPattern(parameter.name) ? ts.factory.updateObjectBindingPattern(parameter.name, parameter.name.elements.filter((item) => item.name.getText(file) !== field)) : parameter.name;
          const type = parameter.type && ts.isTypeLiteralNode(parameter.type) ? ts.factory.updateTypeLiteralNode(parameter.type, parameter.type.members.filter((item) => item.name?.getText(file) !== field)) : parameter.type;
          return ts.factory.updateParameterDeclaration(parameter, parameter.modifiers, parameter.dotDotDotToken, binding, parameter.questionToken, type, parameter.initializer);
        });
        let body = node.body;
        if (body && isMembership && ['SubscriptionsPage', 'PlanCard'].includes(node.name?.text)) {
          body = ts.factory.updateBlock(body, body.statements.filter((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, file).trim() !== 'const reduceMotion = useReducedMotion();'));
        }
        return ts.visitEachChild(ts.factory.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, parameters, node.type, body), visit, context);
      }
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return ts.factory.createNull();
      return ts.visitEachChild(node, visit, context);
    };
    return visit;
  }]);
  const moduleBody = printer.printFile(normalized.transformed[0]);
  normalized.dispose();
  const priceExpressions = [];
  const linksAndSources = new Set();
  const guards = [];
  const isPresentationAttribute = (node) => ts.isJsxAttribute(node) && /^(className|style|aria-|data-|id$|htmlFor$)/.test(node.name.getText(file));
  const hasControl = (node) => {
    let found = false;
    const inspect = (child) => {
      if (ts.isJsxAttribute(child) && /^(on[A-Z]|href$|priceId$|open$|isOpen$)/.test(child.name.getText(file))) found = true;
      ts.forEachChild(child, inspect);
    };
    inspect(node);
    return found;
  };
  const visit = (node) => {
    if (isPresentationAttribute(node)) return;
    if (ts.isJsxAttribute(node) && /^(href|src|ref)$/.test(node.name.getText(file))) {
      const value = node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression ? normalize(node.initializer.expression, file) : node.initializer?.getText(file);
      if (!['"#experience-settings-visuals"', '"#settings-appearance"', '"#settings-listening"', '"#settings-notifications"'].includes(value)) linksAndSources.add(`${node.name.getText(file)}=${value}`);
    }
    if (ts.isJsxExpression(node) && node.expression) {
      const expression = node.expression;
      let value = normalize(expression, file);
      if (value.includes('PLANS.')) {
        // The source has always used -1 to mean unlimited. These are the only
        // two quota-text corrections; the numeric constants stay untouched.
        value = value.replaceAll('`${PLANS.pro.limits.maxTracks}/mois`', "formatLimit(PLANS.pro.limits.maxTracks, '/mois')").replaceAll('String(PLANS.pro.limits.maxTracks)', 'formatLimit(PLANS.pro.limits.maxTracks)');
        if (value !== "isStarterActive ? 'Actif' : PLANS.starter.badge") priceExpressions.push(value);
      }
      if (ts.isConditionalExpression(expression) && hasControl(expression)) guards.push(normalize(expression.condition, file));
      if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && hasControl(expression.right)) guards.push(normalize(expression.left, file));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return createHash('sha256').update(JSON.stringify([moduleBody, controlContracts(text), [...linksAndSources].sort(), priceExpressions.sort(), guards.sort()])).digest('hex');
}

// Evaluate only the actual pure presentational helpers. No page effects, API
// modules, sessions, billing actions or product controls are mounted or invoked.
function helper(text, name) {
  const file = parse(text);
  const declaration = file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  const code = ts.transpileModule(declaration.getText(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const icon = (props) => React.createElement('svg', props);
  const component = vm.runInNewContext(`${code}\n${name}`, {
    React, Check: icon, ArrowUpRight: icon, useReducedMotion: () => true,
    motion: { article: ({ initial, animate, ...props }) => React.createElement('article', props) },
    cx: (...classes) => classes.filter(Boolean).join(' '),
  });
  return component;
}

test('account pages and scoped stylesheet parse without introducing imports or service dependencies', () => {
  for (const path of paths) assert.deepEqual(parse(read(path), path).parseDiagnostics, [], path);
  postcss.parse(css).walkRules((rule) => assert.ok(rule.selector.startsWith('.synaura-chambre'), rule.selector));
  assert.doesNotMatch(css, /url\(|@import|animation:.*infinite/);
  assert.match(css, /max-width: 767px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible/);
});

test('all existing account business statements, effects and individual control contracts survive recomposition', (context) => {
  const backup = new URL('artifacts/chambre-experience/before/account/', root);
  if (!existsSync(backup)) return context.skip('Local before snapshots unavailable; no preservation proof inferred.');
  for (const [index, name] of ['SubscriptionsPage', 'SettingsClient'].entries()) {
    const path = paths[index];
    const before = readFileSync(new URL(path, backup), 'utf8');
    const after = read(path);
    assert.equal(businessBody(after, name), businessBody(before, name), `${path}: data, effects, guards, payloads and state updates`);
    assert.deepEqual(controlContracts(after), controlContracts(before), `${path}: control bindings`);
  }
});

test('period selector exposes selection and sends the exact selected interval', () => {
  const PeriodToggle = helper(subscription, 'PeriodToggle');
  const changes = [];
  const tree = PeriodToggle({ value: 'year', onChange: (period) => changes.push(period) });
  const buttons = React.Children.toArray(tree.props.children);
  assert.equal(buttons.length, 2);
  assert.deepEqual(buttons.map((button) => button.props['aria-pressed']), [false, true]);
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.deepEqual(changes, ['month', 'year']);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /role="group" aria-label="Période de facturation"/);
  assert.doesNotMatch(html, /20%|Populaire/);
});

test('the real pass component keeps an explicit disabled active plan and a single selection owner', () => {
  const PlanCard = helper(subscription, 'PlanCard');
  const props = { title: 'Starter', description: 'Créer', priceText: '47,88 € / an', subPrice: 'soit 3,99 €/mois', features: ['Messagerie'], limits: [['Pistes', '40/mois']] };
  let selected = 0;
  const choice = () => { selected += 1; };
  const tree = PlanCard({ ...props, onChoose: choice });
  const button = React.Children.toArray(tree.props.children).find((child) => child.type === 'button');
  assert.equal(button.props.onClick, choice);
  assert.equal(button.props.disabled, false);
  button.props.onClick();
  assert.equal(selected, 1);
  const html = renderToStaticMarkup(tree);
  assert.ok(html.indexOf('Choisir ce plan') < html.indexOf('40/mois'));
  assert.match(html, /<dl class="experience-membership-plan-limits">/);
  const active = renderToStaticMarkup(PlanCard({ ...props, active: true, badge: 'Actif' }));
  assert.match(active, /disabled=""/);
  assert.match(active, /aria-label="Plan Starter actif"/);
});

test('canonical unlimited quotas format truthfully and comparison has real row headings', () => {
  const formatLimit = helper(subscription, 'formatLimit');
  assert.equal(formatLimit(-1, '/mois'), 'Illimité');
  assert.equal(formatLimit(40, '/mois'), '40/mois');
  assert.match(subscription, /formatLimit\(PLANS.pro.limits.maxTracks, '\/mois'\)/);
  assert.match(subscription, /pro=\{formatLimit\(PLANS.pro.limits.maxTracks\)\}/);
  assert.match(subscription, /<table className="experience-membership-table">/);
  assert.match(subscription, /<th scope="row">\{label\}<\/th>/);
  assert.doesNotMatch(subscription, /PLANS.starter.badge|hint: '-20%'/);
  for (const key of ['free', 'starter', 'pro']) assert.match(subscription, new RegExp(`features=\\{PLANS.${key}.features\\}`));
});

test('all settings sections remain reachable and current fields precede account limits and auxiliary links', () => {
  for (const tab of ['profil', 'compte', 'parrainage', 'preferences', 'events', 'securite', 'legal']) {
    assert.ok(settings.includes(`setTabAndUrl('${tab}')`), tab);
  }
  assert.match(settings, /hidden=\{tab !== 'compte'\}/);
  assert.equal((settings.match(/<SubscriptionLimits \/>/g) || []).length, 1);
  assert.ok(settings.indexOf('<Field label="Nom d’affichage">') < settings.indexOf('<SubscriptionLimits />'));
  assert.ok(settings.indexOf('<Field label="Nom d’affichage">') < settings.indexOf('aria-label="Outils personnels"'));
  for (const id of ['settings-appearance', 'settings-listening', 'settings-notifications']) {
    assert.ok(settings.includes(`href="#${id}"`));
    assert.ok(settings.includes(`id="${id}"`));
  }
  assert.match(css, /\.experience-settings \.v2-settings-sections \{ display: flex; overflow-x: auto; flex-wrap: nowrap;/);
});

test('actual settings switches have contextual names, controlled state and preserved toggle callback', () => {
  const Toggle = helper(settings, 'Toggle');
  const changes = [];
  const tree = Toggle({ checked: true, label: 'Qualité audio élevée', description: 'Audio', onChange: (value) => changes.push(value) });
  const button = React.Children.toArray(tree.props.children).find((child) => child.type === 'button');
  assert.equal(button.props.role, 'switch');
  assert.equal(button.props['aria-checked'], true);
  assert.equal(button.props['aria-label'], 'Qualité audio élevée');
  button.props.onClick();
  assert.deepEqual(changes, [false]);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /aria-label="Qualité audio élevée"/);
  assert.match(settings, /aria-label="Choisir une image pour l’avatar"/);
  assert.match(settings, /aria-label="Phrase de confirmation de suppression du compte"/);
});

test('purchases, subscription change, account delete and profile saves stay behind their existing guards', () => {
  for (const expression of ['onClick={cancelSubscription}', 'onClick={downgradeToFree}', 'onSuccess={() => {', 'priceId={selectedPriceId}', '<BuyCreditsModal isOpen={showBuyCredits}']) assert.ok(subscription.includes(expression), expression);
  assert.match(subscription, /if \(!window.confirm\("Confirmer l'annulation à la fin de la période \?"\)\) return/);
  assert.match(settings, /disabled=\{deleteAccountConfirm !== DELETE_CONFIRM_PHRASE \|\| deleteAccountLoading\}/);
  assert.match(settings, /onClick=\{saveProfile\} disabled=\{!isProfileDirty \|\| profileSaving \|\| profileLoading\}/);
  assert.match(settings, /<UModal open=\{deleteAccountModalOpen\}/);
});

test('account historical adapter rejects altered endpoints, effects, handlers, price sources and action guards', () => {
  const expectedSettings = accountBehaviorFingerprint(settings, paths[1]);
  const expectedSubscription = accountBehaviorFingerprint(subscription, paths[0]);
  const mutations = [
    [paths[1], settings.replace("fetch('/api/account/delete'", "fetch('/api/account/remove'"), expectedSettings, 'endpoint'],
    [paths[1], settings.replace('onClick={saveProfile}', 'onClick={resetProfileForm}'), expectedSettings, 'save handler'],
    [paths[0], subscription.replace('}, 120000);', '}, 60000);'), expectedSubscription, 'refresh effect'],
    [paths[0], subscription.replace("priceText={period === 'year' ? `${formatEuro(PLANS.starter.priceYearly)}", "priceText={period === 'year' ? `${formatEuro(PLANS.pro.priceYearly)}"), expectedSubscription, 'rendered price source'],
    [paths[0], subscription.replace('{selectedPriceId && !paid ? (', '{selectedPriceId ? ('), expectedSubscription, 'checkout guard'],
    [paths[1], settings.replace("import { notify } from '@/components/NotificationCenter';", "import { notify } from '@/components/NotificationCenterChanged';"), expectedSettings, 'service import'],
  ];
  for (const [path, mutated, expected, reason] of mutations) {
    assert.notEqual(mutated, read(path), `Mutation applied: ${reason}`);
    assert.notEqual(accountBehaviorFingerprint(mutated, path), expected, reason);
  }
  assert.throws(() => accountBehaviorFingerprint(settings, 'app/other/page.tsx'), /Not an account route/);
});
