'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, ListMusic, Play, Plus, Save, Trash2, X, Music2 } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import { UModal, UButton } from '@/components/ui/UnifiedUI';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function QueueDialog({ isOpen, onClose }: Props) {
  const { audioState, playTrack, setTracks, upNextEnabled, upNextTracks, toggleUpNextEnabled, removeFromUpNext, clearUpNext, addToUpNext, reorderUpNext, moveUpNext } =
    useAudioPlayer();

  const { current } = useMemo(() => {
    const idx = Math.max(0, audioState.currentTrackIndex || 0);
    const tracks = Array.isArray(audioState.tracks) ? audioState.tracks : [];
    const current = tracks[idx] || null;
    return { current };
  }, [audioState.currentTrackIndex, audioState.tracks]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalDuration = useMemo(() => {
    const secs = upNextTracks.reduce((sum, t: any) => sum + (t?.duration || 0), 0);
    const mins = Math.floor(secs / 60);
    return mins > 0 ? `${mins} min` : '';
  }, [upNextTracks]);

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
    return () => { cancelled = true; };
  }, [isOpen, upNextTracks.length]);

  if (typeof document === 'undefined') return null;

  const handlePlayFromQueue = (track: any) => {
    if (!track) return;
    const exists = audioState.tracks.some((t: any) => t?._id === track._id);
    if (!exists) {
      setTracks([...audioState.tracks, track]);
    }
    playTrack(track);
  };

  const saveAsPlaylist = async () => {
    if (!upNextTracks.length) return;
    const defaultName = `À suivre — ${new Date().toLocaleDateString('fr-FR')}`;
    const name = window.prompt('Nom du dossier', defaultName);
    if (!name || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: 'Enregistré depuis "À suivre"', isPublic: false }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Erreur création dossier');
      const playlistId = String((json as any)?._id || '');
      if (!playlistId) throw new Error('ID dossier invalide');

      for (const t of upNextTracks) {
        if (!t?._id) continue;
        await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: t._id }),
        });
      }

      notify.success('OK', 'File enregistrée dans un dossier');
    } catch (e: any) {
      notify.error('Erreur', e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <UModal open={isOpen} onClose={onClose} size="lg" zClass="z-[200]" showClose={false} className="flex flex-col !overflow-hidden !max-h-[85vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <ListMusic className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white">À suivre</h2>
                <p className="text-[11px] text-white/40">
                  {upNextTracks.length} titre{upNextTracks.length !== 1 ? 's' : ''}
                  {totalDuration && ` · ${totalDuration}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition flex items-center justify-center" aria-label="Fermer">
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Now Playing */}
          {current && (
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 ring-2 ring-indigo-500/40">
                <img
                  src={current.coverUrl || '/default-cover.jpg'}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }}
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <span className="w-0.5 h-3 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-4 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-2.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">En cours</p>
                <p className="text-[13px] font-semibold text-white truncate">{current.title}</p>
                <p className="text-[11px] text-white/35 truncate">{current.artist?.name || current.artist?.username || ''}</p>
              </div>
            </div>
          )}

          {/* Queue content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {upNextTracks.length > 0 ? (
              <div className="py-2">
                <p className="px-5 py-1.5 text-[10px] text-white/25 uppercase tracking-wider font-semibold">
                  Prochains titres
                </p>
                <div className="space-y-0.5">
                  {upNextTracks.map((t: any, idx: number) => {
                    const dur = t.duration || 0;
                    const durStr = dur > 0 ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '';
                    return (
                      <div
                        key={t._id}
                        className="px-3 mx-2 py-2 flex items-center gap-2.5 rounded-lg hover:bg-white/[0.04] transition group"
                        draggable
                        onDragStart={() => setDragId(t._id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (!dragId || dragId === t._id) return;
                          const from = upNextTracks.findIndex((x: any) => x?._id === dragId);
                          const to = upNextTracks.findIndex((x: any) => x?._id === t._id);
                          if (from === -1 || to === -1) return;
                          const next = [...upNextTracks];
                          const [moved] = next.splice(from, 1);
                          next.splice(to, 0, moved);
                          reorderUpNext(next as any);
                          setDragId(null);
                        }}
                      >
                        <div className="w-5 text-center text-[11px] text-white/15 font-semibold tabular-nums shrink-0 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-3.5 h-3.5 text-white/15 group-hover:text-white/30 transition mx-auto" />
                        </div>
                        <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 group/cover">
                          <img
                            src={t.coverUrl || '/default-cover.jpg'}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }}
                          />
                          <button
                            onClick={() => handlePlayFromQueue(t)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity"
                          >
                            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-white font-medium truncate">{t.title}</p>
                          <p className="text-[11px] text-white/30 truncate">{t.artist?.name || t.artist?.username || ''}</p>
                        </div>
                        {durStr && <span className="text-[10px] text-white/20 tabular-nums shrink-0 hidden sm:block">{durStr}</span>}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveUpNext(t._id, 'up')} className="w-7 h-7 rounded-md hover:bg-white/[0.08] transition flex items-center justify-center" aria-label="Monter">
                            <ArrowUp className="w-3.5 h-3.5 text-white/40" />
                          </button>
                          <button onClick={() => moveUpNext(t._id, 'down')} className="w-7 h-7 rounded-md hover:bg-white/[0.08] transition flex items-center justify-center" aria-label="Descendre">
                            <ArrowDown className="w-3.5 h-3.5 text-white/40" />
                          </button>
                          <button
                            onClick={() => {
                              removeFromUpNext(t._id);
                              notify.success('OK', 'Retiré de la file');
                            }}
                            className="w-7 h-7 rounded-md hover:bg-red-500/15 transition flex items-center justify-center"
                            aria-label="Retirer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-6 px-5">
                <div className="text-center py-4">
                  <Music2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/30">Rien dans la file pour le moment</p>
                  <p className="text-[11px] text-white/15 mt-1">Utilise les 3 points sur une piste pour ajouter</p>
                </div>

                {(loadingSug || suggestions.length > 0) && (
                  <div className="mt-4">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Suggestions</p>
                    {loadingSug ? (
                      <div className="py-4 text-center text-sm text-white/20">Chargement...</div>
                    ) : (
                      <div className="space-y-0.5">
                        {suggestions.slice(0, 8).map((t: any) => (
                          <div key={t._id} className="flex items-center gap-2.5 rounded-lg hover:bg-white/[0.04] transition p-2 group">
                            <img
                              src={t.coverUrl || '/default-cover.jpg'}
                              alt=""
                              className="w-9 h-9 rounded-md object-cover shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] text-white truncate">{t.title}</p>
                              <p className="text-[11px] text-white/30 truncate">{t.artist?.name || t.artist?.username || ''}</p>
                            </div>
                            <button
                              onClick={() => {
                                addToUpNext(t as any, 'end');
                                notify.success('OK', `${t.title} ajouté`);
                              }}
                              className="w-7 h-7 rounded-md bg-white/[0.06] hover:bg-indigo-500/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100"
                              aria-label="Ajouter"
                            >
                              <Plus className="w-3.5 h-3.5 text-white/50" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.06] flex gap-2 shrink-0">
            <UButton
              variant="secondary"
              size="lg"
              onClick={() => { clearUpNext(); notify.success('OK', 'File vidée'); }}
              disabled={!upNextTracks.length}
              className="flex-1"
            >
              Vider
            </UButton>
            <UButton
              variant="secondary"
              size="lg"
              onClick={saveAsPlaylist}
              disabled={!upNextTracks.length || saving}
              className="flex-1"
            >
              <Save className="w-3.5 h-3.5" />
              Sauvegarder
            </UButton>
            <UButton
              variant="primary"
              size="lg"
              onClick={onClose}
              className="flex-1"
            >
              OK
            </UButton>
          </div>
    </UModal>
  );
}
