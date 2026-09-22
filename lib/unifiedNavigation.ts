/** Product navigation only; entry, auth, embeds and unrelated subproducts stay independent. */
export function usesUnifiedNavigation(pathname: string | null | undefined) {
  if (!pathname) return false;
  return /^\/(live|discover|radar|library|create|upload|publish|studio|ai-generator|ai-library|posts|profile|track|playlists|album|settings|stats|search|notifications|messages|subscriptions|city|community|download|boosters|clips|support)(\/|$)/.test(pathname)
    || /^\/v2(?:\/(live|discover))?$/.test(pathname)
    || pathname === '/dev/studio';
}
