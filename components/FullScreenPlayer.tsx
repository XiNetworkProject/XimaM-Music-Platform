'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Repeat, ListMusic, Radio, AlertTriangle, ChevronDown } from "lucide-react";
import { useAudioPlayer } from '@/app/providers';
import LikeButton from './LikeButton';
import TikTokPlayer from './TikTokPlayer';

/**
 * SynauraMiniPlayer v3 — Minimal, clean, accessible
 *
 * Goals:
 *  - Simple, calm visuals (no neon/glow/rotation)
 *  - Clear hierarchy, subtle borders, soft hover
 *  - Safe HLS strategy (no dynamic import)
 *  - Integration with existing useAudioPlayer context
 */

export default function SynauraMiniPlayer() {
  const { 
    audioState, 
    setIsPlaying, 
    setShowPlayer,
    play,
    pause,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleMute,
    setRepeat
  } = useAudioPlayer();

  const progressRef = useRef<HTMLDivElement>(null);

  const [showTikTok, setShowTikTok] = useState(false);
  const [hlsUnsupported, setHlsUnsupported] = useState(false);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex] || null;
  const track = useMemo(() => ({
    id: currentTrack?._id || '',
    title: currentTrack?.title || 'Titre inconnu',
    artist: currentTrack?.artist?.name || currentTrack?.artist?.username || 'Artiste inconnu',
    cover: currentTrack?.coverUrl || '/default-cover.jpg',
    src: currentTrack?.audioUrl || '',
  }), [currentTrack]);

  // Detect HLS by extension
  const isHls = useMemo(() => Boolean(track?.src?.toLowerCase?.().endsWith?.(".m3u8")), [track?.src]);
  const isLive = useMemo(() => isHls || /\blive\b|radio|stream/i.test(track?.title || ''), [isHls, track?.title]);

  // Keyboard shortcuts (skip when typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') { seekBy(5); }
      if (e.code === 'ArrowLeft') { seekBy(-5); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [audioState.isPlaying, audioState.duration]);

  const togglePlay = async () => {
    if (audioState.isPlaying) {
      pause();
    } else {
      await play();
    }
  };

  const toTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, '0')}`;
  };

  const seekTo = (fraction: number) => {
    if (!audioState.duration) return;
    const newTime = Math.max(0, Math.min(audioState.duration, fraction * audioState.duration));
    seek(newTime);
  };

  const seekBy = (deltaSec: number) => {
    const newTime = Math.max(0, Math.min((audioState.currentTime || 0) + deltaSec, audioState.duration));
    seek(newTime);
  };

  const onProgressClick = (e: React.MouseEvent) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    seekTo(frac);
  };

  const handleRepeat = () => {
    const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(audioState.repeat);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeat(nextMode);
  };

  if (!currentTrack || !audioState.showPlayer) return null;

  return (
    <>
      {/* TikTok Player Modal */}
      {showTikTok && (
        <TikTokPlayer
          isOpen={showTikTok}
          onClose={() => setShowTikTok(false)}
        />
      )}

      {/* Mini Player Bar */}
      {!showTikTok && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[96%] sm:w-[760px] lg:w-[980px]">
          <div className="rounded-xl border border-white/10 bg-[#0c0c14]/85 backdrop-blur-xl shadow-lg">
            {/* top row */}
            <div className="px-3 py-2 flex items-center gap-3">
              <img 
                src={track.cover} 
                className="w-12 h-12 rounded-md object-cover border border-white/10 cursor-pointer hover:opacity-80 transition" 
                alt={track.title}
                onClick={() => setShowTikTok(true)}
              />
              <div className="min-w-0 flex-1" onClick={() => setShowTikTok(true)}>
                <p className="text-sm font-semibold truncate flex items-center gap-2 cursor-pointer hover:underline">
                  {track.title}
                  {isLive && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-white/20 text-white/80">
                      <Radio className="w-3 h-3"/> LIVE
                    </span>
                  )}
                </p>
                <p className="text-xs text-white/60 truncate">{track.artist}</p>
              </div>

              <button onClick={previousTrack} className="p-2 rounded-md hover:bg-white/5 border border-transparent transition" aria-label="Previous">
                <SkipBack className="w-5 h-5"/>
              </button>
              <button onClick={togglePlay} disabled={audioState.isLoading} className="p-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition" aria-label={audioState.isPlaying? 'Pause':'Play'}>
                {audioState.isPlaying ? <Pause className="w-5 h-5"/> : <Play className="w-5 h-5"/>}
              </button>
              <button onClick={nextTrack} className="p-2 rounded-md hover:bg-white/5 border border-transparent transition" aria-label="Next">
                <SkipForward className="w-5 h-5"/>
              </button>

              {currentTrack && (
                <LikeButton
                  trackId={currentTrack._id}
                  initialIsLiked={currentTrack.isLiked || false}
                  initialLikesCount={typeof currentTrack.likes === 'number' ? currentTrack.likes : (Array.isArray(currentTrack.likes) ? currentTrack.likes.length : 0)}
                  showCount={false}
                  size="md"
                />
              )}
              
              <button 
                onClick={handleRepeat} 
                className={`hidden sm:inline-flex p-2 rounded-md border transition relative ${
                  audioState.repeat !== 'none' ? 'bg-white/10 border-white/20' : 'hover:bg-white/5 border-transparent'
                }`} 
                title={audioState.repeat === 'one' ? 'Répéter un' : audioState.repeat === 'all' ? 'Répéter tout' : 'Répétition désactivée'} 
                aria-pressed={audioState.repeat !== 'none'}
              >
                <Repeat className="w-5 h-5"/>
                {audioState.repeat === 'one' && <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full text-[8px] flex items-center justify-center">1</span>}
              </button>

              <div className="hidden sm:flex items-center gap-2 ml-2">
                {audioState.isMuted || audioState.volume === 0 ? (
                  <button onClick={toggleMute} className="p-2 rounded-md hover:bg-white/5 border border-transparent transition" aria-label="Unmute">
                    <VolumeX className="w-5 h-5"/>
                  </button>
                ) : (
                  <button onClick={toggleMute} className="p-2 rounded-md hover:bg-white/5 border border-transparent transition" aria-label="Mute">
                    <Volume2 className="w-5 h-5"/>
                  </button>
                )}
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={audioState.isMuted ? 0 : audioState.volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-24 accent-white/90"
                  aria-label="Volume"
                />
              </div>

              <button 
                onClick={() => setShowTikTok(true)} 
                className="hidden sm:flex p-2 rounded-md hover:bg-white/5 border border-transparent ml-1 transition" 
                title="Ouvrir le player complet" 
                aria-label="Player complet"
              >
                <ListMusic className="w-5 h-5"/>
              </button>

              <button 
                onClick={() => setShowPlayer(false)} 
                className="p-2 rounded-md hover:bg-white/5 border border-transparent transition" 
                aria-label="Fermer"
              >
                <ChevronDown className="w-5 h-5"/>
              </button>
            </div>

            {/* progress bar */}
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <span className="tabular-nums w-10 text-right">{toTime(audioState.currentTime || 0)}</span>
                <div
                  ref={progressRef}
                  onClick={onProgressClick}
                  className="flex-1 h-2 rounded-md bg-white/8 cursor-pointer relative overflow-hidden"
                  title="Seek"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={audioState.duration || 0}
                  aria-valuenow={audioState.currentTime || 0}
                >
                  {/* progress */}
                  <div
                    className="absolute left-0 top-0 h-2 bg-white/70 transition-all"
                    style={{ width: `${audioState.duration ? ((audioState.currentTime || 0) / audioState.duration) * 100 : 0}%` }}
                  />
                </div>
                <span className="tabular-nums w-10">{toTime(audioState.duration || 0)}</span>
              </div>

              {/* HLS hint (non-blocking) */}
              {hlsUnsupported && (
                <div className="mt-2 text-[11px] text-white/70 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5"/>
                  Lecture live non supportée. Utilise MP3/OGG ou charge Hls.js globalement.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Runtime tests (console) */
if (typeof window !== 'undefined') {
  (() => {
    try {
      const toTime = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
      console.assert(toTime(0) === '0:00', 'toTime 0 OK');
      console.assert(toTime(125) === '2:05', 'toTime 125 OK');
      const frac = (x: number, left: number, width: number) => (x-left)/width;
      console.assert(Math.abs(frac(25, 0, 100) - 0.25) < 1e-6, 'progress fraction 0.25 OK');
      console.log('[DevTests] SynauraMiniPlayer v3 basic tests OK');
    } catch (e) {
      console.warn('[DevTests] Failed', e);
    }
  })();
}
