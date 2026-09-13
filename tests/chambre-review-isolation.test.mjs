import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('reward component review is disabled in production and cannot submit visual specimens', () => {
  const page = read('app/dev/v2/rewards/page.tsx');
  const source = read('app/dev/v2/rewards/RewardsReview.tsx');
  assert.match(page, /process\.env\.NODE_ENV === 'production'\) notFound\(\)/);
  assert.match(source, /SPÉCIMENS NON ATTRIBUÉS/);
  assert.match(source, /visual-specimen-only/);
  assert.doesNotMatch(source, /fetch\(|onOpenBooster=|SessionProvider|localStorage|\.cookie|router\.push/);
  assert.match(source, /<DailySpinModal isOpen=\{surface === 'wheel'\}/);
  assert.match(read('components/DailySpinModal.tsx'), /if \(!isOpen\) return;[\s\S]{0,150}refresh\(\)/);
  for (const name of ['BoosterOpenModal', 'BoosterPackOpenModal']) {
    assert.doesNotMatch(read(`components/${name}.tsx`), /fetch\(|axios\.|useBoosters\(/);
  }
});

test('visual wheel guard blocks its real mutation control including keyboard clicks, not closing controls', () => {
  const source = read('app/dev/v2/rewards/RewardsReview.tsx');
  const ast = ts.createSourceFile('RewardsReview.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'preventVisualLabSpin') declaration = node;
    ts.forEachChild(node, find);
  }
  find(ast);
  assert.ok(declaration);
  const exports = {};
  class Element {
    constructor(mutation) { this.mutation = mutation; }
    closest(selector) { assert.equal(selector, '.chambre-spin-footer button'); return this.mutation ? this : null; }
  }
  vm.runInNewContext(ts.transpileModule(`const ${declaration.getText(ast)}; exports.guard = preventVisualLabSpin;`, {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText, {exports, Element});
  for (const [target, detail, expected] of [[new Element(true), 1, 1], [new Element(true), 0, 1], [new Element(false), 1, 0], [null, 0, 0]]) {
    let prevented = 0, stopped = 0;
    exports.guard({target, detail, preventDefault(){ prevented++; }, stopImmediatePropagation(){ stopped++; }});
    assert.equal(prevented, expected);
    assert.equal(stopped, expected);
  }
  assert.match(source, /document\.addEventListener\('click', preventVisualLabSpin, true\)/);
  assert.match(source, /return \(\) => document\.removeEventListener\('click', preventVisualLabSpin, true\)/);
  assert.match(read('components/DailySpinModal.tsx'), /className="chambre-spin-footer"[\s\S]{0,200}onClick=\{spin\}/);
});
