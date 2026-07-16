'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Bell, CalendarDays, Compass, Pause, Play, Radio, Search, Sparkles } from 'lucide-react';
import { type ScrollPost, type ScrollTrack } from '@/lib/scrollFeed';

type Props = {
  open: boolean;
  tracks: ScrollTrack[];
  posts: ScrollPost[];
  currentTrack?: ScrollTrack | null;
  currentPlaying?: boolean;
  userName?: string | null;
  onEnterFlow: () => void;
  onPlayTrack: (track: ScrollTrack) => void;
  onOpenTrack: (track: ScrollTrack) => void;
  onOpenPost: (post: ScrollPost) => void;
  onSearch: () => void;
  onNotifications: () => void;
  onDiscover: () => void;
  onRadar: () => void;
  onStudio: () => void;
  onEvents: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;

function greetingForHour(hour: number) {
  if (hour < 6) return 'Bonsoir';
  if (hour < 18) return 'Bonjour';
  return 'Bonsoir';
}

function artistName(track: ScrollTrack) {
  return track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

export default function HomeFlowPrelude(props: Props) {
  const {
    open,
    tracks,
    posts,
    currentTrack,
    currentPlaying,
    userName,
    onEnterFlow,
    onPlayTrack,
    onOpenTrack,
    onOpenPost,
    onSearch,
    onNotifications,
    onDiscover,
    onRadar,
    onStudio,
    onEvents,
  } = props;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const homeRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLButtonElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const [greeting, setGreeting] = useState('Bonjour');
  const firstTrack = tracks[0] || null;
  const resumeTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const displayTracks = useMemo(() => tracks.filter((track) => track.audioUrl).slice(0, 5), [tracks]);
  const displayPosts = useMemo(() => posts.filter((post) => post.content || post.track || post.image_url).slice(0, 2), [posts]);
  const firstName = String(userName || '').trim().split(/\s+/)[0] || '';

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  const applyProgress = useCallback((rawProgress: number) => {
    const progress = clamp(rawProgress, 0, 1);
    const scroller = scrollerRef.current;
    const home = homeRef.current;
    const preview = previewRef.current;
    const hint = hintRef.current;
    if (!scroller || !home || !preview) return;
    const height = scroller.clientHeight;
    const startTop = Math.min(height - 145, Math.max(330, height * (height >= 720 ? 0.68 : 0.64)));
    const startSide = Math.min(22, Math.max(12, scroller.clientWidth * 0.04));
    const startBottom = Math.min(82, Math.max(56, height * 0.08));
    const eased = 1 - Math.pow(1 - progress, 3);
    const homeFade = clamp(1 - progress * 1.5, 0, 1);
    home.style.opacity = String(homeFade);
    home.style.transform = `translate3d(0, ${-36 * progress}px, 0) scale(${1 - progress * 0.025})`;
    home.style.filter = `blur(${progress * 2.5}px)`;
    preview.style.clipPath = `inset(${lerp(startTop, 0, eased)}px ${lerp(startSide, 0, eased)}px ${lerp(startBottom, 0, eased)}px ${lerp(startSide, 0, eased)}px round ${lerp(24, 0, eased)}px)`;
    preview.style.setProperty('--preview-copy-opacity', String(clamp(1 - progress * 1.8, 0, 1)));
    if (hint) hint.style.opacity = String(clamp(1 - progress * 2.8, 0, 1));

    if (progress >= 0.995 && finishTimerRef.current == null) {
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onEnterFlow();
      }, 70);
    } else if (progress < 0.96 && finishTimerRef.current != null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, [onEnterFlow]);

  useEffect(() => {
    if (!open) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = 0;
    applyProgress(0);
    return () => {
      if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
      if (finishTimerRef.current != null) window.clearTimeout(finishTimerRef.current);
      frameRef.current = null;
      finishTimerRef.current = null;
    };
  }, [applyProgress, open]);

  const onScroll = () => {
    if (frameRef.current != null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const distance = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      applyProgress(scroller.scrollTop / distance);
    });
  };

  const scrollIntoFlow = () => {
    const scroller = scrollerRef.current;
    if (!scroller || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onEnterFlow();
      return;
    }
    scroller.scrollTo({ top: scroller.scrollHeight - scroller.clientHeight, behavior: 'smooth' });
  };

  if (!open) return null;

  const quickActions = [
    { label: 'Découvrir', icon: Compass, action: onDiscover, tone: '#7357C6' },
    { label: 'Radar', icon: Radio, action: onRadar, tone: '#4A9EAA' },
    { label: 'Studio', icon: Sparkles, action: onStudio, tone: '#D96D63' },
    { label: 'Events', icon: CalendarDays, action: onEvents, tone: '#111111' },
  ];

  return (
    <div ref={scrollerRef} onScroll={onScroll} className="synaura-home-prelude fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[#F7F6F3] text-[#111111] [scrollbar-width:none]">
      <style>{`
        .synaura-home-prelude::-webkit-scrollbar { display: none; }
        .synaura-home-preview-copy { opacity: var(--preview-copy-opacity, 1); }
        @media (max-height: 720px) {
          .synaura-home-optional { display: none !important; }
          .synaura-home-heading { font-size: 1.6rem !important; line-height: 1.05 !important; }
          .synaura-home-content { padding-top: max(env(safe-area-inset-top), .7rem) !important; }
        }
        @media (max-width: 639px) {
          .synaura-home-hint {
            left: auto !important;
            right: 8% !important;
            transform: none !important;
          }
          .synaura-home-hint-label { display: none !important; }
          .synaura-home-hint svg {
            box-sizing: content-box;
            height: 1rem;
            width: 1rem;
            padding: .45rem;
            border: 1px solid rgba(255,255,255,.28);
            border-radius: 999px;
            background: rgba(17,17,17,.32);
            backdrop-filter: blur(8px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .synaura-home-prelude * { animation: none !important; transition: none !important; }
        }
      `}</style>
      <div className="relative h-[156svh] min-h-[720px]">
        <div className="sticky top-0 h-[100svh] min-h-[460px] overflow-hidden bg-[#F7F6F3]">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(217,109,99,0.15),transparent_38%),linear-gradient(28deg,rgba(74,158,170,0.12),transparent_42%),linear-gradient(180deg,#FBFAF7,#F0ECE6)]" />

          <div ref={homeRef} className="synaura-home-content relative z-10 mx-auto h-full w-full max-w-5xl px-4 pb-[38svh] pt-[max(env(safe-area-inset-top),1rem)] sm:px-7">
            <header className="flex h-12 items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#111111] text-[#F7F6F3] shadow-lg">
                  <Radio className="h-5 w-5" />
                </span>
                <div>
                  <strong className="block text-sm font-black">Synaura</strong>
                  <span className="block text-[10px] font-bold text-black/42">Ton monde musical</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onSearch} aria-label="Rechercher" className="grid h-10 w-10 place-items-center rounded-lg border border-black/[0.07] bg-white/70 text-[#111111]">
                  <Search className="h-4 w-4" />
                </button>
                <button type="button" onClick={onNotifications} aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-lg border border-black/[0.07] bg-white/70 text-[#111111]">
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="mt-4">
              <p className="text-[10px] font-black uppercase text-[#7357C6]">Pour toi, maintenant</p>
              <h1 className="synaura-home-heading mt-2 text-3xl font-black leading-none">{greeting}{firstName ? ` ${firstName}` : ''}.</h1>
              <p className="mt-2 text-sm font-semibold text-black/48">Retrouve l’essentiel, puis glisse dans ton Flow.</p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {quickActions.map(({ label, icon: Icon, action, tone }) => (
                <button key={label} type="button" onClick={action} className="flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-black/[0.06] bg-white/[0.68] px-1 text-[10px] font-black shadow-[0_8px_24px_rgba(17,17,17,0.05)] sm:h-11 sm:flex-row sm:gap-2 sm:px-2 sm:text-[11px]">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: tone }} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {resumeTrack ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-black/[0.07] bg-white/[0.76] p-2.5 shadow-[0_12px_34px_rgba(17,17,17,0.07)]">
                <button type="button" onClick={() => onOpenTrack(resumeTrack)} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/[0.06]">
                  {resumeTrack.coverUrl ? <img src={resumeTrack.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
                </button>
                <button type="button" onClick={() => onOpenTrack(resumeTrack)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[9px] font-black uppercase text-[#4A9EAA]">{currentTrack?.audioUrl ? "Reprendre l'écoute" : 'À découvrir maintenant'}</span>
                  <strong className="mt-1 block truncate text-sm">{resumeTrack.title}</strong>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-black/42">{artistName(resumeTrack)}</span>
                </button>
                <button type="button" onClick={() => onPlayTrack(resumeTrack)} aria-label={currentPlaying ? 'Pause' : 'Lecture'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#111111] text-[#F7F6F3]">
                  {currentPlaying && currentTrack?._id === resumeTrack._id ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                </button>
              </div>
            ) : null}

            {displayTracks.length ? (
              <section className="synaura-home-optional mt-4">
                <div className="max-w-xl">
                  <div className="mb-2 flex items-end justify-between">
                    <h2 className="text-sm font-black">À écouter maintenant</h2>
                    <span className="text-[10px] font-bold text-black/36">Du moment</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 overflow-hidden">
                    {displayTracks.map((track) => (
                      <button key={track._id} type="button" onClick={() => onOpenTrack(track)} className="group min-w-0 text-left">
                        <span className="relative block aspect-square overflow-hidden rounded-lg bg-black/[0.06]">
                          {track.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : null}
                          <span className="absolute inset-0 bg-gradient-to-t from-black/42 to-transparent" />
                          <Play className="absolute bottom-2 right-2 h-3.5 w-3.5 fill-white text-white" />
                        </span>
                        <span className="mt-1 block truncate text-[10px] font-black">{track.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {displayPosts.length ? (
              <section className="synaura-home-optional mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-black">Dans la communauté</h2>
                  <span className="text-[10px] font-bold text-black/36">Autour des sons</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {displayPosts.map((post) => (
                    <button key={post.id} type="button" onClick={() => onOpenPost(post)} className="flex min-w-0 items-center gap-2 rounded-lg border border-black/[0.06] bg-white/[0.64] p-2 text-left">
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#111111] text-[10px] font-black text-white">
                        {post.creator.avatar ? <img src={post.creator.avatar} alt="" className="h-full w-full object-cover" /> : (post.creator.name || post.creator.username || 'S').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[10px]">{post.creator.name || post.creator.username}</strong>
                        <span className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-black/48">{post.content || (post.track ? `À propos de ${post.track.title}` : 'Publication Synaura')}</span>
                      </span>
                      {post.track?.cover_url ? <img src={post.track.cover_url} alt="" className="ml-auto h-9 w-9 shrink-0 rounded-lg object-cover" /> : null}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div ref={previewRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden bg-[#171313] text-white [clip-path:inset(64%_4%_8%_4%_round_24px)] will-change-[clip-path]">
            {firstTrack?.coverUrl ? <img src={firstTrack.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-b from-black/8 via-black/10 to-black/90" />
            <div className="synaura-home-preview-copy absolute bottom-[11%] left-[7%] right-[18%] transition-opacity">
              <span className="inline-flex rounded-full bg-[#7357C6] px-2 py-1 text-[8px] font-black uppercase">Ton Flow est prêt</span>
              <h2 className="mt-2 truncate text-2xl font-black">{firstTrack?.title || 'Le Flow arrive'}</h2>
              <p className="mt-1 truncate text-xs font-bold text-white/62">{firstTrack ? artistName(firstTrack) : 'Synaura prépare ta sélection'}</p>
            </div>
          </div>

          <button ref={hintRef} type="button" onClick={scrollIntoFlow} className="synaura-home-hint absolute bottom-[max(env(safe-area-inset-bottom),4rem)] left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1 text-[9px] font-black uppercase text-white drop-shadow-lg">
            <span className="synaura-home-hint-label">Glisse vers le Flow</span>
            <ArrowUp className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </div>
    </div>
  );
}
