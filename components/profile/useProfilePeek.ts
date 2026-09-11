'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useContextSurfaceController } from '@/components/context-surfaces/ContextSurfaceController';
import type { ContextSurfaceOrigin } from '@/lib/contextSurfaces';

export function useProfilePeek(origin: ContextSurfaceOrigin) {
  const pathname = usePathname();
  const { openSurface } = useContextSurfaceController();

  return useCallback((username: string | null | undefined, trigger?: HTMLElement | null) => {
    const normalized = String(username || '').trim();
    if (!normalized) return false;
    const canonicalPath = `/profile/${encodeURIComponent(normalized)}`;
    if (decodeURIComponent(pathname).toLocaleLowerCase('fr-FR') === decodeURIComponent(canonicalPath).toLocaleLowerCase('fr-FR')) return false;
    openSurface({
      surface: 'profile-peek',
      entityType: 'profile',
      entityId: normalized,
      origin,
      presentation: 'auto',
      returnSnapshotId: null,
    }, { trigger });
    return true;
  }, [openSurface, origin, pathname]);
}
