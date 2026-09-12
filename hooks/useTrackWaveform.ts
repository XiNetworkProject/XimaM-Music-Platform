'use client';
import { useQuery } from '@tanstack/react-query';
import { computeWaveformPeaks, WAVEFORM_TARGET_PEAKS } from '@/lib/waveform';
import { commentRequest, useCommentsViewer } from '@/lib/commentsClient';
export type TrackWaveformState = { peaks: number[] | null; duration: number; loading: boolean };
export function useTrackWaveform(trackId: string | null | undefined, audioUrl: string | null | undefined, fallbackDuration?: number): TrackWaveformState {
  const viewer = useCommentsViewer();
  const query = useQuery({
    queryKey: ['track-waveform', trackId || '', viewer],
    enabled: Boolean(trackId),
    staleTime: 30 * 60_000, gcTime: 5 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const body = await commentRequest(`/api/tracks/${encodeURIComponent(trackId!)}/waveform`, { signal });
      if (Array.isArray(body.peaks) && body.peaks.length) return { peaks: body.peaks as number[], duration: Number(body.duration) || fallbackDuration || 0 };
      if (!audioUrl) return { peaks: null, duration: fallbackDuration || 0 };
      const computed = await computeWaveformPeaks(audioUrl, WAVEFORM_TARGET_PEAKS, signal);
      signal.throwIfAborted();
      if (body.canWrite) await commentRequest(`/api/tracks/${encodeURIComponent(trackId!)}/waveform`, { method: 'POST', body: JSON.stringify(computed), signal }).catch(() => { signal.throwIfAborted(); });
      return computed;
    },
  });
  return { peaks: query.data?.peaks || null, duration: query.data?.duration || fallbackDuration || 0, loading: query.isFetching };
}
