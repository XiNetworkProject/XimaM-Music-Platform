'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Activity, Check, Clock3, Headphones, Heart, Maximize2, MessageCircle, Play, Radar, UserPlus } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import TrackCover from '@/components/TrackCover';

type RadarArtist = {
  _id?: string;
  username?: string;
  name?: string;
  artistName?: string;
  avatar?: string | null;
};

export type RadarTrack = {
  _id: string;
  title: string;
  artist?: RadarArtist | null;
  audioUrl?: string;
  coverUrl?: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  duration?: number;
  plays?: number;
  likes?: unknown[];
  likesCount?: number;
  commentsCount?: number;
  savesCount?: number;
  reactionsCount?: number;
  completionRate?: number;
  radarScore?: number;
  radarReasons?: string[];
  radarSignalLabel?: string;
  isNewThisWeek?: boolean;
  isLiked?: boolean;
  genre?: string[] | string;
  createdAt?: string;
  isAI?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function countValue(value: unknown) {
  if (Array.isArray(value)) return value.length;
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCount(value: unknown) {
  const n = countValue(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  if (!safe) return '';
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function artistName(track: RadarTrack) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function artistHref(track: RadarTrack) {
  const username = track.artist?.username;
  return username ? `/profile/${encodeURIComponent(username)}` : '/discover';
}

function toPlayerTrack(track: RadarTrack) {
  const name = artistName(track);
  return {
    ...track,
    _id: track._id,
    title: track.title || 'Sans titre',
    artist: {
      _id: track.artist?._id || track.artist?.username || '',
      name,
      username: track.artist?.username || name,
      avatar: track.artist?.avatar || undefined,
    },
    audioUrl: track.audioUrl || '',
    coverUrl: track.coverUrl || '/default-cover.svg',
    coverVideoUrl: track.coverVideoUrl || null,
    coverVideoPosterUrl: track.coverVideoPosterUrl || track.coverUrl || null,
    duration: track.duration || 0,
    likes: Array.isArray(track.likes) ? track.likes : [],
    comments: [],
    plays: track.plays || 0,
    genre: Array.isArray(track.genre) ? track.genre : track.genre ? [track.genre] : [],
  };
}

function openFullPlayer() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('synaura:open-full-player'));
}

function RadarLikeButton({ track }: { track: RadarTrack }) {
  const initialLikes = countValue(track.likesCount ?? track.likes);
  const { isLiked, likesCount, isLoading, toggleLike } = useLikeSystem({
    trackId: track._id,
    initialLikesCount: initialLikes,
    initialIsLiked: Boolean(track.isLiked),
  });

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleLike();
      }}
      disabled={isLoading}
      className={cx(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition',
        isLiked ? 'border-[#D96D63]/55 bg-[#D96D63]/18 text-white' : 'border-white/12 bg-white/[0.07] text-white/72 hover:bg-white/[0.12] hover:text-white',
        isLoading && 'opacity-60',
      )}
    >
      <Heart className={cx('h-3.5 w-3.5', isLiked && 'fill-current')} />
      {formatCount(likesCount)}
    </button>
  );
}

function RadarFollowButton({ artist }: { artist?: RadarArtist | null }) {
  const { data: session } = useSession();
  const username = artist?.username || '';
  const viewerUsername = (session?.user as any)?.username || '';
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || !username || username === viewerUsername) {
      setReady(true);
      return;
    }
    let mounted = true;
    fetch(`/api/users/${encodeURIComponent(username)}/follow`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json) return;
        setFollowing(Boolean(json.isFollowing ?? json.following));
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [session?.user?.id, username, viewerUsername]);

  if (!username || username === viewerUsername) return null;

  if (!session?.user?.id) {
    return (
      <Link
        href="/auth/signin"
        onClick={(event) => event.stopPropagation()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3 text-xs font-black text-white/72 transition hover:bg-white/[0.12] hover:text-white"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Suivre
      </Link>
    );
  }

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3 text-xs font-black text-white/45"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Suivre
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        setBusy(true);
        try {
          const res = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'POST' });
          const json = await res.json().catch(() => null);
          if (res.ok) setFollowing(json?.action === 'followed' || json?.following === true || json?.isFollowing === true);
        } finally {
          setBusy(false);
        }
      }}
      className={cx(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition',
        following ? 'border-white/12 bg-white text-[#111111]' : 'border-white/12 bg-white/[0.07] text-white/72 hover:bg-white/[0.12] hover:text-white',
        busy && 'opacity-60',
      )}
    >
      {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? 'Suivi' : 'Suivre'}
    </button>
  );
}

function RadarTrackCard({ track, tracks, featured = false }: { track: RadarTrack; tracks: RadarTrack[]; featured?: boolean }) {
  const { setQueueAndPlay } = useAudioPlayer();
  const duration = formatDuration(track.duration);
  const reasons = Array.isArray(track.radarReasons) ? track.radarReasons.filter(Boolean).slice(0, 3) : [];
  const score = Math.max(0, Math.round(Number(track.radarScore || 0)));
  const completionRate = Math.max(0, Math.round(Number(track.completionRate || 0)));

  const play = (full = false) => {
    const playable = tracks.filter((item) => item.audioUrl).map(toPlayerTrack);
    const start = Math.max(0, playable.findIndex((item) => item._id === track._id));
    setQueueAndPlay(playable as any, start >= 0 ? start : 0);
    if (full) window.setTimeout(openFullPlayer, 80);
  };

  return (
    <article
      className={cx(
        'group/card relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-white/[0.085]',
        featured && 'lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-4',
      )}
    >
      <div className={cx('relative overflow-hidden rounded-[1.15rem]', featured ? 'lg:min-h-[220px]' : '')}>
        <TrackCover
          src={track.coverUrl || '/default-cover.svg'}
          videoSrc={track.coverVideoUrl || null}
          posterSrc={track.coverVideoPosterUrl || track.coverUrl || null}
          title={track.title}
          className={cx('aspect-square w-full', featured && 'lg:h-full lg:aspect-auto')}
          rounded="rounded-[1.15rem]"
          objectFit="cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/8 to-transparent" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#7357C6]/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
            <Radar className="h-3 w-3" />
            Radar
          </span>
          {track.isNewThisWeek ? (
            <span className="rounded-full bg-[#4A9EAA]/90 px-2.5 py-1 text-[10px] font-black text-white">Nouveau</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => play(false)}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-white text-[#111111] shadow-[0_16px_35px_rgba(0,0,0,0.32)] transition hover:scale-105"
          aria-label={`Lire ${track.title}`}
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </button>
      </div>

      <div className={cx('mt-3 flex min-w-0 flex-col', featured && 'lg:mt-0 lg:justify-between')}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/62">
              {track.radarSignalLabel || 'Signal Radar'}
            </span>
            {duration ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/42">
                <Clock3 className="h-3 w-3" />
                {duration}
              </span>
            ) : null}
          </div>
          <h3 className={cx('mt-2 line-clamp-2 font-black tracking-[-0.04em]', featured ? 'text-2xl sm:text-3xl' : 'text-base')}>
            {track.title}
          </h3>
          <Link href={artistHref(track)} className="mt-1 block truncate text-sm font-bold text-white/50 transition hover:text-white">
            {artistName(track)}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          <div className="rounded-[0.9rem] bg-white/[0.06] px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/35"><Headphones className="h-3 w-3" /> Ecoutes</p>
            <p className="mt-1 text-sm font-black">{formatCount(track.plays || 0)}</p>
          </div>
          <div className="rounded-[0.9rem] bg-white/[0.06] px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/35"><Activity className="h-3 w-3" /> Score</p>
            <p className="mt-1 text-sm font-black">{score}</p>
          </div>
          <div className="rounded-[0.9rem] bg-white/[0.06] px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/35"><MessageCircle className="h-3 w-3" /> Signaux</p>
            <p className="mt-1 text-sm font-black">{formatCount((track.commentsCount || 0) + (track.reactionsCount || 0))}</p>
          </div>
        </div>

        {completionRate > 0 || reasons.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {completionRate > 0 ? <span className="rounded-full bg-white/[0.075] px-2.5 py-1 text-[10px] font-bold text-white/58">{completionRate}% completion</span> : null}
            {reasons.map((reason) => (
              <span key={reason} className="rounded-full bg-white/[0.075] px-2.5 py-1 text-[10px] font-bold text-white/58">
                {reason}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => play(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-[#111111] transition hover:scale-[1.02]"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Play
          </button>
          <RadarLikeButton track={track} />
          <RadarFollowButton artist={track.artist} />
          <button
            type="button"
            onClick={() => play(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3 text-xs font-black text-white/72 transition hover:bg-white/[0.12] hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Plein écran
          </button>
        </div>
      </div>
    </article>
  );
}

function EmergingArtists({ tracks }: { tracks: RadarTrack[] }) {
  const artists = useMemo(() => {
    const byId = new Map<string, { artist: RadarArtist; tracks: number; cover?: string | null }>();
    for (const track of tracks) {
      const id = track.artist?._id || track.artist?.username;
      if (!id) continue;
      const current = byId.get(id);
      byId.set(id, {
        artist: track.artist!,
        tracks: (current?.tracks || 0) + 1,
        cover: current?.cover || track.coverUrl || null,
      });
    }
    return Array.from(byId.values()).slice(0, 6);
  }, [tracks]);

  if (!artists.length) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">Nouveaux artistes prometteurs</p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-white">Des univers à suivre tôt.</h3>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map(({ artist, tracks: count, cover }) => {
          const label = artist.artistName || artist.name || artist.username || 'Artiste Synaura';
          return (
            <Link
              key={artist._id || artist.username || label}
              href={artist.username ? `/profile/${encodeURIComponent(artist.username)}` : '/discover'}
              className="flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-white/10 bg-white/[0.055] p-2.5 transition hover:bg-white/[0.09]"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[0.9rem] bg-white/[0.08] text-sm font-black text-white">
                {artist.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.avatar} alt="" className="h-full w-full object-cover" />
                ) : cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  label.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{label}</p>
                <p className="mt-0.5 text-xs font-bold text-white/42">{count} son{count > 1 ? 's' : ''} dans le Radar</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function RadarSection({
  tracks,
  title = 'Radar des petits créateurs',
  compact = false,
  showViewAll = false,
}: {
  tracks: RadarTrack[];
  title?: string;
  compact?: boolean;
  showViewAll?: boolean;
}) {
  const newThisWeek = tracks.filter((track) => track.isNewThisWeek).slice(0, compact ? 3 : 6);
  const visible = compact ? tracks.slice(0, 8) : tracks;
  const featured = visible[0];
  const rest = compact ? visible : visible.slice(1);

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#111111] p-4 text-white shadow-[0_26px_90px_rgba(17,17,17,0.24)] sm:p-6">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(115,87,198,0.24),transparent_34%),linear-gradient(160deg,transparent_52%,rgba(74,158,170,0.16)),linear-gradient(0deg,rgba(217,109,99,0.12),transparent_34%)]" />
      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/62">
              <Radar className="h-3.5 w-3.5 text-[#4A9EAA]" />
              Radar Synaura
            </p>
            <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl">{title}</h2>
            <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/62 sm:text-base">
              Découvre les sons avant tout le monde. Sur Synaura, même un petit créateur peut trouver ses premiers vrais auditeurs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showViewAll ? (
              <Link href="/radar" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#111111] transition hover:scale-[1.02]">
                Voir tout le Radar
              </Link>
            ) : null}
          </div>
        </div>

        {tracks.length ? (
          <>
            {newThisWeek.length ? (
              <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-3">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Nouveaux cette semaine</p>
                <div className="flex flex-wrap gap-2">
                  {newThisWeek.map((track) => (
                    <span
                      key={track._id}
                      className="rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-white/68"
                    >
                      {track.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={cx('mt-6 grid gap-3', compact ? 'sm:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]')}>
              {!compact && featured ? <RadarTrackCard track={featured} tracks={tracks} featured /> : null}
              <div className={cx('grid gap-3', compact ? 'contents' : 'sm:grid-cols-2')}>
                {(compact ? visible : rest).map((track) => (
                  <RadarTrackCard key={track._id} track={track} tracks={tracks} />
                ))}
              </div>
            </div>

            {!compact ? <EmergingArtists tracks={tracks} /> : null}
          </>
        ) : (
          <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/16 bg-white/[0.04] p-7 text-center">
            <p className="text-base font-black text-white/70">Le Radar attend les prochains signaux.</p>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-white/42">
              Dès que des morceaux publics avec audio remontent des signaux réels, ils apparaîtront ici.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
