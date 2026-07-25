'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ChevronUp,
  Compass,
  Heart,
  Headphones,
  MessageCircle,
  Play,
  Radar,
  Radio,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  UserPlus,
  Zap,
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

const PUNCHLINES = [
  'POV : tu voulais juste écouter un son.',
  'On t’a gardé du lourd pendant ton absence.',
  'Petit scroll innocent, grosse obsession musicale.',
  'Ton Flow a bossé pendant que tu vivais ta vie.',
  'Ça sent le son envoyé à quatre potes direct.',
  'Le Radar a encore cuisiné quelque chose.',
  'Tu viens pour un son, tu repars avec douze.',
  'Promis, juste deux minutes. On connaît.',
  'Ta prochaine claque est peut-être à un swipe.',
  'Ton FYP imaginaire aurait validé ça.',
  'Il s’est passé deux-trois trucs pas mal ici.',
  'Alerte : risque élevé de remettre ce son en boucle.',
];

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
  const [phraseIndex, setPhraseIndex] = useState(0);
  const leavingRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);

  const playableTracks = useMemo(
    () => tracks.filter((track) => Boolean(track.audioUrl)),
    [tracks],
  );
  const firstTrack = playableTracks[0] || null;
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const nextTrack = playableTracks.find((track) => track._id !== featuredTrack?._id) || null;
  const discoveryTracks = playableTracks
    .filter((track) => track._id !== featuredTrack?._id)
    .slice(0, 4);
  const recentPosts = posts.slice(0, 3);
  const latestPost = posts[0] || null;
  const greetingName = userName?.trim().split(/\s+/)[0] || null;
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isPlayingFeatured = Boolean(isCurrentTrack && currentPlaying);

  useEffect(() => {
    if (open) {
      leavingRef.current = false;
      wheelDeltaRef.current = 0;
      setLeaving(false);
      setPhraseIndex(Math.floor(Math.random() * PUNCHLINES.length));
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
    { label: 'Découvrir', sub: 'Trouve ton mood', icon: Compass, accent: '#F4A261', onClick: onDiscover },
    { label: 'Radar', sub: 'Ce qui chauffe', icon: Radar, accent: '#4A9EAA', onClick: onRadar },
    { label: 'Studio IA', sub: 'Crée maintenant', icon: Sparkles, accent: '#D96D63', onClick: onStudio },
    { label: 'Événements', sub: 'La scène Synaura', icon: CalendarDays, accent: '#A98BE8', onClick: onEvents },
  ];

  const bannerItems = [
    latestPost
      ? `${latestPost.creator.name || latestPost.creator.username} vient de publier`
      : 'La communauté se réveille doucement',
    featuredTrack
      ? `Fais partie des premiers sur « ${featuredTrack.title} »`
      : 'Ton prochain son est en approche',
    'Quelqu’un pourrait t’avoir suivi récemment 👀',
    'Le Radar pense avoir trouvé ta prochaine boucle',
    'Pas de drama, juste des sons à découvrir',
    'Ton algorithme a bossé pendant ton absence',
  ];

  const avatarCandidates = playableTracks
    .map((track) => track.artist?.avatar)
    .filter((avatar): avatar is string => Boolean(avatar))
    .slice(0, 3);

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
          0%, 100% { transform: translate3d(-8%, -4%, 0) scale(1); opacity: .55; }
          50% { transform: translate3d(12%, 8%, 0) scale(1.16); opacity: .9; }
        }
        @keyframes synaura-aurora-two {
          0%, 100% { transform: translate3d(8%, 6%, 0) scale(1.08); opacity: .48; }
          50% { transform: translate3d(-12%, -8%, 0) scale(.92); opacity: .82; }
        }
        @keyframes synaura-card-enter {
          from { opacity: 0; transform: translateY(16px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes synaura-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes synaura-float {
          0%, 100% { transform: translateY(0) rotate(-.4deg); }
          50% { transform: translateY(-5px) rotate(.4deg); }
        }
        @keyframes synaura-swipe-finger {
          0% { transform: translateY(30px) scale(.92); opacity: 0; }
          18% { opacity: 1; }
          72% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1.04); opacity: 0; }
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
          50% { transform: scale(1.07); }
        }
        @keyframes synaura-eq {
          0%, 100% { transform: scaleY(.35); }
          50% { transform: scaleY(1); }
        }
        .synaura-home-stage { transition: opacity 280ms ease, transform 320ms ease; }
        .synaura-home-prelude.is-leaving .synaura-home-stage { opacity: 0; transform: translateY(-42px) scale(.985); }
        .synaura-aurora-a { animation: synaura-aurora-one 9s ease-in-out infinite; }
        .synaura-aurora-b { animation: synaura-aurora-two 11s ease-in-out infinite; }
        .synaura-marquee-track { animation: synaura-marquee 28s linear infinite; }
        .synaura-rail-card { animation: synaura-card-enter .55s both; }
        .synaura-floating-card { animation: synaura-float 5s ease-in-out infinite; }
        .synaura-swipe-finger { animation: synaura-swipe-finger 2.05s cubic-bezier(.45,.05,.2,1) infinite; }
        .synaura-swipe-chevron { animation: synaura-swipe-chevron 1.15s ease-in-out infinite; }
        .synaura-swipe-chevron:nth-child(2) { animation-delay: .14s; }
        .synaura-swipe-chevron:nth-child(3) { animation-delay: .28s; }
        .synaura-pulse-ring { animation: synaura-pulse-ring 1.8s ease-out infinite; }
        .synaura-cover-image { animation: synaura-cover-breathe 13s ease-in-out infinite; }
        .synaura-eq-bar { transform-origin: center bottom; animation: synaura-eq .72s ease-in-out infinite; }
        .synaura-eq-bar:nth-child(2) { animation-delay: .12s; }
        .synaura-eq-bar:nth-child(3) { animation-delay: .24s; }
        .synaura-eq-bar:nth-child(4) { animation-delay: .36s; }
        .synaura-scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
        .synaura-scroll-x::-webkit-scrollbar { display: none; }
        .synaura-rail-card { transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease; }
        .synaura-rail-card:hover { transform: translateY(-4px) scale(1.012); box-shadow: 0 18px 48px rgba(0,0,0,.28); }
        .synaura-action-bubble { transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease; }
        .synaura-action-bubble:hover { transform: scale(1.09); }
        @media (max-width: 760px) {
          .synaura-pulse-zone { height: min(43vh, 322px) !important; min-height: 246px !important; }
          .synaura-punchline { font-size: clamp(1.45rem, 7.5vw, 2rem) !important; }
          .synaura-punch-copy { display: none !important; }
          .synaura-rail-card { min-width: 220px !important; }
          .synaura-quick-card { min-width: 145px !important; }
          .synaura-rail { padding-right: 1rem !important; }
          .synaura-flow-actions { right: .65rem !important; }
          .synaura-swipe-guide { right: 3.8rem !important; }
        }
        @media (max-height: 650px) {
          .synaura-pulse-zone { height: 220px !important; min-height: 220px !important; }
          .synaura-punch-copy, .synaura-ticker { display: none !important; }
          .synaura-rail-card { height: 112px !important; }
          .synaura-rail-wrap { margin-top: .45rem !important; }
          .synaura-preview-meta { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .synaura-home-prelude, .synaura-home-prelude * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="synaura-home-stage relative flex h-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="synaura-aurora-a absolute -left-[17%] -top-[34%] h-[70%] w-[70%] rounded-full bg-[#7357C6]/48 blur-[92px]" />
          <div className="synaura-aurora-b absolute -right-[18%] top-[-12%] h-[62%] w-[62%] rounded-full bg-[#D96D63]/38 blur-[94px]" />
          <div className="absolute left-[38%] top-[3%] h-[38%] w-[38%] rounded-full bg-[#4A9EAA]/25 blur-[82px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,.1),transparent_42%)]" />
        </div>

        <header className="relative z-30 mx-auto flex w-full max-w-[1320px] shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.65rem)] sm:px-6 lg:px-8">
          <button type="button" onClick={enterFlow} className="group flex min-w-0 items-center gap-2.5 text-left" aria-label="Ouvrir le Flow">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#F7F6F3] shadow-[0_12px_34px_rgba(115,87,198,.28)]">
              <span className="synaura-pulse-ring absolute inset-0 rounded-[13px] border border-[#A98BE8]/60" />
              <img src="/brand/2026/synaura-symbol-2026.png" alt="" className="relative h-6 w-6 object-contain transition group-hover:scale-110" />
            </span>
            <span className="min-w-0">
              <strong className="block text-[17px] font-black leading-none tracking-[-0.025em]">Synaura</strong>
              <span className="mt-1 block truncate text-[10px] font-bold text-white/45">
                {greetingName ? `Salut ${greetingName}, regarde ce que t’as raté` : 'Écoute, crée, partage'}
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

        <section className="synaura-pulse-zone relative z-20 mx-auto h-[clamp(246px,38vh,338px)] min-h-[246px] w-full max-w-[1320px] shrink-0 overflow-hidden px-4 pb-3 sm:px-6 lg:px-8">
          <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,17,24,.9),rgba(10,10,13,.76))] shadow-[0_22px_75px_rgba(0,0,0,.3)] backdrop-blur-2xl">
            <div className="flex shrink-0 items-end justify-between gap-4 px-4 pb-2 pt-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#A98BE8]/30 bg-[#7357C6]/18 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-[#DCCEFF]">Pendant ton absence</span>
                  <span className="rounded-full border border-[#72BBC5]/25 bg-[#4A9EAA]/14 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#A8DEE5]">Swipe les cartes</span>
                </div>
                <h1 className="synaura-punchline mt-2 max-w-[760px] text-[clamp(1.65rem,3.2vw,2.8rem)] font-black leading-[.94] tracking-[-0.052em] text-white">{PUNCHLINES[phraseIndex]}</h1>
                <p className="synaura-punch-copy mt-1.5 max-w-xl text-[11px] font-semibold leading-4 text-white/42">Nouveaux posts, sons à tester, petits signaux sociaux et accès rapides : pioche ce qui te donne envie.</p>
              </div>
              <button type="button" onClick={enterFlow} className="hidden h-10 shrink-0 items-center gap-2 rounded-[13px] bg-white px-4 text-xs font-black text-[#111111] shadow-[0_12px_38px_rgba(247,246,243,.12)] transition hover:-translate-y-0.5 sm:inline-flex">
                <Radio className="h-4 w-4 text-[#7357C6]" />
                Ouvrir le Flow
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="synaura-ticker relative mx-4 shrink-0 overflow-hidden rounded-full border border-white/8 bg-white/[0.045] sm:mx-5">
              <div className="synaura-marquee-track flex min-w-max items-center gap-2 px-2 py-1.5">
                {[...bannerItems, ...bannerItems].map((item, index) => (
                  <span key={`${item}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-white/9 bg-black/18 px-3 py-1 text-[9px] font-black text-white/66">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#72BBC5] shadow-[0_0_8px_#72BBC5]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="synaura-rail-wrap relative mt-2 min-h-0 flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-7 bg-gradient-to-r from-[#101014] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-[#101014] to-transparent" />
              <div className="synaura-rail synaura-scroll-x flex h-full snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-4 pb-3 pr-10 sm:px-5 sm:pr-12">
                <button
                  type="button"
                  onClick={() => latestPost && onOpenPost(latestPost)}
                  disabled={!latestPost}
                  className="synaura-rail-card synaura-floating-card relative h-full min-w-[270px] snap-start overflow-hidden rounded-[20px] border border-[#D96D63]/32 bg-[linear-gradient(145deg,rgba(217,109,99,.24),rgba(20,17,23,.92)_62%,rgba(244,162,97,.13))] p-3.5 text-left disabled:opacity-60"
                  style={{ animationDelay: '40ms' }}
                >
                  <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#D96D63]/34 blur-3xl" />
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.13em] text-[#F0AAA2]"><span className="h-1.5 w-1.5 rounded-full bg-[#D96D63] shadow-[0_0_12px_#D96D63]" />Ça bouge maintenant</span>
                    <TrendingUp className="h-3.5 w-3.5 text-[#F4A261]" />
                  </div>
                  <div className="relative mt-3 flex min-w-0 items-center gap-3">
                    <img src={latestPost?.creator.avatar || '/brand/2026/synaura-symbol-2026-white.png'} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white/8 object-cover ring-2 ring-[#D96D63]/35" />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-white/94">{latestPost?.creator.name || latestPost?.creator.username || 'La communauté'}</strong>
                      <span className="mt-1 line-clamp-2 block text-[10px] font-semibold leading-4 text-white/45">{latestPost ? postPreview(latestPost) : 'Les prochaines publications apparaîtront ici.'}</span>
                    </span>
                  </div>
                  <span className="relative mt-3 inline-flex items-center gap-1 text-[9px] font-black text-white/66">Voir ce que t’as raté <ChevronRight className="h-3 w-3" /></span>
                </button>

                <button
                  type="button"
                  onClick={onDiscover}
                  className="synaura-rail-card relative h-full min-w-[245px] snap-start overflow-hidden rounded-[20px] border border-[#A98BE8]/32 bg-[linear-gradient(145deg,rgba(115,87,198,.3),rgba(20,18,25,.92)_65%)] p-3.5 text-left"
                  style={{ animationDelay: '110ms' }}
                >
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#7357C6]/36 blur-3xl" />
                  <div className="relative flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#7357C6]/24 text-[#DCCEFF]"><UserPlus className="h-4 w-4" /></span>
                    <span className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white/52">Social</span>
                  </div>
                  <strong className="relative mt-3 block text-base font-black leading-5 text-white">Quelqu’un t’a peut-être suivi récemment 👀</strong>
                  <div className="relative mt-3 flex items-center">
                    {(avatarCandidates.length ? avatarCandidates : ['/brand/2026/synaura-symbol-2026-white.png']).map((avatar, index) => (
                      <img key={`${avatar}-${index}`} src={avatar} alt="" className={`h-8 w-8 rounded-full border-2 border-[#17151B] bg-white/8 object-cover ${index ? '-ml-2' : ''}`} />
                    ))}
                    <span className="ml-2 text-[9px] font-bold text-white/42">Ouvre ton réseau</span>
                  </div>
                </button>

                {(discoveryTracks.length ? discoveryTracks : featuredTrack ? [featuredTrack] : []).map((track, index) => (
                  <button
                    key={track._id}
                    type="button"
                    onClick={() => onOpenTrack(track)}
                    className="synaura-rail-card relative h-full min-w-[265px] snap-start overflow-hidden rounded-[20px] border border-white/11 bg-[#17151B] text-left"
                    style={{ animationDelay: `${180 + index * 70}ms` }}
                  >
                    {track.coverUrl ? <img src={track.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,7,.08),rgba(5,5,7,.88))]" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,7,.62),transparent_75%)]" />
                    <div className="relative flex h-full flex-col justify-between p-3.5">
                      <span className="w-fit rounded-full border border-[#72BBC5]/25 bg-[#4A9EAA]/18 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#A8DEE5]">{index === 0 ? 'Fais partie des premiers' : index === 1 ? 'Ça monte' : 'Pour toi'}</span>
                      <div>
                        <strong className="line-clamp-2 block text-base font-black leading-5 text-white">{track.title}</strong>
                        <span className="mt-1 block truncate text-[10px] font-bold text-white/55">{artistName(track)}</span>
                        <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-white/70"><Headphones className="h-3 w-3" />{compactCount(track.plays)} écoutes</span>
                      </div>
                    </div>
                  </button>
                ))}

                {recentPosts.slice(1).map((post, index) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onOpenPost(post)}
                    className="synaura-rail-card relative h-full min-w-[250px] snap-start overflow-hidden rounded-[20px] border border-[#F4A261]/24 bg-[linear-gradient(145deg,rgba(244,162,97,.18),rgba(18,17,21,.92)_65%)] p-3.5 text-left"
                    style={{ animationDelay: `${410 + index * 70}ms` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={post.creator.avatar || '/brand/2026/synaura-symbol-2026-white.png'} alt="" className="h-10 w-10 rounded-full bg-white/8 object-cover" />
                      <span className="min-w-0">
                        <strong className="block truncate text-xs font-black text-white/92">{post.creator.name || post.creator.username}</strong>
                        <span className="text-[8px] font-black uppercase tracking-[.12em] text-[#F4C18B]">Post à voir vite</span>
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-[11px] font-semibold leading-4 text-white/48">{postPreview(post)}</p>
                    <div className="mt-3 flex items-center gap-3 text-[9px] font-bold text-white/34"><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes_count}</span><span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comments_count}</span></div>
                  </button>
                ))}

                {shortcuts.map((shortcut, index) => {
                  const Icon = shortcut.icon;
                  return (
                    <button
                      key={shortcut.label}
                      type="button"
                      onClick={shortcut.onClick}
                      className="synaura-rail-card synaura-quick-card relative h-full min-w-[165px] snap-start overflow-hidden rounded-[20px] border p-3.5 text-left"
                      style={{
                        animationDelay: `${520 + index * 60}ms`,
                        borderColor: `${shortcut.accent}3D`,
                        background: `linear-gradient(145deg, ${shortcut.accent}29, rgba(18,17,21,.9) 66%)`,
                      }}
                    >
                      <span className="absolute -right-5 -top-6 h-20 w-20 rounded-full blur-2xl" style={{ backgroundColor: `${shortcut.accent}32` }} />
                      <div className="relative flex h-full flex-col justify-between">
                        <span className="grid h-10 w-10 place-items-center rounded-[13px]" style={{ backgroundColor: `${shortcut.accent}24`, color: shortcut.accent }}><Icon className="h-[18px] w-[18px]" /></span>
                        <div>
                          <strong className="block text-sm font-black text-white/94">{shortcut.label}</strong>
                          <span className="mt-1 block text-[9px] font-semibold text-white/40">{shortcut.sub}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={onStudio}
                  className="synaura-rail-card relative h-full min-w-[250px] snap-start overflow-hidden rounded-[20px] border border-[#D96D63]/30 bg-[linear-gradient(145deg,rgba(217,109,99,.26),rgba(115,87,198,.16),rgba(17,16,21,.92))] p-3.5 text-left"
                  style={{ animationDelay: '780ms' }}
                >
                  <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#D96D63]/35 blur-3xl" />
                  <span className="relative grid h-10 w-10 place-items-center rounded-[13px] bg-white/10 text-[#FFD8D3]"><Zap className="h-5 w-5" /></span>
                  <strong className="relative mt-3 block text-base font-black leading-5 text-white">Ton prochain banger attend juste un clic.</strong>
                  <span className="relative mt-2 inline-flex items-center gap-1 text-[9px] font-black text-[#F0AAA2]">Va cuisiner ça <ChevronRight className="h-3 w-3" /></span>
                </button>
              </div>
            </div>
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
            <span className="h-1.5 w-1.5 rounded-full bg-[#72BBC5] shadow-[0_0_12px_#72BBC5]" />Aperçu du Flow
          </button>

          <div className="absolute left-4 top-14 z-20 flex flex-wrap gap-1.5 sm:left-6">
            <button type="button" onClick={onDiscover} className="rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-[9px] font-black text-white/72 backdrop-blur-xl transition hover:bg-white hover:text-[#111111]">Pour toi</button>
            <button type="button" onClick={onRadar} className="rounded-full border border-[#D96D63]/30 bg-[#D96D63]/16 px-3 py-1.5 text-[9px] font-black text-[#FFD4CE] backdrop-blur-xl transition hover:bg-[#D96D63] hover:text-white">Ça monte</button>
          </div>

          <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 z-20 max-w-[min(72vw,620px)] sm:left-6 lg:left-8">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#DCCEFF]">{isCurrentTrack ? 'Reprendre maintenant' : 'Premier son de ton Flow'}</p>
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="mt-1.5 block max-w-full text-left disabled:cursor-default">
              <h2 className="line-clamp-2 text-[clamp(1.65rem,5vw,3.8rem)] font-black leading-[.96] tracking-[-0.045em] text-white drop-shadow-[0_8px_25px_rgba(0,0,0,.35)]">{featuredTrack?.title || 'Ton Flow se prépare'}</h2>
              <p className="mt-2 truncate text-xs font-bold text-white/62 sm:text-sm">{featuredTrack ? artistName(featuredTrack) : 'Synaura prépare ta sélection'}</p>
            </button>
            {featuredTrack ? (
              <div className="synaura-preview-meta mt-2 flex items-center gap-3 text-[10px] font-bold text-white/38">
                <span>{compactCount(featuredTrack.plays)} écoutes</span><span className="h-1 w-1 rounded-full bg-white/24" /><span>{compactCount(countOf(featuredTrack.likes))} j’aime</span>{nextTrack ? <span className="hidden truncate text-white/28 sm:inline">Ensuite : {nextTrack.title}</span> : null}
              </div>
            ) : null}
            <div className="mt-3 flex items-center gap-2.5">
              <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onPlayTrack(featuredTrack)} className="group relative grid h-12 w-12 place-items-center rounded-full bg-[#F7F6F3] text-[#111111] shadow-[0_15px_45px_rgba(0,0,0,.32)] transition hover:scale-105 disabled:opacity-50">
                <span className="synaura-pulse-ring absolute inset-0 rounded-full border border-white/60" />
                {isPlayingFeatured ? <span className="relative flex h-4 items-end gap-[2px]">{[0, 1, 2, 3].map((bar) => <span key={bar} className="synaura-eq-bar h-4 w-[2px] rounded-full bg-[#7357C6]" />)}</span> : <Play className="relative ml-0.5 h-5 w-5 fill-current" />}
              </button>
              <button type="button" onClick={enterFlow} className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-white/16 bg-black/28 px-4 text-xs font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-[#111111]"><Radio className="h-4 w-4" />Voir en plein écran</button>
            </div>
          </div>

          <div className="synaura-flow-actions absolute bottom-[max(env(safe-area-inset-bottom),1rem)] right-3 z-30 flex flex-col items-center gap-2 sm:right-5">
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="synaura-action-bubble grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/30 text-white backdrop-blur-xl disabled:opacity-50" aria-label="Aimer"><Heart className="h-[18px] w-[18px]" /></button>
            <span className="text-[9px] font-black text-white/52">{featuredTrack ? compactCount(countOf(featuredTrack.likes)) : '0'}</span>
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="synaura-action-bubble grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/30 text-white backdrop-blur-xl disabled:opacity-50" aria-label="Commentaires"><MessageCircle className="h-[18px] w-[18px]" /></button>
            <span className="text-[9px] font-black text-white/52">{featuredTrack ? compactCount(countOf(featuredTrack.comments)) : '0'}</span>
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="synaura-action-bubble grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/30 text-white backdrop-blur-xl disabled:opacity-50" aria-label="Partager"><Share2 className="h-[18px] w-[18px]" /></button>
          </div>

          <button type="button" onClick={enterFlow} className="synaura-swipe-guide absolute right-[4.25rem] top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-[22px] border border-white/12 bg-black/24 px-3 py-3 text-white backdrop-blur-xl transition hover:bg-black/42 sm:right-[5.4rem]" aria-label="Glisser vers le haut pour ouvrir le Flow">
            <span className="flex flex-col items-center -space-y-1"><ChevronUp className="synaura-swipe-chevron h-4 w-4 text-[#DCCEFF]" /><ChevronUp className="synaura-swipe-chevron h-4 w-4 text-[#A8DEE5]" /><ChevronUp className="synaura-swipe-chevron h-4 w-4 text-[#F0AAA2]" /></span>
            <span className="relative mt-1 h-[54px] w-[28px]"><span className="synaura-swipe-finger absolute bottom-0 left-1/2 h-[38px] w-[18px] -translate-x-1/2 rounded-[10px_10px_8px_8px] border-2 border-white/82 bg-white/13 shadow-[0_10px_24px_rgba(0,0,0,.25)]"><span className="absolute left-1/2 top-[5px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#DCCEFF] shadow-[0_0_10px_#A98BE8]" /></span></span>
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/58">Glisse</span>
          </button>
        </section>
      </div>
    </div>
  );
}
