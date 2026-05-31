'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ListMusic, MessageSquare, Pause, Play, Radio, Repeat2, Share2, SkipBack, SkipForward, Sparkles, Trash2, X } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import TikTokPlayer from './TikTokPlayer';
import TrackCover from './TrackCover';
import TrackCreateRemixActions from './TrackCreateRemixActions';

function toTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function trackArtist(track: any) {
  if (!track) return 'Artiste inconnu';
  if (typeof track.artist === 'string') return track.artist;
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste inconnu';
}

function QueueMiniRow({
  track,
  index,
  editable,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  track: any;
  index?: number;
  editable?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[1rem] bg-black/[0.04] p-2">
      {typeof index === 'number' ? <span className="w-5 text-center text-[10px] font-black text-black/32">{index + 1}</span> : null}
      <TrackCover
        trackId={track?._id || track?.id || null}
        src={track?.coverUrl || track?.cover_url || null}
        videoSrc={track?.coverVideoUrl || track?.cover_video_url || null}
        posterSrc={track?.coverVideoPosterUrl || track?.cover_video_poster_url || track?.coverUrl || track?.cover_url || null}
        title={track?.title || 'Titre'}
        className="h-9 w-9 shrink-0"
        rounded="rounded-[0.75rem]"
        objectFit="cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-[#171313]">{track?.title || 'Titre inconnu'}</p>
        <p className="truncate text-[10px] font-semibold text-black/38">{trackArtist(track)}</p>
      </div>
      {editable ? (
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onMoveUp} className="grid h-7 w-7 place-items-center rounded-full bg-white text-black/45 disabled:opacity-25" disabled={!onMoveUp}>
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onMoveDown} className="grid h-7 w-7 place-items-center rounded-full bg-white text-black/45 disabled:opacity-25" disabled={!onMoveDown}>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full bg-red-500/10 text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function QueuePanel({
  currentTrack,
  queueTracks,
  upNextTracks,
  upNextEnabled,
  onToggleEnabled,
  onRemove,
  onClear,
  onMove,
  onClose,
}: {
  currentTrack: any;
  queueTracks: any[];
  upNextTracks: any[];
  upNextEnabled: boolean;
  onToggleEnabled: () => void;
  onRemove: (trackId: string) => void;
  onClear: () => void;
  onMove: (trackId: string, direction: 'up' | 'down') => void;
  onClose: () => void;
}) {
  return (
    <div className="mx-auto mb-2 max-h-[calc(100dvh-var(--synaura-mobile-player-space)-1rem)] max-w-[980px] overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-[#fffaf2]/98 p-2.5 text-[#171313] shadow-[0_22px_60px_rgba(30,25,20,0.22)] backdrop-blur-2xl sm:max-h-[72vh] sm:rounded-[1.45rem] sm:p-3">
      <div className="mb-2.5 flex items-start justify-between gap-3 sm:mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/34">File d'attente</p>
          <h2 className="text-base font-black tracking-[-0.04em] sm:text-lg">À suivre</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleEnabled} className={`h-8 rounded-full px-3 text-[11px] font-black ${upNextEnabled ? 'bg-[#171313] text-white' : 'bg-black/[0.06] text-black/48'}`}>
            {upNextEnabled ? 'Activée' : 'Désactivée'}
          </button>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.06] text-black/45">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid max-h-[calc(100dvh-var(--synaura-mobile-player-space)-6rem)] gap-3 overflow-y-auto pr-1 md:max-h-none md:grid-cols-[1fr_1.1fr] md:overflow-visible md:pr-0">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-black/34">En cours</p>
          <QueueMiniRow track={currentTrack} />
          {queueTracks.length ? (
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Suite naturelle</p>
              <div className="max-h-[116px] space-y-1.5 overflow-y-auto pr-1 sm:max-h-[150px]">
                {queueTracks.map((track, index) => <QueueMiniRow key={`${track?._id || track?.id}-${index}`} track={track} index={index} />)}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/34">Priorité utilisateur</p>
            {upNextTracks.length ? <button type="button" onClick={onClear} className="text-[11px] font-black text-red-600">Vider</button> : null}
          </div>
          {upNextTracks.length ? (
            <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1 sm:max-h-[230px]">
              {upNextTracks.map((track, index) => {
                const id = track?._id || track?.id || '';
                return (
                  <QueueMiniRow
                    key={`${id}-${index}`}
                    track={track}
                    index={index}
                    editable
                    onRemove={() => id && onRemove(id)}
                    onMoveUp={index > 0 && id ? () => onMove(id, 'up') : undefined}
                    onMoveDown={index < upNextTracks.length - 1 && id ? () => onMove(id, 'down') : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-black/[0.12] p-5 text-center">
              <p className="text-sm font-black text-black/48">Aucune piste dans À suivre.</p>
              <p className="mt-1 text-xs font-semibold text-black/34">Ajoute des sons depuis Discover, la Home ou un profil.</p>
              <Link href="/discover" onClick={onClose} className="mt-3 inline-flex h-9 items-center rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                Découvrir des sons
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SynauraMiniPlayer() {
  const {
    audioState,
    albumContext,
    play,
    pause,
    nextTrack,
    previousTrack,
    seek,
    upNextEnabled,
    upNextTracks,
    setUpNextEnabled,
    removeFromUpNext,
    clearUpNext,
    moveUpNext,
    addToUpNext,
  } = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();

  const progressRef = useRef<HTMLDivElement>(null);
  const [showTikTok, setShowTikTok] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex] || null;
  const track = useMemo(
    () => ({
      id: currentTrack?._id || '',
      title: currentTrack?.title || 'Titre inconnu',
      artist: currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu',
      cover: currentTrack?.coverUrl || null,
      coverVideo: (currentTrack as any)?.coverVideoUrl || (currentTrack as any)?.cover_video_url || null,
      coverVideoPoster: (currentTrack as any)?.coverVideoPosterUrl || (currentTrack as any)?.cover_video_poster_url || currentTrack?.coverUrl || null,
      src: currentTrack?.audioUrl || '',
    }),
    [currentTrack],
  );

  const isHls = useMemo(() => Boolean(track.src?.toLowerCase?.().endsWith?.('.m3u8')), [track.src]);
  const isLive = useMemo(() => isHls || /\blive\b|radio|stream/i.test(track.title || ''), [isHls, track.title]);
  const isAI = useMemo(
    () => !isLive && ((currentTrack as any)?.isAI || String(currentTrack?._id || '').startsWith('ai-') || String(currentTrack?._id || '').startsWith('gen-')),
    [currentTrack, isLive],
  );

  const progressPct = duration ? ((currentTime || 0) / duration) * 100 : 0;
  const artistUsername = (currentTrack as any)?.artist?.username;
  const nextQueueTracks = audioState.tracks.slice(Math.max(0, audioState.currentTrackIndex + 1), audioState.currentTrackIndex + 6);

  const togglePlay = async () => {
    if (audioState.isPlaying) pause();
    else await play();
  };

  const seekTo = (fraction: number) => {
    if (!duration) return;
    seek(Math.max(0, Math.min(duration, fraction * duration)));
  };

  const onProgressClick = (event: React.MouseEvent) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    seekTo((event.clientX - rect.left) / rect.width);
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const url = albumContext
      ? `${window.location.origin}/album/${albumContext.id}`
      : `${window.location.origin}/track/${currentTrack._id}`;
    const title = albumContext ? albumContext.name : track.title;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text: `Ecoute ${title} sur Synaura`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      fetch('/api/recommendations/impressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'track', contentId: currentTrack._id, source: 'global-player', eventType: 'share' }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  };

  useEffect(() => {
    if (showTikTok) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void togglePlay();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showTikTok, audioState.isPlaying]);

  if (!currentTrack || !audioState.showPlayer) return null;

  return (
    <>
      {showTikTok ? (
        <TikTokPlayer
          isOpen={showTikTok}
          onClose={() => setShowTikTok(false)}
          initialTrackId={currentTrack?._id || (currentTrack as any)?.id}
        />
      ) : null}

      {!showTikTok ? (
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.55rem)] z-[60] pointer-events-none sm:bottom-0">
            <div className="pointer-events-auto px-2 pb-1 sm:px-4 sm:pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
              {showQueue ? (
                <QueuePanel
                  currentTrack={currentTrack as any}
                  queueTracks={nextQueueTracks as any[]}
                  upNextTracks={upNextTracks as any[]}
                  upNextEnabled={upNextEnabled}
                  onToggleEnabled={() => setUpNextEnabled(!upNextEnabled)}
                  onRemove={removeFromUpNext}
                  onClear={clearUpNext}
                  onMove={moveUpNext}
                  onClose={() => setShowQueue(false)}
                />
              ) : null}
              <div className="mx-auto max-w-[980px] overflow-hidden rounded-[1.1rem] border border-black/[0.08] bg-[#fffaf2]/96 text-[#171313] shadow-[0_18px_48px_rgba(30,25,20,0.20)] backdrop-blur-2xl sm:rounded-[1.45rem] sm:shadow-[0_22px_60px_rgba(30,25,20,0.22)]">
                <div
                  ref={progressRef}
                  onClick={onProgressClick}
                  className="relative h-1.5 cursor-pointer bg-black/[0.06]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={duration || 0}
                  aria-valuenow={currentTime || 0}
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#ff6f61] via-[#7c5cff] to-[#14b8a6] transition-[width] duration-150"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="hidden items-center gap-3 px-3 py-2.5 sm:flex">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setShowTikTok(true)}>
                    <div className="relative shrink-0">
                      <TrackCover trackId={track.id} src={track.cover} videoSrc={track.coverVideo} posterSrc={track.coverVideoPoster} title={track.title} autoPlayVideo={audioState.isPlaying} className="h-11 w-11 ring-1 ring-black/[0.08]" rounded="rounded-[1rem]" objectFit="cover" />
                      {isLive ? (
                        <span className="absolute -top-1 -right-1 inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                          <Radio className="h-2.5 w-2.5" />
                          Live
                        </span>
                      ) : null}
                      {isAI ? (
                        <span className="absolute -top-1 -right-1 inline-flex items-center gap-1 rounded-full bg-violet-500 px-1.5 py-0.5 text-[8px] font-black text-white">
                          <Sparkles className="h-2.5 w-2.5" />
                          IA
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black leading-tight">{track.title}</p>
                      <p className="truncate text-[11px] leading-tight text-black/42">
                        {track.artist}
                        {albumContext ? <span className="text-black/26"> · {albumContext.name}</span> : null}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button onClick={previousTrack} className="grid h-9 w-9 place-items-center rounded-full bg-black/[0.05] text-black/55 transition hover:bg-black/[0.1] hover:text-[#171313]" aria-label="Precedent">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={togglePlay}
                      disabled={audioState.isLoading}
                      className="grid h-10 w-10 place-items-center rounded-full bg-[#171313] text-[#fffaf2] transition hover:scale-[1.03]"
                      aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                    >
                      {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="ml-0.5 w-4 h-4 fill-current" />}
                    </button>
                    <button onClick={nextTrack} className="grid h-9 w-9 place-items-center rounded-full bg-black/[0.05] text-black/55 transition hover:bg-black/[0.1] hover:text-[#171313]" aria-label="Suivant">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="hidden items-center gap-2 text-[10px] font-mono text-black/32 tabular-nums lg:flex">
                    <span>{toTime(currentTime || 0)}</span>
                    <span>/</span>
                    <span>{toTime(duration || 0)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {artistUsername ? (
                      <Link
                        href={`/profile/${encodeURIComponent(artistUsername)}`}
                        className="hidden h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3 text-xs font-black text-black/58 transition hover:bg-black/[0.1] hover:text-[#171313] lg:inline-flex"
                        onClick={() => {
                          fetch('/api/recommendations/impressions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contentType: 'track', contentId: currentTrack._id, source: 'global-player', eventType: 'open_artist' }),
                            keepalive: true,
                          }).catch(() => {});
                        }}
                      >
                        Artiste
                      </Link>
                    ) : null}
                    <button
                      onClick={() => addToUpNext(currentTrack as any, 'end')}
                      className="hidden h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3 text-xs font-black text-black/58 transition hover:bg-black/[0.1] hover:text-[#171313] lg:inline-flex"
                      aria-label="Ajouter à la file"
                    >
                      + File
                    </button>
                    <button
                      onClick={handleShare}
                      className="inline-flex h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3 text-xs font-black text-black/58 transition hover:bg-black/[0.1] hover:text-[#171313]"
                      aria-label="Partager"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Partager
                    </button>
                    <button
                      onClick={() => setShowTikTok(true)}
                      className="inline-flex h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3 text-xs font-black text-black/58 transition hover:bg-black/[0.1] hover:text-[#171313]"
                      aria-label="Player complet"
                    >
                      <ListMusic className="w-3.5 h-3.5" />
                      Feed
                    </button>
                    <button
                      onClick={() => setShowQueue((value) => !value)}
                      className="inline-flex h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3 text-xs font-black text-black/58 transition hover:bg-black/[0.1] hover:text-[#171313]"
                      aria-label="À suivre"
                    >
                      <ListMusic className="w-3.5 h-3.5" />
                      À suivre
                      {upNextTracks.length ? <span className="rounded-full bg-[#171313] px-1.5 py-0.5 text-[9px] text-white">{upNextTracks.length}</span> : null}
                    </button>
                    <Link
                      href={`/community/forum/new?category=feedback&trackId=${encodeURIComponent(String(currentTrack._id))}&title=${encodeURIComponent(String(currentTrack.title || ''))}&source=player`}
                      className="hidden h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3 text-xs font-black text-black/58 transition hover:bg-black/[0.1] hover:text-[#171313] 2xl:inline-flex"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Avis
                    </Link>
                    <Link
                      href={`/community/forum/new?category=remix&trackId=${encodeURIComponent(String(currentTrack._id))}&title=${encodeURIComponent(String(currentTrack.title || ''))}&source=player`}
                      className="hidden h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3 text-xs font-black text-black/58 transition hover:bg-black/[0.1] hover:text-[#171313] 2xl:inline-flex"
                    >
                      <Repeat2 className="w-3.5 h-3.5" />
                      Défi
                    </Link>
                    <TrackCreateRemixActions track={currentTrack as any} compact className="hidden xl:flex" />
                  </div>
                </div>

                {audioState.error ? (
                  <div className="mx-3 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-[1rem] bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700">
                    <span className="line-clamp-1">Lecture impossible : {audioState.error}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void play()} className="rounded-full bg-red-600 px-3 py-1 text-white">Réessayer</button>
                      {isAI ? <Link href="/ai-generator" className="rounded-full bg-white px-3 py-1 text-red-700">Studio</Link> : null}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 px-2 py-1.5 sm:hidden">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setShowTikTok(true)}>
                    <div className="relative shrink-0">
                      <TrackCover trackId={track.id} src={track.cover} videoSrc={track.coverVideo} posterSrc={track.coverVideoPoster} title={track.title} autoPlayVideo={audioState.isPlaying} className="h-8 w-8 ring-1 ring-black/[0.08]" rounded="rounded-[0.75rem]" objectFit="cover" />
                      {isLive ? <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1 py-0.5 text-[7px] font-black uppercase text-white">LIVE</span> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-black leading-tight">{track.title}</p>
                      <p className="truncate text-[9px] leading-tight text-black/42">{track.artist}</p>
                    </div>
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={audioState.isLoading}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171313] text-[#fffaf2]"
                    aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                  >
                    {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="ml-0.5 w-4 h-4 fill-current" />}
                  </button>
                  <button
                    onClick={() => setShowTikTok(true)}
                    className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.05] text-black/55"
                    aria-label="À suivre"
                  >
                    <ListMusic className="w-4 h-4" />
                    {upNextTracks.length ? <span className="absolute -right-1 -top-1 rounded-full bg-[#171313] px-1.5 py-0.5 text-[8px] font-black text-white">{upNextTracks.length}</span> : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
      ) : null}
    </>
  );
}
