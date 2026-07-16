'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Bell, Pause, Play, Radio, Search, Sparkles } from 'lucide-react';
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

export default function HomeFlowPrelude(props: Props) {
  const {
    open,
    tracks,
    currentTrack,
    currentPlaying,
    onEnterFlow,
    onPlayTrack,
    onOpenTrack,
    onSearch,
    onNotifications,
    onStudio,
  } = props;
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const firstTrack = tracks.find((track) => Boolean(track.audioUrl)) || null;
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isResume = Boolean(isCurrentTrack && currentTrack?.audioUrl);

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

  return (
    <div
      className={`synaura-home-prelude fixed inset-0 z-[120] overflow-hidden bg-[#0D0D0D] text-[#F7F6F3] transition-[transform,opacity] duration-300 ease-out ${leaving ? 'is-leaving -translate-y-full opacity-70' : 'translate-y-0 opacity-100'}`}
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
        .synaura-home-scene {
          transition: transform 320ms ease, opacity 260ms ease;
        }
        .synaura-home-prelude.is-leaving .synaura-home-scene {
          opacity: .18;
          transform: translateY(-46px) scale(.975);
        }
        @media (max-height: 700px) {
          .synaura-home-shell { gap: .55rem !important; padding-bottom: .55rem !important; }
          .synaura-home-header { height: 2.55rem !important; }
          .synaura-home-hero { min-height: 0 !important; }
          .synaura-home-artwork { width: min(31vh, 9rem) !important; }
          .synaura-home-title { font-size: 1.45rem !important; line-height: 1.1 !important; }
          .synaura-home-shortcut { min-height: 3.35rem !important; }
          .synaura-home-swipe-copy { display: none !important; }
        }
        @media (max-height: 560px) {
          .synaura-home-artwork { display: none !important; }
          .synaura-home-hero-copy { padding-top: 3.8rem !important; }
        }
        @media (max-width: 639px) {
          .synaura-home-hero-copy { padding-top: min(48vw, 12.5rem); }
        }
        @media (prefers-reduced-motion: reduce) {
          .synaura-home-prelude, .synaura-home-prelude * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="h-full">
        <div className="synaura-home-scene h-full bg-[linear-gradient(145deg,#151318_0%,#0D0D0D_42%,#090909_100%)]">
          <div className="synaura-home-shell mx-auto flex h-[100svh] w-full max-w-6xl flex-col gap-3 px-4 pb-[max(env(safe-area-inset-bottom),0.85rem)] pt-[max(env(safe-area-inset-top),0.8rem)] sm:gap-4 sm:px-7 sm:pb-5 sm:pt-5">
            <header className="synaura-home-header flex h-12 shrink-0 items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-[#F7F6F3] text-[#111111] shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
                  <Radio className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block text-[15px] font-black leading-none">Synaura</strong>
                  <span className="mt-1 block text-[10px] font-bold text-white/45">Ton monde musical</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onSearch} aria-label="Rechercher" className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.06] transition hover:bg-white/[0.12]">
                  <Search className="h-[18px] w-[18px]" />
                </button>
                <button type="button" onClick={onNotifications} aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.06] transition hover:bg-white/[0.12]">
                  <Bell className="h-[18px] w-[18px]" />
                </button>
              </div>
            </header>

            <section className="synaura-home-hero relative min-h-[290px] flex-1 overflow-hidden rounded-lg bg-[#151214] text-[#F7F6F3] shadow-[0_22px_70px_rgba(30,22,25,0.18)]">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#76505A_0%,#272126_48%,#0D0D0D_100%)]" />
              {featuredTrack?.coverUrl ? (
                <img src={featuredTrack.coverUrl} alt="" className="absolute inset-[-12%] h-[124%] w-[124%] scale-110 object-cover opacity-55 blur-[30px] saturate-125" />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,10,10,0.88)_0%,rgba(11,10,10,0.5)_54%,rgba(11,10,10,0.28)_100%)] sm:bg-[linear-gradient(90deg,rgba(11,10,10,0.9)_0%,rgba(11,10,10,0.62)_52%,rgba(11,10,10,0.2)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.08)_0%,rgba(13,13,13,0.08)_50%,rgba(13,13,13,0.92)_100%)]" />

              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 sm:left-6 sm:top-6">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D96D63]" />
                <span className="text-[9px] font-black uppercase text-[#F1CEC1]">{isResume ? "Reprendre l'écoute" : 'Choisi pour toi'}</span>
              </div>

              {featuredTrack?.coverUrl ? (
                <button type="button" onClick={() => onOpenTrack(featuredTrack)} aria-label={`Ouvrir ${featuredTrack.title}`} className="synaura-home-artwork absolute left-1/2 top-[14%] z-10 aspect-square w-[min(42vw,11rem)] -translate-x-1/2 overflow-hidden rounded-lg border border-white/15 bg-black/20 shadow-[0_22px_70px_rgba(0,0,0,0.42)] transition duration-300 hover:scale-[1.015] sm:left-auto sm:right-[7%] sm:top-1/2 sm:w-[clamp(10rem,25vh,17rem)] sm:-translate-x-0 sm:-translate-y-1/2">
                  <img src={featuredTrack.coverUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <div className="synaura-home-artwork absolute left-1/2 top-[14%] z-10 grid aspect-square w-[min(42vw,11rem)] -translate-x-1/2 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-[0_22px_70px_rgba(0,0,0,0.34)] sm:left-auto sm:right-[7%] sm:top-1/2 sm:w-[clamp(10rem,25vh,17rem)] sm:-translate-x-0 sm:-translate-y-1/2">
                  <img src="/brand/2026/synaura-symbol-2026-white.png" alt="" className="h-[58%] w-[58%] object-contain opacity-65" />
                </div>
              )}

              <div className="synaura-home-hero-copy absolute inset-x-0 bottom-0 z-20 p-4 sm:max-w-[62%] sm:p-6 lg:max-w-[58%] lg:p-8">
                <button type="button" onClick={() => featuredTrack && onOpenTrack(featuredTrack)} disabled={!featuredTrack} className="block max-w-full text-left disabled:cursor-default">
                  <h1 className="synaura-home-title line-clamp-2 text-[1.8rem] font-black leading-[1.02] sm:text-4xl lg:text-[2.65rem]">
                    {featuredTrack?.title || 'Ton Flow se prépare'}
                  </h1>
                  <p className="mt-2 truncate text-xs font-bold text-white/62 sm:text-sm">
                    {featuredTrack ? artistName(featuredTrack) : 'De nouveaux sons arrivent sur Synaura'}
                  </p>
                </button>

                <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
                  <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onPlayTrack(featuredTrack)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7F6F3] px-4 text-xs font-black text-[#111111] shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition hover:bg-white disabled:opacity-50">
                    {isCurrentTrack && currentPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                    Écouter
                  </button>
                  <button type="button" onClick={enterFlow} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.09] px-4 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/[0.15]">
                    <Radio className="h-4 w-4" />
                    Entrer dans le Flow
                  </button>
                </div>
              </div>
            </section>

            <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3">
              <button type="button" onClick={enterFlow} className="synaura-home-shortcut flex min-h-[4.15rem] min-w-0 items-center gap-3 rounded-lg border border-white/[0.09] bg-[#19191A] px-3.5 text-left text-white shadow-[0_12px_34px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#202022] sm:px-5">
                <Radio className="h-5 w-5 shrink-0 text-[#4A9EAA]" />
                <span className="min-w-0">
                  <strong className="block text-xs font-black sm:text-sm">Flow</strong>
                  <span className="mt-1 block truncate text-[9px] font-semibold text-white/46 sm:text-[10px]">Découvrir maintenant</span>
                </span>
              </button>
              <button type="button" onClick={onStudio} className="synaura-home-shortcut flex min-h-[4.15rem] min-w-0 items-center gap-3 rounded-lg border border-white/[0.09] bg-[#19191A] px-3.5 text-left text-white shadow-[0_12px_34px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#202022] sm:px-5">
                <Sparkles className="h-5 w-5 shrink-0 text-[#D96D63]" />
                <span className="min-w-0">
                  <strong className="block text-xs font-black sm:text-sm">Studio</strong>
                  <span className="mt-1 block truncate text-[9px] font-semibold text-white/46 sm:text-[10px]">Créer un morceau</span>
                </span>
              </button>
            </div>

            <button type="button" onClick={enterFlow} className="synaura-home-swipe-copy flex h-6 shrink-0 items-center justify-center gap-2 text-[9px] font-black uppercase text-white/38">
              <span>Glisse vers le Flow</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
