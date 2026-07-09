import { useEffect, useRef, useState } from 'react';
import { computeWaveformPeaks } from '@/lib/waveform';

export type TrackWaveformState = {
  peaks: number[] | null;
  duration: number;
  loading: boolean;
};

/** Peaks réels d'un morceau : lit le cache serveur (track_waveforms), et si
 * absent, décode l'audio réel côté client (Web Audio API) puis pousse le
 * résultat en cache pour les prochaines ouvertures. Jamais de données
 * inventées : tant que rien n'est calculé, peaks reste `null`. */
export function useTrackWaveform(
  trackId: string | null | undefined,
  audioUrl: string | null | undefined,
  fallbackDuration?: number,
): TrackWaveformState {
  const [state, setState] = useState<TrackWaveformState>({ peaks: null, duration: fallbackDuration || 0, loading: false });
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!trackId || !audioUrl) {
      setState({ peaks: null, duration: fallbackDuration || 0, loading: false });
      return;
    }
    if (attemptedRef.current === trackId) return;
    attemptedRef.current = trackId;

    let cancelled = false;
    setState({ peaks: null, duration: fallbackDuration || 0, loading: true });

    (async () => {
      try {
        const cacheRes = await fetch(`/api/tracks/${encodeURIComponent(trackId)}/waveform`, { cache: 'no-store' });
        if (cacheRes.ok) {
          const json = await cacheRes.json().catch(() => null);
          if (!cancelled && Array.isArray(json?.peaks) && json.peaks.length) {
            setState({ peaks: json.peaks, duration: Number(json.duration) || fallbackDuration || 0, loading: false });
            return;
          }
        }

        const computed = await computeWaveformPeaks(audioUrl);
        if (cancelled) return;
        setState({ peaks: computed.peaks, duration: computed.duration || fallbackDuration || 0, loading: false });

        fetch(`/api/tracks/${encodeURIComponent(trackId)}/waveform`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: computed.duration, peaks: computed.peaks }),
        }).catch(() => {});
      } catch {
        if (!cancelled) setState({ peaks: null, duration: fallbackDuration || 0, loading: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trackId, audioUrl, fallbackDuration]);

  return state;
}
