'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { attachLiveSnapshotToHistory } from '@/lib/liveContinuity';
import { validLiveReturn } from '@/lib/creationHandoffClient';
import { LIVE_RETURN_PARAM } from '@/lib/creationHandoffs';

/** Attach before Live mounts; leave its 4B.1 restorer and AudioCore untouched. */
export default function LiveHandoffEntry({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const token = params.get(LIVE_RETURN_PARAM);
  const [prepared, setPrepared] = useState(false);
  useLayoutEffect(() => {
    if (token) {
      if (validLiveReturn(token)) attachLiveSnapshotToHistory(window.history, token);
      const url = new URL(window.location.href);
      url.searchParams.delete(LIVE_RETURN_PARAM);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    setPrepared(true);
  }, [token]);
  return prepared ? children : null;
}
