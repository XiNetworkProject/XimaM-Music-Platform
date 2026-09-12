'use client';
import { MoreHorizontal } from 'lucide-react';
import { useTrackActions } from './useTrackActions';
import { normalizeActionTrack } from '@/lib/trackActions';
import type { ContextSurfaceOrigin } from '@/lib/contextSurfaces';

export default function TrackActionButton({ track, origin, className = '' }: { track: any; origin?: ContextSurfaceOrigin; className?: string }) {
  const actions = useTrackActions(origin);
  const normalized = normalizeActionTrack(track);
  return <button type="button" data-context-surface-trigger-key={`track-actions-${origin || 'context'}-${normalized._id}`} aria-label={`Options de ${normalized.title}`} aria-haspopup="menu"
    onClick={event => { event.preventDefault(); event.stopPropagation(); actions.open(track, 'track-options', event.currentTarget); }}
    className={`syn-interactive grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)] ${className}`}><MoreHorizontal className="h-5 w-5" /></button>;
}
