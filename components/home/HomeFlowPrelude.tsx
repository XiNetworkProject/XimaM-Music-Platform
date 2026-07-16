'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Radio, Sparkles } from 'lucide-react';
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
        .synaura-proto-home {
          transition: opacity 280ms ease, transform 320ms ease;
        }
        .synaura-home-prelude.is-leaving .synaura-proto-home {
          opacity: 0;
          transform: translateY(-54px) scale(.96);
        }
        @media (max-height: 620px) {
          .synaura-proto-home { padding-top: max(env(safe-area-inset-top), .55rem) !important; padding-bottom: .45rem !important; }
          .synaura-proto-brand { margin-bottom: .55rem !important; }
          .synaura-proto-brand-mark { width: 2.1rem !important; height: 2.1rem !important; }
          .synaura-proto-shortcut-row { margin-top: .55rem !important; }
          .synaura-proto-shortcut { min-height: 3.35rem !important; }
          .synaura-proto-title { font-size: 1.5rem !important; line-height: 1.05 !important; }
        }
        @media (max-height: 480px) {
          .synaura-proto-brand-line { display: none !important; }
          .synaura-proto-hero { min-height: 10rem !important; }
          .synaura-proto-shortcut-sub { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .synaura-home-prelude, .synaura-home-prelude * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="synaura-proto-home mx-auto flex h-[92svh] w-full max-w-5xl flex-col px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] sm:px-6 sm:pt-5">
        <header className="synaura-proto-brand mb-4 flex shrink-0 items-center gap-2.5">
          <span className="synaura-proto-brand-mark grid h-[38px] w-[38px] place-items-center rounded-lg border border-white/10 bg-[#F7F6F3] text-[#111111] shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
            <Radio className="h-5 w-5" />
          </span>
          <span>
            <strong className="block text-lg font-black leading-none">Synaura</strong>
            <span className="synaura-proto-brand-line mt-1 block text-[10px] font-bold text-white/45">Ton monde musical</span>
          </span>
        </header>

        <section className="synaura-proto-hero relative flex min-h-[230px] flex-1 items-end overflow-hidden rounded-lg bg-[#161417] p-[18px] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#76505A_0%,#282127_48%,#0D0D0D_100%)]" />
          {featuredTrack?.coverUrl ? (
            <img src={featuredTrack.coverUrl} alt="" className="absolute inset-[-8%] h-[116%] w-[116%] scale-105 object-cover opacity-52 blur-2xl saturate-125" />
          ) : (
            <img src="/brand/2026/synaura-symbol-2026-white.png" alt="" className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.08)_0%,rgba(13,13,13,0.16)_42%,rgba(13,13,13,0.94)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,13,13,0.36),transparent_72%)]" />

          <div className="relative z-10 w-full max-w-2xl">
            <span className="text-[9px] font-black uppercase text-[#F1CEC1]">{isResume ? "Reprendre l'écoute" : 'Choisi pour toi'}</span>
            <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="mt-1.5 block max-w-full text-left disabled:cursor-default">
              <h1 className="synaura-proto-title line-clamp-2 text-[31px] font-black leading-[1.04] sm:text-4xl">
                {featuredTrack?.title || 'Ton Flow se prépare'}
              </h1>
              <p className="mt-1.5 truncate text-xs font-bold text-white/68">
                {featuredTrack ? artistName(featuredTrack) : 'Synaura prépare ta sélection'}
              </p>
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onPlayTrack(featuredTrack)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7F6F3] px-4 text-xs font-black text-[#111111] transition hover:bg-white disabled:opacity-50">
                {isCurrentTrack && currentPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                Écouter
              </button>
              <button type="button" onClick={enterFlow} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.1] px-4 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/[0.16]">
                <Radio className="h-4 w-4" />
                Entrer dans le Flow
              </button>
            </div>
          </div>
        </section>

        <div className="synaura-proto-shortcut-row mt-3 grid shrink-0 grid-cols-2 gap-2.5">
          <button type="button" onClick={enterFlow} className="synaura-proto-shortcut flex min-h-[70px] min-w-0 items-center gap-3 rounded-lg border border-white/[0.08] bg-[#19191B] px-3 text-left transition hover:bg-[#202023] sm:px-4">
            <Radio className="h-5 w-5 shrink-0 text-[#4A9EAA]" />
            <span className="min-w-0">
              <strong className="block text-xs font-black sm:text-sm">Flow</strong>
              <span className="synaura-proto-shortcut-sub mt-1 block truncate text-[9px] font-semibold text-white/45">Découvrir maintenant</span>
            </span>
          </button>
          <button type="button" onClick={onStudio} className="synaura-proto-shortcut flex min-h-[70px] min-w-0 items-center gap-3 rounded-lg border border-white/[0.08] bg-[#19191B] px-3 text-left transition hover:bg-[#202023] sm:px-4">
            <Sparkles className="h-5 w-5 shrink-0 text-[#D96D63]" />
            <span className="min-w-0">
              <strong className="block text-xs font-black sm:text-sm">Studio</strong>
              <span className="synaura-proto-shortcut-sub mt-1 block truncate text-[9px] font-semibold text-white/45">Créer un morceau</span>
            </span>
          </button>
        </div>
      </div>

      <button type="button" onClick={enterFlow} aria-label="Entrer dans le Flow" className="relative block h-[8svh] min-h-10 w-full overflow-hidden border-t border-white/[0.06] bg-[#111111]">
        {firstTrack?.coverUrl ? <img src={firstTrack.coverUrl} alt="" className="absolute inset-[-20%] h-[140%] w-[140%] object-cover opacity-24 blur-2xl" /> : null}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.3),#090909)]" />
        <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/22" />
      </button>
    </div>
  );
}
