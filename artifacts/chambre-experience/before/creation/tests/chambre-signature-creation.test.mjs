import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import postcss from 'postcss';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const files = ['app/create/page.tsx','app/publish/page.tsx','app/ai-generator/page.tsx','app/ai-library/page.tsx','app/studio/StudioClient.tsx','app/upload/page.tsx'];
const css = read('components/v2/creation-v2.css');
const signature = css.slice(css.indexOf('/* CHAMBRE SIGNATURE / CREATION'));
const printer = ts.createPrinter({removeComments:true});
const parse = (file, source = read(file)) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const hasJSX = node => {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
  return ts.forEachChild(node, hasJSX) || false;
};
function audit(file) {
  const ast = parse(file);
  const row = {file,imports:[],events:[],controls:[],calls:[],constructors:[]};
  const visit = node => {
    const print = () => printer.printNode(ts.EmitHint.Unspecified, node, ast);
    if (ts.isImportDeclaration(node)) row.imports.push(print());
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(ast))) row.events.push(print());
    if (ts.isJsxAttribute(node) && /^(href|value|defaultValue|disabled|key|ref|type|checked|defaultChecked|required|accept|multiple|action|method)$/.test(node.name.getText(ast))) row.controls.push(print());
    if (ts.isCallExpression(node) && !hasJSX(node)) row.calls.push(print());
    if (ts.isNewExpression(node)) row.constructors.push(print());
    ts.forEachChild(node,visit);
  };
  visit(ast);
  return row;
}

test('signature creation is valid TSX/CSS across every owned application surface', () => {
  for (const file of files) assert.equal(parse(file).parseDiagnostics.length, 0, file);
  assert.ok(signature.length > 1000);
  assert.ok(postcss.parse(css).nodes.length);
});

test('all imports, 339 handlers, 372 controls, 2636 non-JSX calls and 101 constructors match the pre-signature AST', () => {
  // Captured exclusively from artifacts/chambre-signature/before/creation.
  // No runtime snapshot dependency, no import/handler exemption, no reset of earlier tests.
  const rows = files.map(audit);
  const counts = Object.fromEntries(['imports','events','controls','calls','constructors'].map(key => [key,rows.reduce((sum,row) => sum + row[key].length, 0)]));
  assert.deepEqual(counts, {imports:106,events:339,controls:372,calls:2636,constructors:101});
  assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'), '6c6c413a74f3ed29ad949885695c906b7e0e28c9741d5b9a42531c04cdcb0eea');
});

test('Create is still an actionable intent chooser with a decorative, state-bound motif', () => {
  const source = read('app/create/page.tsx');
  assert.match(source, /data-creative-intent=\{creativeIntent\}/);
  assert.match(source, /chambre-signature-intent-orbit" aria-hidden="true"/);
  assert.match(source, /CREATIVE_PATHS\[id\]\.kicker/);
  assert.match(source, /creativePath.steps.map/);
  assert.ok(source.indexOf('className="v2-create-primary"') < source.indexOf('className="v2-create-path-description"'));
  assert.match(signature, /\.chambre-signature-create \.v2-intent-choice \{ min-height:44px/);
  for (const intent of ['audio','video','together']) assert.ok(signature.includes(`[data-creative-intent="${intent}"]`));
});

test('Publish exposes the same real publishing steps and links in a sleeve plus release plan', () => {
  const source = read('app/publish/page.tsx');
  assert.match(source, /chambre-signature-publish-copy/);
  assert.match(source, /className="chambre-publish-material" aria-hidden="true"/);
  assert.match(source, /chambre-signature-release-sleeve/);
  assert.match(source, /STEPS.map\(\(\{ number, title, description, details, cta \}\)/);
  for (const href of ['/upload','/auth/signin','/create','/ai-library','/community/faq']) assert.ok(source.includes(`href="${href}"`));
  assert.match(signature, /\.chambre-signature-release-steps \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(signature, /\.chambre-signature-release-steps \{ grid-template-columns:1fr/);
});

test('AI archive retains real counters and every track action with readable identity and wrapping controls', () => {
  const source = read('app/ai-library/page.tsx');
  for (const value of ['stats.total','stats.favorites','stats.totalDuration','generations.map','allTracks.map','generation.tracks?.map']) assert.ok(source.includes(value));
  assert.equal((source.match(/chambre-signature-version-row/g) || []).length,2);
  assert.equal((source.match(/chambre-signature-version-actions/g) || []).length,2);
  assert.match(source, /aria-label="Rechercher dans mes créations IA"/);
  assert.match(source, /aria-pressed=\{filter === 'favorites'\}/);
  assert.match(signature, /\.chambre-signature-version-actions \{[^}]*flex-wrap:wrap/);
  assert.match(signature, /\.chambre-signature-version-actions > :is\(button,a\) \{ min-width:44px; min-height:44px/);
  for (const operation of ['playAITrack','downloadTrack','publishTrack','generateCoverVideo','resyncGeneration','shareGeneration']) assert.ok(source.includes(operation));
});

test('Upload presentation follows actual step, progress and drag state with unchanged validation owners', () => {
  const source = read('app/upload/page.tsx');
  assert.match(source, /data-release-step=\{currentStep\}/);
  assert.match(source, /aria-current=\{active \? 'step' : undefined\}/);
  assert.match(source, /aria-pressed=\{releaseType === type\}/);
  assert.match(source, /disabled=\{!enabled\}/);
  assert.equal((source.match(/data-drag-active=\{isAudioDrag\}/g) || []).length,2);
  assert.equal((source.match(/data-drag-active=\{isCoverDrag\}/g) || []).length,1);
  assert.match(source, /width: `\$\{progressPercent\}%`/);
  assert.match(signature, /\[data-signature-drop\]\[data-drag-active="true"\]/);
  assert.doesNotMatch(signature, /release-stepper > div:first-child \{ display:none/);
  assert.doesNotMatch(signature, /\.chambre-signature-release-navigation \{ display:contents/);
  postcss.parse(signature).walkDecls('order', declaration => assert.fail(`Unexpected visual/keyboard reordering: ${declaration.toString()}`));
});

test('workspaces retain internal viewport ownership and decorative motion is bounded/reduced-motion safe', () => {
  const ai = read('app/ai-generator/page.tsx'), studio = read('app/studio/StudioClient.tsx');
  assert.match(ai, /data-mobile-composer-open=\{mobileCreateOpen \|\| undefined\}/);
  assert.match(ai, /gridTemplateColumns: studioGridTemplate/);
  assert.match(ai, /onClick=\{generateMusic\}\s+disabled=\{isGenerationDisabled \|\| isGenerating \|\| rateLimitActive\}/);
  assert.match(studio, /h-\[100svh\] overflow-hidden/);
  assert.match(signature, /chambre-signature-sleeve-arrive 900ms/);
  assert.doesNotMatch(signature, /animation:[^;]*infinite|@import|backdrop-filter/);
  assert.match(signature, /@media\(prefers-reduced-motion:reduce\)[\s\S]*\.chambre-signature-release-sleeve \{ animation:none; transform:none/);
  assert.match(signature, /@media\(max-width:360px\)/);
  assert.match(signature, /@media\(max-width:767px\)/);
  assert.doesNotMatch(signature, /\.v2-ai-columns[^}]*grid-template-columns|\.v2-ai-workspace[^}]*height:/);
});
