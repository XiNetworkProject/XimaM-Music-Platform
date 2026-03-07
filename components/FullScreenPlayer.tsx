'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Repeat, ListMusic, ListPlus, Radio, ChevronUp, ChevronDown, X, Sparkles } from "lucide-react";
import { useAudioPlayer, useAudioTime, useSidebar } from '@/app/providers';
import LikeButton from './LikeButton';
import TikTokPlayer from './TikTokPlayer';

export default function SynauraMiniPlayer() {
  const {
    audioState,
    setShowPlayer,
    play,
    pause,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleMute,
    setRepeat,
    addToUpNext,
  } = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();
  const { isSidebarOpen } = useSidebar();
  const pathname = usePathname();

  const progressRef = useRef<HTMLDivElement>(null);
  const [showTikTok, setShowTikTok] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
    cover: currentTrack?.coverUrl || '/default-cover.jpg',
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
          {/* Spacer for mobile BottomNav */}
          <div className="lg:hidden h-[68px]" />

          <div className="pointer-events-auto">
            {/* ── Progress bar — top edge, always visible ── */}
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
              {/* Main row — always visible */}
              <div className="flex items-center gap-3 px-3 lg:px-5 h-[58px] lg:h-[56px]">
                {/* Cover + info */}
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => setShowTikTok(true)}
                >
                  <div className="relative shrink-0">
                    <img
                      src={track.cover}
                      className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/[0.08]"
                      alt={track.title}
                    />
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
                    <p className="text-[11px] text-white/40 truncate leading-tight">{track.artist}</p>
                  </div>
                </div>

                {/* Controls — center */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={previousTrack}
                    className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all hidden sm:flex"
                    aria-label="Précédent"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={togglePlay}
                    disabled={audioState.isLoading}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 shadow-lg shadow-white/10 transition-all"
                    aria-label={audioState.isPlaying ? 'Pause' : 'Play'}
                  >
                    {audioState.isPlaying
                      ? <Pause className="w-4 h-4" />
                      : <Play className="w-4 h-4 fill-current ml-0.5" />
                    }
                  </button>
                  <button
                    onClick={nextTrack}
                    className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all hidden sm:flex"
                    aria-label="Suivant"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Time — desktop only */}
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

                  {/* Expand toggle — mobile */}
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all sm:hidden"
                    aria-label={expanded ? 'Réduire' : 'Plus d\'options'}
                  >
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>

                  {/* Desktop extras */}
                  <button
                    onClick={() => {
                      if (!currentTrack || isLive || String(currentTrack._id || '').startsWith('radio-')) return;
                      addToUpNext(currentTrack as any, 'end');
                    }}
                    disabled={!currentTrack || isLive || String(currentTrack?._id || '').startsWith('radio-')}
                    className="hidden sm:flex p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="À suivre"
                    aria-label="Ajouter à la liste d'attente"
                  >
                    <ListPlus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleRepeat}
                    className={`hidden sm:flex p-2 rounded-full transition-all relative ${
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
                      {audioState.isMuted || audioState.volume === 0
                        ? <VolumeX className="w-4 h-4" />
                        : <Volume2 className="w-4 h-4" />
                      }
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
                    className="hidden sm:flex p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
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

              {/* Expanded row — mobile only */}
              {expanded && (
                <div className="flex items-center justify-center gap-3 px-3 pb-3 sm:hidden">
                  <button onClick={previousTrack} className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] transition-all" aria-label="Précédent">
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => {
                      if (!currentTrack || isLive || String(currentTrack._id || '').startsWith('radio-')) return;
                      addToUpNext(currentTrack as any, 'end');
                    }}
                    disabled={!currentTrack || isLive}
                    className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-30"
                    aria-label="À suivre"
                  >
                    <ListPlus className="w-5 h-5" />
                  </button>

                  <button onClick={handleRepeat} className={`p-2.5 rounded-full transition-all ${audioState.repeat !== 'none' ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`} aria-label="Répéter">
                    <Repeat className="w-5 h-5" />
                  </button>

                  <button onClick={nextTrack} className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] transition-all" aria-label="Suivant">
                    <SkipForward className="w-5 h-5" />
                  </button>

                  <span className="text-[10px] font-mono text-white/30 tabular-nums ml-1">{toTime(currentTime || 0)} / {toTime(duration || 0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
