import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/** Exact opt-in adapter projection, not a relaxed AST snapshot. The resulting V1
 * source must still hash to the deployed a0f554f9 baseline. New pilot behavior
 * is tested separately in v2-pilot.test.mjs. No historical fixture is changed. */
export function reviewedPilotV1(file, raw) {
  let text = raw.replaceAll('\r\n', '\n');
  const replace = (from, to = '') => { assert.equal(text.split(from).length, 2, `${file}: exact reviewed adapter fragment`); text = text.replace(from, to); };
  if (file === 'components/home/SynauraScroll.tsx') {
    text = text.replace(/\/\*\* Optional presentation boundary\. V1 remains the default, with the same effects and handlers\. \*\/\nexport type LivePilotModel = \{[\s\S]*?\n\};\n\n/, '');
    replace('export default function SynauraScroll({ renderPilot }: { renderPilot?: (model: LivePilotModel) => React.ReactNode } = {}) {', 'export default function SynauraScroll() {');
    replace('    if (renderPilot) return false;\n');
    replace('useRef(Boolean(renderPilot))', 'useRef(false)');
    replace("setHomePreludeOpen(!renderPilot && restore.snapshot.contextSurface === 'prelude')", "setHomePreludeOpen(restore.snapshot.contextSurface === 'prelude')");
    replace('    if (renderPilot) return;\n');
    replace(`  if (renderPilot) return renderPilot({
    items: feedItems, activeIndex, filter, ready: continuityReady, loading, error,
    scrollSnap, range: renderRange, selectFilter, jump, playIndex,
    retry: () => setReloadKey(value => value + 1), waveform: trackWaveform,
    moments: momentComments, reactions: momentReactions, react: submitMomentReaction,
    sharePost, shareClip, launchCollection, launchingCollectionId,
  });

`);
    replace('  pilot?: boolean;\n');
    replace('onTogglePlay, onReturnHome, pilot = false } = opts', 'onTogglePlay, onReturnHome } = opts');
    replace(`    if (pilot) {
      const anchor = el.scrollTop + Math.min(40, el.clientHeight * .15);
      let visible = 0;
      itemRefs.current.forEach((item, index) => { if (item && item.offsetTop <= anchor) visible = index; });
      return visible;
    }
`);
    replace('  }, [activeIndex, itemCount, pilot]);', '  }, [activeIndex, itemCount]);');
    replace('      if (pilot && (itemRefs.current[activeIndex]?.offsetHeight || 0) > el.clientHeight + 2) return;\n');
    replace('onNavigate, onReturnHome, pilot]);', 'onNavigate, onReturnHome]);');
    replace('      if (pilot && (e.defaultPrevented || t?.closest(\'button, a, select, input, textarea, [role="slider"]\'))) return;\n');
    replace('onReturnHome, onTogglePlay, pilot]);', 'onReturnHome, onTogglePlay]);');
    replace('    pilot: Boolean(renderPilot),\n');
    assert.equal(createHash('sha256').update(text).digest('hex'), '92e64c39547c039a104c68ed5cbd5e567797d1fa2b3338fa778862bca58e5d43', 'V1 Live source remains identical after projecting the exact opt-in additions');
  } else if (file === 'lib/routeChrome.ts') {
    replace(`
/** Parallel pilot only; no similarly named or V1 route is captured. */
export function isV2PilotRoute(pathname: string | null | undefined) {
  return pathname === '/v2' || pathname === '/v2/live' || pathname === '/v2/discover';
}
`);
    assert.equal(text.split(' || isV2PilotRoute(pathname)').length, 3);
    text = text.replaceAll(' || isV2PilotRoute(pathname)', '');
    assert.equal(createHash('sha256').update(text).digest('hex'), 'e48280def0c6ef9ba97ab99e0bfb7f78523177501166937347c60a12fd59bccd');
  }
  return text;
}
