'use client';

import { useEffect, useState } from 'react';
import { UModal, UModalBody, UButton } from '@/components/ui/UnifiedUI';

type Track = {
  id: string;
  title: string;
  coverUrl?: string | null;
  duration?: number | null;
};

interface TrackSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (trackId: string) => Promise<void> | void;
}

export default function TrackSelectModal({ isOpen, onClose, onSelect }: TrackSelectModalProps) {
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/users/tracks', { cache: 'no-store' });
        if (!res.ok) throw new Error('Erreur chargement pistes');
        const json = await res.json();
        const list: Track[] = (json?.tracks || []).map((t: any) => ({ id: t.id, title: t.title, coverUrl: t.coverUrl, duration: t.duration }));
        setTracks(list);
      } catch (e: any) {
        setError(e?.message || 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  return (
    <UModal open={isOpen} onClose={onClose} zClass="z-50" size="lg" showClose={false}>
      <UModalBody>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">Sélectionner une piste</h3>
          <UButton variant="ghost" size="sm" onClick={onClose}>Fermer</UButton>
        </div>
        {loading && <div className="py-8 text-center text-white/40">Chargement…</div>}
        {error && <div className="py-8 text-center text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="max-h-[60vh] overflow-y-auto grid grid-cols-1 gap-2">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.06] text-left transition-colors"
              >
                <div className="w-12 h-12 rounded-md overflow-hidden bg-black/30 border border-white/[0.08]">
                  {t.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.coverUrl} alt={t.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold truncate">{t.title}</div>
                  {typeof t.duration === 'number' ? (
                    <div className="text-xs text-white/40">{Math.round((t.duration || 0) / 1000)}s</div>
                  ) : null}
                </div>
              </button>
            ))}
            {tracks.length === 0 && (
              <div className="py-8 text-center text-white/40">Aucune piste trouvée</div>
            )}
          </div>
        )}
      </UModalBody>
    </UModal>
  );
}
