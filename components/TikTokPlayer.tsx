'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Download,
  UserPlus,
  X,
  Music2,
  Disc3,
  Verified,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAudioPlayer } from '@/app/providers';
import LikeButton from './LikeButton';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * SynauraTikTokPlayer — feed vertical façon TikTok (v2.1.1)
 *
 * Fix build: ensure valid TSX, explicit types, semicolons.
 * Features:
 *  - Swipe haut/bas fluide (touch) et flèches ↑/↓ pour naviguer entre les cartes.
 *  - Colonne d'actions (like, commenter, partager, télécharger).
 *  - Drawer commentaires réel (liste + input).
 *  - Modale Terms avant téléchargement.
 *  - Mode vidéo si `srcVideo` est fourni, sinon cover.
 *  - Auto-play de la carte visible, pause des autres (IntersectionObserver).
 */

type Quality = "128k" | "192k" | "256k" | "320k" | "Lossless";

type Artist = {
  name: string;
  verified?: boolean;
  username?: string;
};

type Track = {
  id: string;
  title: string;
  artist: Artist;
  cover: string;
  src: string;
  srcVideo?: string;
  isAlbum?: boolean;
  albumTitle?: string;
  tracksCount?: number;
  quality?: Quality;
  likes?: number;
  comments?: number;
  shares?: number;
  lyrics?: string;
  isLiked?: boolean;
};

type TikTokPlayerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SynauraTikTokPlayer({ isOpen, onClose }: TikTokPlayerProps) {
  const { audioState, setCurrentTrackIndex, play, pause } = useAudioPlayer();
  const { data: session } = useSession();
  const router = useRouter();
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [lyricsFor, setLyricsFor] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState<boolean>(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);

  // Convert audioState tracks to TikTok format
  const tracks: Track[] = useMemo(() => {
    return audioState.tracks.map(t => ({
      id: t._id || '',
      title: t.title || 'Titre inconnu',
      artist: {
        name: t.artist?.name || t.artist?.username || 'Artiste inconnu',
        verified: (t.artist as any)?.isVerified || false,
        username: t.artist?.username
      },
      cover: t.coverUrl || '/default-cover.jpg',
      src: t.audioUrl || '',
      srcVideo: undefined,
      isAlbum: !!(t as any).album,
      albumTitle: (t as any).album || undefined,
      quality: '320k' as Quality,
      likes: typeof t.likes === 'number' ? t.likes : (Array.isArray(t.likes) ? t.likes.length : 0),
      comments: Array.isArray(t.comments) ? t.comments.length : 0,
      shares: 0,
      lyrics: (t as any).lyrics,
      isLiked: t.isLiked || false
    }));
  }, [audioState.tracks]);

  // Initialize activeId with current track
  useEffect(() => {
    if (isOpen && audioState.currentTrackIndex >= 0 && tracks[audioState.currentTrackIndex]) {
      setActiveId(tracks[audioState.currentTrackIndex].id);
    }
  }, [isOpen, audioState.currentTrackIndex, tracks]);

  // Simple in-memory comments store
  type Comment = { id: string; author: string; text: string; ts: number };
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});

  // IntersectionObserver => active card
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;

    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card]"));
    const observer = new IntersectionObserver(
      (entries) => {
        let best: Element | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          const ratio = entry.intersectionRatio;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = entry.target;
          }
        }
        if (best) {
          const id = best.getAttribute("data-id") || undefined;
          setActiveId(id);
          
          // Update current track index in audio context
          const idx = tracks.findIndex(t => t.id === id);
          if (idx >= 0 && idx !== audioState.currentTrackIndex) {
            setCurrentTrackIndex(idx);
          }
        }
      },
      { threshold: [0.25, 0.5, 0.75, 0.9] }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [tracks.length, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as HTMLElement).isContentEditable)
      )
        return;
      if (e.code === "ArrowDown") {
        scrollToOffset(1);
      }
      if (e.code === "ArrowUp") {
        scrollToOffset(-1);
      }
      if (e.code === "Escape") {
        if (commentsOpen) {
          setCommentsOpen(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeId, commentsOpen, isOpen]);

  const scrollToOffset = (delta: number) => {
    const i = tracks.findIndex((t) => t.id === activeId);
    const nextIdx = Math.max(0, Math.min(tracks.length - 1, i + delta));
    const pane = containerRef.current?.querySelector<HTMLElement>(`[data-id="${tracks[nextIdx].id}"]`);
    pane?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const fmt = new Intl.NumberFormat("fr-FR");

  // Index courant
  const currentIndex = tracks.findIndex((t) => t.id === activeId);

  // Touch swipe (haut/bas très fluide)
  const touchStartRef = useRef<{ y: number; time: number; locked: boolean }>({ y: 0, time: 0, locked: false });
  const onTouchStart = (e: React.TouchEvent) => {
    const y = e.touches?.[0]?.clientY ?? 0;
    touchStartRef.current = { y, time: performance.now(), locked: false };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const y = e.touches?.[0]?.clientY ?? 0;
    const dy = y - touchStartRef.current.y;
    if (!touchStartRef.current.locked && Math.abs(dy) > 8) {
      touchStartRef.current.locked = true;
    }
  };
  const smoothScrollToCard = (index: number) => {
    const pane = containerRef.current?.querySelector<HTMLElement>(`[data-id="${tracks[index]?.id}"]`);
    pane?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches?.[0]?.clientY ?? touchStartRef.current.y;
    const dy = endY - touchStartRef.current.y; // + = vers le bas
    const dt = Math.max(1, performance.now() - touchStartRef.current.time);
    const velocity = dy / dt; // px/ms
    const threshold = 60;
    const fast = Math.abs(velocity) > 0.6 && Math.abs(dy) > 24;

    if (Math.abs(dy) > threshold || fast) {
      if (dy < 0 && currentIndex < tracks.length - 1) {
        smoothScrollToCard(currentIndex + 1);
      } else if (dy > 0 && currentIndex > 0) {
        smoothScrollToCard(currentIndex - 1);
      } else {
        smoothScrollToCard(currentIndex);
      }
    } else {
      smoothScrollToCard(currentIndex);
    }
  };

  const handleFollow = (username?: string) => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }
    if (username) {
      // Call follow API
      fetch(`/api/users/${username}/follow`, { method: 'POST' })
        .then(() => console.log('Followed'))
        .catch(() => console.error('Follow error'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a12] text-white select-none">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 left-3 z-50 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
        aria-label="Fermer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Up/Down hint */}
      <div className="pointer-events-none absolute top-3 right-3 z-40 hidden sm:flex flex-col items-center text-white/60 text-xs">
        <ChevronUp className="w-4 h-4" />
        <span>Swipe ↑ / ↓</span>
        <ChevronDown className="w-4 h-4 mt-1" />
      </div>

      {/* Scroll container */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar"
      >
        {tracks.map((t) => (
          <section
            data-card
            data-id={t.id}
            key={t.id}
            className="h-screen w-full snap-center flex items-center justify-center relative px-5"
          >
            {/* Media center: video if srcVideo else cover */}
            <div className="relative">
              {t.srcVideo ? (
                <video
                  ref={(node) => {
                    if (node) videoRefs.current[t.id] = node;
                  }}
                  src={t.srcVideo}
                  className="w-[72vw] max-w-[520px] aspect-square object-cover rounded-3xl border border-white/10 shadow-xl bg-black"
                  playsInline
                  muted
                  loop
                />
              ) : (
                <img
                  src={t.cover}
                  alt={t.title}
                  className="w-[72vw] max-w-[520px] aspect-square object-cover rounded-3xl border border-white/10 shadow-xl"
                />
              )}
            </div>

            {/* Colonne d'actions droite */}
            <aside className="absolute right-3 bottom-28 flex flex-col items-center gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <LikeButton
                  trackId={t.id}
                  initialIsLiked={t.isLiked || false}
                  initialLikesCount={t.likes || 0}
                  showCount={true}
                  size="lg"
                />
              </div>
              <ActionBtn
                count={fmt.format(commentsMap[t.id]?.length || t.comments || 0)}
                onClick={() => setCommentsOpen(true)}
                icon={MessageCircle}
                ariaLabel="Commentaires"
              />
              <ActionBtn
                count={fmt.format(t.shares || 0)}
                onClick={() =>
                  (navigator as any)?.share?.({ title: t.title, url: location.href }).catch(() => alert("Partage (mock)"))
                }
                icon={Share2}
                ariaLabel="Partager"
              />
              <ActionBtn onClick={() => setDownloadId(t.id)} icon={Download} ariaLabel="Télécharger" />
            </aside>

            {/* Bandeau bas info */}
            <footer className="absolute left-0 right-0 bottom-0 p-4">
              <div className="mx-auto max-w-3xl bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white/70 flex items-center gap-1">
                      <Music2 className="w-4 h-4" /> {t.isAlbum ? "Album" : "Single"}
                      {t.isAlbum && t.albumTitle ? (
                        <span className="ml-1 text-white/60">
                          • {t.albumTitle}
                          {t.tracksCount ? ` (${t.tracksCount})` : ""}
                        </span>
                      ) : null}
                    </p>
                    <h2 className="text-lg font-semibold truncate">{t.title}</h2>
                    <div className="mt-0.5 flex items-center gap-2 text-sm">
                      <span 
                        className="font-medium truncate flex items-center gap-1 cursor-pointer hover:underline"
                        onClick={() => t.artist.username && router.push(`/profile/${t.artist.username}`)}
                      >
                        {t.artist.name}
                        {t.artist.verified && <Verified className="w-4 h-4 text-sky-300" />}
                      </span>
                      <button 
                        onClick={() => handleFollow(t.artist.username)}
                        className="px-2 py-0.5 text-xs rounded-md bg-white/10 border border-white/10 hover:bg-white/15 flex items-center gap-1 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Suivre
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-white/60 flex items-center gap-1">
                      <Disc3 className="w-3.5 h-3.5" /> Qualité audio: <span className="ml-1 font-medium">{t.quality || "320k"}</span>
                    </p>
                  </div>

                  {/* Play/Pause local */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeId === t.id && audioState.isPlaying ? (
                      <button
                        onClick={() => pause()}
                        className="p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition"
                        aria-label="Pause"
                      >
                        <Pause className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const idx = tracks.findIndex(tr => tr.id === t.id);
                          if (idx >= 0) {
                            setCurrentTrackIndex(idx);
                            play();
                          }
                        }}
                        className="p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition"
                        aria-label="Lecture"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    )}
                    {t.lyrics && (
                      <button
                        onClick={() => setLyricsFor((id) => (id === t.id ? null : t.id))}
                        className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-sm transition"
                      >
                        Paroles
                      </button>
                    )}
                  </div>
                </div>

                {/* Paroles */}
                {t.lyrics && lyricsFor === t.id && (
                  <div className="mt-3 max-h-40 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-white/85 border-t border-white/10 pt-2">
                    {t.lyrics}
                  </div>
                )}
              </div>
            </footer>
          </section>
        ))}
      </div>

      {/* Drawer commentaires */}
      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        track={tracks.find((t) => t.id === activeId)}
        comments={(activeId && commentsMap[activeId]) || []}
        onAdd={(text) => {
          if (!text?.trim() || !activeId) return;
          setCommentsMap((m) => ({
            ...m,
            [activeId]: [
              ...(m[activeId] || []),
              { id: Math.random().toString(36).slice(2), author: "Vous", text, ts: Date.now() },
            ],
          }));
        }}
      />

      {/* Modal Terms avant download */}
      <TermsModal
        open={!!downloadId}
        onCancel={() => setDownloadId(null)}
        onAccept={() => {
          const t = tracks.find((x) => x.id === downloadId);
          setDownloadId(null);
          if (!t) return;
          try {
            const a = document.createElement("a");
            a.href = t.src;
            a.download = `${t.title}.mp3`;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch {
            alert("Téléchargement démarré");
          }
        }}
      />

      <DevTests tracks={tracks} />
    </div>
  );
}

type ActionBtnProps = {
  icon: React.ComponentType<{ className?: string }>;
  count?: string | number;
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
};

function ActionBtn({ icon: Icon, count, onClick, active, ariaLabel }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition hover:bg-white/10 ${
        active ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10"
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? "text-rose-300" : ""}`} />
      {typeof count !== "undefined" && (
        <span className="text-[10px] leading-none text-white/70">{count}</span>
      )}
    </button>
  );
}

// --- Drawer Commentaires ---

type CommentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  track?: Track;
  comments: { id: string; author: string; text: string; ts: number }[];
  onAdd: (text: string) => void;
};

function CommentsDrawer({ open, onClose, track, comments, onAdd }: CommentsDrawerProps) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (!open) setText("");
  }, [open]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#0c0c15] border-l border-white/10 transform transition ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <p className="text-sm font-semibold">
            Commentaires — <span className="text-white/70">{track?.title || "—"}</span>
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-140px)]">
          {comments.length === 0 && (
            <p className="text-sm text-white/60">Soyez le premier à commenter.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                {(c.author[0] || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium">{c.author}</span>{" "}
                  <span className="text-white/50 text-xs ml-1">
                    {new Date(c.ts).toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-white/90 whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAdd(text);
              setText("");
            }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-sm transition">
              Envoyer
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

// --- Modal Terms ---

type TermsModalProps = {
  open: boolean;
  onCancel: () => void;
  onAccept: () => void;
};

function TermsModal({ open, onCancel, onAccept }: TermsModalProps) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        onClick={onCancel}
        className={`absolute inset-0 bg-black/50 transition ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[520px] bg-[#0c0c15] border border-white/10 rounded-2xl p-4 shadow-xl transform transition ${
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <h3 className="text-lg font-semibold">Conditions de téléchargement</h3>
        <p className="mt-2 text-sm text-white/80">
          En téléchargeant ce média, vous confirmez :
          <br />• Usage personnel uniquement (pas de redistribution non autorisée)
          <br />• Respect des droits d'auteur et des licences
          <br />• Conformité RGPD et CGU Synaura
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm transition"
          >
            Annuler
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-sm transition"
          >
            J'accepte
          </button>
        </div>
      </div>
    </div>
  );
}

/** Dev tests — assertions légères en console (étendues). */
function DevTests({ tracks }: { tracks: Track[] }) {
  useEffect(() => {
    try {
      if (tracks.length > 0) {
        console.assert(Array.isArray(tracks), "Feed should be an array");
        console.assert(typeof tracks[0].title === "string", "Track has title");
        console.assert(!!tracks[0].cover && !!tracks[0].src, "Track has cover & src");
        console.log(`[DevTests] TikTok Player v2.1.1 - ${tracks.length} tracks loaded OK`);
      }
    } catch (e) {
      console.error("[DevTests] FAILED", e);
    }
  }, [tracks]);
  return null;
}
