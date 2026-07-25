'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronUp,
  Compass,
  Heart,
  MessageCircle,
  Play,
  Radar,
  Radio,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import MessageInboxButton from '@/components/messaging/MessageInboxButton';
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

function artistName(track: ScrollTrack) {
  return track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function countOf(value: number | string[]) {
  return Array.isArray(value) ? value.length : Number(value || 0);
}

function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return String(value);
}

function postPreview(post: ScrollPost) {
  if (post.content?.trim()) return post.content.trim();
  if (post.track?.title) return `partage « ${post.track.title} »`;
  if (post.image_url) return 'a partagé une nouvelle image';
  return 'vient de publier sur Synaura';
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

  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);

  const playableTracks = useMemo(() => tracks.filter((track) => Boolean(track.audioUrl)), [tracks]);
  const firstTrack = playableTracks[0] || null;
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const nextTrack = playableTracks.find((track) => track._id !== featuredTrack?._id) || null;
  const latestPost = posts[0] || null;
  const greetingName = userName?.trim().split(/\s+/)[0] || null;
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isPlayingFeatured = Boolean(isCurrentTrack && currentPlaying);

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
      if (wheelDeltaRef.current >= 70) enterFlow();
    };
    window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [enterFlow, open]);

  if (!open) return null;

  const shortcuts = [
    { label: 'Découvrir', sub: 'Trouve ton son', icon: Compass, accent: '#F4A261', onClick: onDiscover },
    { label: 'Radar', sub: 'Ce qui monte', icon: Radar, accent: '#4A9EAA', onClick: onRadar },
    { label: 'Studio IA', sub: 'Crée maintenant', icon: Sparkles, accent: '#D96D63', onClick: onStudio },
    { label: 'Événements', sub: 'La scène Synaura', icon: CalendarDays, accent: '#9B7AE5', onClick: onEvents },
  ];

  return (
    <div
      className={`synaura-home-prelude fixed inset-x-0 bottom-[var(--synaura-primary-dock-space)] top-0 z-[120] overflow-hidden bg-[#09090B] text-[#F7F6F3] transition-[transform,opacity] duration-300 ease-out lg:bottom-0 ${
        leaving ? 'is-leaving -translate-y-full opacity-70' : 'translate-y-0 opacity-100'
      }`}
      onTouchStart={(event) => {
        touchStartYRef.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartYRef.current;
        const end = event.changedTouches[0]?.clientY;
        touchStartYRef.current = null;
        if (start != null && end != null && start - end > 48) enterFlow();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') enterFlow();
      }}
      tabIndex={-1}
    >
      <style>{`
        @keyframes synaura-aurora-one {
          0%, 100% { transform: translate3d(-8%, -4%, 0) scale(1); opacity: .52; }
          50% { transform: translate3d(13%, 7%, 0) scale(1.2); opacity: .88; }
        }
        @keyframes synaura-aurora-two {
          0%, 100% { transform: translate3d(8%, 6%, 0) scale(1.08); opacity: .46; }
          50% { transform: translate3d(-12%, -8%, 0) scale(.94); opacity: .8; }
        }
        @keyframes synaura-card-float {
          0%, 100% { transform: translateY(0) rotate(-.6deg); }
          50% { transform: translateY(-5px) rotate(.6deg); }
        }
        @keyframes synaura-swipe-finger {
          0% { transform: translateY(32px) scale(.92); opacity: 0; }
          16% { opacity: 1; }
          72% { opacity: 1; }
          100% { transform: translateY(-42px) scale(1.04); opacity: 0; }
        }
        @keyframes synaura-swipe-chevron {
          0%, 100% { transform: translateY(5px); opacity: .18; }
          50% { transform: translateY(-4px); opacity: .95; }
        }
        @keyframes synaura-pulse-ring {
          0% { transform: scale(.72); opacity: .72; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes synaura-cover-breathe {
          0%, 100% { transform: scale(1.015); }
          50% { transform: scale(1.075); }
        }
        @keyframes synaura-eq {
          0%, 100% { transform: scaleY(.35); }
          50% { transform: scaleY(1); }
        }
        @keyframes synaura-wave-drift {
          from { transform: translateX(-10%); }
          to { transform: translateX(10%); }
        }
        @keyframes synaura-dot-pop {
          0%, 70%, 100% { transform: scale(.7); opacity: .35; }
          35% { transform: scale(1); opacity: 1; }
        }
        .synaura-home-stage { transition: opacity 280ms ease, transform 320ms ease; }
        .synaura-home-prelude.is-leaving .synaura-home-stage { opacity: 0; transform: translateY(-42px) scale(.985); }
        .synaura-aurora-a { animation: synaura-aurora-one 9s ease-in-out infinite; }
        .synaura-aurora-b { animation: synaura-aurora-two 11s ease-in-out infinite; }
        .synaura-floating-post { animation: synaura-card-float 4.8s ease-in-out infinite; }
        .synaura-swipe-finger { animation: synaura-swipe-finger 2.05s cubic-bezier(.45,.05,.2,1) infinite; }
        .synaura-swipe-chevron { animation: synaura-swipe-chevron 1.15s ease-in-out infinite; }
        .synaura-swipe-chevron:nth-child(2) { animation-delay: .14s; }
        .synaura-swipe-chevron:nth-child(3) { animation-delay: .28s; }
        .synaura-pulse-ring { animation: synaura-pulse-ring 1.8s ease-out infinite; }
        .synaura-cover-image { animation: synaura-cover-breathe 13s ease-in-out infinite; }
        .synaura-wave-drift { animation: synaura-wave-drift 8s ease-in-out infinite alternate; }
        .synaura-live-dot { animation: synaura-dot-pop 1.8s ease-in-out infinite; }
        .synaura-live-dot:nth-child(2) { animation-delay: .2s; }
        .synaura-live-dot:nth-child(3) { animation-delay: .4s; }
        .synaura-shortcut { transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease; }
        .synaura-shortcut:hover { transform: translateY(-4px) scale(1.015); box-shadow: 0 18px 42px rgba(0,0,0,.26); }
        .synaura-action-bubble { transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease; }
        .synaura-action-bubble:hover { transform: scale(1.1); }
        .synaura-eq-bar { transform-origin: center bottom; animation: synaura-eq .72s ease-in-out infinite; }
        .synaura-eq-bar:nth-child(2) { animation-delay: .12s; }
        .synaura-eq-bar:nth-child(3) { animation-delay: .24s; }
        .synaura-eq-bar:nth-child(4) { animation-delay: .36s; }
        @media (max-width: 960px) {
          .synaura-community-pulse { display: none !important; }
          .synaura-pulse-grid { grid-template-columns: minmax(0,1fr) !important; }
          .synaura-shortcuts-wrap { grid-template-columns: repeat(4,minmax(132px,1fr)) !important; overflow-x: auto; }
        }
        @media (max-width: 760px) {
          .synaura-home-intro { min-height: 132px !important; height: 132px !important; }
          .synaura-flow-copy { display: none !important; }
          .synaura-shortcuts-wrap { display: flex !important; }
          .synaura-shortcut { min-width: 132px !important; min-height: 58px !important; }
          .synaura-shortcut-sub { display: none !important; }
          .synaura-pulse-title { font-size: 1.35rem !important; }
        }
        @media (max-height: 650px) {
          .synaura-home-intro { min-height: 116px !important; height: 116px !important; }
          .synaura-pulse-kicker, .synaura-flow-copy { display: none !important; }
          .synaura-shortcut { min-height: 50px !important; }
          .synaura-preview-meta { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .synaura-home-prelude, .synaura-home-prelude * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="synaura-home-stage relative flex h-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="synaura-aurora-a absolute -left-[14%] -top-[42%] h-[74%] w-[74%] rounded-full bg-[#7357C6]/46 blur-[92px]" />
          <div className="synaura-aurora-b absolute -right-[18%] top-[-22%] h-[66%] w-[66%] rounded-full bg-[#D96D63]/35 blur-[94px]" />
          <div className="absolute left-[42%] top-[3%] h-[34%] w-[34%] rounded-full bg-[#4A9EAA]/24 blur-[82px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,.1),transparent_42%)]" />
        </div>

        <header className="relative z-30 mx-auto flex w-full max-w-[1240px] shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.65rem)] sm:px-6 lg:px-8">
          <button type="button" onClick={enterFlow} className="group flex min-w-0 items-center gap-2.5 text-left" aria-label="Ouvrir le Flow">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#F7F6F3] shadow-[0_12px_34px_rgba(115,87,198,.28)]">
              <span className="synaura-pulse-ring absolute inset-0 rounded-[13px] border border-[#A98BE8]/60" />
              <img src="/brand/2026/synaura-symbol-2026.png" alt="" className="relative h-6 w-6 object-contain transition group-hover:scale-110" />
            </span>
            <span className="min-w-0">
              <strong className="block text-[17px] font-black leading-none tracking-[-0.025em]">Synaura</strong>
              <span className="mt-1 block truncate text-[10px] font-bold text-white/45">
                {greetingName ? `Salut ${greetingName}, ton Flow est prêt` : 'Écoute, crée, partage'}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onSearch} className="synaura-action-bubble grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 backdrop-blur-xl hover:border-white/22 hover:bg-white/14 hover:text-white" aria-label="Rechercher" title="Rechercher">
              <Search className="h-4 w-4" />
            </button>
            <MessageInboxButton className="synaura-action-bubble h-10 w-10 border border-white/12 bg-white/[0.075] text-white/72 backdrop-blur-xl hover:border-white/22 hover:bg-white/14 hover:text-white" />
            <button type="button" onClick={onNotifications} className="synaura-action-bubble grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 backdrop-blur-xl hover:border-white/22 hover:bg-white/14 hover:text-white" aria-label="Notifications" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="synaura-home-intro relative z-20 mx-auto h-[clamp(136px,20vh,188px)] min-h-[136px] w-full max-w-[1240px] shrink-0 px-4 pb-3 sm:px-6 lg:px-8">
          <div className="synaura-pulse-grid grid h-full grid-cols-[minmax(250px,.72fr)_minmax(0,1.7fr)_minmax(230px,.68fr)] gap-2.5">
            <button type="button" onClick={enterFlow} className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border border-[#9B7AE5]/28 bg-[linear-gradient(135deg,rgba(115,87,198,.3),rgba(23,20,29,.82)_58%,rgba(74,158,170,.16))] p-4 text-left shadow-[0_18px_55px_rgba(0,0,0,.22)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-[#B89DFF]/50">
              <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#7357C6]/40 blur-3xl" />
              <div className="synaura-wave-drift pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-end justify-center gap-[5px] opacity-25">
                {[18, 30, 44, 26, 52, 34, 60, 38, 48, 24, 42, 20].map((height, index) => (
                  <span key={`${height}-${index}`} className="w-[4px] rounded-t-full bg-gradient-to-t from-[#4A9EAA] via-[#9B7AE5] to-[#D96D63]" style={{ height }} />
                ))}
              </div>
              <div className="relative flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/16 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#DCCEFF]">
                  <span className="synaura-live-dot h-1.5 w-1.5 rounded-full bg-[#D96D63]" />
                  Flow prêt
                </span>
                <span className="synaura-pulse-kicker text-[9px] font-bold text-white/36">une sélection sans fin</span>
              </div>
              <div className="relative">
                <h1 className="synaura-pulse-title text-[clamp(1.35rem,2.5vw,2.2rem)] font-black leading-[.95] tracking-[-0.045em] text-white">
                  Lance ta prochaine découverte.
                </h1>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-white/68">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#111111] transition group-hover:scale-110">
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                  </span>
                  Entrer dans le Flow
                  <ChevronUp className="h-3.5 w-3.5 text-[#A8DEE5] transition group-hover:-translate-y-1" />
                </div>
              </div>
            </button>

            <div className="synaura-shortcuts-wrap grid min-w-0 grid-cols-4 gap-2.5">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={shortcut.onClick}
                    className="synaura-shortcut group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[18px] border p-3 text-left backdrop-blur-xl"
                    style={{
                      borderColor: `${shortcut.accent}40`,
                      background: `linear-gradient(145deg, ${shortcut.accent}2B, rgba(18,17,21,.78) 62%)`,
                    }}
                  >
                    <span className="pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full blur-2xl" style={{ backgroundColor: `${shortcut.accent}35` }} />
                    <span className="relative grid h-9 w-9 place-items-center rounded-[11px] transition group-hover:rotate-[-7deg] group-hover:scale-110" style={{ backgroundColor: `${shortcut.accent}24`, color: shortcut.accent, boxShadow: `0 8px 28px ${shortcut.accent}1C` }}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="relative mt-3 min-w-0">
                      <strong className="block truncate text-xs font-black text-white/94">{shortcut.label}</strong>
                      <span className="synaura-shortcut-sub mt-1 block truncate text-[9px] font-semibold text-white/40">{shortcut.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => latestPost && onOpenPost(latestPost)}
              disabled={!latestPost}
              className="synaura-community-pulse synaura-floating-post relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border border-[#D96D63]/28 bg-[linear-gradient(145deg,rgba(217,109,99,.22),rgba(19,18,22,.86)_62%,rgba(244,162,97,.12))] p-3.5 text-left shadow-[0_18px_55px_rgba(0,0,0,.22)] backdrop-blur-2xl transition hover:border-[#F0AAA2]/48 disabled:opacity-55"
            >
              <div className="pointer-events-none absolute -right-5 -top-7 h-24 w-24 rounded-full bg-[#D96D63]/28 blur-3xl" />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.13em] text-[#F0AAA2]">
                  <span className="synaura-live-dot h-1.5 w-1.5 rounded-full bg-[#D96D63] shadow-[0_0_12px_#D96D63]" />
                  Ça bouge
                </span>
                <TrendingUp className="h-3.5 w-3.5 text-[#F4A261]" />
              </div>
              {latestPost ? (
                <div className="relative mt-2 flex min-w-0 items-center gap-2.5">
                  <img src={latestPost.creator.avatar || '/brand/2026/synaura-symbol-2026-white.png'} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white/8 object-cover ring-2 ring-[#D96D63]/35" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-black text-white/92">{latestPost.creator.name || latestPost.creator.username}</strong>
                    <span className="mt-1 line-clamp-2 block text-[9px] font-semibold leading-3.5 text-white/42">{postPreview(latestPost)}</span>
                  </span>
                </div>
              ) : (
                <p className="relative mt-2 text-[10px] font-semibold leading-4 text-white/42">Les prochains posts apparaîtront ici.</p>
              )}
              <div className="relative mt-2 flex items-center gap-3 text-[8px] font-black text-white/30">
                <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{latestPost?.likes_count || 0}</span>
                <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{latestPost?.comments_count || 0}</span>
              </div>
            </button>
          </div>
        </section>

        <section className="relative z-20 min-h-0 flex-1 overflow-hidden rounded-t-[30px] border-t border-white/14 bg-[#131116] shadow-[0_-24px_80px_rgba(0,0,0,.38)]">
          {featuredTrack?.coverUrl ? (
            <img src={featuredTrack.coverUrl} alt="" className="synaura-cover-image absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(115,87,198,.72),transparent_35%),radial-gradient(circle_at_18%_72%,rgba(74,158,170,.55),transparent_42%),linear-gradient(145deg,#2B172D,#0B0B0D)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,9,.2)_0%,rgba(7,7,9,.08)_26%,rgba(7,7,9,.82)_78%,rgba(7,7,9,.98)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,9,.68)_0%,transparent_56%,rgba(7,7,9,.18)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(115,87,198,.2),transparent)]" />

          <button type="button" onClick={enterFlow} className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/66 backdrop-blur-xl transition hover:bg-black/44 hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#72BBC5] shadow-[0_0_12px_#72BBC5]" />
            Aperçu du Flow
          </button>

          <div className="absolute left-4 top-14 z-20 flex flex-wrap gap-1.5 sm:left-6">
            <button type="button" onClick={onDiscover} className="rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-[9px] font-black text-white/72 backdrop-blur-xl transition hover:bg-white hover:text-[#111111]">Pour toi</button>
            <button type="button" onClick={onRadar} className="rounded-full border border-[#D96D63]/30 bg-[#D96D63]/16 px-3 py-1.5 text-[9px] font-black text-[#FFD4CE] backdrop-blur-xl transition hover:bg-[#D96D63] hover:text-white">Ça monte</button>
          </div>

          <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 z-20 max-w-[min(72vw,620px)] sm:left-6 lg:left-8">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#DCCEFF]">{isCurrentTrack ? 'Reprendre maintenant' : 'Premier son de ton Flow'}</p>
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="mt-1.5 block max-w-full text-left disabled:cursor-default">
              <h2 className="line-clamp-2 text-[clamp(1.65rem,5vw,3.8rem)] font-black leading-[.96] tracking-[-0.045em] text-white drop-shadow-[0_8px_25px_rgba(0,0,0,.35)]">
                {featuredTrack?.title || 'Ton Flow se prépare'}
              </h2>
              <p className="mt-2 truncate text-xs font-bold text-white/62 sm:text-sm">{featuredTrack ? artistName(featuredTrack) : 'Synaura prépare ta sélection'}</p>
            </button>

            {featuredTrack ? (
              <div className="synaura-preview-meta mt-2 flex items-center gap-3 text-[10px] font-bold text-white/38">
                <span>{compactCount(featuredTrack.plays)} écoutes</span>
                <span className="h-1 w-1 rounded-full bg-white/24" />
                <span>{compactCount(countOf(featuredTrack.likes))} j’aime</span>
                {nextTrack ? <span className="hidden truncate text-white/28 sm:inline">Ensuite : {nextTrack.title}</span> : null}
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-2.5">
              <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onPlayTrack(featuredTrack)} className="group relative grid h-12 w-12 place-items-center rounded-full bg-[#F7F6F3] text-[#111111] shadow-[0_15px_45px_rgba(0,0,0,.32)] transition hover:scale-105 disabled:opacity-50">
                <span className="synaura-pulse-ring absolute inset-0 rounded-full border border-white/60" />
                {isPlayingFeatured ? (
                  <span className="relative flex h-4 items-end gap-[2px]">
                    {[0, 1, 2, 3].map((bar) => <span key={bar} className="synaura-eq-bar h-4 w-[2px] rounded-full bg-[#7357C6]" />)}
                  </span>
                ) : (
                  <Play className="relative ml-0.5 h-5 w-5 fill-current" />
                )}
              </button>
              <button type="button" onClick={enterFlow} className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-white/16 bg-black/28 px-4 text-xs font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-[#111111]">
                <Radio className="h-4 w-4" />
                Voir en plein écran
              </button>
            </div>
          </div>

          <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] right-3 z-30 flex flex-col items-center gap-2 sm:right-5">
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="synaura-action-bubble grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/30 text-white backdrop-blur-xl disabled:opacity-50" aria-label="Aimer">
              <Heart className={`h-[18px] w-[18px] ${featuredTrack?.isLiked ? 'fill-[#D96D63] text-[#D96D63]' : ''}`} />
            </button>
            <span className="text-[9px] font-black text-white/52">{featuredTrack ? compactCount(countOf(featuredTrack.likes)) : '0'}</span>
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="synaura-action-bubble grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/30 text-white backdrop-blur-xl disabled:opacity-50" aria-label="Commentaires">
              <MessageCircle className="h-[18px] w-[18px]" />
            </button>
            <span className="text-[9px] font-black text-white/52">{featuredTrack ? compactCount(countOf(featuredTrack.comments)) : '0'}</span>
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="synaura-action-bubble grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/30 text-white backdrop-blur-xl disabled:opacity-50" aria-label="Partager">
              <Share2 className="h-[18px] w-[18px]" />
            </button>
          </div>

          <button type="button" onClick={enterFlow} className="absolute right-[4.25rem] top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-[22px] border border-white/12 bg-black/24 px-3 py-3 text-white backdrop-blur-xl transition hover:bg-black/42 sm:right-[5.4rem]" aria-label="Glisser vers le haut pour ouvrir le Flow">
            <span className="flex flex-col items-center -space-y-1">
              <ChevronUp className="synaura-swipe-chevron h-4 w-4 text-[#DCCEFF]" />
              <ChevronUp className="synaura-swipe-chevron h-4 w-4 text-[#A8DEE5]" />
              <ChevronUp className="synaura-swipe-chevron h-4 w-4 text-[#F0AAA2]" />
            </span>
            <span className="relative mt-1 h-[54px] w-[28px]">
              <span className="synaura-swipe-finger absolute bottom-0 left-1/2 h-[38px] w-[18px] -translate-x-1/2 rounded-[10px_10px_8px_8px] border-2 border-white/82 bg-white/13 shadow-[0_10px_24px_rgba(0,0,0,.25)]">
                <span className="absolute left-1/2 top-[5px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#DCCEFF] shadow-[0_0_10px_#A98BE8]" />
              </span>
            </span>
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/58">Glisse</span>
          </button>
        </section>
      </div>
    </div>
  );
}
