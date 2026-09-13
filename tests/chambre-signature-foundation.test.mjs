import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const decorativeImport = "import ChambreResonance from '@/components/v2/ChambreResonance';";

test('resonance renders deterministic bounded decorative geometry without runtime side effects', () => {
  const source = read('components/v2/ChambreResonance.tsx');
  assert.doesNotMatch(source, /useEffect|useState|fetch\(|Audio|requestAnimationFrame|setTimeout|Math\.random/);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX} }).outputText, {exports, require});
  const first = renderToStaticMarkup(React.createElement(exports.default));
  assert.equal(first, renderToStaticMarkup(React.createElement(exports.default)));
  assert.match(first, /aria-hidden="true"/);
  assert.match(first, /focusable="false"/);
  assert.equal((first.match(/<path /g) || []).length, 30);
  assert.ok(first.length < 65000, `${first.length} characters`);
  assert.doesNotMatch(first, /NaN|Infinity|<audio|<button|tabindex/);
});

test('signature style has bounded motion, no hidden content dependency, and no entry/audio selectors', () => {
  const css = read('components/v2/chambre-signature.css');
  const sheet = postcss.parse(css);
  const motions = [];
  sheet.walkDecls('animation', declaration => motions.push(declaration));
  for (const declaration of motions) {
    assert.doesNotMatch(declaration.value, /infinite/);
    if (declaration.value.startsWith('none')) continue;
    let parent = declaration.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media')) parent = parent.parent;
    assert.match(parent?.params || '', /prefers-reduced-motion:no-preference/);
  }
  sheet.walkRules(rule => {
    assert.doesNotMatch(rule.selector, /chamber-product|chamber-material|chamber-listening|chambre-public-entry|data-musical|player|(^|[ ,>+~])body\b/);
  });
  assert.doesNotMatch(css, /backdrop-filter|will-change|scroll-behavior|scroll-snap/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('existing spaces controller and destinations are byte-identical outside decorative insertion', {skip: !fs.existsSync(new URL('../artifacts/chambre-signature/before/foundation/components/synaura/ChambreSpacesMenu.tsx', import.meta.url))}, () => {
  const previous = read('artifacts/chambre-signature/before/foundation/components/synaura/ChambreSpacesMenu.tsx').replaceAll('\r\n','\n');
  const current = read('components/synaura/ChambreSpacesMenu.tsx').replaceAll('\r\n','\n');
  assert.equal(current.split(decorativeImport).length - 1, 1);
  assert.equal(current.replace(`${decorativeImport}\n`, '').replace('        <ChambreResonance className="chambre-spaces-resonance" />\n', ''), previous);
});

test('root integration adds only its stylesheet; support form behavior remains untouched', {skip: !fs.existsSync(new URL('../artifacts/chambre-signature/before/foundation/app/layout.tsx', import.meta.url))}, () => {
  const previous = read('artifacts/chambre-signature/before/foundation/app/layout.tsx').replaceAll('\r\n','\n');
  const current = read('app/layout.tsx').replaceAll('\r\n','\n');
  // The explicitly requested full experience redraw adds these presentation sheets only.
  let previousIntegration = current;
  for (const sheet of ['experience-live-navigation', 'experience-collection', 'experience-creation', 'experience-account']) {
    const line = `import '@/components/v2/${sheet}.css';\n`;
    assert.ok(previousIntegration.split(line).length <= 2, `${sheet}: no duplicate integration`);
    previousIntegration = previousIntegration.replace(line, '');
  }
  assert.equal(previousIntegration.replace("import '@/components/v2/chambre-signature.css';\n", ''), previous);
  const support = read('app/support/page.tsx');
  assert.equal(support.split(decorativeImport).length - 1, 1);
  assert.match(support, /<SupportForm \/>/);
  assert.match(support, /<NoBookingNotice \/>/);
  assert.match(support, /<RevealEmailButton \/>/);
  assert.match(support, /id="contact-form"/);
});

test('service sidebar keeps its controller and route arrays, with one coherent accessible brand', {skip: !fs.existsSync(new URL('../artifacts/chambre-signature/before/foundation/components/AppSidebar.tsx', import.meta.url))}, () => {
  const previous = read('artifacts/chambre-signature/before/foundation/components/AppSidebar.tsx').replaceAll('\r\n','\n');
  const current = read('components/AppSidebar.tsx').replaceAll('\r\n','\n');
  assert.equal(current.split('      {/* Logo */}')[0], previous.split('      {/* Logo */}')[0]);
  const suffix = current.split('      {/* Profile with dropdown */}')[1]
    .replace('chambre-service-links ', '')
    .replace("              aria-current={active ? 'page' : undefined}\n", '');
  assert.equal(suffix, previous.split('      {/* Profile with dropdown */}')[1]);
  assert.match(current, /aria-label="Synaura, accueil"/);
  assert.match(current, /variant="wordmark" size=\{34\}/);
  assert.match(current, /size=\{32\} className="hidden group-data-\[collapsed=true\]\/sidebar:inline-flex"/);
});
