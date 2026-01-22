'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ListMusic, Play, Plus, Trash2, X } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function QueueDialog({ isOpen, onClose }: Props) {
  const { audioState, playTrack, upNextEnabled, upNextTracks, toggleUpNextEnabled, removeFromUpNext, clearUpNext, addToUpNext } =
    useAudioPlayer();

  const { current } = useMemo(() => {
    const idx = Math.max(0, audioState.currentTrackIndex || 0);
    const tracks = Array.isArray(audioState.tracks) ? audioState.tracks : [];
    const current = tracks[idx] || null;
    return { current };
  }, [audioState.currentTrackIndex, audioState.tracks]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (upNextTracks.length > 0) return;
    let cancelled = false;
    (async () => {
      setLoadingSug(true);
      try {
        const res = await fetch('/api/ranking/feed?strategy=reco&ai=0&limit=20', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        setSuggestions(Array.isArray(json?.tracks) ? json.tracks : []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSug(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, upNextTracks.length]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18 }}
          className="w-[92vw] max-w-[520px] rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="p-4 border-b border-border-secondary/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin grid place-items-center">
                  <ListMusic className="h-4 w-4 text-foreground-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground-primary">À suivre</div>
                  <div className="text-xs text-foreground-tertiary">{upNextTracks.length} titre(s)</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
            <div className="flex items-center justify-between rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-3">
              <div className="text-sm text-foreground-secondary">Activer “À suivre”</div>
              <button
                type="button"
                onClick={toggleUpNextEnabled}
                className={cx(
                  'h-7 w-12 rounded-full border border-border-secondary transition relative',
                  upNextEnabled ? 'bg-overlay-on-primary' : 'bg-background-tertiary',
                )}
                aria-label="Toggle à suivre"
              >
                <span
                  className={cx(
                    'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background-primary transition',
                    upNextEnabled ? 'left-6' : 'left-1',
                  )}
                />
              </button>
            </div>

            <div className="rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-2">
              <div className="text-xs text-foreground-tertiary">Lecture en cours</div>
              <div className="mt-1 text-sm text-foreground-primary truncate">{current?.title || '—'}</div>
              <div className="text-xs text-foreground-tertiary truncate">
                {current?.artist?.name || current?.artist?.username || ''}
              </div>
            </div>

            {upNextTracks.length ? (
              <div className="rounded-2xl border border-border-secondary bg-background-fog-thin overflow-hidden">
                <div className="px-3 py-2 border-b border-border-secondary/60 text-xs text-foreground-tertiary">
                  Prochains titres
                </div>
                <div className="divide-y divide-border-secondary/40">
                  {upNextTracks.map((t: any) => (
                    <div key={t._id} className="px-3 py-2 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground-primary truncate">{t.title}</div>
                        <div className="text-xs text-foreground-tertiary truncate">
                          {t.artist?.name || t.artist?.username || ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => playTrack(t._id)}
                        className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                        aria-label="Lire"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeFromUpNext(t._id);
                        }}
                        className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-red-500/15 hover:border-red-500/30 transition grid place-items-center"
                        aria-label="Retirer"
                      >
                        <Trash2 className="h-4 w-4 text-red-300" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-foreground-secondary text-center py-2">
                  Rien à suivre pour le moment.
                </div>
                <div className="rounded-2xl border border-border-secondary bg-background-fog-thin overflow-hidden">
                  <div className="px-3 py-2 border-b border-border-secondary/60 text-xs text-foreground-tertiary">
                    Suggestions
                  </div>
                  {loadingSug ? (
                    <div className="p-4 text-sm text-foreground-tertiary">Chargement…</div>
                  ) : suggestions.length ? (
                    <div className="divide-y divide-border-secondary/40">
                      {suggestions.slice(0, 10).map((t: any) => (
                        <div key={t._id} className="px-3 py-2 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-foreground-primary truncate">{t.title}</div>
                            <div className="text-xs text-foreground-tertiary truncate">
                              {t.artist?.name || t.artist?.username || ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addToUpNext(t as any, 'end')}
                            className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                            aria-label="Ajouter"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-foreground-tertiary">Aucune suggestion.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border-secondary/60 flex gap-2">
            <button
              type="button"
              onClick={() => {
                clearUpNext();
              }}
              disabled={!upNextTracks.length}
              className={cx(
                'flex-1 h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition',
                !upNextTracks.length && 'opacity-50',
              )}
            >
              Vider “à suivre”
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition"
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

