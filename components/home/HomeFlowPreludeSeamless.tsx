'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ChevronUp,
  Compass,
  Headphones,
  Radar,
  Search,
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

const BANNER_ROTATION_MS = 4200;
const LEAVE_MS = 360;

function artistName(track: ScrollTrack) {
  return track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return String(Math.max(0, value));
}

function postPreview(post: ScrollPost) {
  if (post.content?.trim()) return post.content.trim();
  if (post.track?.title) return `partage « ${post.track.title} »`;
  if (post.image_url) return 'a partagé une nouvelle image';
  return 'vient de publier sur Synaura';
}

export default function HomeFlowPreludeSeamless(props: Props) {
  const {
    open,
    tracks,
    posts,
    currentTrack,
    currentPlaying,
    userName,
    onEnterFlow,
    onOpenTrack,
    onOpenPost,
    onSearch,
    onNotifications,
    onDiscover,
    onRadar,
    onStudio,
    onEvents,
  } = props;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const leavingRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const wheelDeltaRef = useRef(0);

  const playableTracks = useMemo(() => tracks.filter((track) => Boolean(track.audioUrl)), [tracks]);
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : playableTracks[0] || null;
  const discoveryTracks = playableTracks.filter((track) => track._id !== featuredTrack?._id).slice(0, 4);
  const latestPost = posts[0] || null;
  const greetingName = userName?.trim().split(/\s+/)[0] || null;

  const bannerItems = useMemo(() => [
    latestPost
      ? `${latestPost.creator.name || latestPost.creator.username} vient de publier`
      : 'La communauté se réveille doucement',
    featuredTrack
      ? `Fais partie des premiers sur « ${featuredTrack.title} »`
      : 'Ton prochain son est en approche',
    currentPlaying ? 'Ton Flow joue déjà sous cet écran' : 'Le premier morceau est déjà prêt sous l’accueil',
    'Quelqu’un pourrait t’avoir suivi récemment 👀',
    'Le Radar pense avoir trouvé ta prochaine boucle',
    'Ton algorithme a bossé pendant ton absence',
  ], [currentPlaying, featuredTrack, latestPost]);

  const avatars = playableTracks
    .map((track) => track.artist?.avatar)
    .filter((avatar): avatar is string => Boolean(avatar))
    .slice(0, 3);

  useEffect(() => {
    if (!open) return;
    leavingRef.current = false;
    wheelDeltaRef.current = 0;
    setLeaving(false);
    setDragOffset(0);
    setPhraseIndex(Math.floor(Math.random() * PUNCHLINES.length));
    setBannerIndex(0);
    return () => {
      if (leaveTimerRef.current != null) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || bannerItems.length < 2) return;
    const interval = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % bannerItems.length);
    }, BANNER_ROTATION_MS);
    return () => window.clearInterval(interval);
  }, [bannerItems.length, open]);

  const enterFlow = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onEnterFlow();
      return;
    }
    setLeaving(true);
    setDragOffset(0);
    leaveTimerRef.current = window.setTimeout(onEnterFlow, LEAVE_MS);
  }, [onEnterFlow]);

  useEffect(() => {
    if (!open) return;
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      wheelDeltaRef.current += event.deltaY;
      setDragOffset(Math.min(window.innerHeight * 0.22, wheelDeltaRef.current * 0.42));
      if (wheelDeltaRef.current >= 72) enterFlow();
    };
    window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [enterFlow, open]);

  if (!open) return null;

  const dragProgress = typeof window === 'undefined' ? 0 : Math.min(1, dragOffset / Math.max(260, window.innerHeight * 0.42));
  const transform = leaving ? 'translate3d(0,-100%,0)' : `translate3d(0,${-dragOffset}px,0)`;
  const opacity = leaving ? 0 : Math.max(0.55, 1 - dragProgress * 0.35);

  const shortcuts = [
    { label: 'Découvrir', sub: 'Trouve ton mood', icon: Compass, accent: '#F4A261', onClick: onDiscover },
    { label: 'Radar', sub: 'Ce qui chauffe', icon: Radar, accent: '#4A9EAA', onClick: onRadar },
    { label: 'Studio IA', sub: 'Crée maintenant', icon: Sparkles, accent: '#D96D63', onClick: onStudio },
    { label: 'Événements', sub: 'La scène Synaura', icon: CalendarDays, accent: '#A98BE8', onClick: onEvents },
  ];

  return (
    <div
      className={`synaura-home-prelude synaura-home-seamless fixed inset-x-0 bottom-[var(--synaura-primary-dock-space)] top-0 z-[120] overflow-hidden text-[#F7F6F3] lg:bottom-0 ${leaving ? 'is-leaving' : ''}`}
      style={{ transform, opacity, transition: leaving ? `transform ${LEAVE_MS}ms cubic-bezier(.65,0,.2,1), opacity ${LEAVE_MS}ms ease` : dragOffset ? 'none' : 'transform 260ms ease, opacity 260ms ease' }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY, at: performance.now() } : null;
      }}
      onTouchMove={(event) => {
        const start = touchStartRef.current;
        const touch = event.touches[0];
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (dy >= 0 || Math.abs(dy) <= Math.abs(dx) * 1.12) return;
        setDragOffset(Math.min(window.innerHeight * 0.58, -dy));
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        const touch = event.changedTouches[0];
        touchStartRef.current = null;
        if (!start || !touch) return;
        const dy = start.y - touch.clientY;
        const dx = Math.abs(start.x - touch.clientX);
        const elapsed = Math.max(1, performance.now() - start.at);
        const velocity = dy / elapsed;
        if (dy > 58 && dy > dx * 1.12 || velocity > 0.42) enterFlow();
        else setDragOffset(0);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') enterFlow();
      }}
      tabIndex={-1}
    >
      <style>{`
        @keyframes syn-signal-a { 0%,100%{transform:translate3d(-8%,-4%,0) scale(1);opacity:.58} 50%{transform:translate3d(12%,8%,0) scale(1.16);opacity:.92} }
        @keyframes syn-signal-b { 0%,100%{transform:translate3d(8%,6%,0) scale(1.08);opacity:.46} 50%{transform:translate3d(-12%,-8%,0) scale(.94);opacity:.8} }
        @keyframes syn-card-in { from{opacity:0;transform:translateY(14px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes syn-card-float { 0%,100%{transform:translateY(0) rotate(-.25deg)} 50%{transform:translateY(-4px) rotate(.25deg)} }
        @keyframes syn-banner-in { from{opacity:0;transform:translateY(6px);filter:blur(3px)} to{opacity:1;transform:translateY(0);filter:blur(0)} }
        @keyframes syn-banner-progress { from{width:0} to{width:100%} }
        @keyframes syn-bridge { 0%,100%{transform:translateY(3px)} 50%{transform:translateY(-4px)} }
        .syn-home-chrome{height:clamp(360px,52svh,540px);background:#09090b;border-radius:0 0 30px 30px;box-shadow:0 28px 80px rgba(0,0,0,.42);}
        .syn-home-aura-a{animation:syn-signal-a 9s ease-in-out infinite}.syn-home-aura-b{animation:syn-signal-b 11s ease-in-out infinite}
        .syn-home-card{animation:syn-card-in .52s both;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.syn-home-card:hover{transform:translateY(-4px) scale(1.012);border-color:rgba(255,255,255,.3);box-shadow:0 18px 48px rgba(0,0,0,.3)}
        .syn-home-card-float{animation:syn-card-float 5.2s ease-in-out infinite}.syn-home-banner{animation:syn-banner-in .34s ease both}.syn-home-progress{animation:syn-banner-progress ${BANNER_ROTATION_MS}ms linear both}.syn-home-bridge-icon{animation:syn-bridge 1.3s ease-in-out infinite}
        .syn-home-scroll{scrollbar-width:none}.syn-home-scroll::-webkit-scrollbar{display:none}
        @media(max-width:760px){.syn-home-chrome{height:min(54svh,460px)}.syn-home-title{font-size:clamp(1.45rem,7.4vw,2rem)!important}.syn-home-card{min-width:218px!important}.syn-home-copy{display:none}.syn-home-label{display:none}}
        @media(max-height:650px){.syn-home-chrome{height:56svh;min-height:300px}.syn-home-copy{display:none}.syn-home-card{height:105px!important}.syn-home-rail{margin-top:.45rem!important}}
        @media(prefers-reduced-motion:reduce){.synaura-home-seamless,.synaura-home-seamless *{animation:none!important;transition:none!important}}
      `}</style>

      <div className="syn-home-chrome relative w-full overflow-hidden border-b border-white/20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="syn-home-aura-a absolute -left-[18%] -top-[38%] h-[78%] w-[78%] rounded-full bg-[#7357C6]/45 blur-[100px]" />
          <div className="syn-home-aura-b absolute -right-[18%] -top-[16%] h-[68%] w-[68%] rounded-full bg-[#D96D63]/36 blur-[100px]" />
          <div className="absolute left-[36%] top-[2%] h-[46%] w-[46%] rounded-full bg-[#4A9EAA]/23 blur-[90px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,.11),transparent_42%)]" />
        </div>

        <header className="relative z-30 flex h-[62px] w-full items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),.35rem)] sm:px-6 lg:px-8 xl:px-10">
          <button type="button" onClick={enterFlow} className="group flex min-w-0 items-center gap-2.5 text-left" aria-label="Continuer dans le Flow">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-white/30 bg-[#F7F6F3] shadow-[0_12px_34px_rgba(115,87,198,.3)]">
              <img src="/brand/2026/synaura-symbol-2026.png" alt="" className="h-6 w-6 object-contain transition group-hover:scale-110" />
            </span>
            <span className="min-w-0"><strong className="block text-[17px] font-black leading-none tracking-[-.025em]">Synaura</strong><span className="mt-1 block truncate text-[10px] font-bold text-white/45">{greetingName ? `Salut ${greetingName}, regarde ce que t’as raté` : 'Écoute, crée, partage'}</span></span>
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onSearch} className="grid h-10 w-10 place-items-center rounded-full border border-white/24 bg-white/[.075] text-white/80 backdrop-blur-xl transition hover:border-white/38 hover:bg-white/14" aria-label="Rechercher"><Search className="h-4 w-4" /></button>
            <MessageInboxButton className="h-10 w-10 border border-white/24 bg-white/[.075] text-white/80 backdrop-blur-xl hover:border-white/38 hover:bg-white/14" />
            <button type="button" onClick={onNotifications} className="grid h-10 w-10 place-items-center rounded-full border border-white/24 bg-white/[.075] text-white/80 backdrop-blur-xl transition hover:border-white/38 hover:bg-white/14" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
          </div>
        </header>

        <section className="relative z-20 flex h-[calc(100%-62px)] w-full flex-col px-4 pb-3 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-white/21 bg-[linear-gradient(180deg,rgba(18,17,24,.94),rgba(10,10,13,.86))] shadow-[0_22px_75px_rgba(0,0,0,.34)] backdrop-blur-2xl">
            <div className="flex shrink-0 items-end justify-between gap-5 px-4 pb-2 pt-3.5 sm:px-5 lg:px-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#A98BE8]/46 bg-[#7357C6]/18 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.15em] text-[#DCCEFF]">Pendant ton absence</span><span className="rounded-full border border-[#72BBC5]/40 bg-[#4A9EAA]/14 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-[#A8DEE5]">Swipe les cartes</span></div>
                <h1 className="syn-home-title mt-2 max-w-[980px] text-[clamp(1.8rem,3vw,3.3rem)] font-black leading-[.94] tracking-[-.052em] text-white">{PUNCHLINES[phraseIndex]}</h1>
                <p className="syn-home-copy mt-1.5 max-w-2xl text-[11px] font-semibold leading-4 text-white/42">Les vraies données du Flow sont déjà chargées juste en dessous.</p>
              </div>
              <button type="button" onClick={enterFlow} className="hidden h-11 shrink-0 items-center gap-2 rounded-[14px] border border-white/70 bg-white px-5 text-xs font-black text-[#111] shadow-[0_12px_38px_rgba(247,246,243,.14)] transition hover:-translate-y-0.5 sm:inline-flex"><Headphones className="h-4 w-4 text-[#7357C6]" />Continuer le Flow<ChevronUp className="h-3.5 w-3.5" /></button>
            </div>

            <div className="relative mx-4 shrink-0 overflow-hidden rounded-[14px] border border-white/20 bg-[linear-gradient(90deg,rgba(115,87,198,.16),rgba(255,255,255,.05),rgba(74,158,170,.14))] sm:mx-5 lg:mx-6">
              <div key={bannerIndex} className="syn-home-banner flex min-h-[40px] items-center justify-between gap-3 px-3.5 py-2 sm:px-4"><span className="flex min-w-0 items-center gap-2.5"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#72BBC5]/44 bg-[#4A9EAA]/16 text-[#A8DEE5]"><Zap className="h-3 w-3" /></span><span className="syn-home-label shrink-0 text-[8px] font-black uppercase tracking-[.14em] text-[#DCCEFF]">En ce moment</span><span className="truncate text-[10px] font-black text-white/76">{bannerItems[bannerIndex]}</span></span><span className="shrink-0 text-[8px] font-black tabular-nums text-white/34">{String(bannerIndex + 1).padStart(2, '0')} / {String(bannerItems.length).padStart(2, '0')}</span></div>
              <span key={`progress-${bannerIndex}`} className="syn-home-progress absolute bottom-0 left-0 h-[2.5px] bg-[linear-gradient(90deg,#7357C6,#4A9EAA,#D96D63)] shadow-[0_0_10px_rgba(74,158,170,.65)]" />
            </div>

            <div className="syn-home-rail relative mt-2.5 min-h-0 flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-7 bg-gradient-to-r from-[#101014] to-transparent" /><div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-[#101014] to-transparent" />
              <div className="syn-home-scroll flex h-full snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-4 pb-3 pr-12 sm:px-5 sm:pr-14 lg:px-6 lg:pr-16">
                <button type="button" onClick={() => latestPost && onOpenPost(latestPost)} disabled={!latestPost} className="syn-home-card syn-home-card-float relative h-full min-w-[270px] snap-start overflow-hidden rounded-[20px] border border-white/23 bg-[linear-gradient(145deg,rgba(217,109,99,.27),rgba(20,17,23,.94)_62%,rgba(244,162,97,.13))] p-3.5 text-left disabled:opacity-60" style={{ animationDelay: '40ms' }}>
                  <div className="relative flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.13em] text-[#F0AAA2]"><span className="h-1.5 w-1.5 rounded-full bg-[#D96D63] shadow-[0_0_12px_#D96D63]" />Ça bouge maintenant</span><TrendingUp className="h-3.5 w-3.5 text-[#F4A261]" /></div>
                  <div className="relative mt-3 flex min-w-0 items-center gap-3"><img src={latestPost?.creator.avatar || '/brand/2026/synaura-symbol-2026-white.png'} alt="" className="h-12 w-12 shrink-0 rounded-full border-2 border-white/60 bg-white/8 object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-black text-white/94">{latestPost?.creator.name || latestPost?.creator.username || 'La communauté'}</strong><span className="mt-1 line-clamp-2 block text-[10px] font-semibold leading-4 text-white/48">{latestPost ? postPreview(latestPost) : 'Les prochaines publications apparaîtront ici.'}</span></span></div>
                  <span className="relative mt-3 inline-flex items-center gap-1 text-[9px] font-black text-white/72">Voir ce que t’as raté <ChevronRight className="h-3 w-3" /></span>
                </button>

                <button type="button" onClick={onDiscover} className="syn-home-card relative h-full min-w-[245px] snap-start overflow-hidden rounded-[20px] border border-white/23 bg-[linear-gradient(145deg,rgba(115,87,198,.32),rgba(20,18,25,.94)_65%)] p-3.5 text-left" style={{ animationDelay: '110ms' }}>
                  <div className="relative flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl border border-[#A98BE8]/48 bg-[#7357C6]/24 text-[#DCCEFF]"><UserPlus className="h-4.5 w-4.5" /></span><span className="rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-white/56">Social</span></div>
                  <p className="relative mt-2.5 line-clamp-3 text-[16px] font-black leading-[1.04] tracking-[-.025em] text-white">Quelqu’un t’a peut-être suivi récemment 👀</p>
                  <div className="relative mt-2 flex items-center justify-between"><span className="flex items-center">{(avatars.length ? avatars : ['/brand/2026/synaura-symbol-2026-white.png']).map((avatar, index) => <img key={`${avatar}-${index}`} src={avatar} alt="" className={`h-7 w-7 rounded-full border-2 border-[#17151b] object-cover ${index ? '-ml-2' : ''}`} />)}</span><span className="text-[8px] font-bold text-white/44">Ouvre ton réseau</span></div>
                </button>

                {discoveryTracks.map((track, index) => (
                  <button key={track._id} type="button" onClick={() => onOpenTrack(track)} className="syn-home-card relative h-full min-w-[250px] snap-start overflow-hidden rounded-[20px] border border-white/24 bg-[#17151b] p-3.5 text-left" style={{ animationDelay: `${180 + index * 55}ms` }}>
                    <img src={track.coverUrl || '/brand/2026/synaura-symbol-2026-white.png'} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/28 to-black/8" /><span className="relative inline-flex rounded-full border border-[#72BBC5]/50 bg-[#4A9EAA]/20 px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-[#A8DEE5]">{index === 0 ? 'Premiers auditeurs' : index === 1 ? 'Ça monte' : 'Pour toi'}</span><div className="absolute bottom-3.5 left-3.5 right-3.5"><strong className="line-clamp-2 block text-[15px] font-black leading-[1.04] text-white">{track.title}</strong><span className="mt-1 block truncate text-[9px] font-bold text-white/60">{artistName(track)}</span><span className="mt-1.5 flex items-center gap-1 text-[8px] font-black text-white/64"><Headphones className="h-3 w-3" />{compactCount(track.plays || 0)} écoutes</span></div>
                  </button>
                ))}

                {shortcuts.map(({ label, sub, icon: Icon, accent, onClick }, index) => (
                  <button key={label} type="button" onClick={onClick} className="syn-home-card relative h-full min-w-[170px] snap-start overflow-hidden rounded-[20px] border border-white/21 bg-[#17151b] p-3.5 text-left" style={{ animationDelay: `${350 + index * 50}ms`, background: `linear-gradient(145deg,${accent}34,rgba(22,20,26,.96) 66%)` }}><span className="grid h-10 w-10 place-items-center rounded-xl border" style={{ color: accent, borderColor: `${accent}66`, backgroundColor: `${accent}22` }}><Icon className="h-4.5 w-4.5" /></span><div className="absolute bottom-3.5 left-3.5 right-3.5"><strong className="block text-sm font-black text-white">{label}</strong><span className="mt-1 block text-[9px] font-bold text-white/46">{sub}</span></div></button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[clamp(359px,calc(52svh-1px),539px)] z-[124] flex justify-center max-[760px]:top-[min(calc(54svh-1px),459px)]">
        <button type="button" onClick={enterFlow} className="pointer-events-auto mt-3 flex min-h-12 items-center gap-2.5 rounded-[18px] border border-white/28 bg-[#09090B]/72 px-4 text-left shadow-[0_14px_40px_rgba(0,0,0,.34)] backdrop-blur-xl">
          <ChevronUp className="syn-home-bridge-icon h-4 w-4 text-[#DCCEFF]" /><span><strong className="block text-[8px] font-black uppercase tracking-[.13em] text-[#DCCEFF]">Le Flow est déjà là</strong><span className="mt-0.5 block text-[10px] font-bold text-white/62">Glisse : le morceau continue</span></span>
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[clamp(359px,calc(52svh-1px),539px)] z-[123] h-[3px] bg-[linear-gradient(90deg,#7357C6,#4A9EAA,#D96D63)] max-[760px]:top-[min(calc(54svh-1px),459px)]" />
    </div>
  );
}
