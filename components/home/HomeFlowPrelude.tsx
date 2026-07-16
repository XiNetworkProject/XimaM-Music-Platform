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
  const [greeting, setGreeting] = useState('Bonjour');
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const firstTrack = tracks[0] || null;
  const resumeTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const displayTracks = useMemo(() => tracks.filter((track) => track.audioUrl).slice(0, 5), [tracks]);
  const displayPosts = useMemo(() => posts.filter((post) => post.content || post.track || post.image_url).slice(0, 2), [posts]);
  const firstName = String(userName || '').trim().split(/\s+/)[0] || '';

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    if (open) {
      leavingRef.current = false;
      wheelDeltaRef.current = 0;
      setLeaving(false);
    }
    return () => {
      if (leaveTimerRef.current != null) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    };
  }, [open]);

  const enterFlow = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onEnterFlow();
      return;
    }
    setLeaving(true);
    leaveTimerRef.current = window.setTimeout(onEnterFlow, 320);
  }, [onEnterFlow]);

  useEffect(() => {
    if (!open) return;
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      let node = event.target instanceof HTMLElement ? event.target : null;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const zIndex = Number.parseInt(style.zIndex || '0', 10);
        if (style.position === 'fixed' && zIndex > 120 && !node.classList.contains('synaura-home-prelude')) return;
        node = node.parentElement;
      }
      wheelDeltaRef.current += event.deltaY;
      if (wheelDeltaRef.current >= 24) enterFlow();
    };
    window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [enterFlow, open]);

  if (!open) return null;

  const quickActions = [
    { label: 'Découvrir', icon: Compass, action: onDiscover, tone: '#A995E8' },
    { label: 'Radar', icon: Radio, action: onRadar, tone: '#74C7CF' },
    { label: 'Studio', icon: Sparkles, action: onStudio, tone: '#F09A91' },
    { label: 'Events', icon: CalendarDays, action: onEvents, tone: '#F7F6F3' },
  ];

  return (
    <div
      className={`synaura-home-prelude fixed inset-0 z-[120] overflow-hidden bg-[#090909] text-[#F7F6F3] transition-[transform,opacity] duration-300 ease-out ${leaving ? '-translate-y-full opacity-60' : 'translate-y-0 opacity-100'}`}
      onWheel={(event) => {
        if (event.deltaY > 18 && Math.abs(event.deltaY) > Math.abs(event.deltaX)) enterFlow();
      }}
      onTouchStart={(event) => {
        touchStartYRef.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartYRef.current;
        const end = event.changedTouches[0]?.clientY;
        touchStartYRef.current = null;
        if (start != null && end != null && start - end > 34) enterFlow();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') enterFlow();
      }}
      tabIndex={-1}
    >
      <style>{`
        @media (max-height: 860px) {
          .synaura-home-posts { display: none !important; }
          .synaura-home-top { padding-top: max(env(safe-area-inset-top), .65rem) !important; }
        }
        @media (max-height: 740px) {
          .synaura-home-track-rail { display: none !important; }
          .synaura-home-heading { font-size: 1.55rem !important; }
          .synaura-home-copy { display: none !important; }
        }
        @media (max-height: 620px) {
          .synaura-home-resume { display: none !important; }
          .synaura-home-greeting { margin-top: .45rem !important; }
          .synaura-home-quick { margin-top: .55rem !important; }
        }
        @media (max-width: 639px) {
          .synaura-home-stage-copy { padding-bottom: max(env(safe-area-inset-bottom), 1rem) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .synaura-home-prelude, .synaura-home-prelude * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="relative flex h-[100svh] min-h-[460px] flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(115,87,198,0.18),transparent_34%),linear-gradient(28deg,rgba(74,158,170,0.12),transparent_42%),linear-gradient(180deg,#111111,#090909)]" />

        <div className="synaura-home-top relative z-20 mx-auto w-full max-w-6xl shrink-0 px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)] sm:px-7">
          <header className="flex h-11 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-[#F7F6F3] text-[#111111] shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
                <Radio className="h-5 w-5" />
              </span>
              <div>
                <strong className="block text-sm font-black">Synaura</strong>
                <span className="block text-[10px] font-bold text-white/46">Ton monde musical</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onSearch} aria-label="Rechercher" className="grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.07] text-[#F7F6F3] transition hover:bg-white/[0.13]">
                <Search className="h-4 w-4" />
              </button>
              <button type="button" onClick={onNotifications} aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.07] text-[#F7F6F3] transition hover:bg-white/[0.13]">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="synaura-home-greeting mt-4">
            <p className="text-[10px] font-black uppercase text-[#A995E8]">Pour toi, maintenant</p>
            <h1 className="synaura-home-heading mt-1.5 text-3xl font-black leading-none">{greeting}{firstName ? ` ${firstName}` : ''}.</h1>
            <p className="synaura-home-copy mt-2 text-sm font-semibold text-white/52">Tes raccourcis, tes sons, puis ton Flow.</p>
          </div>

          <div className="synaura-home-quick mt-4 grid grid-cols-4 gap-2">
            {quickActions.map(({ label, icon: Icon, action, tone }) => (
              <button key={label} type="button" onClick={action} className="flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.06] px-1 text-[9px] font-black transition hover:bg-white/[0.12] sm:text-[11px]">
                <Icon className="h-4 w-4 shrink-0" style={{ color: tone }} />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
            {resumeTrack ? (
              <div className="synaura-home-resume flex min-w-0 items-center gap-3 rounded-lg border border-white/[0.1] bg-white/[0.07] p-2.5">
                <button type="button" onClick={() => onOpenTrack(resumeTrack)} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
                  {resumeTrack.coverUrl ? <img src={resumeTrack.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
                </button>
                <button type="button" onClick={() => onOpenTrack(resumeTrack)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[9px] font-black uppercase text-[#74C7CF]">{currentTrack?.audioUrl ? "Reprendre l'écoute" : 'À découvrir maintenant'}</span>
                  <strong className="mt-1 block truncate text-sm">{resumeTrack.title}</strong>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-white/46">{artistName(resumeTrack)}</span>
                </button>
                <button type="button" onClick={() => onPlayTrack(resumeTrack)} aria-label={currentPlaying ? 'Pause' : 'Lecture'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F7F6F3] text-[#111111]">
                  {currentPlaying && currentTrack?._id === resumeTrack._id ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                </button>
              </div>
            ) : null}

            {displayTracks.length ? (
              <section className="synaura-home-track-rail min-w-0 rounded-lg border border-white/[0.08] bg-black/15 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-black">À écouter maintenant</h2>
                  <span className="text-[9px] font-bold text-white/38">Du moment</span>
                </div>
                <div className="grid grid-cols-5 gap-2 overflow-hidden">
                  {displayTracks.map((track) => (
                    <button key={track._id} type="button" onClick={() => onOpenTrack(track)} className="group min-w-0 text-left">
                      <span className="relative block aspect-square overflow-hidden rounded-lg bg-white/[0.06]">
                        {track.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : null}
                        <span className="absolute inset-0 bg-gradient-to-t from-black/48 to-transparent" />
                        <Play className="absolute bottom-1.5 right-1.5 h-3 w-3 fill-white text-white" />
                      </span>
                      <span className="mt-1 block truncate text-[9px] font-black">{track.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {displayPosts.length ? (
            <section className="synaura-home-posts mt-3 grid grid-cols-2 gap-2">
              {displayPosts.map((post) => (
                <button key={post.id} type="button" onClick={() => onOpenPost(post)} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 text-left">
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#7357C6] text-[10px] font-black text-white">
                    {post.creator.avatar ? <img src={post.creator.avatar} alt="" className="h-full w-full object-cover" /> : (post.creator.name || post.creator.username || 'S').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[10px]">{post.creator.name || post.creator.username}</strong>
                    <span className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-white/48">{post.content || (post.track ? `À propos de ${post.track.title}` : 'Publication Synaura')}</span>
                  </span>
                  {post.track?.cover_url ? <img src={post.track.cover_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : null}
                </button>
              ))}
            </section>
          ) : null}
        </div>

        <section className="relative z-10 min-h-[180px] flex-1 overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(135deg,rgba(115,87,198,0.24),transparent_42%),linear-gradient(32deg,rgba(217,109,99,0.16),transparent_46%),linear-gradient(180deg,#151515,#090909)]">
          {firstTrack?.coverUrl ? (
            <img src={firstTrack.coverUrl} alt="" className="absolute inset-[-6%] h-[112%] w-[112%] scale-105 object-cover opacity-60 blur-xl saturate-125" />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#090909_0%,rgba(9,9,9,0.58)_18%,rgba(9,9,9,0.08)_52%,rgba(9,9,9,0.78)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,9,0.58),transparent_58%,rgba(9,9,9,0.22))]" />

          <div className="synaura-home-stage-copy absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-4 pb-[max(env(safe-area-inset-bottom),1.4rem)] sm:px-7">
            <button type="button" onClick={() => firstTrack && onOpenTrack(firstTrack)} className="flex min-w-0 items-center gap-3 text-left">
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/16 bg-white/[0.07] shadow-[0_16px_44px_rgba(0,0,0,0.35)] sm:h-20 sm:w-20">
                {firstTrack?.coverUrl ? <img src={firstTrack.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0">
                <span className="inline-flex rounded-md bg-[#7357C6] px-2 py-1 text-[8px] font-black uppercase">Ton Flow</span>
                <strong className="mt-2 block max-w-xl truncate text-xl font-black sm:text-2xl">{firstTrack?.title || 'Le Flow arrive'}</strong>
                <span className="mt-1 block truncate text-xs font-bold text-white/58">{firstTrack ? artistName(firstTrack) : 'Synaura prépare ta sélection'}</span>
              </span>
            </button>
            <button type="button" onClick={enterFlow} aria-label="Entrer dans le Flow" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/18 bg-[#F7F6F3] text-[#111111] shadow-[0_14px_36px_rgba(0,0,0,0.35)] transition hover:scale-105">
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
