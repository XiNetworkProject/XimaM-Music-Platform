'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  GripVertical,
  ListMusic,
  Pause,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { useAudioPlayer } from '@/app/providers';
import { UModal } from '@/components/ui/UnifiedUI';
import TrackCover from '@/components/TrackCover';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type QueueTrackRowProps = {
  track: any;
  index: number;
  draggable?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  removeIcon?: 'trash' | 'plus';
  onDragStart?: () => void;
  onDrop?: () => void;
};

function formatDuration(seconds?: number) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatTotal(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

function artistName(track: any) {
  return track?.artist?.name || track?.artist?.username || 'Artiste';
}

function QueueTrackRow({
  track,
  index,
  draggable,
  isPlaying,
  onPlay,
  onMoveUp,
  onMoveDown,
  onRemove,
  removeIcon = 'trash',
  onDragStart,
  onDrop,
}: QueueTrackRowProps) {
  return (
    <div
      className={`group flex min-w-0 items-center gap-2 rounded-[1rem] border p-2 transition sm:gap-3 sm:rounded-[1.2rem] sm:p-2.5 ${
        isPlaying
          ? 'border-[#ff6f61]/30 bg-[#ff6f61]/10'
          : 'border-black/[0.06] bg-white/72 hover:bg-white'
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className="hidden w-6 shrink-0 cursor-grab justify-center text-black/24 group-hover:text-black/42 sm:flex">
        {draggable ? <GripVertical className="h-4 w-4" /> : <span className="text-xs font-black tabular-nums">{index + 1}</span>}
      </div>
      <button type="button" onClick={onPlay} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[0.85rem] bg-black/[0.06] sm:h-12 sm:w-12 sm:rounded-[1rem]">
        <TrackCover src={track.coverUrl} videoSrc={(track as any).coverVideoUrl || (track as any).cover_video_url || null} posterSrc={(track as any).coverVideoPosterUrl || (track as any).cover_video_poster_url || track.coverUrl} title={track.title} className="h-full w-full" rounded="rounded-none" objectFit="cover" />
        <span className="absolute inset-0 grid place-items-center bg-black/24 text-white opacity-0 transition group-hover:opacity-100">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </span>
      </button>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-xs font-black text-[#171313] sm:text-sm">{track.title || 'Titre'}</p>
        <p className="truncate text-[10px] font-bold text-black/42 sm:text-xs">{artistName(track)}</p>
      </div>
      {formatDuration(track.duration) ? (
        <span className="hidden shrink-0 text-xs font-black tabular-nums text-black/30 sm:inline">{formatDuration(track.duration)}</span>
      ) : null}
      <div className="flex shrink-0 items-center gap-1">
        {onMoveUp ? (
          <button type="button" onClick={onMoveUp} className="hidden h-8 w-8 place-items-center rounded-full bg-black/[0.04] text-black/42 transition hover:bg-black/[0.08] min-[390px]:grid">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onMoveDown ? (
          <button type="button" onClick={onMoveDown} className="hidden h-8 w-8 place-items-center rounded-full bg-black/[0.04] text-black/42 transition hover:bg-black/[0.08] min-[390px]:grid">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
              removeIcon === 'plus'
                ? 'bg-[#171313] text-white hover:opacity-90'
                : 'bg-red-500/10 text-red-600 hover:bg-red-500/16'
            }`}
          >
            {removeIcon === 'plus' ? <Plus className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function QueueDialog({ isOpen, onClose }: Props) {
  const {
    audioState,
    playTrack,
    setTracks,
    upNextEnabled,
    upNextTracks,
    toggleUpNextEnabled,
    removeFromUpNext,
    clearUpNext,
    addToUpNext,
    reorderUpNext,
    moveUpNext,
  } = useAudioPlayer();

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = useMemo(() => {
    const tracks = Array.isArray(audioState.tracks) ? audioState.tracks : [];
    return tracks[Math.max(0, audioState.currentTrackIndex || 0)] || null;
  }, [audioState.currentTrackIndex, audioState.tracks]);

  const queueMeta = useMemo(() => {
    const totalSeconds = upNextTracks.reduce((sum: number, track: any) => sum + Number(track?.duration || 0), 0);
    return {
      total: upNextTracks.length,
      duration: formatTotal(totalSeconds),
    };
  }, [upNextTracks]);

  const upcomingFromMainQueue = useMemo(() => {
    const tracks = Array.isArray(audioState.tracks) ? audioState.tracks : [];
    const start = Math.max(0, (audioState.currentTrackIndex || 0) + 1);
    const upIds = new Set(upNextTracks.map((track: any) => track?._id).filter(Boolean));
    return tracks.slice(start).filter((track: any) => track?._id && !upIds.has(track._id)).slice(0, 6);
  }, [audioState.currentTrackIndex, audioState.tracks, upNextTracks]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch('/api/recommendations/feed?limit=24', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const existing = new Set([
          current?._id,
          ...upNextTracks.map((track: any) => track?._id),
          ...audioState.tracks.map((track: any) => track?._id),
        ].filter(Boolean));
        const next = (Array.isArray(json?.tracks) ? json.tracks : []).filter((track: any) => track?._id && !existing.has(track._id));
        setSuggestions(next.slice(0, 10));
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioState.tracks, current?._id, isOpen, upNextTracks]);

  const playFromQueue = (track: any) => {
    if (!track?._id) return;
    const exists = audioState.tracks.some((item: any) => item?._id === track._id);
    if (!exists) setTracks([...audioState.tracks, track]);
    void playTrack(track);
  };

  const saveAsPlaylist = async () => {
    if (!upNextTracks.length || saving) return;
    const defaultName = `File Synaura - ${new Date().toLocaleDateString('fr-FR')}`;
    const name = window.prompt('Nom de la playlist', defaultName);
    if (!name?.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: 'Enregistrée depuis la file d’attente Synaura', isPublic: false }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Erreur création playlist');
      const playlistId = String((json as any)?._id || '');
      if (!playlistId) throw new Error('Playlist invalide');

      for (const track of upNextTracks) {
        if (!track?._id) continue;
        await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: track._id }),
        });
      }
      notify.success('OK', 'File enregistrée en playlist');
    } catch (error: any) {
      notify.error('Erreur', error?.message || 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <UModal open={isOpen} onClose={onClose} size="full" zClass="z-[200]" showClose={false} className="!max-h-[92dvh] !overflow-hidden">
      <div className="flex max-h-[92dvh] min-w-0 flex-col overflow-hidden bg-[#fffaf2] text-[#171313]">
        <div className="relative overflow-hidden border-b border-black/[0.08] px-3 py-3 sm:px-6 sm:py-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(255,111,97,0.18),transparent_34%),radial-gradient(circle_at_92%_30%,rgba(124,92,255,0.12),transparent_36%)]" />
          <div className="relative flex min-w-0 items-start justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] bg-[#171313] text-[#fffaf2] shadow-[0_14px_36px_rgba(23,19,19,0.22)] sm:h-12 sm:w-12 sm:rounded-[1.2rem]">
                <ListMusic className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/36 sm:text-[11px] sm:tracking-[0.22em]">Système de lecture</p>
                <h2 className="mt-0.5 text-xl font-black tracking-tight sm:mt-1 sm:text-2xl">File d’attente</h2>
                <p className="mt-1 hidden text-sm font-semibold text-black/48 sm:block">
                  Décide ce qui passe après, garde le fil principal intact, puis sauvegarde si la sélection est bonne.
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.06] text-black/54 transition hover:bg-black/[0.1]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-3 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
            <div className="min-w-0 rounded-[0.95rem] bg-white/80 p-2 sm:rounded-[1.1rem] sm:p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/34">État</p>
              <p className="mt-1 truncate text-sm font-black sm:text-lg">{upNextEnabled ? 'Active' : 'En pause'}</p>
            </div>
            <div className="min-w-0 rounded-[0.95rem] bg-white/80 p-2 sm:rounded-[1.1rem] sm:p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/34">À suivre</p>
              <p className="mt-1 truncate text-sm font-black sm:text-lg">{queueMeta.total} titre{queueMeta.total !== 1 ? 's' : ''}</p>
            </div>
            <div className="min-w-0 rounded-[0.95rem] bg-white/80 p-2 sm:rounded-[1.1rem] sm:p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/34">Durée</p>
              <p className="mt-1 truncate text-sm font-black sm:text-lg">{queueMeta.duration || '—'}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-5">
          {current ? (
            <div className="mb-4 rounded-[1.15rem] border border-black/[0.08] bg-white p-2.5 shadow-[0_16px_44px_rgba(44,33,19,0.06)] sm:mb-5 sm:rounded-[1.4rem] sm:p-3">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[0.95rem] sm:h-14 sm:w-14 sm:rounded-[1.1rem]">
                  <TrackCover src={current.coverUrl} videoSrc={(current as any).coverVideoUrl || (current as any).cover_video_url || null} posterSrc={(current as any).coverVideoPosterUrl || (current as any).cover_video_poster_url || current.coverUrl} title={current.title} className="h-full w-full" rounded="rounded-none" objectFit="cover" />
                  {audioState.isPlaying ? (
                    <span className="absolute inset-0 grid place-items-center bg-black/22 text-white">
                      <Pause className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6f61]">En cours</p>
                  <p className="truncate text-base font-black">{current.title}</p>
                  <p className="truncate text-xs font-bold text-black/42">{artistName(current)}</p>
                </div>
                <button type="button" onClick={() => playFromQueue(current)} className="grid h-10 w-10 place-items-center rounded-full bg-[#171313] text-white">
                  {audioState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_0.85fr] xl:gap-5">
            <section className="min-w-0">
              <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Priorité</p>
                  <h3 className="text-lg font-black sm:text-xl">À suivre</h3>
                </div>
                <div className="flex shrink-0 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={toggleUpNextEnabled}
                    className={`h-9 rounded-full px-3 text-[11px] font-black transition sm:h-10 sm:px-4 sm:text-xs ${
                      upNextEnabled ? 'bg-[#171313] text-white' : 'bg-black/[0.06] text-black/54 hover:bg-black/[0.1]'
                    }`}
                  >
                    {upNextEnabled ? 'File active' : 'Activer la file'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { clearUpNext(); notify.success('OK', 'File vidée'); }}
                    disabled={!upNextTracks.length}
                    className="h-9 rounded-full bg-black/[0.06] px-3 text-[11px] font-black text-black/54 transition hover:bg-black/[0.1] disabled:opacity-40 sm:h-10 sm:px-4 sm:text-xs"
                  >
                    Vider
                  </button>
                </div>
              </div>

              {upNextTracks.length ? (
                <div className="space-y-2">
                  {upNextTracks.map((track: any, index: number) => (
                    <QueueTrackRow
                      key={`${track._id}-${index}`}
                      track={track}
                      index={index}
                      draggable
                      isPlaying={current?._id === track._id}
                      onPlay={() => playFromQueue(track)}
                      onMoveUp={() => moveUpNext(track._id, 'up')}
                      onMoveDown={() => moveUpNext(track._id, 'down')}
                      onRemove={() => {
                        removeFromUpNext(track._id);
                        notify.success('OK', 'Retiré de la file');
                      }}
                      onDragStart={() => setDragId(track._id)}
                      onDrop={() => {
                        if (!dragId || dragId === track._id) return;
                        const from = upNextTracks.findIndex((item: any) => item?._id === dragId);
                        const to = upNextTracks.findIndex((item: any) => item?._id === track._id);
                        if (from === -1 || to === -1) return;
                        const next = [...upNextTracks];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        reorderUpNext(next as any);
                        setDragId(null);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-black/[0.12] bg-white/60 p-6 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-black/22" />
                  <p className="mt-3 text-base font-black">Aucun titre prioritaire</p>
                  <p className="mt-1 text-sm font-semibold text-black/42">Ajoute un son pour le jouer juste après le morceau en cours.</p>
                </div>
              )}
            </section>

            <aside className="min-w-0 space-y-5">
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Suite naturelle</p>
                    <h3 className="text-lg font-black">Après la file</h3>
                  </div>
                  <Clock3 className="h-5 w-5 text-black/28" />
                </div>
                <div className="space-y-2">
                  {upcomingFromMainQueue.length ? upcomingFromMainQueue.map((track: any, index: number) => (
                    <QueueTrackRow
                      key={`${track._id}-main-${index}`}
                      track={track}
                      index={index}
                      onPlay={() => playFromQueue(track)}
                    />
                  )) : (
                    <p className="rounded-[1.2rem] bg-white/70 p-4 text-sm font-semibold text-black/42">La suite naturelle du player est vide.</p>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Suggestions</p>
                    <h3 className="text-lg font-black">Ajouter rapidement</h3>
                  </div>
                  <Plus className="h-5 w-5 text-black/28" />
                </div>
                {loadingSuggestions ? (
                  <p className="rounded-[1.2rem] bg-white/70 p-4 text-sm font-semibold text-black/42">Chargement des suggestions...</p>
                ) : suggestions.length ? (
                  <div className="space-y-2">
                    {suggestions.slice(0, 6).map((track: any, index: number) => (
                      <QueueTrackRow
                        key={`${track._id}-suggestion-${index}`}
                        track={track}
                        index={index}
                        onPlay={() => playFromQueue(track)}
                        onRemove={() => {
                          addToUpNext(track as any, 'end');
                          notify.success('OK', `${track.title || 'Titre'} ajouté`);
                        }}
                        removeIcon="plus"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[1.2rem] bg-white/70 p-4 text-sm font-semibold text-black/42">Aucune suggestion disponible.</p>
                )}
              </section>
            </aside>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-black/[0.08] bg-white/76 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <p className="text-[11px] font-bold text-black/42 sm:text-xs">La file se synchronise avec le player global.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveAsPlaylist}
              disabled={!upNextTracks.length || saving}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-[#fffaf2] px-4 text-xs font-black text-black/58 transition hover:bg-white disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button type="button" onClick={onClose} className="h-10 rounded-full bg-[#171313] px-5 text-xs font-black text-white">
              Terminé
            </button>
          </div>
        </div>
      </div>
    </UModal>
  );
}
