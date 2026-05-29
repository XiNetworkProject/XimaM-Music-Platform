"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAudioPlayer } from "@/app/providers";
import { applyCdnToTracks } from "@/lib/cdnHelpers";
import FollowButton from "@/components/FollowButton";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Track = {
  _id: string;
  title: string;
  artist: { _id: string; name: string; username: string; avatar?: string };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: number | string[];
  comments: number | string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  lyrics?: string;
};

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, "0")}`;
};

const fmtCount = (n: number) => {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

function countOf(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number") return value;
  return 0;
}

export default function SwipePage() {
  const router = useRouter();
  const { audioState, setQueueAndPlay, playTrack, play, pause, seek, handleLike } = useAudioPlayer();

  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const wheelLockRef = useRef(false);
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const currentId = currentTrack?._id;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/ranking/feed?limit=60&ai=1", { cache: "no-store" });
        if (!res.ok) throw new Error("Chargement impossible");
        const json = await res.json();
        const list = applyCdnToTracks((Array.isArray(json?.tracks) ? json.tracks : []) as any) as Track[];
        if (!mounted) return;
        setTracks(list);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Impossible de charger le scroll");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const queueTracks = useMemo(
    () =>
      tracks.map((track) => ({
        ...track,
        coverUrl: track.coverUrl || "/brand/2026/synaura-symbol-2026-white.png",
        source: "swipe",
      })),
    [tracks],
  );

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    itemRefs.current[index]?.scrollIntoView({ behavior, block: "start" });
  }, []);

  const playIndex = useCallback(
    (index: number) => {
      const track = tracks[index];
      if (!track?._id) return;
      setActiveIndex(index);
      setQueueAndPlay(queueTracks as any, index);
    },
    [queueTracks, setQueueAndPlay, tracks],
  );

  useEffect(() => {
    if (!tracks.length) return;
    const root = containerRef.current;
    if (!root) return;
    const els = itemRefs.current.filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!best) return;
        const index = Number((best.target as HTMLElement).dataset.index);
        if (Number.isFinite(index)) setActiveIndex(index);
      },
      { root, threshold: [0.55, 0.72, 0.9] },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tracks.length]);

  useEffect(() => {
    const track = tracks[activeIndex];
    if (!track?._id || lyricsOpen) return;
    const timer = window.setTimeout(() => {
      if (currentId !== track._id) playIndex(activeIndex);
    }, 110);
    return () => window.clearTimeout(timer);
  }, [activeIndex, currentId, lyricsOpen, playIndex, tracks]);

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      if (lyricsOpen) return;
      if (wheelLockRef.current) {
        event.preventDefault();
        return;
      }
      const direction = event.deltaY > 0 ? 1 : -1;
      const next = Math.min(tracks.length - 1, Math.max(0, activeIndex + direction));
      if (next === activeIndex) return;
      wheelLockRef.current = true;
      event.preventDefault();
      scrollToIndex(next);
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 430);
    },
    [activeIndex, lyricsOpen, scrollToIndex, tracks.length],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (lyricsOpen) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollToIndex(Math.min(tracks.length - 1, activeIndex + 1));
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToIndex(Math.max(0, activeIndex - 1));
      }
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        audioState.isPlaying ? pause() : play();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        router.back();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, audioState.isPlaying, lyricsOpen, pause, play, router, scrollToIndex, tracks.length]);

  const shareTrack = useCallback(async (track: Track) => {
    const url = `${window.location.origin}/track/${track._id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: track.title, text: "Écoute sur Synaura", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignore
    }
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-[#fffaf2] text-[#171313]">
        <div className="rounded-[2rem] border border-[#dccfbb] bg-white p-8 text-center shadow-[0_24px_80px_rgba(44,33,19,0.16)]">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm font-black text-black/50">Chargement du scroll...</p>
        </div>
      </div>
    );
  }

  if (error || tracks.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-[#fffaf2] text-[#171313]">
        <div className="max-w-md rounded-[2rem] border border-[#dccfbb] bg-white p-8 text-center shadow-[0_24px_80px_rgba(44,33,19,0.16)]">
          <Sparkles className="mx-auto h-10 w-10 text-black/24" />
          <h1 className="mt-4 text-2xl font-black">Aucun son à afficher</h1>
          <p className="mt-2 text-sm font-semibold text-black/48">{error || "Le feed est vide pour le moment."}</p>
          <button onClick={() => router.push("/")} className="mt-5 h-11 rounded-full bg-[#171313] px-5 text-sm font-black text-white">
            Retour accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#171313] text-white">
      <div
        ref={containerRef}
        onWheel={onWheel}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {tracks.map((track, index) => {
          const isActive = index === activeIndex;
          const isPlayingThis = currentId === track._id && audioState.isPlaying;
          const currentTime = currentId === track._id ? audioState.currentTime || 0 : 0;
          const duration = currentId === track._id ? audioState.duration || track.duration || 0 : track.duration || 0;
          const likesCount = countOf(track.likes);
          const commentsCount = countOf(track.comments);

          return (
            <section
              key={track._id || index}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              data-index={index}
              className="relative h-[100svh] w-full snap-start overflow-hidden"
              style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
            >
              <div className="absolute inset-0">
                <img
                  src={track.coverUrl || "/brand/2026/synaura-symbol-2026-white.png"}
                  alt=""
                  className="h-full w-full scale-125 object-cover opacity-42 blur-3xl saturate-150"
                  onError={(event) => {
                    event.currentTarget.src = "/brand/2026/synaura-symbol-2026-white.png";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#171313]/90 via-[#171313]/35 to-[#171313]/92" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,111,97,0.22),transparent_30%),radial-gradient(circle_at_88%_30%,rgba(124,92,255,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(0,194,203,0.14),transparent_34%)]" />
              </div>

              <header className="absolute left-0 right-0 top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),1rem)]">
                <div className="flex items-center justify-between">
                  <button onClick={() => router.back()} className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/10 backdrop-blur-xl transition hover:bg-white/16" aria-label="Fermer">
                    <X className="h-5 w-5" />
                  </button>
                  <div className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 backdrop-blur-xl">
                    Scroll Synaura
                  </div>
                </div>
              </header>

              <div className="absolute inset-0 z-10 grid place-items-center px-5">
                <button
                  type="button"
                  onClick={() => {
                    if (currentId !== track._id) playIndex(index);
                    else if (audioState.isPlaying) pause();
                    else void play();
                  }}
                  className="group relative w-[min(76vw,520px)] overflow-hidden rounded-[2.2rem] border border-white/12 bg-white/8 shadow-[0_34px_100px_rgba(0,0,0,0.38)] backdrop-blur"
                >
                  <img
                    src={track.coverUrl || "/brand/2026/synaura-symbol-2026-white.png"}
                    alt={track.title}
                    className="aspect-square w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = "/brand/2026/synaura-symbol-2026-white.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid h-20 w-20 place-items-center rounded-full border border-white/18 bg-[#171313]/56 text-white shadow-xl backdrop-blur-xl transition group-hover:scale-105">
                      {isPlayingThis ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8 fill-current" />}
                    </span>
                  </div>
                </button>
              </div>

              <aside className="absolute right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3">
                <button onClick={() => handleLike(track._id)} className="grid min-h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
                  <Heart className={`h-5 w-5 ${track.isLiked ? "fill-[#ff6f61] text-[#ff6f61]" : ""}`} />
                  <span className="text-[10px] font-black">{fmtCount(likesCount)}</span>
                </button>
                <button onClick={() => router.push(`/track/${track._id}`, { scroll: false })} className="grid min-h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-[10px] font-black">{fmtCount(commentsCount)}</span>
                </button>
                <button onClick={() => shareTrack(track)} className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
                  <Share2 className="h-5 w-5" />
                </button>
                <a href={track.audioUrl} download className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
                  <Download className="h-5 w-5" />
                </a>
              </aside>

              <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
                <div className="mx-auto max-w-5xl rounded-[1.8rem] border border-white/12 bg-[#fffaf2]/95 p-4 text-[#171313] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/34">
                        {track.genre?.[0] || "Synaura"}
                      </p>
                      <h2 className="mt-1 truncate text-2xl font-black tracking-tight">{track.title}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-black/56">{track.artist?.name || track.artist?.username || "Artiste"}</p>
                        {track.artist?._id ? (
                          <FollowButton artistId={track.artist._id} artistUsername={track.artist.username} size="sm" className="rounded-full px-3 py-1 text-xs" />
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (currentId !== track._id) playIndex(index);
                        else if (audioState.isPlaying) pause();
                        else void play();
                      }}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#171313] text-white transition hover:scale-105"
                    >
                      {isPlayingThis ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-black/42">
                      <span>{fmtTime(currentTime)}</span>
                      <span>
                        {index + 1}/{tracks.length} · {fmtTime(duration)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, duration)}
                      value={Math.min(currentTime, Math.max(1, duration))}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (currentId === track._id) seek(value);
                        else {
                          void playTrack(track as any).then(() => setTimeout(() => seek(value), 120));
                        }
                      }}
                      className="h-2 w-full accent-[#171313]"
                    />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-28 right-4 z-30 hidden flex-col gap-2 md:flex">
                <button onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 backdrop-blur-xl transition hover:bg-white/16">
                  <ChevronUp className="h-5 w-5" />
                </button>
                <button onClick={() => scrollToIndex(Math.min(tracks.length - 1, activeIndex + 1))} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 backdrop-blur-xl transition hover:bg-white/16">
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              {lyricsOpen && isActive ? (
                <div className="absolute inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
                  <div className="mx-auto w-full max-w-4xl rounded-t-[2rem] border border-white/12 bg-[#fffaf2] p-5 text-[#171313]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black">Paroles</h3>
                      <button onClick={() => setLyricsOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06]">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <pre className="mt-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-sm font-semibold leading-7 text-black/64">
                      {track.lyrics?.trim() || "Aucune parole disponible pour ce titre."}
                    </pre>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
