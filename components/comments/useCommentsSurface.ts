'use client';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useContextSurfaceController } from '@/components/context-surfaces/ContextSurfaceController';
import { useCommentsViewer } from '@/lib/commentsClient';
import type { CommentEntity } from '@/lib/commentsModel';
import type { ContextSurfaceOrigin } from '@/lib/contextSurfaces';

export function useCommentsSurface(origin: ContextSurfaceOrigin) {
  const { openSurface } = useContextSurfaceController();
  const client = useQueryClient();
  const viewer = useCommentsViewer();
  return useCallback((entity: CommentEntity, trigger?: HTMLElement | null, timestampSeconds?: number, selectedCommentId?: string) => {
    if (!entity.id) return;
    client.setQueryData(['comment-entity', entity.type, entity.id, viewer], entity);
    if (timestampSeconds != null || selectedCommentId) client.setQueryData(['comment-draft', entity.type, entity.id, viewer], (old: any) => ({ ...old, timestamp: timestampSeconds ?? old?.timestamp ?? null, mode: 'moments', selectedCommentId: selectedCommentId || null }));
    openSurface({ surface: 'comments', entityType: entity.type, entityId: entity.id, origin, presentation: 'auto', returnSnapshotId: null }, { trigger });
  }, [client, openSurface, origin, viewer]);
}
