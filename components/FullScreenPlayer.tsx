'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Repeat, ListMusic, ListPlus, Radio, ChevronUp, ChevronDown, X, Sparkles, Shuffle, Share2 } from "lucide-react";
import { useAudioPlayer, useAudioTime, useSidebar } from '@/app/providers';
import LikeButton from './LikeButton';
import TikTokPlayer from './TikTokPlayer';
import TrackCover from './TrackCover';

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
    setVolume,
    toggleMute,
    setShuffle,
    setRepeat,
    addToUpNext,
  } = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();
  const { isSidebarOpen } = useSidebar();
  const pathname = usePathname();

  const progressRef = useRef<HTMLDivElement>(null);
  const [showTikTok, setShowTikTok] = useState(false);
  const [isLg, setIsLg] = useState(false);
  
  const sidebarWidth = isSidebarOpen ? 220 : 72;
  const isStudioPage = pathname?.startsWith('/ai-generator');

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex] || null;
  const track = useMemo(() => ({
    id: currentTrack?._id || '',
    title: currentTrack?.title || 'Titre inconnu',
    artist: currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu',
    cover: currentTrack?.coverUrl || null,
    src: currentTrack?.audioUrl || '',
  }), [currentTrack]);

  const isHls = useMemo(() => Boolean(track?.src?.toLowerCase?.().endsWith?.(".m3u8")), [track?.src]);
  const isLive = useMemo(() => isHls || /\blive\b|radio|stream/i.test(track?.title || ''), [isHls, track?.title]);

  const togglePlay = async () => {
    if (audioState.isPlaying) pause();
    else await play();
  };

  const toTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, '0')}`;
  };

  const seekTo = (fraction: number) => {
    if (!duration) return;
    seek(Math.max(0, Math.min(duration, fraction * duration)));
  };

  const seekBy = (deltaSec: number) => {
    seek(Math.max(0, Math.min((currentTime || 0) + deltaSec, duration)));
  };

  useEffect(() => {
    if (showTikTok) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') seekBy(5);
      if (e.code === 'ArrowLeft') seekBy(-5);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showTikTok, togglePlay, seekBy]);

  const onProgressClick = (e: React.MouseEvent) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  };

  const handleRepeat = () => {
    const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
    setRepeat(modes[(modes.indexOf(audioState.repeat) + 1) % modes.length]);
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

  const progressPct = duration ? ((currentTime || 0) / duration) * 100 : 0;

  if (!currentTrack || !audioState.showPlayer) return null;

  return (
    <>
      {showTikTok && (
        <TikTokPlayer
          isOpen={showTikTok}
          onClose={() => setShowTikTok(false)}
          initialTrackId={currentTrack?._id || (currentTrack as any)?.id}
        />
      )}

      {!showTikTok && (
        <div
          className={`fixed bottom-0 right-0 pointer-events-none z-[50] ${isStudioPage ? 'hidden lg:block' : ''}`}
          style={{ left: isLg ? sidebarWidth : 0, transition: 'left 200ms ease' }}
        >
          <div className="pointer-events-auto">
            {/* ── Progress bar — top edge ── */}
            <div
              ref={progressRef}
              onClick={onProgressClick}
              className="h-1 bg-white/[0.06] cursor-pointer relative group"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime || 0}
            >
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-[width] duration-150"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progressPct}%`, marginLeft: -6 }}
              />
            </div>

            {/* ── Player bar ── */}
            <div className="bg-[#0a0a12]/95 backdrop-blur-2xl border-t border-white/[0.04]">
              {/* ── DESKTOP layout (sm+) ── */}
              <div className="hidden sm:flex items-center gap-3 px-5 h-[56px]">
                {/* Cover + info */}
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => setShowTikTok(true)}
                >
                  <div className="relative shrink-0">
                    <TrackCover src={track.cover} title={track.title} className="w-10 h-10 ring-1 ring-white/[0.08]" rounded="rounded-lg" objectFit="cover" />
                    {isLive && (
                      <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-red-500 text-white text-[7px] font-bold uppercase px-1 py-px rounded-full tracking-wider">
                        <Radio className="w-2 h-2" /> Live
                      </span>
                    )}
                    {!isLive && ((currentTrack as any)?.isAI || String(currentTrack?._id || '').startsWith('ai-') || String(currentTrack?._id || '').startsWith('gen-')) && (
                      <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-violet-500 text-white text-[7px] font-bold px-1 py-px rounded-full">
                        <Sparkles className="w-2 h-2" /> IA
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{track.title}</p>
                    <p className="text-[11px] text-white/40 truncate leading-tight">
                      {track.artist}
                      {albumContext && <span className="text-white/20"> — {albumContext.name}</span>}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                  <button onClick={previousTrack} className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all" aria-label="Précédent">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={togglePlay}
                    disabled={audioState.isLoading}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 shadow-lg shadow-white/10 transition-all"
                    aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                  >
                    {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <button onClick={nextTrack} className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all" aria-label="Suivant">
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Time */}
                <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-white/30 tabular-nums shrink-0">
                  <span>{toTime(currentTime || 0)}</span>
                  <span>/</span>
                  <span>{toTime(duration || 0)}</span>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {currentTrack && (
                    <LikeButton
                      key={currentTrack._id}
                      trackId={currentTrack._id}
                      initialIsLiked={currentTrack.isLiked || false}
                      initialLikesCount={typeof currentTrack.likes === 'number' ? currentTrack.likes : (Array.isArray(currentTrack.likes) ? currentTrack.likes.length : 0)}
                      showCount={false}
                      size="md"
                    />
                  )}

                  <button
                    onClick={() => {
                      if (!currentTrack || isLive || String(currentTrack._id || '').startsWith('radio-')) return;
                      addToUpNext(currentTrack as any, 'end');
                    }}
                    disabled={!currentTrack || isLive || String(currentTrack?._id || '').startsWith('radio-')}
                    className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="À suivre"
                    aria-label="Ajouter à la liste d'attente"
                  >
                    <ListPlus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleRepeat}
                    className={`p-2 rounded-full transition-all relative ${
                      audioState.repeat !== 'none' ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
                    }`}
                    aria-pressed={audioState.repeat !== 'none'}
                    aria-label="Répéter"
                  >
                    <Repeat className="w-4 h-4" />
                    {audioState.repeat === 'one' && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[8px] font-bold flex items-center justify-center text-white">1</span>
                    )}
                  </button>

                  {/* Volume — desktop */}
                  <div className="hidden lg:flex items-center gap-1 ml-1">
                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                      aria-label={audioState.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {audioState.isMuted || audioState.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={audioState.isMuted ? 0 : audioState.volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 accent-white/70 h-1"
                      aria-label="Volume"
                    />
                  </div>

                  <button
                    onClick={() => setShowTikTok(true)}
                    className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                    title="Player complet"
                    aria-label="Player complet"
                  >
                    <ListMusic className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowPlayer(false)}
                    className="p-2 rounded-full text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all"
                    aria-label="Fermer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── MOBILE layout (<sm) ── */}
              <div className="sm:hidden">
                {/* Row 1: Cover + Title + Play/Pause + Close */}
                <div className="flex items-center gap-2.5 px-3 h-[54px]">
                  {/* Cover */}
                  <div
                    className="relative shrink-0 cursor-pointer"
                    onClick={() => setShowTikTok(true)}
                  >
                    <TrackCover src={track.cover} title={track.title} className="w-10 h-10 ring-1 ring-white/[0.08]" rounded="rounded-lg" objectFit="cover" />
                    {isLive && (
                      <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-red-500 text-white text-[7px] font-bold uppercase px-1 py-px rounded-full tracking-wider">
                        <Radio className="w-2 h-2" /> Live
                      </span>
                    )}
                    {!isLive && ((currentTrack as any)?.isAI || String(currentTrack?._id || '').startsWith('ai-') || String(currentTrack?._id || '').startsWith('gen-')) && (
                      <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-violet-500 text-white text-[7px] font-bold px-1 py-px rounded-full">
                        <Sparkles className="w-2 h-2" /> IA
                      </span>
                    )}
                  </div>

                  {/* Title + artist — tap opens full player */}
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowTikTok(true)}>
                    <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{track.title}</p>
                    <p className="text-[11px] text-white/40 truncate leading-tight">
                      {track.artist}
                      {albumContext && <span className="text-white/20"> — {albumContext.name}</span>}
                    </p>
                  </div>

                  {/* Core controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={previousTrack} className="p-1.5 rounded-full text-white/50 active:text-white active:bg-white/[0.08] transition-all" aria-label="Précédent">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={togglePlay}
                      disabled={audioState.isLoading}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black active:scale-95 shadow-lg shadow-white/10 transition-all"
                      aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                    >
                      {audioState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <button onClick={nextTrack} className="p-1.5 rounded-full text-white/50 active:text-white active:bg-white/[0.08] transition-all" aria-label="Suivant">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Like + Close */}
                  <div className="flex items-center gap-0 shrink-0">
                    {currentTrack && (
                      <LikeButton
                        key={currentTrack._id}
                        trackId={currentTrack._id}
                        initialIsLiked={currentTrack.isLiked || false}
                        initialLikesCount={typeof currentTrack.likes === 'number' ? currentTrack.likes : (Array.isArray(currentTrack.likes) ? currentTrack.likes.length : 0)}
                        showCount={false}
                        size="sm"
                      />
                    )}
                    <button
                      onClick={() => setShowPlayer(false)}
                      className="p-1.5 rounded-full text-white/20 active:text-white/50 transition-all"
                      aria-label="Fermer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Secondary actions — compact */}
                <div className="flex items-center justify-between px-3 pb-1.5 -mt-1">
                  <span className="text-[9px] font-mono text-white/20 tabular-nums">
                    {toTime(currentTime || 0)} / {toTime(duration || 0)}
                  </span>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setShuffle(!audioState.shuffle)}
                      className={`p-1 rounded-full transition-all ${audioState.shuffle ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/25 active:text-white/50'}`}
                      aria-label="Aléatoire"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleRepeat}
                      className={`p-1 rounded-full transition-all relative ${audioState.repeat !== 'none' ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/25 active:text-white/50'}`}
                      aria-label="Répéter"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      {audioState.repeat === 'one' && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full text-[7px] font-bold flex items-center justify-center text-white">1</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (!currentTrack || isLive || String(currentTrack._id || '').startsWith('radio-')) return;
                        addToUpNext(currentTrack as any, 'end');
                      }}
                      disabled={!currentTrack || isLive}
                      className="p-1 rounded-full text-white/25 active:text-white/50 transition-all disabled:opacity-30"
                      aria-label="À suivre"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleShare}
                      className="p-1 rounded-full text-white/25 active:text-white/50 transition-all"
                      aria-label="Partager"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setShowTikTok(true)}
                      className="p-1 rounded-full text-white/25 active:text-white/50 transition-all"
                      aria-label="Player complet"
                    >
                      <ListMusic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer mobile — occupe l'espace de la BottomNav sous le player */}
          <div className="lg:hidden" style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }} />
        </div>
      )}
    </>
  );
}
