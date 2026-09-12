'use client';
import dynamic from 'next/dynamic';
import { useContextSurfaceRenderer } from '@/components/context-surfaces/ContextSurfaceController';
const ActionsSurface = dynamic(() => import('./ActionsSurface'), { ssr: false });
export default function ActionsRegistration() {
  useContextSurfaceRenderer('track-options', ActionsSurface);
  useContextSurfaceRenderer('playlist-picker', ActionsSurface);
  useContextSurfaceRenderer('queue', ActionsSurface);
  useContextSurfaceRenderer('lyrics', ActionsSurface);
  useContextSurfaceRenderer('track-details', ActionsSurface);
  useContextSurfaceRenderer('track-share', ActionsSurface);
  useContextSurfaceRenderer('track-remix', ActionsSurface);
  useContextSurfaceRenderer('track-clip', ActionsSurface);
  return null;
}
