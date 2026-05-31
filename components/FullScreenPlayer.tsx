'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ListMusic, Pause, Play, Radio, Share2, SkipBack, SkipForward, Sparkles, X } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import TikTokPlayer from './TikTokPlayer';
import TrackCover from './TrackCover';

function toTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export default function SynauraMiniPlayer() {
  const {
    audioState,
    albumContext,
    setShowPlayer,
    play,
    pause,
    nextTrack,
    previousTrack,
    seek,
  } = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();

  const progressRef = useRef<HTMLDivElement>(null);
  const [showTikTok, setShowTikTok] = useState(false);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex] || null;
  const track = useMemo(
    () => ({
      id: currentTrack?._id || '',
      title: currentTrack?.title || 'Titre inconnu',
      artist: currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu',
      cover: currentTrack?.coverUrl || null,
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
          <div className="fixed inset-x-0 bottom-0 z-[50] pointer-events-none">
            <div className="pointer-events-auto px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-4">
              <div className="mx-auto max-w-[980px] overflow-hidden rounded-[1.45rem] border border-black/[0.08] bg-[#fffaf2]/96 text-[#171313] shadow-[0_22px_60px_rgba(30,25,20,0.22)] backdrop-blur-2xl">
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
                      <TrackCover src={track.cover} title={track.title} className="h-11 w-11 ring-1 ring-black/[0.08]" rounded="rounded-[1rem]" objectFit="cover" />
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
                      onClick={() => setShowPlayer(false)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-black/[0.05] text-black/50 transition hover:bg-black/[0.1] hover:text-[#171313]"
                      aria-label="Fermer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2.5 sm:hidden">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => setShowTikTok(true)}>
                    <div className="relative shrink-0">
                      <TrackCover src={track.cover} title={track.title} className="h-10 w-10 ring-1 ring-black/[0.08]" rounded="rounded-[0.9rem]" objectFit="cover" />
                      {isLive ? <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1 py-0.5 text-[7px] font-black uppercase text-white">LIVE</span> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-black leading-tight">{track.title}</p>
                      <p className="truncate text-[10px] leading-tight text-black/42">{track.artist}</p>
                    </div>
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={audioState.isLoading}
                    className="grid h-10 w-10 place-items-center rounded-full bg-[#171313] text-[#fffaf2]"
                    aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                  >
                    {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="ml-0.5 w-4 h-4 fill-current" />}
                  </button>
                  <button
                    onClick={() => setShowTikTok(true)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.05] text-black/55"
                    aria-label="Player complet"
                  >
                    <ListMusic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowPlayer(false)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.05] text-black/50"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
      ) : null}
    </>
  );
}
