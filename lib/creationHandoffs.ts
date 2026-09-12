/** URL-only handoff policy. Snapshot validation is supplied by the existing 4B.1 cache. */
export const LIVE_RETURN_PARAM = 'liveReturn';
export const PROFILE_RETURN_PARAM = 'profileReturn';

export function isLiveReturnToken(value: unknown): value is string {
  return typeof value === 'string' && /^live-[a-zA-Z0-9-]{1,90}$/.test(value);
}

export function localHandoffUrl(href: string): URL | null {
  if (!href.startsWith('/') || href.startsWith('//') || /[\\\u0000-\u0020]/.test(href)) return null;
  try {
    const url = new URL(href, 'https://handoff.invalid');
    return url.origin === 'https://handoff.invalid' ? url : null;
  } catch { return null; }
}

export function isHandoffDestination(href: string) {
  const path = localHandoffUrl(href)?.pathname;
  return Boolean(path && /^(?:\/create(?:\/|$)|\/ai-generator$|\/ai-library$|\/studio$|\/upload$|\/clips\/new$|\/messages(?:\/|$)|\/notifications$|\/community(?:\/|$)|\/city$|\/posts(?:\/|$)|\/challenges(?:\/|$))/.test(path));
}

export function safeProfileReturn(value: string | null): string | null {
  return value && /^\/profile\/[a-zA-Z0-9_.%-]{1,120}$/.test(value)
    && !/%(?:2f|5c|00)/i.test(value) ? value : null;
}

export function carryHandoff(
  href: string,
  originHref: string,
  liveSnapshotId: string | null,
  isValid: (token: string) => boolean,
): string {
  const target = localHandoffUrl(href);
  const origin = localHandoffUrl(originHref);
  if (!target || !origin || !isHandoffDestination(href)) return href;
  // Never replace an explicit destination token with a different entity's context.
  const explicit = target.searchParams.get(LIVE_RETURN_PARAM);
  const candidate = explicit ?? (origin.pathname === '/live'
    ? liveSnapshotId : origin.searchParams.get(LIVE_RETURN_PARAM));
  if (isLiveReturnToken(candidate) && isValid(candidate)) target.searchParams.set(LIVE_RETURN_PARAM, candidate);
  else target.searchParams.delete(LIVE_RETURN_PARAM);
  if (target.pathname.startsWith('/messages')) {
    const profile = safeProfileReturn(origin.pathname)
      || safeProfileReturn(origin.searchParams.get(PROFILE_RETURN_PARAM));
    if (profile) target.searchParams.set(PROFILE_RETURN_PARAM, profile);
    else target.searchParams.delete(PROFILE_RETURN_PARAM);
  } else target.searchParams.delete(PROFILE_RETURN_PARAM);
  return target.pathname + target.search + target.hash;
}

export function handoffReturnHref(href: string, isValid: (token: string) => boolean): string | null {
  const url = localHandoffUrl(href);
  if (!url) return null;
  if (url.pathname.startsWith('/messages')) {
    const profile = safeProfileReturn(url.searchParams.get(PROFILE_RETURN_PARAM));
    if (profile) return profile;
  }
  const token = url.searchParams.get(LIVE_RETURN_PARAM);
  return isLiveReturnToken(token) && isValid(token) ? `/live?${LIVE_RETURN_PARAM}=${encodeURIComponent(token)}` : null;
}
