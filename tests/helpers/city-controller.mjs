import ts from 'typescript';
import { createHash } from 'node:crypto';

// City now has a different presentation tree. Compare every statement in its
// unchanged data/audio/mutation owners, including modal loading/cancellation.
// The only removed state calculation is the obsolete display-only ticker.
export function cityControllerFingerprint(source) {
  const file = ts.createSourceFile('city.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['compact', 'artistName', 'playerTrack', 'SynauraCityPage', 'TrackPickerModal', 'EventDetailModal'];
  const printer = ts.createPrinter({removeComments:true});
  const statements = names.map(name => {
    const node = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    if (!node) throw new Error(`Missing City controller: ${name}`);
    const transform = ts.transform(node, [context => {
      const visit = n => {
        if (ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(file) === 'tickerText')) return undefined;
        if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) return ts.factory.createNull();
        return ts.visitEachChild(n, visit, context);
      };
      return visit;
    }]);
    const text = printer.printNode(ts.EmitHint.Unspecified, transform.transformed[0], file);
    transform.dispose();
    return text;
  });
  return createHash('sha256').update(JSON.stringify(statements)).digest('hex');
}
