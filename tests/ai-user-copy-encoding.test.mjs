import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const path = 'app/ai-generator/page.tsx';
const source = readFileSync(path, 'utf8');
const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

test('AI user-facing literals do not contain confirmed mojibake', () => {
  const failures = [];
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)
      || ts.isJsxText(node)) {
      const text = source.slice(node.getStart(ast), node.end);
      let developerConsole = false;
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isCallExpression(parent) && parent.expression.getText(ast).startsWith('console.')) {
          developerConsole = true;
        }
      }
      // Existing backend prompt hint is not UI copy and intentionally remains outside this fix.
      const internalPrompt = text === "'radio edit 2:30â€“3:00 with intro / verse / pre / drop'";
      if (!developerConsole && !internalPrompt && /Ã|Â|â€|ðŸ|\uFFFD/.test(text)) {
        failures.push(ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.deepEqual(failures, []);
});

test('AI library, settings and accessible previous-track labels use UTF-8 French', () => {
  assert.ok(source.includes("label: 'Bibliothèque'"));
  assert.ok(source.includes('aria-label="Paramètres"'));
  assert.ok(source.includes('aria-label="Piste précédente"'));
});
