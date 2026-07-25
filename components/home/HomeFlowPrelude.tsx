'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Compass,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Radar,
  Radio,
  Search,
  Sparkles,
  type LucideIcon,
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

type Shortcut = {
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  onClick: () => void;
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
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isResume = Boolean(isCurrentTrack && currentTrack?.audioUrl);
  const rotationTracks = playableTracks.filter((track) => track._id !== featuredTrack?._id).slice(0, 3);
  const latestPost = posts[0] || null;
  const greetingName = userName?.trim().split(/\s+/)[0] || null;

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

  const shortcuts: Shortcut[] = [
    {
      label: 'Découvrir',
      description: 'Genres et sélections',
      icon: Compass,
      accent: '#F4A261',
      onClick: onDiscover,
    },
    {
      label: 'Radar',
      description: 'Ce qui monte',
      icon: Radar,
      accent: '#4A9EAA',
      onClick: onRadar,
    },
    {
      label: 'Studio',
      description: 'Créer un morceau',
      icon: Sparkles,
      accent: '#D96D63',
      onClick: onStudio,
    },
    {
      label: 'Événements',
      description: 'La scène Synaura',
      icon: CalendarDays,
      accent: '#A78BFA',
      onClick: onEvents,
    },
  ];

  return (
    <div
      className={`synaura-home-prelude fixed inset-x-0 bottom-[var(--synaura-primary-dock-space)] top-0 z-[120] overflow-hidden bg-[#0B0B0C] text-[#F7F6F3] transition-[transform,opacity] duration-300 ease-out lg:bottom-0 ${
        leaving ? 'is-leaving -translate-y-full opacity-70' : 'translate-y-0 opacity-100'
      }`}
      onTouchStart={(event) => {
        touchStartYRef.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartYRef.current;
        const end = event.changedTouches[0]?.clientY;
        touchStartYRef.current = null;
        if (start != null && end != null && start - end > 64) enterFlow();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') enterFlow();
      }}
      tabIndex={-1}
    >
      <style>{`
        .synaura-home-v2 { transition: opacity 280ms ease, transform 320ms ease; }
        .synaura-home-prelude.is-leaving .synaura-home-v2 { opacity: 0; transform: translateY(-44px) scale(.975); }
        .synaura-home-card { transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease; }
        .synaura-home-card:hover { transform: translateY(-2px); }
        @media (max-width: 1023px) {
          .synaura-home-rotation, .synaura-home-community { display: none !important; }
          .synaura-home-hero { min-height: min(52vh, 420px) !important; }
        }
        @media (max-height: 720px) {
          .synaura-home-community { display: none !important; }
          .synaura-home-hero { min-height: 220px !important; }
        }
        @media (max-height: 590px) {
          .synaura-home-rotation { display: none !important; }
          .synaura-home-hero-copy { padding-bottom: .25rem !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .synaura-home-prelude, .synaura-home-prelude * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="synaura-home-v2 grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="mx-auto flex w-full max-w-[1220px] items-center justify-between gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.9rem)] sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#F7F6F3] shadow-[0_12px_34px_rgba(0,0,0,.34)]">
              <img src="/brand/2026/synaura-symbol-2026.png" alt="" className="h-6 w-6 object-contain" />
            </span>
            <div className="min-w-0">
              <strong className="block text-[17px] font-black leading-none tracking-[-0.02em]">Synaura</strong>
              <span className="mt-1 block truncate text-[10px] font-bold text-white/42">
                {greetingName ? `Content de te revoir, ${greetingName}` : 'Ta musique, ta communauté, ton Flow'}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onSearch} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/68 transition hover:bg-white/12 hover:text-white" aria-label="Rechercher" title="Rechercher">
              <Search className="h-4 w-4" />
            </button>
            <MessageInboxButton className="h-10 w-10 border border-white/10 bg-white/[0.055] text-white/68 hover:bg-white/12 hover:text-white" />
            <button type="button" onClick={onNotifications} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/68 transition hover:bg-white/12 hover:text-white" aria-label="Notifications" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1220px] gap-3 overflow-hidden px-4 pb-3 sm:px-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)] lg:px-8">
          <section className="synaura-home-hero synaura-home-card relative min-h-[260px] overflow-hidden rounded-[22px] border border-white/10 bg-[#171719] shadow-[0_30px_90px_rgba(0,0,0,.38)]">
            {featuredTrack?.coverUrl ? (
              <img src={featuredTrack.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_24%,rgba(115,87,198,.52),transparent_34%),radial-gradient(circle_at_26%_74%,rgba(74,158,170,.35),transparent_38%),#171719]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,9,.96)_0%,rgba(8,8,9,.68)_46%,rgba(8,8,9,.08)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,9,.04)_20%,rgba(8,8,9,.92)_100%)]" />
            <div className="absolute right-4 top-4 rounded-full border border-white/12 bg-black/24 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/72 backdrop-blur-xl">
              {isResume ? 'À reprendre' : 'Choisi pour toi'}
            </div>

            <div className="synaura-home-hero-copy relative z-10 flex h-full max-w-[620px] flex-col justify-end p-5 sm:p-7 lg:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E7DBFF]">Ton point de départ</p>
              <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="mt-2 block max-w-full text-left disabled:cursor-default">
                <h1 className="line-clamp-2 text-[clamp(2rem,5vw,4.4rem)] font-black leading-[.94] tracking-[-0.055em] text-white">
                  {featuredTrack?.title || 'Ton Flow se prépare'}
                </h1>
                <p className="mt-3 truncate text-sm font-bold text-white/62">
                  {featuredTrack ? artistName(featuredTrack) : 'Synaura prépare une sélection rien que pour toi'}
                </p>
              </button>

              {featuredTrack ? (
                <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-white/42">
                  <span>{compactCount(featuredTrack.plays)} écoutes</span>
                  <span className="h-1 w-1 rounded-full bg-white/25" />
                  <span>{compactCount(countOf(featuredTrack.likes))} j’aime</span>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onPlayTrack(featuredTrack)} className="inline-flex h-11 items-center justify-center gap-2 rounded-[13px] bg-[#F7F6F3] px-5 text-sm font-black text-[#111111] transition hover:bg-white disabled:opacity-50">
                  {isCurrentTrack && currentPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                  {isCurrentTrack && currentPlaying ? 'En écoute' : 'Écouter'}
                </button>
                <button type="button" onClick={enterFlow} className="inline-flex h-11 items-center justify-center gap-2 rounded-[13px] border border-white/18 bg-white/[0.09] px-5 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white/[0.15]">
                  <Radio className="h-4 w-4" />
                  Ouvrir le Flow
                </button>
              </div>
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 overflow-hidden">
            <section className="rounded-[20px] border border-white/[0.075] bg-[#151517] p-3.5">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/38">Explorer Synaura</p>
                  <h2 className="mt-1 text-sm font-black">Où tu veux aller ?</h2>
                </div>
                <span className="text-[10px] font-bold text-white/28">4 espaces</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {shortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <button key={shortcut.label} type="button" onClick={shortcut.onClick} className="synaura-home-card flex min-h-[74px] items-center gap-3 rounded-[15px] border border-white/[0.07] bg-white/[0.035] p-3 text-left hover:border-white/14 hover:bg-white/[0.07]">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]" style={{ backgroundColor: `${shortcut.accent}1F`, color: shortcut.accent }}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-xs font-black text-white/92">{shortcut.label}</strong>
                        <span className="mt-1 block truncate text-[9px] font-semibold text-white/36">{shortcut.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="synaura-home-rotation rounded-[20px] border border-white/[0.075] bg-[#151517] p-3.5">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8AC3CB]">En rotation</p>
                  <h2 className="mt-1 text-sm font-black">À écouter ensuite</h2>
                </div>
                <button type="button" onClick={onDiscover} className="text-[10px] font-black text-white/42 transition hover:text-white">Tout voir</button>
              </div>
              <div className="grid gap-1.5">
                {rotationTracks.length ? rotationTracks.map((track, index) => (
                  <button key={track._id} type="button" onClick={() => onOpenTrack(track)} className="group flex min-w-0 items-center gap-3 rounded-[13px] px-2 py-1.5 text-left transition hover:bg-white/[0.055]">
                    <span className="w-4 shrink-0 text-center text-[10px] font-black text-white/24">{String(index + 1).padStart(2, '0')}</span>
                    <img src={track.coverUrl || '/brand/2026/synaura-symbol-2026-white.png'} alt="" className="h-9 w-9 shrink-0 rounded-[10px] bg-white/5 object-cover" />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-black text-white/86">{track.title}</strong>
                      <span className="mt-0.5 block truncate text-[9px] font-semibold text-white/34">{artistName(track)}</span>
                    </span>
                    <Play className="h-3.5 w-3.5 shrink-0 text-white/22 transition group-hover:text-white/78" />
                  </button>
                )) : (
                  <p className="rounded-[13px] bg-white/[0.035] px-3 py-4 text-xs font-semibold text-white/34">Les prochaines recommandations arrivent.</p>
                )}
              </div>
            </section>

            <section className="synaura-home-community min-h-0 rounded-[20px] border border-white/[0.075] bg-[#151517] p-3.5">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#E8A79F]">Communauté</p>
                  <h2 className="mt-1 text-sm font-black">Ça bouge maintenant</h2>
                </div>
                <MessageCircle className="h-4 w-4 text-white/24" />
              </div>

              {latestPost ? (
                <button type="button" onClick={() => onOpenPost(latestPost)} className="synaura-home-card flex w-full min-w-0 items-start gap-3 rounded-[15px] border border-white/[0.06] bg-white/[0.035] p-3 text-left hover:border-white/14 hover:bg-white/[0.065]">
                  <img src={latestPost.creator.avatar || '/brand/2026/synaura-symbol-2026-white.png'} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white/5 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <strong className="truncate text-xs font-black text-white/90">{latestPost.creator.name || latestPost.creator.username}</strong>
                      <span className="shrink-0 text-[9px] font-semibold text-white/26">vient de publier</span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-[11px] font-semibold leading-4 text-white/48">{postPreview(latestPost)}</span>
                    <span className="mt-2 flex items-center gap-3 text-[9px] font-bold text-white/28">
                      <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{latestPost.likes_count}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{latestPost.comments_count}</span>
                    </span>
                  </span>
                </button>
              ) : (
                <p className="rounded-[15px] bg-white/[0.035] px-3 py-4 text-xs font-semibold text-white/34">Les premiers posts de la communauté apparaîtront ici.</p>
              )}
            </section>
          </aside>
        </main>

        <button type="button" onClick={enterFlow} aria-label="Entrer dans le Flow" className="group relative mx-auto mb-[max(env(safe-area-inset-bottom),0.55rem)] flex h-12 w-[calc(100%_-_2rem)] max-w-[1220px] items-center justify-center overflow-hidden rounded-[15px] border border-white/[0.08] bg-[#121214] px-4 sm:w-[calc(100%_-_3rem)] lg:w-[calc(100%_-_4rem)]">
          {firstTrack?.coverUrl ? <img src={firstTrack.coverUrl} alt="" className="absolute inset-[-30%] h-[160%] w-[160%] object-cover opacity-16 blur-3xl" /> : null}
          <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(74,158,170,.12),transparent_38%,rgba(115,87,198,.12))]" />
          <span className="relative flex items-center gap-2.5 text-xs font-black text-white/68 transition group-hover:text-white">
            <Radio className="h-4 w-4 text-[#72BBC5]" />
            Glisse vers le haut pour entrer dans le Flow
          </span>
        </button>
      </div>
    </div>
  );
}
