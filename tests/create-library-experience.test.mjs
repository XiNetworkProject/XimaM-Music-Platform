import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const parse = path => ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Create was explicitly replaced by a sheet: its functional gate is create-surface.test.mjs.
test('Library retains the exact deployed controller body outside JSX', () => {
  const path = 'app/library/LibraryClient.tsx';
  const ast = parse(path);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'LibraryClient');
  const transformed = ts.transform(fn, [context => {
    const visit = node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)
      ? ts.factory.createNull() : ts.visitEachChild(node, visit, context);
    return visit;
  }]);
  const normalized = ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, transformed.transformed[0], ast);
  transformed.dispose();
  assert.equal(createHash('sha256').update(normalized).digest('hex'), '09cfb90f033df937a903a6e71c90dd286ee929a2cfa06142ef39fa164835df32');
});

test('Library visual wrapper is presentation-only', () => {
  const source = read('app/library/layout.tsx');
  assert.match(source, /collection-redesign/);
  assert.doesNotMatch(source, /useEffect|fetch\(|AudioProvider|new Audio|localStorage|sessionStorage/);
  assert.equal(parse('app/library/layout.tsx').parseDiagnostics.length, 0);
});

test('Library remains scoped, responsive, keyboard-accessible and pausable', () => {
  const source = read('app/library/library-experience.css');
  const css = postcss.parse(source);
  css.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') return;
    assert.ok(rule.selectors.every(selector => selector.includes('.collection-redesign')), rule.selector);
  });
  assert.match(source, /prefers-reduced-motion:reduce/);
  assert.match(source, /focus-visible/);
  assert.doesNotMatch(source, /overflow-y:\s*(?:auto|scroll)/);
  assert.match(source, /animation-play-state:paused/);
  assert.match(source, /\[data-motion=true\][^{]*\{animation-play-state:running\}/);
  assert.match(source, /v2-library-categories\{[^}]*flex-wrap:wrap/);
  assert.match(source, /grid-template-columns:44px minmax\(0,1fr\) 44px 44px/);
});
