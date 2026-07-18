export type FlowPageResolution = {
  rawIndex: number;
  index: number;
  corrected: boolean;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
/**
 * Resolves the page selected by a native fling while enforcing the Flow
 * contract: one gesture can reveal at most one new item.
 */
export function resolveFlowPage({
  currentIndex,
  offsetY,
  pageHeight,
  itemCount,
}: {
  currentIndex: number;
  offsetY: number;
  pageHeight: number;
  itemCount: number;
}): FlowPageResolution {
  if (itemCount <= 0 || !Number.isFinite(pageHeight) || pageHeight <= 0) {
    return { rawIndex: 0, index: 0, corrected: false };
  }

  const lastIndex = itemCount - 1;
  const stableCurrent = clamp(Math.round(currentIndex), 0, lastIndex);
  const rawIndex = clamp(Math.round(Math.max(0, offsetY) / pageHeight), 0, lastIndex);
  const index = clamp(rawIndex, stableCurrent - 1, stableCurrent + 1);

  return {
    rawIndex,
    index,
    corrected: rawIndex !== index,
  };
}
