'use client';
import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useContextSurfaceController } from '@/components/context-surfaces/ContextSurfaceController';
import { useOrganizationViewer } from '@/lib/organizationClient';
import { nativeTrackShare, normalizeActionTrack, type TrackSurface } from '@/lib/trackActions';
import { readLiveSnapshotId } from '@/lib/liveContinuity';
import type { ContextSurfaceOrigin } from '@/lib/contextSurfaces';

const siblings = new Set(['track-options', 'playlist-picker', 'queue', 'lyrics', 'track-details', 'track-share', 'track-remix', 'track-clip']);
export function useTrackActions(originOverride?: ContextSurfaceOrigin) {
  const controller = useContextSurfaceController();
  const pathname = usePathname();
  const client = useQueryClient();
  const viewer = useOrganizationViewer();
  const origin = originOverride || controller.current?.origin || (pathname === '/live' || pathname === '/dev/live' ? 'live' : pathname.startsWith('/discover') ? 'discover' : pathname.startsWith('/search') ? 'search' : 'other');
  const open = useCallback((raw: any, surface: TrackSurface = 'track-options', trigger?: HTMLElement | null) => {
    const track = normalizeActionTrack(raw);
    if (!track._id && surface !== 'queue') return;
    client.setQueryData(['organization-summary', viewer, track._id], track);
    controller.openSurface({ surface, entityType: surface === 'queue' ? 'queue' : 'track', entityId: surface === 'queue' ? null : track._id, origin,
      presentation: surface === 'track-options' || surface === 'track-share' ? 'context-menu' : 'auto', returnSnapshotId: readLiveSnapshotId(window.history.state) },
    { trigger, replace: Boolean(controller.current && siblings.has(controller.current.surface)) });
  }, [client, controller.openSurface, controller.current, origin, viewer]);
  const share = useCallback(async (raw: any, trigger?: HTMLElement | null) => {
    const track = normalizeActionTrack(raw);
    if (await nativeTrackShare(track, navigator) === 'fallback') open(track, 'track-share', trigger);
  }, [open]);
  return { open, share };
}
