'use client';

import '@/components/v2/music-v2.css';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, EyeOff, Info, ListMusic, MessageSquare, Repeat2, Share2, SlidersHorizontal, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import { ListeningRoom, PlayerDock } from './player/ListeningPlayer';
import TrackCreateRemixActions from './TrackCreateRemixActions';
import { useTrackActions } from './actions/useTrackActions';
import QueueDialog from './QueueDialog';
import { recommendationReasonLabel } from '@/lib/recommendation/reasonLabels';
import { shouldRenderGlobalMiniPlayer } from '@/lib/routeChrome';

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

function TastePanel({
  explanation,
  canHideArtist,
  busy,
  feedback,
  onAction,
  onClose,
}: {
  explanation: string;
  canHideArtist: boolean;
  busy: 'more' | 'less' | 'hide_artist' | null;
  feedback: string;
  onAction: (action: 'more' | 'less' | 'hide_artist') => void;
  onClose: () => void;
}) {
  const actions = [
    { action: 'more' as const, label: 'Plus comme ça', icon: ThumbsUp, disabled: false },
    { action: 'less' as const, label: 'Moins comme ça', icon: ThumbsDown, disabled: false },
    { action: 'hide_artist' as const, label: 'Masquer cet artiste', icon: EyeOff, disabled: !canHideArtist },
  ];
  return (
    <div className="mx-auto mb-2 max-w-[980px] rounded-[1.25rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-3 text-[var(--syn-text-primary)] shadow-[0_22px_60px_var(--syn-shadow)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4A9EAA]">Affiner ton Flow</p>
          {explanation ? (
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[var(--syn-text-secondary)]">
              <Info className="h-4 w-4 shrink-0 text-[#4A9EAA]" />
              <span><strong className="text-[var(--syn-text-primary)]">Pourquoi ce morceau ?</strong> {explanation}</span>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--syn-soft)] text-[var(--syn-text-secondary)]" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {actions.map(({ action, label, icon: Icon, disabled }) => (
          <button
            key={action}
            type="button"
            disabled={disabled || Boolean(busy)}
            onClick={() => onAction(action)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--syn-border)] bg-[var(--syn-soft)] px-3 text-xs font-black transition hover:bg-[var(--syn-soft-strong)] disabled:opacity-40"
          >
            <Icon className="h-4 w-4" />
            {busy === action ? 'Enregistrement...' : label}
          </button>
        ))}
      </div>
      {feedback ? <p className="mt-2 text-xs font-bold text-[#4A9EAA]">{feedback}</p> : null}
    </div>
  );
}

export default function SynauraMiniPlayer({ forceVisible = false }: { forceVisible?: boolean }) {
  const pathname = usePathname();
  const {
    audioState,
    albumContext,
    playTrack,
    play,
    pause,
    nextTrack,
    previousTrack,
    seek,
    upNextTracks,
    removeFromUpNext,
    clearUpNext,
    moveUpNext,
    addToUpNext,
  } = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();

  const progressRef = useRef<HTMLDivElement>(null);
  const [showTikTok, setShowTikTok] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const trackActions = useTrackActions();
  const [showTaste, setShowTaste] = useState(false);
  const [tasteBusy, setTasteBusy] = useState<'more' | 'less' | 'hide_artist' | null>(null);
  const [tasteFeedback, setTasteFeedback] = useState('');
  const [relatedTracks, setRelatedTracks] = useState<any[]>([]);
  const [relatedLabel, setRelatedLabel] = useState('');

  const currentTrack = audioState.tracks[audioState.currentTrackIndex] || null;
  const currentTrackId = String(currentTrack?._id || (currentTrack as any)?.id || '');
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
  const artistId = String((currentTrack as any)?.artist?._id || '');
  const tasteExplanation = recommendationReasonLabel((currentTrack as any)?.recommendationReasons, relatedLabel);
  const nextQueueTracks = audioState.tracks.slice(Math.max(0, audioState.currentTrackIndex + 1), audioState.currentTrackIndex + 6);

  useEffect(() => {
    const id = currentTrackId;
    if (!forceVisible && !shouldRenderGlobalMiniPlayer(pathname)) return;
    if (!id || id.startsWith('radio-') || id.startsWith('ai-') || id.startsWith('gen-')) {
      setRelatedTracks([]);
      setRelatedLabel('');
      return;
    }
    const controller = new AbortController();
    fetch(`/api/tracks/similar?trackId=${encodeURIComponent(id)}&limit=10`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!payload) return;
        setRelatedTracks((Array.isArray(payload.tracks) ? payload.tracks : []).filter((item: any) => String(item?._id || item?.id || '') !== id));
        setRelatedLabel(typeof payload.contextLabel === 'string' ? payload.contextLabel : '');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setRelatedTracks([]);
        setRelatedLabel('');
      });
    return () => controller.abort();
  }, [currentTrackId, forceVisible, pathname]);

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

  const onProgressKeyDown = (event: React.KeyboardEvent) => {
    if (!duration) return;
    let next: number | null = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, currentTime - 5);
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(duration, currentTime + 5);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = duration;
    if (next === null) return;
    event.preventDefault();
    seek(next);
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

  const applyTaste = async (action: 'more' | 'less' | 'hide_artist') => {
    if (!currentTrackId || tasteBusy) return;
    setTasteBusy(action);
    setTasteFeedback('');
    try {
      const response = await fetch('/api/recommendations/taste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, trackId: currentTrackId, artistId: artistId || undefined, source: 'web-global-player' }),
      });
      if (!response.ok) throw new Error();
      setTasteFeedback(action === 'more'
        ? 'Compris, Synaura cherchera davantage cette aura.'
        : action === 'less'
          ? 'Compris, ce type de son sera moins présent.'
          : 'Cet artiste ne sera plus proposé dans ton Flow.');
      if (action !== 'more') {
        setShowTaste(false);
        nextTrack();
      }
    } catch {
      setTasteFeedback('Connecte-toi pour personnaliser durablement ton Flow.');
    } finally {
      setTasteBusy(null);
    }
  };

  useEffect(() => {
    setTasteFeedback('');
    setTasteBusy(null);
  }, [currentTrackId]);

  useEffect(() => {
    if (showTikTok || (!forceVisible && !shouldRenderGlobalMiniPlayer(pathname))) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement;
      if (target && (target.isContentEditable || target.closest('input, textarea, select, button, a, summary, [role="button"], [role="slider"], [role="tab"], [role="textbox"], [role="combobox"]'))) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void togglePlay();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showTikTok, audioState.isPlaying, forceVisible, pathname]);

  const openPlayer = useCallback(() => {
    // The Studio owns its song details. Do not replace its private selection
    // with the expanded player's public recommendation queue.
    if (pathname === '/studio' || pathname === '/ai-generator' || pathname === '/dev/studio') {
      const request = new CustomEvent('synaura:open-studio-track', {
        detail: { trackId: currentTrackId }, cancelable: true,
      });
      if (!window.dispatchEvent(request)) return;
    }
    setShowTikTok(true);
  }, [pathname, currentTrackId]);

  useEffect(() => {
    if (!forceVisible && !shouldRenderGlobalMiniPlayer(pathname)) return;
    window.addEventListener('synaura:open-full-player', openPlayer);
    return () => window.removeEventListener('synaura:open-full-player', openPlayer);
  }, [openPlayer, forceVisible, pathname]);

  if (!currentTrack || !audioState.showPlayer || (!forceVisible && !shouldRenderGlobalMiniPlayer(pathname))) return null;

  return <>
    <ListeningRoom open={showTikTok} onClose={() => setShowTikTok(false)} onQueue={() => setShowQueue(true)} />
    <QueueDialog isOpen={showQueue} onClose={() => setShowQueue(false)} />
    {showTaste && <div className="lp-taste-overlay"><TastePanel explanation={tasteExplanation} canHideArtist={Boolean(artistId)} busy={tasteBusy} feedback={tasteFeedback} onAction={action => void applyTaste(action)} onClose={() => setShowTaste(false)} /></div>}
    {!showTikTok && <PlayerDock onOpen={openPlayer} onQueue={() => setShowQueue(true)} extraActions={<>
      <button onClick={() => { if (albumContext || isLive) void handleShare(); else void trackActions.share(currentTrack); }}><Share2 size={17} />Partager</button>
      <button onClick={() => trackActions.open(currentTrack, 'lyrics')}><MessageSquare size={17} />Paroles</button>
      <button onClick={openPlayer}><ListMusic size={17} />Ouvrir le lecteur</button>
      <button onClick={() => addToUpNext(currentTrack as any, 'end')}><ListMusic size={17} />Ajouter à la file</button>
      <button onClick={() => { setShowTaste(true); setShowQueue(false); }}><SlidersHorizontal size={17} />Affiner mon Flow</button>
      {artistUsername && <Link href={`/profile/${encodeURIComponent(artistUsername)}`}><ArrowUpRight size={17} />Voir le profil</Link>}
      <Link href={`/community/forum/new?category=feedback&trackId=${encodeURIComponent(currentTrack._id)}&source=player`}><MessageSquare size={17} />Demander un avis</Link>
      <Link href={`/community/forum/new?category=remix&trackId=${encodeURIComponent(currentTrack._id)}&source=player`}><Repeat2 size={17} />Lancer un défi</Link>
      <TrackCreateRemixActions track={currentTrack as any} compact className="lp-remix-actions" />
    </>} />}
  </>;
}
