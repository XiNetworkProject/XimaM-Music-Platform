import ts from 'typescript';
import { createHash } from 'node:crypto';
import { projectProductHints } from './reviewed-product-hints.mjs';

export const secondaryPaths = [
  'app/library/LibraryClient.tsx', 'app/playlists/[id]/page.tsx', 'app/album/[id]/page.tsx',
  'app/upload/page.tsx', 'app/publish/page.tsx', 'app/settings/SettingsClient.tsx',
  'app/notifications/page.tsx', 'app/community/[club]/page.tsx',
  'app/community/forum/[id]/page.tsx', 'app/community/forum/new/page.tsx',
  'app/community/faq/page.tsx', 'app/posts/page.tsx', 'app/posts/[id]/page.tsx',
  'app/clips/[id]/page.tsx', 'components/city/SynauraCityPage.tsx',
  'app/challenges/[id]/page.tsx', 'app/boosters/BoostersClient.tsx',
  'app/support/page.tsx', 'app/error.tsx', 'app/not-found.tsx',
];

// Includes every non-JSX statement, import, event, value, conditional and link.
// Only visual attributes, native headings/markup and literal copy are excluded.
export function secondaryBehavior(path, source) {
  source = projectProductHints(path, source).replaceAll('\r\n', '\n');
  // Reviewed native-video sizing adapter. Playback props remain checked below;
  // the adapter's metadata-only behavior is executed in secondary-experience.test.
  if (path === 'app/clips/[id]/page.tsx') {
    source = source.replace("import PublicClipVideo from '@/components/clips/PublicClipVideo';", '')
      .replace('<PublicClipVideo\n', '<video\n').replace('<PublicClipVideo\r\n', '<video\r\n');
  }
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error(`Invalid TSX: ${path}`);
  const printer = ts.createPrinter({removeComments: true});
  const normalize = node => {
    const transform = ts.transform(node, [context => {
      const visit = n => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n) ? ts.factory.createNull() : ts.visitEachChild(n,visit,context);
      return visit;
    }]);
    const result = printer.printNode(ts.EmitHint.Unspecified,transform.transformed[0],file);
    transform.dispose();
    return result;
  };
  const expressions = [], routes = [];
  const visit = node => {
    if (ts.isJsxAttribute(node) && /^(className|contentClassName|style|aria-|data-)/.test(node.name.getText(file))) return;
    if (ts.isJsxExpression(node) && node.expression) expressions.push(normalize(node.expression));
    if (ts.isJsxAttribute(node) && /^(href|src|action|method|type|disabled|value|checked|on[A-Z])/.test(node.name.getText(file))) routes.push(normalize(node));
    ts.forEachChild(node,visit);
  };
  visit(file);
  return createHash('sha256').update(JSON.stringify({program:normalize(file),expressions,routes})).digest('hex');
}
