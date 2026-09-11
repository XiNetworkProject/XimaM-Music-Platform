'use client';

import dynamic from 'next/dynamic';
import { useContextSurfaceRenderer } from '@/components/context-surfaces/ContextSurfaceController';

const ProfilePeekSurface = dynamic(() => import('./ProfilePeekSurface'), {
  loading: () => <div className="h-[82dvh] animate-pulse bg-[var(--syn-soft)] md:h-full" aria-label="Chargement du profil" />,
  ssr: false,
});

export default function ProfilePeekRegistration() {
  useContextSurfaceRenderer('profile-peek', ProfilePeekSurface);
  return null;
}
