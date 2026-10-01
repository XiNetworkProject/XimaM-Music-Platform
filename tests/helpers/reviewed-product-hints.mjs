import assert from 'node:assert/strict';

// The requested contextual suggestions are new behavior. Historical visual
// fingerprints still verify their original controllers after removing only
// these exact integration seams. Raw-source/runtime coverage lives in
// product-hints.test.mjs; an unexpected change to a seam fails closed here.
const slots = {
  'components/NotificationCenter.tsx': '<ProductHint placement="notifications" />',
  'app/publish/page.tsx': '<ProductHint placement="publish" />',
  'app/notifications/page.tsx': '{!unreadOnly && (category === \'all\' || category === \'boost\') && <ProductHint placement="notifications" />}',
  'app/messages/page.tsx': '{activeTab === \'conversations\' && !query && <ProductHint placement="messages" />}',
};
export function projectProductHints(file, raw) {
  const marker = "import ProductHint from '@/components/benefits/ProductHint';";
  if (!slots[file] || !raw.includes(marker)) return raw;
  let source = raw;
  for (const fragment of [marker, slots[file]]) {
    assert.equal(source.split(fragment).length, 2, `${file}: one exact contextual-hint seam`);
    source = source.replace(fragment, '');
  }
  return source;
}

export function projectBenefitsNavigation(raw) {
  let source = raw.replaceAll('\r\n', '\n');
  const block = `      <nav aria-label="Les petits plus Synaura" className="chambre-spaces-benefits">
        <Link href="/boosters" prefetch={false} onClick={close}><Zap size={20} aria-hidden="true" /><span><strong>Boosters & récompenses</strong><small>Un coup de pouce pour ton son.</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/subscriptions" prefetch={false} onClick={close}><Sparkles size={20} aria-hidden="true" /><span><strong>Abonnements</strong><small>Plus de possibilités, à ton rythme.</small></span><ArrowUpRight size={16} /></Link>
      </nav>
`;
  for (const [from, to] of [
    [block, ''],
    ['{ ArrowUpRight, Grid2X2, Sparkles, Zap }', '{ ArrowUpRight, Grid2X2 }'],
    ["    { href: '/stats', label: 'Statistiques' },\n", "    { href: '/stats', label: 'Statistiques' },\n    { href: '/subscriptions', label: 'Abonnements' },\n    { href: '/boosters', label: 'Boosters' },\n"],
  ]) {
    assert.equal(source.split(from).length, 2, 'exact benefit navigation relocation');
    source = source.replace(from, to);
  }
  return source;
}
