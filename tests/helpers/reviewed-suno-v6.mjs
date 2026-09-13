import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// V6 is an explicitly authorized behavior change after the visual redesign.
// Keep its immutable BEFORE files and the original visual-test fingerprints.
// Only these named, reviewed AST slots may project back to their old form.
// Each current slot has an exact semantic digest: no wildcard function/import
// exclusion, whole-file exemption, or automatic hash update is permitted.
export const V6_BEFORE_ROOT = 'artifacts/suno-v6/before';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const printer = ts.createPrinter({ removeComments: true });
const parse = (file, source) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const print = (node, ast) => printer.printNode(ts.EmitHint.Unspecified, node, ast);
// Git checkouts may normalize CRLF. Hash identical source independently of OS newlines.
const digest = text => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const normalized = text => text.replace(/\r\n/g, '\n');

// Digests are scoped to the reviewed change, not replacement file snapshots.
// New-generation payload semantics are exercised in suno-v6-generator.test.mjs;
// Studio model/queue/keyboard behavior is exercised in suno-v6-studio.test.mjs.
const SLOTS = {
  'app/ai-generator/page.tsx': [
    ['import', '@/lib/entitlements', 'add', '16b7cfd25fb7ca5e81e566f454e201490f9e3ba07df1c8fa808dd3acf346a8e3'],
    ['import', '@/lib/sunoModels', 'add', '0e078e7c28b32c91717a59e858d50ed0c0cc3b291806f6e58c80e4e52ae12abe'],
    ['import', '@/lib/sunoGeneratorForm', 'add', 'a8910e72d3fbf6e0c7408709728de601cdf9658a0d6616dfa6c68a18ae678bea'],
    ['import', '@/components/ai-studio/SunoV6Announcement', 'add', '912d24ec649aea316b48ffb592f1700d8805fc466acae25168da80874d37bf8d'],
    ['variable', '[modelVersion, setModelVersion]', 'replace', 'eca88895af77dec48f67ae05229211528cab721c1a67965924bef0c464c95034'],
    ['variable', '[generationDuration, setGenerationDuration]', 'replace', 'b0af17b9090dcd3602222f50f9d41e62585ff2544c5e7272513a79b63bca366f'],
    ['variable', 'availableModels', 'add', '3c7518ec01379b57100e83dfd448d5fb59f8ac6b981366b4139c3fd1277fb2d0'],
    ['effect', 'normalizeGenerationModel(current, availableModels)', 'add', '7247d28976a950ed880811ea0ec7e065e56891c1c4a42c40c23fb91f77948868'],
    ['call', 'setModelVersion|s.modelVersion', 'replace', '7873120be9a371b2bd1a1f049ea1058752badcfd1fa24ff5056bdc3ce38978ea'],
    ['call', 'setGenerationDuration|s.generationDuration', 'replace', '8fbbfb0429330737d89e402c8a15df0eb1c1a784d15b0efd58b59fa648f0a619'],
    ['if', 'savedModel', 'replace', '9c8536b393b58e3eb1d83e5776c65ad7cbbdb23283cd5051ad18d911361f934b'],
    ['if', 'savedDuration', 'replace', 'f4042c389912a7b35382e945002f700c2e11899eabd820a8bf12ab003643b760'],
    ['variable', 'generateMusic', 'replace', '5058d2f5bed2662bb4467b81e43f663a8440e8c5ff05f0db2ec02c34d19acdba'],
    ['variable', 'handleReuseTrackInfo', 'replace', '6be79532de3e5f2d89accb002d27c002396c55b1b963aa8f2d281eaadcdcda39'],
    ['variable', 'useLibraryTrackForRemix', 'replace', 'f089a5be883f22c5929e83e00d31e0be91d4f3771dd1c45a678c17151e61a772'],
    ['variable', 'useGeneratedTrackForRemix', 'replace', '9625d52739ab9c83d89881b8341a55c316eed3ec099d462f5bd1214760602d14'],
    ['variable', 'studioModelLabel', 'replace', '9242427055db877b96b770189afdfa8a33eb606d8664433c210cdee909ed0b87'],
    ['variable', 'studioExpectedSlots', 'replace', '4847df312985b3d1fd8abb1bd4281121e4ccce921c10e8178e1d085ac00c1067'],
    ['model-region', 'chambre-ai-render-settings', 'replace', '11dda99038012e5ebcddf33bfcf8e80f259225360403d3277e54a50974225ba8'],
    ['commit-disabled', 'chambre-ai-generation-commit', 'replace', 'f0e2a62fa4709a15db1c9e2b91595257a2c2986cff59dcae4a61240675cc2415'],
  ],
  'app/ai-library/page.tsx': [
    ['import', '@/lib/sunoModels', 'add', '803c84c6ecae5ae4e4fe1ec0b8e9392f6c035d133a50071b5dde097f6606852b'],
    ['variable', '[modelFilter, setModelFilter]', 'replace', '15fcfc87573a759fc3c29f6f74d8b570600923f9cc407797656946f775ca5a32'],
    ['variable', 'filteredTracks', 'add', 'ab15cffdf09989a4c6a78dd2095d771911ca1ec581fd4569a5dd01f9db3eb364'],
    ['jsx-expression', 'CURRENT_SUNO_MODELS.map', 'add', 'c189f59a6a0abff9a7a64ec886a91d7c686d3ef918d04b4b9a1abba6f237b03a'],
    ['call', 'getSunoModelLabel|track.model_name', 'add-expression', 'dbd1f3443f89cfef09bb3eb89240bfbc38c3f61a1b05eeab9d598f9b31f6dead'],
    ['option', 'V4_5ALL', 'add', 'f5feb7551873c233c8418a78be244a70c841ea908d599d070db902f03f917b28'],
    ['option', 'V4', 'add', '884ab5386cfa17df3f4eed69f68c188389616fb2f5c8c594610e750f1a8f7ade'],
  ],
  'app/studio/StudioClient.tsx': [
    ['import', '@/lib/sunoModels', 'add', '5691ff8d54f318997848a24fa4350f256b9244b6ac78e99b0569146e0b0ab923'],
    ['variable', 'presets', 'replace', 'e768e8dc5aece78522e16a823dade64ca2315ba479d1c054389612d20583a851'],
    ['variable', 'runGenerate', 'replace', '30e89f4480bc7ca6928c8940e9bee7d0681243019dc13632ad1ff629543e2290'],
    ['variable', 'applyPreset', 'replace', '5672067aad8c49c8ec400824984fb08ea42de65dea64ae99dd8dc32c4f985ebc'],
    ['effect', 'cmdInputRef.current?.focus()', 'replace', 'ed5946f1267491ac4286531d4cf26de215a74f5bea89df6f2e0ecfd7664242a7'],
    ['command-handler', 'cmdInputRef', 'replace', '3c7284d18d96e6215e6b50f50715d13250ab999daad1514a39896f214312405e'],
  ],
  'components/studio/LeftDock/GeneratorForm.tsx': [
    ['import', 'react', 'replace', '28051d61b57a778afea815a491748ae226d9a8f9b03aff32c550e12d7e439024'],
    ['import', '@/lib/sunoModels', 'add', '9063e9626b96dbfa5245f352b4df884b5058e0c1c7b163da0f24856515063b1d'],
    ['import', '@/hooks/useEntitlementsClient', 'add', '261cc018ba68feb1b405577f2ff9a72b70d1887100c7c04333941a110ab36904'],
    ['import', '@/components/ai-studio/SunoV6Announcement', 'add', '912d24ec649aea316b48ffb592f1700d8805fc466acae25168da80874d37bf8d'],
    ['variable', '{ loading: accessLoading, entitlements }', 'add', 'c165e2ded81d616671ebf7049b71543b67d7d865879bb7dd20c35a0fbf5cb2df'],
    ['variable', '[modelNotice, setModelNotice]', 'add', 'e7a589a8161dd130aa0c2e1df2b492d81262b7eed7323604d2b676e47dfb92c7'],
    ['effect', 'entitlements.ai.availableModels', 'add', 'd5ecb8d23a028d8f4f562ce38d944bbaf5b5f4c468994c0741e48fbf983fbb0e'],
    ['label-value', 'form.model', 'replace', '5bd1a98dbd8366c06e72d4f560e021183c403b394d9e4c57b231623e53c9c364'],
    ['label-variations', 'form.variations', 'replace', 'ef8dc878966951d65f379259f3932db89b2fd7e57a90d257fc7a6daf4b07739b'],
    ['label-value', "!form.customMode || form.duration == null ? 'auto' : 'custom'", 'add', '43cff63be4618e583e36d08fcdd4c42b91b9e28f25a9aa6e6e1e746eb05cef07'],
    ['jsx-expression', 'form.customMode && form.duration != null', 'add', 'b41a83030eea0904dceff654eaf9163bbb2cfff19288923f9f673b96f72479a3'],
    ['lyrics-disabled', 'form.lyrics', 'add', '56ef0b5620c7caf40f2cf17e2bd0eff1770fc3a322d3db96ef05b026a90de0e3'],
    ['fieldset-disabled', '!form.customMode', 'add', '1fc78c2c0627be98333f31eb4b4b0c605a227086dd941e46b8ff6bc5a6897f87'],
    ['label-value', 'form.vocalGender', 'replace', '5cb5d360a609b3deca8cf749c93a30cf4f63224156693975275cf456787af535'],
  ],
};

function nodes(ast, predicate) {
  const found = [];
  const visit = node => {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return found;
}
function attributes(opening, name, ast) {
  return opening.attributes.properties.filter(node => ts.isJsxAttribute(node) && node.name.getText(ast) === name);
}
function valueOf(attribute, ast) {
  const init = attribute?.initializer;
  return init && ts.isJsxExpression(init) ? init.expression?.getText(ast) : init?.text;
}
function openingOf(node) {
  return ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
}
function containsValue(node, value, ast) {
  return nodes(node, child => {
    const opening = openingOf(child);
    return opening && attributes(opening, 'value', ast).some(attribute => valueOf(attribute, ast) === value);
  }).length > 0;
}
function hasClassAncestor(node, marker, ast) {
  for (let current = node.parent; current; current = current.parent) {
    const opening = openingOf(current);
    if (opening && attributes(opening, 'className', ast).some(attr => valueOf(attr, ast)?.includes(marker))) return true;
  }
  return false;
}

function locate(ast, kind, key, before = false) {
  const source = ast.text;
  if (kind === 'model-region') {
    const marker = source.indexOf(`className="${key}`);
    assert.ok(marker >= 0, key);
    const startText = before ? '<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">' : '<div className="grid grid-cols-3 gap-2" role="group" aria-label="Modèle de génération">';
    const start = source.indexOf(startText, marker);
    const end = source.indexOf('{customMode && (', start);
    assert.ok(start > marker && end > start, 'Exact model/duration region');
    const text = source.slice(start, end);
    return { start, end, text, canonical: normalized(text).trim() };
  }
  const matches = nodes(ast, node => {
    if (kind === 'import') return ts.isImportDeclaration(node) && node.moduleSpecifier.text === key;
    if (kind === 'variable') return ts.isVariableDeclaration(node) && node.name.getText(ast) === key;
    if (kind === 'effect') return ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.getText(ast).includes(key);
    if (kind === 'if') return ts.isIfStatement(node) && node.expression.getText(ast).startsWith(key);
    if (kind === 'call') {
      const [callee, argument] = key.split('|');
      return ts.isCallExpression(node) && node.expression.getText(ast) === callee && node.arguments.some(arg => arg.getText(ast).includes(argument));
    }
    if (kind === 'jsx-expression') return ts.isJsxExpression(node) && node.expression?.getText(ast).startsWith(key);
    if (kind === 'option') return ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'option' && attributes(node.openingElement, 'value', ast).some(attr => valueOf(attr, ast) === key);
    if (kind === 'commit-disabled') return ts.isJsxAttribute(node) && node.name.getText(ast) === 'disabled' && hasClassAncestor(node, key, ast);
    if (kind === 'command-handler') return ts.isJsxAttribute(node) && node.name.getText(ast) === 'onKeyDown' && attributes(node.parent.parent, 'ref', ast).some(attr => valueOf(attr, ast) === key);
    if (kind === 'label-value') return ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'label' && containsValue(node, key, ast);
    if (kind === 'label-variations') return ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'label' && containsValue(node, before ? 'form.variations' : 'normalizeVariantTarget(Number(form.variations || 2)) / 2', ast);
    if (kind === 'lyrics-disabled') return ts.isJsxAttribute(node) && node.name.getText(ast) === 'disabled' && attributes(node.parent.parent, 'value', ast).some(attr => valueOf(attr, ast) === key);
    if (kind === 'fieldset-disabled') return ts.isJsxAttribute(node) && node.name.getText(ast) === 'disabled' && node.parent.parent.tagName?.getText(ast) === 'fieldset';
    return false;
  });
  assert.equal(matches.length, 1, `${ast.fileName}: exactly one reviewed ${kind} ${key}`);
  const node = matches[0];
  // Remove the complete declaration/statement for additions. Replacements can
  // retain a declaration slot, so the historical comma/semicolon stays intact.
  const text = source.slice(node.getStart(ast), node.end);
  return { start: node.getStart(ast), end: node.end, text, canonical: print(node, ast), node };
}

export function reviewedV6SlotDigests(file, source = read(file)) {
  const ast = parse(file, source);
  return (SLOTS[file] || []).map(([kind, key, action]) => [kind, key, action, digest(locate(ast, kind, key).canonical)]);
}

export function projectReviewedV6(file, source = read(file)) {
  const slots = SLOTS[file];
  if (!slots) return source;
  const ast = parse(file, source);
  const old = parse(file, read(`${V6_BEFORE_ROOT}/${file}`));
  const edits = slots.map(([kind, key, action, expected]) => {
    const current = locate(ast, kind, key);
    assert.equal(digest(current.canonical), expected, `${file}: reviewed V6 ${kind} ${key} changed; inspect its behavior before amending this explicit exception`);
    let { start, end } = current;
    if (action === 'add' && current.node) {
      const owner = kind === 'variable' ? current.node.parent.parent : kind === 'effect' ? current.node.parent : null;
      if (owner && (ts.isVariableStatement(owner) || ts.isExpressionStatement(owner))) {
        start = owner.getStart(ast);
        end = owner.end;
      }
    }
    return { start, end, text: action === 'replace' ? locate(old, kind, key, true).text : action === 'add-expression' ? "''" : '' };
  }).sort((a, b) => b.start - a.start);
  for (let index = 1; index < edits.length; index++) assert.ok(edits[index].end <= edits[index - 1].start, `${file}: reviewed slots must not overlap`);
  for (const edit of edits) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  assert.equal(parse(file, source).parseDiagnostics.length, 0, `${file}: projection remains valid TSX`);
  return source;
}

export function assertUnchangedV6TrackBoundaries(file, source = read(file)) {
  const protectedNames = {
    'app/ai-generator/page.tsx': ['playGenerated', 'playAITrack', 'playLibraryQueue', 'downloadGenerated', 'shareGenerated', 'toggleGenerationVisibility', 'toggleTrackTrash', 'toggleTrackLike', 'hydrateTrackFromSuno'],
    'app/ai-library/page.tsx': ['playAITrack', 'downloadTrack', 'publishTrack', 'toggleFavorite', 'resyncGeneration', 'generateCoverVideo', 'shareGeneration'],
    'app/studio/StudioClient.tsx': ['playTrackCompat'],
  }[file] || [];
  const current = parse(file, source);
  const before = parse(file, read(`${V6_BEFORE_ROOT}/${file}`));
  for (const name of protectedNames) {
    assert.equal(locate(current, 'variable', name).canonical, locate(before, 'variable', name).canonical, `${file}: ${name} is outside the V6 request/form scope`);
  }
}
