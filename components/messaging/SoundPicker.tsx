'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Search, Send } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import TrackCover from '@/components/TrackCover';
import { SynauraOverlay, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';

export type SharedSound = { _id: string; title: string; coverUrl?: string; artist?: string | { name?: string }; duration?: number; isAI?: boolean };
export default function SoundPicker({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (sound: SharedSound) => Promise<unknown> }) {
  const { audioState } = useAudioPlayer();
  const current = audioState.tracks[audioState.currentTrackIndex];
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SharedSound[]>([]);
  const [selected, setSelected] = useState<SharedSound | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!open) { setQuery(''); setSelected(null); setError(''); } }, [open]);
  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?filter=tracks&limit=20&query=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw new Error('Recherche indisponible');
        if (!controller.signal.aborted) setResults(data.tracks || []);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Recherche impossible'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query]);
  const items: SharedSound[] = query.trim().length >= 2 ? results : current && !/^(gen-|radio-)/.test(current._id) ? [current] : [];
  return <SynauraOverlay open={open} onClose={() => !sending && onClose()} initialFocusRef={input} presentation="responsive" size="md" className="ms-dialog"><div className="ms-dialog-content">
    <div className="ms-dialog-symbol"><Music2 size={24} /></div><SynauraOverlayTitle>Fais écouter ça.</SynauraOverlayTitle><p className="ms-muted">Partage un morceau Synaura directement dans la discussion.</p>
    <label className="ms-search"><Search size={18} /><input ref={input} value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }} aria-label="Rechercher un morceau à partager" placeholder="Un titre, une envie…" maxLength={100} /></label>
    {!query.trim() && items.length > 0 && <p className="ms-label">DANS TON LECTEUR</p>}
    <div className="ms-picker-results">{loading ? <p role="status">Recherche…</p> : items.map(sound => <button key={sound._id} className="ms-person ms-sound-result" aria-pressed={selected?._id === sound._id} onClick={() => setSelected(sound)}><TrackCover src={sound.coverUrl} title={sound.title} size={52} animationEnabled={false} /><span><strong>{sound.title}</strong><small>{typeof sound.artist === 'string' ? sound.artist : sound.artist?.name || 'Synaura'}</small></span><Music2 size={18} /></button>)}{!loading && !items.length && <p>{query.trim().length >= 2 ? 'Aucun morceau trouvé.' : 'Recherche un morceau public à partager.'}</p>}</div>
    {error && <p role="alert" className="ms-error">{error}</p>}<button className="ms-primary" disabled={!selected || sending} onClick={async () => { if (!selected || sending) return; setSending(true); setError(''); try { await onSend(selected); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Partage impossible'); } finally { setSending(false); } }}>{sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}Partager{selected ? ` « ${selected.title} »` : ' le morceau'}</button>
  </div></SynauraOverlay>;
}
