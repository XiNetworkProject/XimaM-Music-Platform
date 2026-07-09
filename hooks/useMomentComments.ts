import { useCallback, useEffect, useState } from 'react';

export type MomentComment = {
  id: string;
  content: string;
  createdAt: string;
  timestampSeconds: number;
  user: { id: string; username: string; name: string; avatar?: string };
};

function normalize(raw: any): MomentComment | null {
  if (!raw || !Number.isFinite(Number(raw.timestampSeconds))) return null;
  return {
    id: String(raw.id || ''),
    content: String(raw.content || ''),
    createdAt: String(raw.createdAt || raw.created_at || ''),
    timestampSeconds: Number(raw.timestampSeconds),
    user: {
      id: String(raw.user?.id || ''),
      username: String(raw.user?.username || 'utilisateur'),
      name: String(raw.user?.name || raw.user?.username || 'Membre'),
      avatar: raw.user?.avatar || '',
    },
  };
}

/** Marqueurs de commentaires horodatés à afficher sur la waveform d'un
 * morceau. Requête dédiée et légère (pas les réponses, pas les likes). */
export function useMomentComments(trackId: string | null | undefined) {
  const [markers, setMarkers] = useState<MomentComment[]>([]);

  const refresh = useCallback(async () => {
    if (!trackId) {
      setMarkers([]);
      return;
    }
    try {
      const res = await fetch(`/api/tracks/${encodeURIComponent(trackId)}/comments?timestampedOnly=1`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      const list = (Array.isArray(json?.comments) ? json.comments : [])
        .map(normalize)
        .filter((c: MomentComment | null): c is MomentComment => Boolean(c));
      setMarkers(list);
    } catch {
      // silencieux : les marqueurs sont un enrichissement, pas une donnée critique
    }
  }, [trackId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addOptimistic = useCallback((comment: MomentComment) => {
    setMarkers((current) => [...current, comment].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
  }, []);

  return { markers, refresh, addOptimistic };
}
