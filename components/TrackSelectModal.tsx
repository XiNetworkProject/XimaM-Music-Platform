'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-[var(--text)]">Sélectionner une piste</h3>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">Fermer</button>
            </div>
            {loading && <div className="py-8 text-center text-[var(--text-muted)]">Chargement…</div>}
            {error && <div className="py-8 text-center text-red-400">{error}</div>}
            {!loading && !error && (
              <div className="max-h-[60vh] overflow-y-auto grid grid-cols-1 gap-2">
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-3)] text-left"
                  >
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-black/30 border border-[var(--border)]">
                      {t.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.coverUrl} alt={t.title} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <div className="text-[var(--text)] font-semibold truncate">{t.title}</div>
                      {typeof t.duration === 'number' ? (
                        <div className="text-xs text-[var(--text-muted)]">{Math.round((t.duration || 0) / 1000)}s</div>
                      ) : null}
                    </div>
                  </button>
                ))}
                {tracks.length === 0 && (
                  <div className="py-8 text-center text-[var(--text-muted)]">Aucune piste trouvée</div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


