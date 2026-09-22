'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { useContextSurfaceController, useContextSurfaceRenderer } from '@/components/context-surfaces/ContextSurfaceController';
import { SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import { getCreateSurfaceInput } from '@/lib/createSurface';

const CreateSurface = dynamic(() => import('./CreateSurface'), {
  ssr: false,
  loading: () => <div className="p-8"><SynauraOverlayTitle>Créer</SynauraOverlayTitle><p className="mt-3 text-sm" role="status">Ouverture des outils…</p></div>,
});

export default function CreateRegistration() {
  useContextSurfaceRenderer('create', CreateSurface);
  const { openSurface } = useContextSurfaceController();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (pathname !== '/live' || params.get('create') !== '1') return;
    // Let the provider finish its route-change cleanup before opening the cold-link sheet.
    const frame = window.requestAnimationFrame(() => {
      const url = new URL(window.location.href);
      if (url.pathname !== pathname) return;
      // Read the live URL again so effect replay cannot open a duplicate surface.
      if (url.searchParams.get('create') !== '1') return;
      const target = new URLSearchParams();
      const challenge = url.searchParams.get('createChallengeId');
      if (challenge) target.set('challengeId', challenge);
      const token = url.searchParams.get('liveReturn');
      if (token) target.set('liveReturn', token);
      const input = getCreateSurfaceInput(`/create?${target}`, pathname);
      url.searchParams.delete('create');
      url.searchParams.delete('createChallengeId');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      if (input) openSurface(input);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openSurface, params, pathname]);
  return null;
}
