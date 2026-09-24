// Top is the conversation's unshifted position below the actual app navigation.
export function messagingViewport(height: number, top: number, offsetTop = 0) {
  return { height: Math.max(0, height - Math.max(0, top)), offset: Math.max(0, offsetTop) };
}
