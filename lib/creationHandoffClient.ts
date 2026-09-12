'use client';

import { carryHandoff, handoffReturnHref, isLiveReturnToken, safeProfileReturn, PROFILE_RETURN_PARAM } from './creationHandoffs';
import { LIVE_HISTORY_STATE_KEY, loadLiveNavigationContext, readLiveSnapshotId } from './liveContinuity';

export function validLiveReturn(token: string) {
  if (!isLiveReturnToken(token) || typeof window === 'undefined') return false;
  try {
    return loadLiveNavigationContext({ [LIVE_HISTORY_STATE_KEY]: token }, window.sessionStorage).status !== 'miss';
  } catch { return false; }
}

export function withCurrentHandoff(href: string) {
  if (typeof window === 'undefined') return href;
  return carryHandoff(href, window.location.pathname + window.location.search,
    readLiveSnapshotId(window.history.state), validLiveReturn);
}

export function currentHandoffReturn(fallback = '/') {
  if (typeof window === 'undefined') return fallback;
  return handoffReturnHref(window.location.pathname + window.location.search, validLiveReturn) || fallback;
}

export function messageOriginReturn() {
  if (typeof window === 'undefined') return '/messages';
  return safeProfileReturn(new URLSearchParams(window.location.search).get(PROFILE_RETURN_PARAM)) || '/messages';
}
