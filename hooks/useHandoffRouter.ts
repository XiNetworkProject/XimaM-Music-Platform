'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { withCurrentHandoff } from '@/lib/creationHandoffClient';

/** Keep the router identity stable for existing effects; no subscriptions or audio work. */
export function useHandoffRouter() {
  const router = useRouter();
  return useMemo(() => ({ ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(withCurrentHandoff(href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(withCurrentHandoff(href), options),
  }), [router]);
}
