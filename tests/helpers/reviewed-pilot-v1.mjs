import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { projectLiveMedia } from './reviewed-live-media.mjs';

/** Exact opt-in adapter projection, not a relaxed AST snapshot. The resulting V1
 * source must still hash to the deployed a0f554f9 baseline. New pilot behavior
 * is tested separately in v2-pilot.test.mjs. No historical fixture is changed. */
export function reviewedPilotV1(file, raw) {
  let text = projectLiveMedia(file, raw);
  const replace = (from, to = '') => { assert.equal(text.split(from).length, 2, `${file}: exact reviewed adapter fragment`); text = text.replace(from, to); };
  if (file === 'components/home/SynauraScroll.tsx') {
    text = text.replace(/\/\*\* Optional presentation boundary\. V1 remains the default, with the same effects and handlers\. \*\/\nexport type LivePilotModel = \{[\s\S]*?\n\};\n\n/, '');
    replace('export default function SynauraScroll({ renderPilot }: { renderPilot?: (model: LivePilotModel) => React.ReactNode } = {}) {', 'export default function SynauraScroll() {');
    replace('useRef(Boolean(renderPilot))', 'useRef(false)');
    replace('    if (renderPilot) return;\n');
    replace(`  if (renderPilot) return renderPilot({
    items: feedItems, activeIndex, filter, ready: continuityReady, loading, error,
    scrollSnap, range: renderRange, selectFilter, jump, playIndex,
    retry: () => setReloadKey(value => value + 1), waveform: trackWaveform,
    moments: momentComments, reactions: momentReactions, react: submitMomentReaction,
    sharePost, shareClip, launchCollection, launchingCollectionId,
    entryOpen: homePreludeOpen && filter === 'foryou', enterFeed: enterFlow,
    entryPosts: basePosts, entryUserName: (session?.user as any)?.name || username || null,
    navigateFromEntry: navigateFromLive,
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
    replace("locked: contextDepth > 0 || Boolean(renderPilot && homePreludeOpen && filter === 'foryou')", 'locked: contextDepth > 0');
    assert.equal(createHash('sha256').update(text).digest('hex'), '92e64c39547c039a104c68ed5cbd5e567797d1fa2b3338fa778862bca58e5d43', 'V1 Live source remains identical after projecting the exact opt-in additions');
  } else if (file === 'lib/routeChrome.ts') {
    // Offline Studio fixture only; production and all existing paths are unchanged.
    replace("  if (process.env.NODE_ENV !== 'production' && pathname === '/dev/studio') return getRouteChrome('/studio');\n");
    replace(`
/** Validated Live/Discover plus preview aliases; other routes keep their chrome. */
export function isV2PilotRoute(pathname: string | null | undefined) {
  return pathname === '/live' || pathname === '/discover' || pathname === '/v2' || pathname === '/v2/live' || pathname === '/v2/discover';
}
`);
    assert.equal(text.split(' || isV2PilotRoute(pathname)').length, 3);
    text = text.replaceAll(' || isV2PilotRoute(pathname)', '');
    assert.equal(createHash('sha256').update(text).digest('hex'), 'e48280def0c6ef9ba97ab99e0bfb7f78523177501166937347c60a12fd59bccd');
  }
  return text;
}
