'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { isHandoffDestination } from '@/lib/creationHandoffs';
import { withCurrentHandoff } from '@/lib/creationHandoffClient';

/** Local explicit edges only. Modifier/new-tab navigation keeps ordinary Link semantics. */
export default function HandoffLink({ onClick, href, prefetch, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  return <Link {...props} href={href}
    prefetch={typeof href === 'string' && isHandoffDestination(href) ? false : prefetch}
    onClick={event => {
      onClick?.(event);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
        || props.target === '_blank' || props.download || typeof href !== 'string') return;
      const next = withCurrentHandoff(href);
      if (next === href) return;
      event.preventDefault();
      if (props.replace) router.replace(next, { scroll: props.scroll });
      else router.push(next, { scroll: props.scroll });
    }} />;
}
