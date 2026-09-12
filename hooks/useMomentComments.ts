'use client';
import { useSharedMoments } from '@/lib/commentsClient';
import type { SocialComment } from '@/lib/commentsModel';
export type MomentComment = Omit<SocialComment, 'timestampSeconds'> & { timestampSeconds: number };
export function useMomentComments(trackId: string | null | undefined) {
  const query = useSharedMoments(trackId);
  return { ...query, markers: query.markers.filter((c): c is MomentComment => c.timestampSeconds != null) };
}
