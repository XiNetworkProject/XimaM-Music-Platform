'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Heart } from 'lucide-react';

/** Existing Clip like contract. Reads only for the active clip; no automatic like. */
export default function PilotClipFavorite({ id, active, count }: { id: string; active: boolean; count: number }) {
  const { data: session } = useSession();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = ['v2-pilot-clip-like', session?.user?.id, id];
  const endpoint = `/api/music-clips/${encodeURIComponent(id)}/like`;
  const state = useQuery<{ liked: boolean; likesCount: number }>({ queryKey: key, enabled: active && Boolean(session?.user?.id), staleTime: 300_000, refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => { const response = await fetch(endpoint, { signal }); if (!response.ok) throw new Error('Favori indisponible'); return response.json(); } });
  const liked = state.data?.liked ?? false;
  return <><button data-live-like aria-label={liked ? 'Ne plus aimer le clip' : 'Aimer le clip'} aria-pressed={liked} disabled={busy || !state.data} onClick={async () => {
    if (busy || !state.data) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: liked ? 'DELETE' : 'POST' });
      if (!response.ok) throw new Error();
      client.setQueryData(key, await response.json());
    } catch { setError('Impossible de modifier le favori. Réessayez.'); }
    finally { setBusy(false); }
  }}><Heart size={20} fill={liked ? 'currentColor' : 'none'} /><span>{state.data?.likesCount ?? count}</span></button>{(error || state.isError) && <span role="status">{error || 'Favori du clip indisponible.'}</span>}</>;
}
