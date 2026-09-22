import assert from 'node:assert/strict';

/** Exact presentation-only additions requested in the second Create/Library review.
 * Older behavioral hashes remain unchanged after these checked fragments are projected out.
 * New route membership, rendering and pause contracts have their own regression tests. */
export function projectUnifiedPresentation(file, raw) {
  let source = raw.replaceAll('\r\n', '\n');
  const remove = (fragment, replacement = '') => {
    assert.equal(source.split(fragment).length, 2, `${file}: exact presentation addition`);
    source = source.replace(fragment, replacement);
  };
  if (file === 'components/synaura/SynauraShell.tsx') {
    remove("import { usesUnifiedNavigation } from '@/lib/unifiedNavigation';\n");
    remove('export function SynauraAccountMenu(', 'function SynauraAccountMenu(');
    const check = '  if (usesUnifiedNavigation(pathname)) return null;\n';
    assert.equal(source.split(check).length, 4, 'exactly three legacy chrome opt-outs');
    source = source.replace('  const pathname = usePathname();\n' + check, '').replace('  const pathname = usePathname();\n' + check, '').replace(check, '');
  }
  return source;
}
