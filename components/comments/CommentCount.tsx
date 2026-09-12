'use client';
import { useCommentCount } from '@/lib/commentsClient';
import type { CommentEntityType } from '@/lib/commentsModel';
export default function CommentCount({ type, id, fallback = 0 }: { type: CommentEntityType; id: string; fallback?: number }) {
  return <>{new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(useCommentCount(type, id, fallback))}</>;
}
