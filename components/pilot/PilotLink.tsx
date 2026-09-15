'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { readLiveSnapshotId } from '@/lib/liveContinuity';
import { validLiveReturn } from '@/lib/creationHandoffClient';

/** Local pilot edges only. The established snapshot is carried, never copied or rewritten. */
export default function PilotLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  return <Link {...props} href={href} prefetch={false} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank' || typeof href !== 'string') return;
    if (!href.startsWith('/v2/')) return;
    const token = window.location.pathname === '/v2/live'
      ? readLiveSnapshotId(window.history.state)
      : new URLSearchParams(window.location.search).get('liveReturn');
    const url = new URL(href, window.location.origin);
    if (token && validLiveReturn(token)) url.searchParams.set('liveReturn', token);
    if (new URLSearchParams(window.location.search).get('pilotReview') === '1') url.searchParams.set('pilotReview', '1');
    if (url.pathname + url.search === href) return;
    event.preventDefault();
    router.push(url.pathname + url.search, { scroll: false });
  }} />;
}
