import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const read = (path) => readFileSync(path, 'utf8');

test('native modal centering is restored after the global reset with low specificity', () => {
  const css = postcss.parse(read('app/globals.css'));
  const reset = css.nodes.findIndex(node => node.selector === '*');
  const modal = css.nodes.findIndex(node => node.selector === 'dialog:where(:modal)');
  assert.ok(modal > reset);
  assert.deepEqual(css.nodes[modal].nodes.map(({ prop, value, important }) => ({ prop, value, important: !!important })), [
    { prop: 'margin', value: 'auto', important: false },
  ]);
});

test('mobile sheet margins and fullscreen opening remain explicit component overrides', () => {
  for (const [path, selector] of [
    ['app/boosters/boosters.css', '.boost-dialog'],
    ['components/city/city-experience.css', '.city-dialog'],
  ]) {
    const matches = [];
    postcss.parse(read(path)).walkRules(selector, rule => {
      rule.walkDecls('margin', decl => {
        if (rule.parent.type === 'atrule' && /max-width/.test(rule.parent.params)) matches.push(decl.value);
      });
    });
    assert.ok(matches.includes('auto 0 0'), path);
  }
  const opening = postcss.parse(read('components/boosters/booster-opening.css'));
  const margins = [];
  opening.walkRules('.boost-dialog.bo-opening', rule => rule.walkDecls('margin', decl => margins.push(decl.value)));
  assert.deepEqual(margins, ['0']);
});
