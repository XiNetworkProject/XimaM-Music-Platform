'use client';
import { useEffect, useRef } from 'react';
import { useCommentsSurface } from './useCommentsSurface';
import { useContextSurfaceController } from '@/components/context-surfaces/ContextSurfaceController';
import type { CommentEntity } from '@/lib/commentsModel';

// Compatibility for callers whose public API still uses isOpen/onClose.
export default function LegacyCommentsBridge({ entity, isOpen, onClose }: { entity: CommentEntity; isOpen: boolean; onClose: () => void }) {
  const open = useCommentsSurface('other');
  const { current } = useContextSurfaceController();
  const opened = useRef(false);
  const seen = useRef(false);
  useEffect(() => {
    if (isOpen && !opened.current) { opened.current = true; open(entity); }
    if (!isOpen) { opened.current = false; seen.current = false; }
  }, [isOpen, entity, open]);
  useEffect(() => {
    if (current?.surface === 'comments' && current.entityId === entity.id) seen.current = true;
    if (opened.current && seen.current && !current) { opened.current = false; seen.current = false; onClose(); }
  }, [current, entity.id, onClose]);
  return null;
}
