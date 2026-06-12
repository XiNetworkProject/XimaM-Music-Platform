'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import NotificationCenter, { notify } from '@/components/NotificationCenter';
import SharedPostCard, { type Post as BasePost } from '@/components/PostCard';
import { SynauraMobileDock as SharedSynauraMobileDock } from '@/components/synaura/SynauraShell';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import TrackCreateRemixActions from '@/components/TrackCreateRemixActions';
import TrackCover from '@/components/TrackCover';
import SynauraAndroidHomeBanner from '@/components/mobile/SynauraAndroidHomeBanner';
import SynauraEventsRail from '@/components/synaura/SynauraEventsRail';
import { useLikeSystem } from '@/hooks/useLikeSystem';
import { sendTrackEvents } from '@/lib/analyticsClient';
import { isPastShutdownEnd, isShutdownAnnounced, SHUTDOWN_END_DATE_LABEL } from '@/lib/synauraShutdown';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Home,
  Image as ImageIcon,
  Library,
  ListPlus,
  Loader2,
  MessageSquare,
  MessageCircle,
  Mic2,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Radio,
  Repeat2,
  Search,
  Share2,
  Send,
  Sparkles,
  Smartphone,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

type PlayerTrack = {
  _id: string;
  title: string;
  artist: {
    _id?: string;
    name?: string;
    username?: string;
    avatar?: string;
    artistName?: string;
  };
  audioUrl?: string;
  coverUrl?: string;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  duration?: number;
  plays?: number;
  likes?: string[] | number;
  comments?: string[] | number;
  isLiked?: boolean;
  isAI?: boolean;
  isBoosted?: boolean;
  genre?: string[];
  album?: string | null;
};

type Track = {
  id: string;
  title: string;
  artist: string;
  artistHref?: string;
  cover: string;
  coverVideo?: string | null;
  coverVideoPoster?: string | null;
  style: string;
  plays: string;
  likes: string;
  comments: string;
  likesCount: number;
  commentsCount: number;
  tint: string;
  playerTrack: PlayerTrack;
};

type Playlist = {
  id: string;
  title: string;
  curator: string;
  covers: string[];
  tracks: string;
  vibe: string;
  href: string;
};

type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  tag: string;
  followers: string;
  tint: string;
  href: string;
};

type PostItem = {
  id: string;
  kind: 'post';
  entity: BasePost;
  creatorId: string;
  author: string;
  handle: string;
  avatar: string;
  authorHref?: string;
  time: string;
  mood: string;
  text: string;
  image?: string;
  href: string;
  track?: Track;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
};

type RadioItem = {
  id: string;
  kind: 'radio';
  title: string;
  subtitle: string;
  station: string;
  listeners: string;
  color: string;
  track: PlayerTrack;
};

type FeedItem =
  | { id: string; kind: 'composer' }
  | { id: string; kind: 'city' }
  | PostItem
  | { id: string; kind: 'track'; title: string; subtitle: string; track: Track; label: string }
  | { id: string; kind: 'rail'; title: string; subtitle: string; label: string; tracks: Track[] }
  | { id: string; kind: 'playlist'; playlist: Playlist }
  | { id: string; kind: 'creator'; title: string; creators: Creator[] }
  | RadioItem
  | { id: string; kind: 'studio'; title: string; text: string }
  | { id: string; kind: 'booster'; title: string; text: string }
  | { id: string; kind: 'library'; title: string; stats: Array<[string, string]> };

type LibraryStats = {
  playlists: number;
  favorites: number;
  recent: number;
  ai: number;
};

type HomeComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    avatar?: string | null;
  };
  replies: HomeComment[];
};

type HomeSearchResults = {
  tracks: Track[];
  posts: PostItem[];
  artists: Array<{
    id: string;
    name: string;
    username: string;
    avatar: string;
    href: string;
  }>;
  playlists: Playlist[];
};

type HomeFeedActions = {
  onPostCreated: (post: PostItem) => void;
};

const HomeFeedActionsContext = React.createContext<HomeFeedActions | null>(null);

const FILTERS = ['Pour toi', 'Sons', 'Communauté', 'Plus'];
const TINTS = ['#8B5CF6', '#38BDF8', '#FB7185', '#F59E0B', '#14B8A6', '#EF4444'];
const MUSIC_BATCH_SIZE = 18;
const POST_BATCH_SIZE = 4;

function formatCompact(value: number | string | null | undefined) {
  const numberValue = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return '0';
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return String(numberValue);
}

function safeString(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function pickTint(seed: string) {
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return TINTS[total % TINTS.length];
}

function relativeTime(dateLike?: string) {
  if (!dateLike) return 'maintenant';
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return 'maintenant';
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(dateLike).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

async function fetchJson(url: string) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

function normalizeArtistLabel(raw: any) {
  return (
    raw?.artist?.artistName ||
    raw?.artist?.name ||
    raw?.artist?.username ||
    raw?.artist_name ||
    raw?.creator_name ||
    'Artiste inconnu'
  );
}

function normalizePlayerTrack(raw: any): PlayerTrack | null {
  const id = String(raw?._id || raw?.id || '');
  if (!id) return null;

  const artistLabel = normalizeArtistLabel(raw);
  const genre = Array.isArray(raw?.genre)
    ? raw.genre.filter(Boolean).map((entry: any) => String(entry))
    : Array.isArray(raw?.tags)
      ? raw.tags.filter(Boolean).map((entry: any) => String(entry))
      : typeof raw?.genre === 'string' && raw.genre.trim()
        ? [raw.genre.trim()]
        : [];

  return {
    _id: id,
    title: safeString(raw?.title, 'Titre inconnu'),
    artist: {
      _id: String(raw?.artist?._id || raw?.artist?.id || raw?.creator_id || ''),
      name: safeString(raw?.artist?.name || raw?.artist?.artistName || artistLabel, artistLabel),
      username: safeString(raw?.artist?.username, ''),
      avatar: safeString(raw?.artist?.avatar, ''),
      artistName: safeString(raw?.artist?.artistName || artistLabel, artistLabel),
    },
    audioUrl: typeof raw?.audioUrl === 'string' ? raw.audioUrl : typeof raw?.audio_url === 'string' ? raw.audio_url : '',
    coverUrl:
      typeof raw?.coverUrl === 'string'
        ? raw.coverUrl
        : typeof raw?.cover_url === 'string'
          ? raw.cover_url
          : typeof raw?.image_url === 'string'
            ? raw.image_url
            : '/default-cover.svg',
    coverVideoUrl:
      typeof raw?.coverVideoUrl === 'string'
        ? raw.coverVideoUrl
        : typeof raw?.cover_video_url === 'string'
          ? raw.cover_video_url
          : null,
    coverVideoPosterUrl:
      typeof raw?.coverVideoPosterUrl === 'string'
        ? raw.coverVideoPosterUrl
        : typeof raw?.cover_video_poster_url === 'string'
          ? raw.cover_video_poster_url
          : null,
    duration: Number(raw?.duration || 0),
    plays: Number(raw?.plays || 0),
    likes: raw?.likes ?? raw?.likes_count ?? 0,
    comments: raw?.comments ?? raw?.comments_count ?? 0,
    isLiked: Boolean(raw?.isLiked),
    isAI: Boolean(raw?.isAI || id.startsWith('ai-')),
    isBoosted: Boolean(raw?.isBoosted),
    genre,
    album: typeof raw?.album === 'string' ? raw.album : null,
  };
}

function normalizeTrack(raw: any): Track | null {
  const playerTrack = normalizePlayerTrack(raw);
  if (!playerTrack) return null;

  const artistLabel = playerTrack.artist.artistName || playerTrack.artist.name || playerTrack.artist.username || 'Artiste inconnu';
  const likesCount = typeof playerTrack.likes === 'number' ? playerTrack.likes : Array.isArray(playerTrack.likes) ? playerTrack.likes.length : 0;
  const commentsCount =
    typeof playerTrack.comments === 'number' ? playerTrack.comments : Array.isArray(playerTrack.comments) ? playerTrack.comments.length : 0;
  const firstGenre = playerTrack.genre?.[0];
  const secondGenre = playerTrack.genre?.[1];
  const style = playerTrack.isBoosted
    ? 'Booste'
    : playerTrack.isAI
      ? 'Creation IA'
      : [firstGenre, secondGenre].filter(Boolean).join(' · ') || 'Track Synaura';
  const tint = pickTint(playerTrack._id);

  return {
    id: playerTrack._id,
    title: playerTrack.title,
    artist: artistLabel,
    artistHref: playerTrack.artist.username ? `/profile/${encodeURIComponent(playerTrack.artist.username)}` : undefined,
    cover: playerTrack.coverUrl || '/default-cover.svg',
    coverVideo: playerTrack.coverVideoUrl || null,
    coverVideoPoster: playerTrack.coverVideoPosterUrl || playerTrack.coverUrl || '/default-cover.svg',
    style,
    plays: formatCompact(playerTrack.plays),
    likes: formatCompact(likesCount),
    comments: formatCompact(commentsCount),
    likesCount,
    commentsCount,
    tint,
    playerTrack: {
      ...playerTrack,
      coverUrl: playerTrack.coverUrl || '/default-cover.svg',
      coverVideoUrl: playerTrack.coverVideoUrl || null,
      coverVideoPosterUrl: playerTrack.coverVideoPosterUrl || playerTrack.coverUrl || '/default-cover.svg',
    },
  };
}

function uniqueTracks(tracks: Array<Track | null | undefined>) {
  const seen = new Set<string>();
  return tracks.filter((track): track is Track => {
    if (!track || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

function normalizePlaylist(raw: any, fallbackCovers: string[]) {
  const id = String(raw?._id || raw?.id || '');
  if (!id) return null;

  const cover = typeof raw?.coverUrl === 'string' && raw.coverUrl ? raw.coverUrl : '/default-cover.svg';
  const covers = [cover, ...fallbackCovers].slice(0, 4);
  while (covers.length < 4) covers.push(cover);

  const trackCount = Array.isArray(raw?.tracks) ? raw.tracks.length : Number(raw?.trackCount || 0);

  return {
    id,
    title: safeString(raw?.name || raw?.title, 'Playlist'),
    curator: safeString(raw?.creator?.artistName || raw?.creator?.name || 'Synaura Picks', 'Synaura Picks'),
    covers,
    tracks: `${trackCount || 0} sons`,
    vibe: safeString(raw?.description, 'selection communautaire'),
    href: `/playlists/${encodeURIComponent(id)}`,
  } satisfies Playlist;
}

function normalizeCreator(raw: any) {
  const id = String(raw?._id || raw?.id || '');
  if (!id) return null;
  const name = safeString(raw?.name || raw?.artistName || raw?.username, 'Createur');
  const username = safeString(raw?.username, '');
  const avatarValue = safeString(name, 'C').slice(0, 1).toUpperCase();
  const totalPlays = Number(raw?.totalPlays || 0);
  const trackCount = Number(raw?.trackCount || 0);

  return {
    id,
    name,
    handle: username ? `@${username}` : '@synaura',
    avatar: avatarValue,
    tag: trackCount > 0 ? `${trackCount} titres` : raw?.isTrending ? 'En tendance' : 'Actif sur Synaura',
    followers: `${formatCompact(totalPlays)} ecoutes`,
    tint: pickTint(id),
    href: username ? `/profile/${encodeURIComponent(username)}` : '/community',
  } satisfies Creator;
}

function normalizePost(raw: any) {
  const id = String(raw?.id || '');
  if (!id) return null;

  const track = raw?.track
    ? normalizeTrack({
        _id: raw.track.id,
        title: raw.track.title,
        artist: {
          _id: '',
          name: raw.track.artist_name || 'Artiste',
          username: '',
        },
        audioUrl: raw.track.audio_url,
        coverUrl: raw.track.cover_url,
        coverVideoUrl: raw.track.cover_video_url || raw.track.coverVideoUrl || null,
        coverVideoPosterUrl: raw.track.cover_video_poster_url || raw.track.coverVideoPosterUrl || null,
        duration: raw.track.duration || 0,
        likes: raw.likes_count || 0,
        comments: raw.comments_count || 0,
      })
    : null;

  const typeLabel =
    raw?.type === 'track_share' ? 'partage de son' : raw?.type === 'photo' ? 'post image' : 'discussion';
  const authorName = safeString(raw?.creator?.name || raw?.creator?.username, 'Membre');
  const username = safeString(raw?.creator?.username, '');
  const authorHref = username ? `/profile/${encodeURIComponent(username)}` : '/community';
  const entity: BasePost = {
    id,
    type: raw?.type === 'track_share' ? 'track_share' : raw?.type === 'photo' ? 'photo' : raw?.type === 'repost' ? 'repost' : 'text',
    content: typeof raw?.content === 'string' ? raw.content : undefined,
    image_url: typeof raw?.image_url === 'string' ? raw.image_url : undefined,
    track_id: typeof raw?.track_id === 'string' ? raw.track_id : undefined,
    original_post_id: typeof raw?.original_post_id === 'string' ? raw.original_post_id : undefined,
    include_original_track: raw?.include_original_track !== false,
    likes_count: Number(raw?.likes_count || 0),
    comments_count: Number(raw?.comments_count || 0),
    created_at: safeString(raw?.created_at, new Date().toISOString()),
    creator: {
      id: String(raw?.creator?.id || raw?.creator_id || ''),
      username,
      name: authorName,
      avatar: typeof raw?.creator?.avatar === 'string' ? raw.creator.avatar : undefined,
      is_verified: Boolean(raw?.creator?.is_verified),
    },
    track: raw?.track
      ? {
          id: String(raw.track.id || ''),
          title: safeString(raw.track.title, 'Son partage'),
          artist_name: safeString(raw.track.artist_name, 'Artiste'),
          cover_url: typeof raw.track.cover_url === 'string' ? raw.track.cover_url : undefined,
          cover_video_url: typeof raw.track.cover_video_url === 'string' ? raw.track.cover_video_url : typeof raw.track.coverVideoUrl === 'string' ? raw.track.coverVideoUrl : undefined,
          cover_video_poster_url: typeof raw.track.cover_video_poster_url === 'string' ? raw.track.cover_video_poster_url : typeof raw.track.coverVideoPosterUrl === 'string' ? raw.track.coverVideoPosterUrl : undefined,
          audio_url: typeof raw.track.audio_url === 'string' ? raw.track.audio_url : undefined,
          duration: Number(raw.track.duration || 0),
        }
      : null,
    original_post: raw?.original_post || null,
    track_hidden: Boolean(raw?.track_hidden),
    isLiked: Boolean(raw?.isLiked),
  };

  return {
    id,
    kind: 'post',
    entity,
    creatorId: entity.creator.id,
    author: authorName,
    handle: username ? `@${username}` : '@synaura',
    avatar: authorName.slice(0, 1).toUpperCase(),
    authorHref,
    time: relativeTime(raw?.created_at),
    mood: typeLabel,
    text: safeString(raw?.content, raw?.track?.title || 'Publication Synaura'),
    image: raw?.type === 'photo' && typeof raw?.image_url === 'string' ? raw.image_url : undefined,
    href: `/posts/${encodeURIComponent(id)}`,
    track: track || undefined,
    likesCount: Number(raw?.likes_count || 0),
    commentsCount: Number(raw?.comments_count || 0),
    isLiked: Boolean(raw?.isLiked),
  } satisfies PostItem;
}

function isCommentableTrack(trackId: string) {
  return Boolean(trackId) && !trackId.startsWith('ai-') && !trackId.startsWith('radio-');
}

async function copyTextToClipboard(value: string, successMessage = 'Lien copie') {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      notify.success(successMessage, '');
      return true;
    }
  } catch {}

  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.setAttribute('readonly', 'true');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (copied) {
        notify.success(successMessage, '');
        return true;
      }
    }
  } catch {}

  notify.error('', 'Copie impossible');
  return false;
}

function recordTrackShare(track: Track | undefined, source: string) {
  if (!track || !isCommentableTrack(track.id)) return;
  try {
    void sendTrackEvents(track.id, {
      event_type: 'share',
      source,
      is_ai_track: Boolean(track.playerTrack.isAI),
    });
  } catch {}
}

function getRecommendationSessionId() {
  try {
    const key = 'synaura_reco_session_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function feedItemImpression(item: FeedItem, rank: number) {
  if (item.kind === 'track') {
    return {
      contentType: 'track',
      contentId: item.track.id,
      source: 'home',
      rank,
      score: Number((item.track.playerTrack as any)?.recommendationScore || 0),
      reasons: (item.track.playerTrack as any)?.recommendationReasons || [],
    };
  }
  if (item.kind === 'post') {
    return {
      contentType: 'post',
      contentId: item.id,
      source: 'home',
      rank,
      score: Number((item.entity as any)?.recommendationScore || 0),
      reasons: (item.entity as any)?.recommendationReasons || [],
    };
  }
  return null;
}

function sendRecommendationImpressions(impressions: Array<ReturnType<typeof feedItemImpression>>) {
  const valid = impressions.filter(Boolean);
  if (!valid.length) return;
  try {
    void fetch('/api/recommendations/impressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getRecommendationSessionId(), impressions: valid }),
      keepalive: true,
    });
  } catch {}
}

function normalizeSearchArtist(raw: any) {
  const id = String(raw?._id || raw?.id || '');
  if (!id) return null;
  const username = safeString(raw?.username, '');
  const name = safeString(raw?.artistName || raw?.name || username, 'Createur');
  return {
    id,
    name,
    username,
    avatar: typeof raw?.avatar === 'string' ? raw.avatar : '',
    href: username ? `/profile/${encodeURIComponent(username)}` : '/community',
  };
}

function HomeSearchBox({ compact = false }: { compact?: boolean }) {
  const { playTrack } = useAudioPlayer();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HomeSearchResults>({ tracks: [], posts: [], artists: [], playlists: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalResults = results.tracks.length + results.posts.length + results.artists.length + results.playlists.length;

  const runSearch = useCallback(async (value: string) => {
    const q = value.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      setResults({ tracks: [], posts: [], artists: [], playlists: [] });
      setOpen(false);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setOpen(true);

    try {
      const [searchJson, postsJson] = await Promise.all([
        fetch(`/api/search?query=${encodeURIComponent(q)}&filter=all&limit=6`, { cache: 'no-store', signal: controller.signal })
          .then((response) => response.json().catch(() => null)),
        fetch(`/api/posts?limit=5&query=${encodeURIComponent(q)}`, { cache: 'no-store', signal: controller.signal })
          .then((response) => response.json().catch(() => null)),
      ]);

      const tracks = (Array.isArray(searchJson?.tracks) ? searchJson.tracks : [])
        .map(normalizeTrack)
        .filter((track: Track | null): track is Track => Boolean(track));
      const posts = (Array.isArray(postsJson?.posts) ? postsJson.posts : [])
        .map(normalizePost)
        .filter((post: PostItem | null): post is PostItem => Boolean(post));
      const artists = (Array.isArray(searchJson?.artists) ? searchJson.artists : [])
        .map(normalizeSearchArtist)
        .filter((artist: ReturnType<typeof normalizeSearchArtist>): artist is NonNullable<ReturnType<typeof normalizeSearchArtist>> => Boolean(artist));
      const fallbackCovers = tracks.map((track: Track) => track.cover);
      const playlists = (Array.isArray(searchJson?.playlists) ? searchJson.playlists : [])
        .map((playlist: any) => normalizePlaylist(playlist, fallbackCovers))
        .filter((playlist: Playlist | null): playlist is Playlist => Boolean(playlist));

      setResults({ tracks, posts, artists, playlists });
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setResults({ tracks: [], posts: [], artists: [], playlists: [] });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void runSearch(query), 260);
    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const clearSearch = () => {
    abortRef.current?.abort();
    setQuery('');
    setOpen(false);
    setResults({ tracks: [], posts: [], artists: [], playlists: [] });
  };

  return (
    <div ref={rootRef} className={`relative ${compact ? 'min-w-0 flex-1' : 'hidden max-w-2xl flex-1 lg:block'}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35 sm:left-4" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length >= 2) setOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter' && results.tracks[0]) {
              event.preventDefault();
              playTrack(results.tracks[0].playerTrack as any);
              setOpen(false);
            }
          }}
          placeholder={compact ? 'Rechercher sur Synaura...' : 'Rechercher un son, un post, une playlist, un createur...'}
          className="h-10 w-full rounded-full border border-transparent bg-black/[0.055] pl-9 pr-10 text-xs font-semibold text-[#171313] outline-none placeholder:text-black/35 transition focus:border-black/[0.12] focus:bg-white/70 sm:h-11 sm:pl-11 sm:text-sm"
        />
        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/[0.06] text-black/42 transition hover:bg-black hover:text-white"
            aria-label="Effacer la recherche"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-[80] max-h-[72vh] overflow-y-auto rounded-[1.35rem] border border-black/[0.08] bg-[#fffaf2]/98 p-2 shadow-[0_24px_80px_rgba(30,25,20,0.22)] backdrop-blur-2xl">
          <div className="flex items-center justify-between px-2 py-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">
              {loading ? 'Recherche...' : totalResults ? `${totalResults} résultat(s)` : 'Recherche'}
            </p>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-black/35" /> : null}
          </div>

          {!loading && !totalResults ? (
            <div className="rounded-[1rem] bg-black/[0.045] p-5 text-center">
              <Search className="mx-auto h-7 w-7 text-black/24" />
              <p className="mt-2 text-sm font-black text-black/58">Aucun résultat pour "{query}"</p>
              <Link href="/ai-generator" className="mt-3 inline-flex h-9 items-center rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                Créer une piste IA
              </Link>
            </div>
          ) : null}

          {results.tracks.length ? (
            <div className="space-y-1">
              <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-black/34">Sons</p>
              {results.tracks.slice(0, 4).map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    playTrack(track.playerTrack as any);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-[1rem] p-2 text-left transition hover:bg-black/[0.055]"
                >
                  <img src={track.cover} alt="" className="h-11 w-11 rounded-[0.8rem] object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[#171313]">{track.title}</span>
                    <span className="block truncate text-xs font-semibold text-black/40">{track.artist}</span>
                  </span>
                  <Play className="h-4 w-4 text-black/42" />
                </button>
              ))}
            </div>
          ) : null}

          {results.posts.length ? (
            <div className="mt-2 space-y-1">
              <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-black/34">Posts</p>
              {results.posts.slice(0, 4).map((post) => (
                <Link
                  key={post.id}
                  href={post.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-[1rem] p-2 transition hover:bg-black/[0.055]"
                >
                  <AvatarBubble value={post.avatar} size="sm" tint={post.track?.tint || '#171313'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[#171313]">{post.author}</span>
                    <span className="line-clamp-2 text-xs font-semibold leading-5 text-black/46">{post.text}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {(results.artists.length || results.playlists.length) ? (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {results.artists.slice(0, 3).map((artist) => (
                <Link key={artist.id} href={artist.href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[1rem] p-2 transition hover:bg-black/[0.055]">
                  <AvatarBubble value={(artist.name || artist.username).slice(0, 1).toUpperCase()} size="sm" tint={pickTint(artist.id)} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{artist.name}</span>
                    <span className="block truncate text-xs text-black/38">@{artist.username || 'synaura'}</span>
                  </span>
                </Link>
              ))}
              {results.playlists.slice(0, 3).map((playlist) => (
                <Link key={playlist.id} href={playlist.href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[1rem] p-2 transition hover:bg-black/[0.055]">
                  <div className="grid h-10 w-10 place-items-center rounded-[0.85rem] bg-black/[0.06]">
                    <Library className="h-4 w-4 text-black/42" />
                  </div>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{playlist.title}</span>
                    <span className="block truncate text-xs text-black/38">{playlist.tracks}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function buildTrackFeedItem(track: Track, index: number, strategyLabel: string) {
  const isTrending = strategyLabel === 'trending';
  return {
    id: `feed-track-${strategyLabel}-${track.id}-${index}`,
    kind: 'track' as const,
    title: index % 2 === 0 ? 'A suivre' : isTrending ? 'Ca monte' : 'Encore pour toi',
    subtitle: isTrending
      ? 'les morceaux qui accelerent en ce moment'
      : 'on prolonge avec des morceaux proches de tes habitudes',
    label: isTrending ? 'tendance' : 'pour toi',
    track,
  };
}

function buildInfiniteMusicItems(tracks: Track[], strategyLabel: string, offset: number) {
  return tracks.map((track, index) => buildTrackFeedItem(track, offset + index, strategyLabel));
}

function normalizeUnifiedFeedItems(rawItems: any[], offset: number) {
  const items: FeedItem[] = [];
  rawItems.forEach((item, index) => {
    if (item?.type === 'track' && item.track) {
      const track = normalizeTrack(item.track);
      if (track) items.push(buildTrackFeedItem(track, offset + index, 'reco'));
    }
    if (item?.type === 'post' && item.post) {
      const post = normalizePost(item.post);
      if (post) items.push(post);
    }
  });
  return items;
}

function buildRadioTrack({
  id,
  title,
  artist,
  streamUrl,
  coverUrl,
  genres,
}: {
  id: string;
  title: string;
  artist: string;
  streamUrl: string;
  coverUrl: string;
  genres: string[];
}) {
  return {
    _id: id,
    title,
    artist: {
      _id: `artist-${id}`,
      name: artist,
      username: artist.toLowerCase().replace(/\s+/g, ''),
    },
    audioUrl: streamUrl,
    coverUrl,
    duration: -1,
    likes: [],
    comments: [],
    plays: 0,
    genre: genres,
  } satisfies PlayerTrack;
}

function buildFeedItems({
  posts,
  forYouTracks,
  trendingTracks,
  recentTracks,
  boostedTracks,
  playlists,
  creators,
  radios,
  libraryStats,
}: {
  posts: PostItem[];
  forYouTracks: Track[];
  trendingTracks: Track[];
  recentTracks: Track[];
  boostedTracks: Track[];
  playlists: Playlist[];
  creators: Creator[];
  radios: RadioItem[];
  libraryStats: LibraryStats | null;
}) {
  const items: FeedItem[] = [];

  if (forYouTracks.length) {
    items.push({
      id: 'rail-for-you',
      kind: 'rail',
      title: 'Pour toi',
      subtitle: 'les titres et partages qui collent a ton humeur du moment',
      label: 'personnalise',
      tracks: forYouTracks.slice(0, 8),
    });
  }
  if ((boostedTracks[0] || trendingTracks[0]) && (boostedTracks[0] || trendingTracks[0])!.playerTrack.audioUrl) {
    const headlineTrack = boostedTracks[0] || trendingTracks[0];
    items.push({
      id: 'headline-track',
      kind: 'track',
      title: 'A ecouter maintenant',
      subtitle: boostedTracks[0]
        ? 'un titre qui pousse fort et donne le ton'
        : 'un morceau qui circule fort dans la communaute',
      label: boostedTracks[0] ? 'boost' : 'recommande',
      track: headlineTrack,
    });
  }
  if (recentTracks.length) {
    items.push({
      id: 'rail-recent',
      kind: 'rail',
      title: 'Fraichement publie',
      subtitle: 'les sorties recentes qui arrivent dans la home',
      label: 'nouveau',
      tracks: recentTracks.slice(0, 8),
    });
  }
  items.push({ id: 'city-feed-pulse', kind: 'city' });
  items.push({ id: 'composer', kind: 'composer' });
  if (posts[0]) items.push(posts[0]);
  if (posts[1]) items.push(posts[1]);
  if (trendingTracks.length) {
    items.push({
      id: 'rail-trending',
      kind: 'rail',
      title: 'Tendances maintenant',
      subtitle: 'les pistes qui prennent de la vitesse en ce moment',
      label: 'trending',
      tracks: trendingTracks.slice(0, 8),
    });
  }
  if (creators.length) items.push({ id: 'creator-rail', kind: 'creator', title: 'Createurs a suivre', creators: creators.slice(0, 8) });
  if (posts[2]) items.push(posts[2]);
  if (radios[0]) items.push(radios[0]);
  items.push({
    id: 'studio',
    kind: 'studio',
    title: 'Créer dans ce style',
    text: 'Pars d’un son que tu aimes, remixe l’ambiance et publie ta version.',
  });
  if (playlists[0]) items.push({ id: `playlist-${playlists[0].id}`, kind: 'playlist', playlist: playlists[0] });
  items.push({
    id: 'booster',
    kind: 'booster',
    title: 'Boosters du jour',
    text: 'Active les mises en avant et les campagnes sans sortir de la logique Synaura.',
  });
  if (playlists[1]) items.push({ id: `playlist-${playlists[1].id}`, kind: 'playlist', playlist: playlists[1] });
  if (radios[1]) items.push(radios[1]);
  if (libraryStats) {
    items.push({
      id: 'library',
      kind: 'library',
      title: 'Ta bibliotheque',
      stats: [
        [String(libraryStats.playlists), 'playlists'],
        [String(libraryStats.favorites), 'favoris'],
        [String(libraryStats.ai), 'IA'],
        [String(libraryStats.recent), 'recentes'],
      ],
    });
  }
  if (posts[3]) items.push(posts[3]);

  return items;
}

function matchesFilter(item: FeedItem, filter: string) {
  if (filter === 'Pour toi') return true;
  if (filter === 'Sons') return item.kind === 'track' || item.kind === 'rail' || (item.kind === 'post' && Boolean(item.track));
  if (filter === 'Communauté') return item.kind === 'composer' || item.kind === 'post' || item.kind === 'creator' || item.kind === 'city';
  if (filter === 'Plus') return item.kind === 'playlist' || item.kind === 'library' || item.kind === 'radio' || item.kind === 'studio' || item.kind === 'booster' || item.kind === 'city';
  return true;
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-20 min-h-screen overflow-x-hidden bg-[#F4EFE6] text-[#171313]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,111,97,0.22),transparent_28%),radial-gradient(circle_at_94%_4%,rgba(124,92,255,0.20),transparent_30%),radial-gradient(circle_at_60%_100%,rgba(0,194,203,0.14),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(#ded4c7_1px,transparent_1px),linear-gradient(90deg,#ded4c7_1px,transparent_1px)] [background-size:34px_34px]" />
        <motion.div
          className="absolute -left-28 top-36 h-72 w-72 rounded-full bg-[#ff6f61]/18 blur-3xl"
          animate={{ y: [0, -24, 0], x: [0, 18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-20 top-24 h-80 w-80 rounded-full bg-[#7c5cff]/18 blur-3xl"
          animate={{ y: [0, 28, 0], x: [0, -24, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="relative mx-auto max-w-[1480px] px-2 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+7.25rem)] sm:px-5 sm:py-3 sm:pb-5 lg:px-8 lg:py-5">
        {children}
      </div>
      <SharedSynauraMobileDock />
    </div>
  );
}

function Card({
  children,
  className = '',
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-black/[0.08] bg-[#fffaf2]/88 shadow-[0_18px_60px_rgba(30,25,20,0.10)] backdrop-blur-xl sm:rounded-[2rem] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function InkCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative w-full min-w-0 overflow-hidden rounded-[1.5rem] bg-[#171313] text-[#fffaf2] shadow-[0_20px_70px_rgba(20,15,10,0.25)] sm:rounded-[2rem] ${className}`}
    >
      {children}
    </div>
  );
}

function AvatarBubble({
  value,
  size = 'md',
  tint = '#8B5CF6',
}: {
  value: string;
  size?: 'sm' | 'md' | 'lg';
  tint?: string;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };

  return (
    <div
      className={`${sizes[size]} grid shrink-0 place-items-center rounded-full font-black text-white shadow-sm`}
      style={{ background: tint }}
    >
      {value.slice(0, 1)}
    </div>
  );
}

function SynauraRouteNav() {
  const pathname = usePathname();
  const items = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/discover', label: 'Découvrir', icon: Compass },
    { href: '/library', label: 'Bibliothèque', icon: Library },
    { href: '/community', label: 'Communauté', icon: Users },
    { href: '/ai-generator', label: 'Studio', icon: Sparkles },
    { href: '/upload', label: 'Publier', icon: Upload },
  ];

  return (
    <nav className="mb-4 hidden sm:block" aria-label="Navigation Synaura">
      <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/84 p-2 shadow-[0_14px_36px_rgba(30,25,20,0.08)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
                isActive
                  ? 'bg-[#171313] text-white'
                  : 'bg-black/[0.045] text-black/56 hover:bg-black/[0.08] hover:text-[#171313]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SynauraAnnouncementStrip() {
  if (!isShutdownAnnounced() || isPastShutdownEnd()) return null;

  return (
    <Link
      href="/fermeture"
      className="mb-4 flex items-center justify-center gap-2 rounded-[1.35rem] border border-red-300/45 bg-red-50/92 px-4 py-3 text-center text-xs font-black text-red-900/78 shadow-[0_14px_30px_rgba(120,35,20,0.08)] transition hover:bg-red-50"
    >
      Synaura ferme le {SHUTDOWN_END_DATE_LABEL} - lire l'annonce officielle
    </Link>
  );
}

function TopBar() {
  return (
    <header className="sticky top-2 z-40 mb-4 rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/90 px-3 py-3 shadow-[0_16px_50px_rgba(30,25,20,0.12)] backdrop-blur-2xl sm:top-3 sm:rounded-[2rem] sm:px-4">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_10px_26px_rgba(30,25,20,0.10)]">
            <Image
              src="/brand/2026/synaura-symbol-2026.png"
              alt="Synaura"
              width={52}
              height={52}
              className="h-12 w-12 object-contain"
              unoptimized
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black tracking-tight">Synaura</p>
            <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-black/35 sm:block">
              social music feed
            </p>
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-black/35 sm:hidden">
              écoute · crée · remix
            </p>
          </div>
        </Link>

        <SynauraUniversalSearch />

        <div className="flex items-center gap-2">
          <NotificationCenter className="bg-black/[0.06] text-black/60 hover:bg-black hover:text-white sm:h-11 sm:w-11" />
          <Link
            href="/ai-generator"
            className="hidden h-11 items-center gap-2 rounded-full bg-black/[0.06] px-4 text-sm font-black text-black/60 transition hover:bg-black hover:text-white sm:flex"
          >
            <Sparkles className="h-4 w-4" /> Studio
          </Link>
          <Link
            href="/download"
            className="hidden h-11 items-center gap-2 rounded-full bg-[#7c5cff]/10 px-4 text-sm font-black text-[#6d4df0] transition hover:bg-[#171313] hover:text-white lg:flex"
          >
            <Smartphone className="h-4 w-4" /> App Android
          </Link>
          <Link
            href="/upload"
            className="inline-flex h-10 items-center rounded-full bg-[#171313] px-3 text-xs font-black text-white transition hover:scale-[1.02] sm:h-11 sm:px-5 sm:text-sm"
          >
            Publier
          </Link>
        </div>
      </div>

      <div className="mt-2.5 flex gap-2 lg:hidden">
        <SynauraUniversalSearch compact />
        <Link
          href="/ai-generator"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black/[0.06] px-3 text-xs font-black text-black/60 transition hover:bg-black hover:text-white sm:hidden"
        >
          <Sparkles className="h-4 w-4" />
          Studio
        </Link>
      </div>
    </header>
  );
}

function playQueueFromTracks(tracks: Track[], targetTrackId: string, setQueueAndPlay: (tracks: any[], startIndex?: number) => void) {
  const queue = tracks.map((track) => track.playerTrack).filter((track) => Boolean(track.audioUrl));
  const startIndex = queue.findIndex((track) => track._id === targetTrackId);
  if (!queue.length || startIndex === -1) {
    notify.error('Lecture', "Cette selection n'a pas d'audio disponible.");
    return;
  }
  setQueueAndPlay(queue as any, startIndex);
}

function MiniCarousel({ tracks }: { tracks: Track[] }) {
  const { setQueueAndPlay } = useAudioPlayer();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= tracks.length) setActive(0);
  }, [active, tracks.length]);

  if (!tracks.length) {
    return (
      <Card className="mb-4 p-3 sm:p-4">
        <div className="min-h-[176px] animate-pulse rounded-[1.55rem] bg-black/[0.05]" />
      </Card>
    );
  }

  const item = tracks[active] ?? tracks[0];

  return (
    <Card className="mb-4 p-2.5 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-stretch">
        <div className="relative min-h-[150px] overflow-hidden rounded-[1.15rem] bg-[#171313] p-3 text-white sm:min-h-[176px] sm:rounded-[1.55rem] sm:p-4">
          <img src={item.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-32" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#171313] via-[#171313]/84 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-40" style={{ background: item.tint }} />
          <div className="relative z-10 flex min-h-[130px] flex-col justify-between sm:min-h-[144px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/70 sm:px-3 sm:py-1.5 sm:text-[11px]">
                  Mix quotidien
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/52 sm:px-3 sm:py-1.5 sm:text-[11px]">
                  Top hebdo
                </span>
              </div>
              <div className="hidden gap-2 min-[380px]:flex">
                <button
                  type="button"
                  onClick={() => setActive((value) => (value - 1 + tracks.length) % tracks.length)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActive((value) => (value + 1) % tracks.length)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <h1 className="max-w-xl text-[1.55rem] font-black leading-[0.96] tracking-[-0.04em] sm:text-4xl">Découvre, remixe, publie.</h1>
              <p className="mt-1 line-clamp-2 text-xs font-semibold text-white/62 sm:text-sm">
                Lance un mix de sons IA et indés, puis crée ton univers musical à partir de ce que tu aimes.
              </p>
              <p className="mt-2 max-w-md truncate text-[11px] font-bold text-white/42 sm:text-xs">
                En tête maintenant : {item.title} · {item.artist}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => playQueueFromTracks(tracks, item.id, setQueueAndPlay)}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-[#fffaf2] px-3 text-[11px] font-black text-black sm:h-10 sm:px-4 sm:text-xs"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Lancer mon mix
                </button>
                <Link
                  href={`/ai-generator?mode=style&sourceTrack=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}&style=${encodeURIComponent(item.style)}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-3 text-[11px] font-black text-white/70 sm:h-10 sm:px-4 sm:text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Créer dans ce style
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden rounded-[1.55rem] bg-black/[0.045] p-2 sm:grid sm:grid-cols-2 sm:gap-2">
          {tracks.slice(0, 4).map((track, index) => (
            <button
              key={track.id}
              type="button"
              onClick={() => setActive(index)}
              className={`flex items-center gap-2 rounded-[1.15rem] p-2 text-left transition ${
                active === index ? 'bg-[#171313] text-white' : 'bg-white/45 text-black/65 hover:bg-white'
              }`}
            >
              <img src={track.cover} alt="" className="h-10 w-10 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black">{track.title}</p>
                <p className="truncate text-[10px] opacity-55">{track.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MobileActions() {
  const items = [
    { label: 'Écouter', icon: Music2, tint: '#8B5CF6', href: '/discover' },
    { label: 'Créer', icon: Sparkles, tint: '#38BDF8', href: '/ai-generator' },
    { label: 'Publier', icon: Upload, tint: '#FB7185', href: '/upload' },
    { label: 'Communauté', icon: Mic2, tint: '#F59E0B', href: '/community' },
  ];

  return (
    <div className="mb-4 grid grid-cols-4 gap-2 lg:flex lg:gap-3 lg:overflow-x-auto lg:px-0">
      {items.map((item) => (
        <Link key={item.label} href={item.href} className="flex min-w-0 flex-col items-center gap-2">
          <div
            className="grid h-11 w-11 place-items-center rounded-[1rem] text-white shadow-[0_12px_30px_rgba(30,25,20,0.14)] min-[380px]:h-12 min-[380px]:w-12 sm:h-14 sm:w-14 sm:rounded-[1.25rem]"
            style={{ background: item.tint }}
          >
            <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="max-w-full truncate text-[10px] font-black text-black/58 sm:text-xs">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

function ComposerCard({ onPostCreated }: { onPostCreated: (post: PostItem) => void }) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'text' | 'photo'>('text');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const initial =
    (session?.user as { name?: string; username?: string })?.name?.slice(0, 1) ||
    (session?.user as { username?: string })?.username?.slice(0, 1) ||
    'M';

  const chips = [
    { label: 'Son', icon: Music2, href: '/upload', active: false },
    { label: 'Image', icon: ImageIcon, action: () => { setMode('photo'); fileInputRef.current?.click(); }, active: mode === 'photo' },
    { label: 'Texte', icon: MessageCircle, action: () => setMode('text'), active: mode === 'text' },
    { label: 'Studio', icon: Wand2, href: '/ai-generator', active: false },
  ];

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handlePublish = useCallback(async () => {
    if (!session?.user) {
      notify.error('', 'Connecte-toi pour publier');
      return;
    }

    const trimmed = content.trim();
    if (mode === 'text' && !trimmed) {
      notify.error('', 'Ecris quelque chose avant de publier');
      return;
    }
    if (mode === 'photo' && !imageFile) {
      notify.error('', 'Ajoute une image pour publier ce post');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = '';
      if (mode === 'photo' && imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadResponse = await fetch('/api/posts/upload-image', { method: 'POST', body: formData });
        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok) throw new Error(uploadPayload?.error || 'Upload image impossible');
        imageUrl = uploadPayload?.url || '';
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode === 'photo' ? 'photo' : 'text',
          content: trimmed,
          image_url: imageUrl || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Publication impossible');

      const normalized = normalizePost(payload);
      if (normalized) onPostCreated(normalized);
      setContent('');
      setImageFile(null);
      setMode('text');
      notify.success('Post publie', 'Il est deja dans le feed.');
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible de publier');
    } finally {
      setSubmitting(false);
    }
  }, [content, imageFile, mode, onPostCreated, session?.user]);

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex gap-3">
        <AvatarBubble value={initial} size="sm" tint="#171313" />
        <div className="min-w-0 flex-1">
          {session?.user ? (
            <div className="rounded-[1.15rem] bg-black/[0.055] p-2">
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={mode === 'photo' ? 2 : 3}
                className="min-h-[76px] w-full resize-none rounded-[0.95rem] border border-transparent bg-white/55 px-3 py-3 text-sm font-semibold text-[#171313] outline-none placeholder:text-black/34 focus:border-black/[0.1]"
                placeholder={mode === 'photo' ? 'Ajoute une legende a ton image...' : 'Partager un texte directement depuis l’accueil...'}
              />
              {imagePreview ? (
                <div className="relative mt-2 overflow-hidden rounded-[1rem] bg-black/[0.06]">
                  <img src={imagePreview} alt="" className="max-h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white"
                    aria-label="Retirer l'image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-black/35">Partage ton idee quand elle est prete.</p>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={submitting || (mode === 'text' ? !content.trim() : !imageFile)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] border border-[#ff6f61]/18 bg-[#ff6f61]/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff6f61]">Tu n'as pas encore de compte</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[#171313]">Rejoins le feed Synaura</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-black/54">
                Inscris-toi pour publier tes sons, commenter les posts, suivre des artistes et garder tes notifications.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/auth/signup"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  <UserPlus className="h-4 w-4" />
                  Créer un compte
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black/58 transition hover:bg-black hover:text-white"
                >
                  Connexion
                </Link>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (file) {
                setMode('photo');
                setImageFile(file);
              }
              event.currentTarget.value = '';
            }}
          />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {chips.map((chip) => {
              const className = `inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full px-3 text-[11px] font-black transition sm:h-9 sm:w-auto sm:text-xs ${
                chip.active ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/56 hover:bg-black/[0.09]'
              }`;
              if ('href' in chip && chip.href) {
                return (
                  <Link key={chip.label} href={chip.href} className={className}>
                    <chip.icon className="h-3.5 w-3.5" />
                    {chip.label}
                  </Link>
                );
              }
              return (
                <button key={chip.label} type="button" onClick={chip.action} className={className}>
                  <chip.icon className="h-3.5 w-3.5" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Wave({ color = '#14B8A6', active = true }: { color?: string; active?: boolean }) {
  const bars = [32, 80, 48, 95, 58, 70, 42, 86];
  return (
    <div className="mt-2 flex h-5 items-end gap-1">
      {bars.map((bar, index) => (
        <motion.span
          key={index}
          className="w-1 rounded-full"
          style={{ height: `${bar}%`, background: color, opacity: active ? 1 : 0.42 }}
          animate={active ? { scaleY: [0.45, 1, 0.55] } : { scaleY: 0.68 }}
          transition={{ duration: 0.52 + index * 0.03, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function normalizeHomeComment(raw: any): HomeComment {
  return {
    id: String(raw?.id || ''),
    content: safeString(raw?.content, ''),
    createdAt: safeString(raw?.createdAt || raw?.created_at, new Date().toISOString()),
    user: {
      id: String(raw?.user?.id || raw?.user_id || ''),
      username: safeString(raw?.user?.username, 'utilisateur'),
      name: safeString(raw?.user?.name || raw?.user?.username, 'Membre'),
      avatar: typeof raw?.user?.avatar === 'string' ? raw.user.avatar : null,
    },
    replies: Array.isArray(raw?.replies) ? raw.replies.map(normalizeHomeComment) : [],
  };
}

function removeCommentFromTree(comments: HomeComment[], commentId: string): HomeComment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({ ...comment, replies: removeCommentFromTree(comment.replies, commentId) }));
}

function CommentAvatar({
  comment,
  dark = false,
}: {
  comment: HomeComment;
  dark?: boolean;
}) {
  const letter = (comment.user.name || comment.user.username || '?').slice(0, 1).toUpperCase();
  return (
    <div
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
        dark ? 'bg-white/12 text-white' : 'bg-[#171313] text-[#fffaf2]'
      }`}
    >
      {letter}
    </div>
  );
}

function InlineSharePanel({
  dark = false,
  url,
  text,
  onClose,
}: {
  dark?: boolean;
  url: string;
  text: string;
  onClose: () => void;
}) {
  const panelClassName = dark
    ? 'mt-3 rounded-[1.25rem] border border-white/10 bg-white/8 p-3 text-white'
    : 'mt-3 rounded-[1.25rem] border border-black/[0.08] bg-black/[0.035] p-3 text-[#171313]';
  const buttonClassName = dark
    ? 'inline-flex h-10 w-full items-center justify-center rounded-full bg-white/10 px-4 text-sm font-black text-white/78 transition hover:bg-white/14 hover:text-white sm:w-auto'
    : 'inline-flex h-10 w-full items-center justify-center rounded-full bg-black/[0.055] px-4 text-sm font-black text-black/62 transition hover:bg-black/[0.1] hover:text-black sm:w-auto';

  return (
    <div className={panelClassName}>
      <p className={`text-xs font-black uppercase tracking-[0.22em] ${dark ? 'text-white/45' : 'text-black/38'}`}>
        Partager sans quitter le fil
      </p>
      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={async () => {
            const copied = await copyTextToClipboard(url, 'Lien copie');
            if (copied) onClose();
          }}
          className={buttonClassName}
        >
          Copier le lien
        </button>
        <button
          type="button"
          onClick={async () => {
            const copied = await copyTextToClipboard(text, 'Texte copie');
            if (copied) onClose();
          }}
          className={buttonClassName}
        >
          Copier le texte
        </button>
      </div>
      <p className={`mt-2 text-xs leading-5 ${dark ? 'text-white/42' : 'text-black/46'}`}>
        Rien ne s’ouvre ailleurs: on garde le partage dans la page et on copie juste ce qu’il faut.
      </p>
    </div>
  );
}

function InlineTrackSharePanel({
  dark = false,
  url,
  text,
  track,
  onClose,
}: {
  dark?: boolean;
  url: string;
  text: string;
  track: Track;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const feedActions = React.useContext(HomeFeedActionsContext);
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const canPostTrack = isCommentableTrack(track.id);
  const quickCaptions = ['Coup de coeur', 'A mettre en boucle', 'Besoin d avis', 'Pour vos playlists'];

  const panelClassName = dark
    ? 'mt-3 rounded-[1.25rem] border border-white/10 bg-white/8 p-3 text-white'
    : 'mt-3 rounded-[1.25rem] border border-black/[0.08] bg-black/[0.035] p-3 text-[#171313]';
  const buttonClassName = dark
    ? 'inline-flex h-10 w-full items-center justify-center rounded-full bg-white/10 px-4 text-sm font-black text-white/78 transition hover:bg-white/14 hover:text-white sm:w-auto'
    : 'inline-flex h-10 w-full items-center justify-center rounded-full bg-black/[0.055] px-4 text-sm font-black text-black/62 transition hover:bg-black/[0.1] hover:text-black sm:w-auto';
  const primaryButtonClassName = dark
    ? 'inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-4 text-sm font-black text-[#171313] transition hover:opacity-90 disabled:opacity-50 sm:w-auto'
    : 'inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-[#fffaf2] transition hover:opacity-92 disabled:opacity-50 sm:w-auto';
  const inputClassName = dark
    ? 'min-h-[76px] w-full resize-none rounded-[1rem] border border-white/10 bg-black/22 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/22'
    : 'min-h-[76px] w-full resize-none rounded-[1rem] border border-black/[0.08] bg-white/72 px-3 py-3 text-sm text-[#171313] outline-none placeholder:text-black/30 focus:border-black/18';
  const chipClassName = dark
    ? 'h-8 shrink-0 rounded-full bg-white/10 px-3 text-xs font-black text-white/58 transition hover:bg-white/14 hover:text-white'
    : 'h-8 shrink-0 rounded-full bg-black/[0.055] px-3 text-xs font-black text-black/50 transition hover:bg-black/[0.09] hover:text-black';

  const handleInternalShare = useCallback(async () => {
    if (!canPostTrack) {
      notify.error('', 'Ce son ne peut pas encore etre republie');
      return;
    }
    if (!session?.user) {
      notify.error('', 'Connecte-toi pour partager dans le feed');
      return;
    }
    if (sharing) return;

    setSharing(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'track_share',
          track_id: track.id,
          content: caption.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Partage impossible');

      const post = normalizePost(payload);
      if (post) feedActions?.onPostCreated(post);
      recordTrackShare(track, 'home-internal-post');
      setCaption('');
      notify.success('', 'Son partage dans le feed');
      onClose();
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible de partager ce son');
    } finally {
      setSharing(false);
    }
  }, [canPostTrack, caption, feedActions, onClose, session?.user, sharing, track]);

  const handleNativeShare = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: track.title, text, url });
        recordTrackShare(track, 'home-native-share');
        onClose();
        return;
      }
    } catch {
      return;
    }

    const copied = await copyTextToClipboard(url, 'Lien copie');
    if (copied) {
      recordTrackShare(track, 'home-copy-link');
      onClose();
    }
  }, [onClose, text, track, url]);

  return (
    <div className={panelClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.22em] ${dark ? 'text-white/45' : 'text-black/38'}`}>
            Partager sans quitter le fil
          </p>
          <p className={`mt-1 text-sm leading-6 ${dark ? 'text-white/58' : 'text-black/52'}`}>
            Republie le son dans le feed ou envoie un lien propre.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
            dark ? 'bg-white/10 text-white/58 hover:text-white' : 'bg-black/[0.055] text-black/42 hover:text-black'
          }`}
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={`mt-3 flex gap-3 rounded-[1rem] p-2.5 ${dark ? 'bg-black/18' : 'bg-white/62'}`}>
        <img src={track.cover} alt="" className="h-12 w-12 shrink-0 rounded-[0.85rem] object-cover" />
        <div className="min-w-0">
          <p className={`truncate text-sm font-black ${dark ? 'text-white' : 'text-[#171313]'}`}>{track.title}</p>
          <p className={`truncate text-xs font-bold ${dark ? 'text-white/45' : 'text-black/42'}`}>{track.artist}</p>
          <p className={`mt-1 text-[11px] font-black uppercase tracking-wide ${dark ? 'text-white/32' : 'text-black/30'}`}>
            Post interne Synaura
          </p>
        </div>
      </div>

      {canPostTrack ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 220))}
            className={inputClassName}
            placeholder="Ajoute une phrase avant de republier ce son..."
          />
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {quickCaptions.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setCaption((current) => (current.trim() ? `${current.trim()} ${chip}` : chip))}
                className={chipClassName}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-xs ${dark ? 'text-white/36' : 'text-black/36'}`}>
              {session?.user ? `${caption.length}/220 caracteres` : 'Connexion requise pour publier dans le feed.'}
            </p>
            <button
              type="button"
              onClick={() => void handleInternalShare()}
              disabled={sharing || !session?.user}
              className={primaryButtonClassName}
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sharing ? 'Partage...' : 'Publier dans le feed'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`mt-3 rounded-[1rem] p-3 text-sm leading-6 ${dark ? 'bg-black/18 text-white/48' : 'bg-white/62 text-black/48'}`}>
          Ce son vient d'une source temporaire ou radio. Le partage public reste possible par lien, mais pas en post interne.
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        <button type="button" onClick={() => void handleNativeShare()} className={buttonClassName}>
          Partage rapide
        </button>
        <button
          type="button"
          onClick={async () => {
            const copied = await copyTextToClipboard(url, 'Lien copie');
            if (copied) {
              recordTrackShare(track, 'home-copy-link');
              onClose();
            }
          }}
          className={buttonClassName}
        >
          Copier le lien
        </button>
        <button
          type="button"
          onClick={async () => {
            const copied = await copyTextToClipboard(text, 'Texte copie');
            if (copied) {
              recordTrackShare(track, 'home-copy-text');
              onClose();
            }
          }}
          className={buttonClassName}
        >
          Copier le texte
        </button>
      </div>
      <p className={`mt-2 text-xs leading-5 ${dark ? 'text-white/42' : 'text-black/46'}`}>
        Le partage interne cree un vrai post track_share et nourrit aussi les signaux du feed.
      </p>
    </div>
  );
}

function InlineCommentsPanel({
  kind,
  targetId,
  ownerId,
  dark = false,
  onCountChange,
}: {
  kind: 'track' | 'post';
  targetId: string;
  ownerId?: string;
  dark?: boolean;
  onCountChange?: (delta: number) => void;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<HomeComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const panelClassName = dark
    ? 'mt-3 rounded-[1.25rem] border border-white/10 bg-white/8 p-3 text-white'
    : 'mt-3 rounded-[1.25rem] border border-black/[0.08] bg-black/[0.035] p-3 text-[#171313]';
  const inputClassName = dark
    ? 'min-h-[76px] w-full rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/22'
    : 'min-h-[76px] w-full rounded-[1rem] border border-black/[0.08] bg-white/68 px-3 py-3 text-sm text-[#171313] outline-none placeholder:text-black/28 focus:border-black/18';
  const actionButtonClassName = dark
    ? 'inline-flex h-10 w-full items-center justify-center rounded-full bg-[#fffaf2] px-4 text-sm font-black text-[#171313] transition hover:opacity-90 disabled:opacity-50 sm:w-auto'
    : 'inline-flex h-10 w-full items-center justify-center rounded-full bg-[#171313] px-4 text-sm font-black text-[#fffaf2] transition hover:opacity-92 disabled:opacity-50 sm:w-auto';
  const loadButtonClassName = dark
    ? 'text-xs font-black text-white/52 transition hover:text-white'
    : 'text-xs font-black text-black/46 transition hover:text-black';

  const loadComments = useCallback(
    async (mode: 'initial' | 'more' = 'initial', nextCursorValue: string | number | null = null) => {
      const isTrack = kind === 'track';
      const currentCursor = mode === 'initial' ? null : nextCursorValue;
      const query = isTrack
        ? `?limit=6&offset=${typeof currentCursor === 'number' ? currentCursor : 0}`
        : `?limit=8${typeof currentCursor === 'string' ? `&cursor=${encodeURIComponent(currentCursor)}` : ''}`;

      if (mode === 'initial') setLoading(true);

      try {
        const response = await fetch(`${isTrack ? `/api/tracks/${encodeURIComponent(targetId)}/comments` : `/api/posts/${encodeURIComponent(targetId)}/comments`}${query}`, {
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);
        const nextComments = (Array.isArray(payload?.comments) ? payload.comments : []).map(normalizeHomeComment);

        if (mode === 'initial') {
          setComments(nextComments);
        } else {
          setComments((current) => [...current, ...nextComments]);
        }

        if (isTrack) {
          setCursor(typeof payload?.nextOffset === 'number' ? payload.nextOffset : null);
          setHasMore(Boolean(payload?.hasMore));
        } else {
          setCursor(typeof payload?.nextCursor === 'string' ? payload.nextCursor : null);
          setHasMore(Boolean(payload?.nextCursor));
        }
      } catch {
        notify.error('', 'Impossible de charger les commentaires');
      } finally {
        if (mode === 'initial') setLoading(false);
      }
    },
    [kind, targetId],
  );

  useEffect(() => {
    void loadComments('initial');
  }, [kind, loadComments, targetId]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    if (!session) {
      notify.error('', 'Connecte-toi pour commenter');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        kind === 'track'
          ? `/api/tracks/${encodeURIComponent(targetId)}/comments`
          : `/api/posts/${encodeURIComponent(targetId)}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text.trim() }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'submit-comment-failed');
      }

      const nextComment = normalizeHomeComment(kind === 'track' ? payload?.comment : payload);
      setComments((current) => (kind === 'track' ? [nextComment, ...current] : [...current, nextComment]));
      setText('');
      onCountChange?.(1);
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible d’envoyer le commentaire');
    } finally {
      setSubmitting(false);
    }
  }, [kind, onCountChange, session, targetId, text]);

  const handleDeleteComment = useCallback(async (comment: HomeComment) => {
    if (!session?.user) {
      notify.error('', 'Connecte-toi pour supprimer un commentaire');
      return;
    }
    if (!comment.id || deletingCommentId) return;

    const currentUserId = String((session.user as any)?.id || '');
    const canDelete = currentUserId && (currentUserId === comment.user.id || currentUserId === ownerId);
    if (!canDelete) {
      notify.error('', 'Tu ne peux pas supprimer ce commentaire');
      return;
    }

    setDeletingCommentId(comment.id);
    try {
      const response = await fetch(
        kind === 'track'
          ? `/api/tracks/${encodeURIComponent(targetId)}/comments/${encodeURIComponent(comment.id)}`
          : `/api/posts/${encodeURIComponent(targetId)}/comments?comment_id=${encodeURIComponent(comment.id)}`,
        { method: 'DELETE' },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Suppression impossible');

      setComments((current) => removeCommentFromTree(current, comment.id));
      onCountChange?.(-1);
      notify.success('', 'Commentaire supprime');
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible de supprimer le commentaire');
    } finally {
      setDeletingCommentId(null);
    }
  }, [deletingCommentId, kind, onCountChange, ownerId, session?.user, targetId]);

  const renderComment = (comment: HomeComment, nested = false) => {
    const currentUserId = String((session?.user as any)?.id || '');
    const canDelete = Boolean(currentUserId && (currentUserId === comment.user.id || currentUserId === ownerId));

    return (
      <div key={`${nested ? 'reply' : 'comment'}-${comment.id}`} className={nested ? 'ml-7 mt-2 sm:ml-10' : ''}>
        <div className="flex gap-3">
          <CommentAvatar comment={comment} dark={dark} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`text-sm font-black ${dark ? 'text-white' : 'text-[#171313]'}`}>{comment.user.name}</span>
              <span className={`text-xs font-semibold ${dark ? 'text-white/38' : 'text-black/34'}`}>@{comment.user.username}</span>
              <span className={`text-xs font-semibold ${dark ? 'text-white/28' : 'text-black/28'}`}>{relativeTime(comment.createdAt)}</span>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteComment(comment)}
                  disabled={deletingCommentId === comment.id}
                  className={`text-xs font-black transition ${dark ? 'text-white/35 hover:text-white' : 'text-black/32 hover:text-black'}`}
                >
                  {deletingCommentId === comment.id ? 'Suppression...' : 'Supprimer'}
                </button>
              ) : null}
            </div>
            <p className={`mt-1 text-sm leading-6 ${dark ? 'text-white/72' : 'text-black/66'}`}>{comment.content}</p>
            {comment.replies.length ? <div className="mt-2 space-y-2">{comment.replies.map((reply) => renderComment(reply, true))}</div> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={panelClassName}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-black uppercase tracking-[0.22em] ${dark ? 'text-white/45' : 'text-black/38'}`}>
          Commentaires dans le fil
        </p>
        {hasMore ? (
          <button type="button" onClick={() => void loadComments('more', cursor)} className={loadButtonClassName}>
            Charger plus
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {loading ? (
          <p className={`text-sm ${dark ? 'text-white/42' : 'text-black/44'}`}>Chargement...</p>
        ) : comments.length ? (
          comments.map((comment) => renderComment(comment))
        ) : (
          <p className={`text-sm ${dark ? 'text-white/42' : 'text-black/44'}`}>Aucun commentaire pour le moment.</p>
        )}
      </div>

      <div className="mt-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={inputClassName}
          placeholder="Ecris une reponse sans quitter la home..."
        />
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-xs ${dark ? 'text-white/35' : 'text-black/36'}`}>Tout reste ancre dans cette carte.</p>
          <button type="button" onClick={handleSubmit} disabled={submitting || !text.trim()} className={actionButtonClassName}>
            {submitting ? 'Envoi...' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackInlineActions({
  track,
  dark = false,
}: {
  track: Track;
  dark?: boolean;
}) {
  const { addToUpNext } = useAudioPlayer();
  const canComment = isCommentableTrack(track.id);
  const { isLiked, likesCount, isLoading, toggleLike } = useLikeSystem({
    trackId: track.id,
    initialLikesCount: track.likesCount,
    initialIsLiked: track.playerTrack.isLiked || false,
  });
  const [commentsCount, setCommentsCount] = useState(track.commentsCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setCommentsCount(track.commentsCount);
    setCommentsOpen(false);
    setShareOpen(false);
  }, [track.commentsCount, track.id]);

  const defaultButtonClassName = dark
    ? 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.075] px-2.5 text-[11px] font-black text-white/66 transition hover:bg-white/14 hover:text-white'
    : 'inline-flex h-9 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black/[0.055] px-3 text-xs font-black text-black/62 transition hover:bg-black/[0.1] hover:text-black sm:h-10 sm:w-auto sm:px-4 sm:text-sm';
  const likedButtonClassName = dark
    ? 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#fffaf2] px-2.5 text-[11px] font-black text-[#171313] transition hover:opacity-90'
    : 'inline-flex h-9 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-[#171313] px-3 text-xs font-black text-white transition hover:opacity-92 sm:h-10 sm:w-auto sm:px-4 sm:text-sm';
  const actionGridClassName = dark
    ? 'flex flex-wrap items-center gap-1.5'
    : `grid gap-2 sm:flex sm:flex-wrap sm:items-center ${canComment ? 'grid-cols-2' : 'grid-cols-1'}`;

  return (
    <div className="mt-3">
      <div className={actionGridClassName}>
        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={isLoading}
          className={isLiked ? likedButtonClassName : defaultButtonClassName}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          {likesCount ? formatCompact(likesCount) : 'Liker'}
        </button>

        {canComment ? (
          <button
            type="button"
            onClick={() => {
              setCommentsOpen((current) => !current);
              setShareOpen(false);
            }}
            className={defaultButtonClassName}
          >
            <MessageCircle className="h-4 w-4" />
            {commentsCount ? formatCompact(commentsCount) : 'Commenter'}
          </button>
        ) : null}

          <button
            type="button"
            onClick={() => {
              setShareOpen((current) => !current);
              setCommentsOpen(false);
            }}
            className={defaultButtonClassName}
          >
            <Share2 className="h-4 w-4" />
            Partager
          </button>
          <div className={dark ? 'shrink-0' : 'col-span-2 sm:col-span-1'}>
            <TrackCreateRemixActions track={track.playerTrack as any} compact dark={dark} className={dark ? 'gap-1.5' : ''} />
          </div>
          {track.playerTrack.audioUrl ? (
            <button
              type="button"
              onClick={() => {
                addToUpNext(track.playerTrack as any, 'next');
                notify.success('File', `${track.title} sera lu ensuite.`);
              }}
              className={defaultButtonClassName}
            >
              <ListPlus className="h-4 w-4" />
              Lire ensuite
            </button>
          ) : null}
          <Link
            href={`/community/forum/new?category=feedback&trackId=${encodeURIComponent(track.id)}&title=${encodeURIComponent(track.title)}&source=feed`}
            className={defaultButtonClassName}
          >
            <MessageSquare className="h-4 w-4" />
            Avis
          </Link>
          <Link
            href={`/community/forum/new?category=remix&trackId=${encodeURIComponent(track.id)}&title=${encodeURIComponent(track.title)}&source=feed`}
            className={defaultButtonClassName}
          >
            <Repeat2 className="h-4 w-4" />
            Défi remix
          </Link>
      </div>

      {commentsOpen ? (
        <InlineCommentsPanel
          kind="track"
          targetId={track.id}
          dark={dark}
          onCountChange={(delta) => setCommentsCount((current) => Math.max(0, current + delta))}
        />
      ) : null}

      {shareOpen ? (
        <InlineTrackSharePanel
          dark={dark}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/track/${encodeURIComponent(track.id)}`}
          text={`Ecoute ${track.title} par ${track.artist} sur Synaura`}
          track={track}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  );
}

function MiniPlayer({ track, withActions = true }: { track: Track; withActions?: boolean }) {
  const { audioState, playTrack } = useAudioPlayer();
  const currentTrackId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isPlayingThis = currentTrackId === track.id && audioState.isPlaying;

  return (
    <div className="mt-4 rounded-[1.35rem] bg-black/[0.055] p-3">
      <div className="flex items-start gap-3 sm:items-center">
        <img src={track.cover} alt="" className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{track.title}</p>
          <p className="truncate text-xs font-semibold text-black/42">
            {track.artist} · {track.style}
          </p>
          <Wave color={track.tint} active={isPlayingThis} />
          {withActions ? <TrackInlineActions track={track} /> : null}
        </div>
        <button
          type="button"
          onClick={() => playTrack(track.playerTrack as any)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#171313] text-white sm:h-11 sm:w-11"
        >
          {isPlayingThis ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>
      </div>
    </div>
  );
}

function PostCard({ item, onDeleted }: { item: PostItem; onDeleted: (postId: string) => void }) {
  const feedActions = React.useContext(HomeFeedActionsContext);

  return (
    <SharedPostCard
      post={item.entity}
      onDelete={onDeleted}
      onPostCreated={(post) => {
        const normalized = normalizePost(post);
        if (normalized) feedActions?.onPostCreated(normalized);
      }}
    />
  );
}

function TrackFeedCard({ item }: { item: Extract<FeedItem, { kind: 'track' }> }) {
  const { audioState, playTrack } = useAudioPlayer();
  const isPlayingThis = audioState.tracks[audioState.currentTrackIndex]?._id === item.track.id && audioState.isPlaying;

  return (
    <InkCard className="p-0">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: item.track.tint }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white/[0.055] to-transparent" />

        <div className="relative grid grid-cols-[112px_minmax(0,1fr)] gap-3 p-3.5 sm:grid-cols-[154px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4 lg:p-5">
          <div className="col-span-2 flex items-center justify-between gap-3 sm:hidden">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">{item.label}</p>
              <h2 className="mt-0.5 text-lg font-black leading-none tracking-[-0.04em] text-white">{item.title}</h2>
            </div>
            <span className="shrink-0 rounded-full bg-[#fffaf2] px-2.5 py-1 text-[10px] font-black text-[#171313]">Reco</span>
          </div>

          <div className="relative overflow-hidden rounded-[1.15rem] bg-white/8 shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:rounded-[1.3rem]">
            <TrackCover
              src={item.track.cover}
              videoSrc={item.track.coverVideo}
              posterSrc={item.track.coverVideoPoster || item.track.cover}
              title={item.track.title}
              className="aspect-square w-full"
              rounded="rounded-none"
              objectFit="cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
            <button
              type="button"
              onClick={() => playTrack(item.track.playerTrack as any)}
              className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-[#fffaf2] text-[#171313] shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition hover:scale-105 sm:hidden"
              aria-label={isPlayingThis ? 'Mettre en pause' : 'Lire ce morceau'}
            >
              {isPlayingThis ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </button>
          </div>

          <div className="min-w-0">
            <div className="hidden sm:block">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/46">{item.label}</span>
                <span className="rounded-full bg-[#fffaf2] px-3 py-1 text-[10px] font-black text-[#171313]">À écouter</span>
              </div>
              <h2 className="truncate text-2xl font-black tracking-[-0.05em] text-white">{item.title}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-white/42">{item.subtitle}</p>
            </div>

            <p className="truncate text-[1.05rem] font-black leading-tight tracking-[-0.04em] text-white sm:mt-4 sm:text-2xl">{item.track.title}</p>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/48 sm:text-sm">
              {item.track.artist} · {item.track.style}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black text-white/52 sm:mt-3 sm:gap-2 sm:text-xs">
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">{item.track.plays} écoutes</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">{item.track.likes} likes</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">{item.track.comments} coms</span>
            </div>

            <div className="mt-3 hidden sm:block">
              <Wave color={item.track.tint} active={isPlayingThis} />
            </div>

            <div className="hidden sm:block">
              <TrackInlineActions track={item.track} dark />
            </div>
          </div>

          <div className="col-span-2 sm:hidden">
            <TrackInlineActions track={item.track} dark />
          </div>

          <button
            type="button"
            onClick={() => playTrack(item.track.playerTrack as any)}
            className="hidden h-14 w-14 shrink-0 place-items-center rounded-full bg-[#fffaf2] text-[#171313] shadow-[0_18px_42px_rgba(0,0,0,0.22)] transition hover:scale-105 sm:grid"
            aria-label={isPlayingThis ? 'Mettre en pause' : 'Lire ce morceau'}
          >
            {isPlayingThis ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
          </button>
        </div>
      </div>
    </InkCard>
  );
}

function RailCard({ item }: { item: Extract<FeedItem, { kind: 'rail' }> }) {
  const { audioState, setQueueAndPlay } = useAudioPlayer();

  return (
    <Card className="p-3 sm:p-5">
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black">{item.title}</p>
          <p className="text-sm text-black/40">{item.subtitle}</p>
        </div>
        <span className="rounded-full bg-black/[0.055] px-3 py-1.5 text-xs font-black text-black/58">{item.label}</span>
      </div>
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:gap-3 sm:px-0">
        {item.tracks.map((track) => {
          const isPlayingThis = audioState.tracks[audioState.currentTrackIndex]?._id === track.id && audioState.isPlaying;
          return (
            <motion.div key={track.id} whileHover={{ y: -4 }} className="w-[min(42vw,168px)] shrink-0 snap-start sm:w-[170px]">
              <div className="rounded-[1.2rem] bg-black/[0.045] p-2">
                <div className="relative overflow-hidden rounded-2xl">
                  <TrackCover
                    src={track.cover}
                    videoSrc={track.coverVideo}
                    posterSrc={track.coverVideoPoster || track.cover}
                    title={track.title}
                    className="aspect-square w-full"
                    rounded="rounded-none"
                    objectFit="cover"
                  />
                  <button
                    type="button"
                    onClick={() => playQueueFromTracks(item.tracks, track.id, setQueueAndPlay)}
                    className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-[#fffaf2] text-black"
                  >
                    {isPlayingThis ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
                  </button>
                </div>
                <p className="mt-2 truncate text-sm font-black">{track.title}</p>
                <p className="truncate text-xs text-black/36">{track.artist}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

function PlaylistCard({ item }: { item: Extract<FeedItem, { kind: 'playlist' }> }) {
  const playlist = item.playlist;
  return (
    <Card className="p-3 sm:p-5">
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black">{playlist.title}</p>
          <p className="text-sm text-black/40">
            {playlist.curator} · {playlist.vibe}
          </p>
        </div>
        <span className="rounded-full bg-black/[0.055] px-3 py-1.5 text-xs font-black text-black/58">playlist</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[124px_1fr]">
        <div className="grid h-[140px] grid-cols-2 overflow-hidden rounded-[1rem] sm:h-[124px] sm:rounded-[1.15rem]">
          {playlist.covers.map((cover, index) => (
            <img key={index} src={cover} alt="" className="h-full w-full object-cover" />
          ))}
        </div>
        <div className="flex min-w-0 flex-col justify-between">
          <div className="min-w-0">
            <p className="text-xl font-black leading-tight sm:text-2xl">{playlist.tracks}</p>
            <p className="mt-1 text-sm leading-6 text-black/52">Une vraie playlist issue des surfaces deja presentes dans l'app.</p>
          </div>
          <Link
            href={playlist.href}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-white sm:h-10 sm:w-fit"
          >
            <Play className="h-4 w-4 fill-current" /> Ouvrir
          </Link>
        </div>
      </div>
    </Card>
  );
}

function CreatorRailCard({ item }: { item: Extract<FeedItem, { kind: 'creator' }> }) {
  return (
    <Card className="p-3 sm:p-5">
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black">{item.title}</p>
          <p className="text-sm text-black/40">profils qui publient, remixent et font bouger la home</p>
        </div>
        <Users className="h-5 w-5 text-black/36" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:overflow-x-auto sm:pb-1">
        {item.creators.map((creator) => (
          <Link
            key={creator.id}
            href={creator.href}
            className="min-w-0 rounded-[1.1rem] bg-black/[0.045] p-2.5 text-center transition hover:bg-black/[0.07] sm:min-w-[145px] sm:rounded-[1.25rem] sm:p-3"
          >
            <div className="mx-auto mb-3 w-fit">
              <AvatarBubble value={creator.avatar} size="md" tint={creator.tint} />
            </div>
            <p className="truncate text-sm font-black">{creator.name}</p>
            <p className="truncate text-xs text-black/36">{creator.handle}</p>
            <p className="mt-2 text-xs font-bold text-black/50">{creator.followers}</p>
            <div className="mt-3 grid h-9 place-items-center rounded-full bg-black/[0.06] text-xs font-black text-black/62">
              Voir profil
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RadioFeedCard({ item }: { item: RadioItem }) {
  const { audioState, playTrack } = useAudioPlayer();
  const isPlayingThis = audioState.tracks[audioState.currentTrackIndex]?._id === item.track._id && audioState.isPlaying;

  return (
    <InkCard className="p-3 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="grid h-14 w-14 place-items-center rounded-[1rem] text-red-100 sm:h-16 sm:w-16 sm:rounded-[1.25rem]"
          style={{ background: `${item.color}33` }}
        >
          <Radio className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-black">{item.title}</p>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-black text-red-100" style={{ background: `${item.color}55` }}>
              LIVE
            </span>
          </div>
          <p className="truncate text-sm text-white/45">{item.subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-white/50">
            <span>{item.listeners} auditeurs</span>
            <span>{item.station}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => playTrack(item.track as any)}
          className="grid h-10 w-full shrink-0 place-items-center rounded-full bg-[#fffaf2] text-black sm:h-12 sm:w-12 sm:self-auto"
        >
          {isPlayingThis ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </button>
      </div>
    </InkCard>
  );
}

function StudioCard({ item }: { item: Extract<FeedItem, { kind: 'studio' }> }) {
  return (
    <Card
      className="p-3 sm:p-5"
      style={{ background: 'linear-gradient(135deg, #fffaf2 0%, #eee7ff 50%, #e2fbff 100%)' }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-[1rem] bg-[#171313] text-white sm:h-14 sm:w-14 sm:rounded-[1.2rem]">
            <Wand2 className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black">{item.title}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-black/54">{item.text}</p>
          </div>
        </div>
        <Link href="/ai-generator" className="inline-flex h-9 w-full items-center justify-center rounded-full bg-[#171313] px-4 text-sm font-black text-white sm:h-11 sm:w-auto sm:px-5">
          Ouvrir
        </Link>
      </div>
    </Card>
  );
}

function BoosterCard({ item }: { item: Extract<FeedItem, { kind: 'booster' }> }) {
  return (
    <Card
      className="p-3 sm:p-5"
      style={{ background: 'linear-gradient(135deg, #fff6d7 0%, #ffe4f1 55%, #fffaf2 100%)' }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-[1rem] bg-[#171313] text-[#fbbf24] sm:h-14 sm:w-14 sm:rounded-[1.2rem]">
            <Zap className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black">{item.title}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-black/54">{item.text}</p>
          </div>
        </div>
        <Link href="/boosters" className="inline-flex h-9 w-full items-center justify-center rounded-full bg-[#171313] px-4 text-sm font-black text-white sm:h-11 sm:w-auto sm:px-5">
          Booster
        </Link>
      </div>
    </Card>
  );
}

function LibraryCard({ item }: { item: Extract<FeedItem, { kind: 'library' }> }) {
  return (
    <Link href="/library">
      <Card className="block p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-lg font-black">{item.title}</p>
            <p className="text-sm text-black/40">favoris, playlists et ecoutes recentes</p>
          </div>
          <Library className="h-5 w-5 text-black/36" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {item.stats.map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-black/[0.045] p-2.5 sm:p-3">
              <p className="text-lg font-black sm:text-xl">{value}</p>
              <p className="text-xs text-black/38">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </Link>
  );
}

function FeedRenderer({
  item,
  rank,
  onPostCreated,
  onPostDeleted,
}: {
  item: FeedItem;
  rank: number;
  onPostCreated: (post: PostItem) => void;
  onPostDeleted: (postId: string) => void;
}) {
  const impression = feedItemImpression(item, rank);
  const body =
    item.kind === 'composer' ? <ComposerCard onPostCreated={onPostCreated} /> :
    item.kind === 'city' ? <CityFeedPulseCard /> :
    item.kind === 'post' ? <PostCard item={item} onDeleted={onPostDeleted} /> :
    item.kind === 'track' ? <TrackFeedCard item={item} /> :
    item.kind === 'rail' ? <RailCard item={item} /> :
    item.kind === 'playlist' ? <PlaylistCard item={item} /> :
    item.kind === 'creator' ? <CreatorRailCard item={item} /> :
    item.kind === 'radio' ? <RadioFeedCard item={item} /> :
    item.kind === 'studio' ? <StudioCard item={item} /> :
    item.kind === 'booster' ? <BoosterCard item={item} /> :
    <LibraryCard item={item} />;

  if (!impression) return body;
  return (
    <div data-reco-impression="1" data-reco-key={`${impression.contentType}:${impression.contentId}`}>
      {body}
    </div>
  );
}

function CityFeedPulseCard() {
  const [city, setCity] = useState<any>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/city', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data?.dayKey) setCity(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const liveEvent = city?.events?.find((event: any) => event.kind === 'battle' && event.isLive)
    || city?.events?.find((event: any) => event.isLive)
    || city?.events?.[0];
  const topPulse = city?.pulse?.[0];
  return (
    <Card className="group p-4">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#FF6F61]/18 blur-2xl transition duration-500 group-hover:scale-110" />
      <div className="pointer-events-none absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-[#7C5CFF]/12 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#171313] text-[#fffaf2] shadow-[0_12px_28px_rgba(23,19,19,.16)]">
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF6F61]">{liveEvent?.kind === 'battle' ? 'Battle live' : 'Events · Synaura Pulse'}</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight">{liveEvent?.title || city?.cityMood?.title || 'Le quartier bouge maintenant'}</h3>
          <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-black/54">
            {liveEvent?.description || city?.cityMood?.subtitle || 'Vitrine du jour, Radar, battle et awards peuvent surgir entre deux sons, sans quitter le rythme de la home.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-black/52">
              <Zap className="h-3.5 w-3.5 text-[#FF6F61]" /> {topPulse ? `Pulse ${topPulse.pulse}%` : 'Pulse live'}
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-black/52">
              <Sparkles className="h-3.5 w-3.5 text-[#7C5CFF]" /> {liveEvent?.participationCount || 0} participations
            </span>
            <Link href="/city" className="inline-flex h-8 items-center rounded-full bg-[#171313] px-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#fffaf2]">
              Ouvrir Events
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RightColumn({
  topTracks,
  radioItem,
  libraryStats,
  playlistCount,
}: {
  topTracks: Track[];
  radioItem: RadioItem | null;
  libraryStats: LibraryStats | null;
  playlistCount: number;
}) {
  const { audioState, playTrack } = useAudioPlayer();

  return (
    <aside className="hidden space-y-4 xl:block">
      <InkCard className="p-4">
        <p className="mb-3 text-sm font-black">Mood du moment</p>
        <div className="rounded-[1.4rem] bg-white/8 p-4">
          <p className="text-3xl font-black leading-none">Social.</p>
          <p className="text-3xl font-black leading-none text-white/55">Music.</p>
          <p className="mt-3 text-sm leading-6 text-white/45">
            Retrouve les sons, les createurs et les radios qui bougent en ce moment.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/8 p-3">
              <p className="text-xl font-black">{topTracks.length}</p>
              <p className="text-xs text-white/45">titres chauds</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <p className="text-xl font-black">{playlistCount}</p>
              <p className="text-xs text-white/45">playlists vues</p>
            </div>
          </div>
        </div>
      </InkCard>

      <Card className="p-4">
        <p className="mb-3 text-sm font-black">A ecouter</p>
        <div className="space-y-3">
          {topTracks.slice(0, 4).map((track) => {
            const isPlayingThis = audioState.tracks[audioState.currentTrackIndex]?._id === track.id && audioState.isPlaying;
            return (
              <button key={track.id} type="button" onClick={() => playTrack(track.playerTrack as any)} className="flex w-full items-center gap-3 text-left">
                <img src={track.cover} alt="" className="h-11 w-11 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{track.title}</p>
                  <p className="truncate text-xs text-black/36">{track.artist}</p>
                </div>
                {isPlayingThis ? <Pause className="h-4 w-4 text-black/36" /> : <Play className="h-4 w-4 text-black/36" />}
              </button>
            );
          })}
        </div>
      </Card>

      {radioItem ? (
        <InkCard className="p-4">
          <p className="mb-3 text-sm font-black">Radio live</p>
          <button type="button" onClick={() => playTrack(radioItem.track as any)} className="w-full rounded-[1.4rem] bg-white/8 p-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black">{radioItem.title}</p>
                <p className="mt-1 text-sm text-white/45">{radioItem.listeners} auditeurs</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#fffaf2] text-[#171313]">
                <Radio className="h-4 w-4" />
              </div>
            </div>
          </button>
        </InkCard>
      ) : null}

      {libraryStats ? (
        <Card className="p-4">
          <p className="mb-3 text-sm font-black">Ton rythme</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-black/58">
            <div className="rounded-2xl bg-black/[0.045] p-3">
              <p className="text-xl font-black text-[#171313]">{libraryStats.favorites}</p>
              <p>favoris</p>
            </div>
            <div className="rounded-2xl bg-black/[0.045] p-3">
              <p className="text-xl font-black text-[#171313]">{libraryStats.recent}</p>
              <p>recentes</p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <p className="mb-3 text-sm font-black">Explorer Synaura</p>
        <div className="grid gap-2 text-xs font-bold text-black/58">
          <Link href="/discover" className="hover:text-black">
            Découvrir
          </Link>
          <Link href="/ai-generator" className="hover:text-black">
            Studio
          </Link>
          <Link href="/boosters" className="hover:text-black">
            Boosters
          </Link>
          <Link href="/library" className="hover:text-black">
            Bibliothèque
          </Link>
          <Link href="/community" className="hover:text-black">
            Communauté
          </Link>
        </div>
      </Card>
    </aside>
  );
}

function FeedLoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="h-44 animate-pulse bg-white/70" />
      ))}
    </div>
  );
}

function FeedEmptyState({ filter }: { filter: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-lg font-black">Rien a montrer pour "{filter}"</p>
      <p className="mt-2 text-sm text-black/52">Reviens dans un instant, de nouveaux sons peuvent arriver.</p>
    </Card>
  );
}

export default function SynauraWarmFeed() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;
  const [filter, setFilter] = useState('Pour toi');
  const [loading, setLoading] = useState(true);
  const [forYouTracks, setForYouTracks] = useState<Track[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [boostedTracks, setBoostedTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [libraryStats, setLibraryStats] = useState<LibraryStats | null>(null);
  const [radioItems, setRadioItems] = useState<RadioItem[]>([]);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [musicCursor, setMusicCursor] = useState(0);
  const [musicStrategy, setMusicStrategy] = useState<'reco' | 'trending'>('reco');
  const [hasMoreMusic, setHasMoreMusic] = useState(true);
  const [extraFeedItems, setExtraFeedItems] = useState<FeedItem[]>([]);
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const seenTrackIdsRef = useRef<Set<string>>(new Set());
  const impressionSeenRef = useRef<Set<string>>(new Set());

  const refreshRadio = useCallback(async () => {
    const [mixx, ximam] = await Promise.all([
      fetchJson('/api/radio/status?station=mixx_party'),
      fetchJson('/api/radio/status?station=ximam'),
    ]);

    const nextRadios: RadioItem[] = [];

    const mixxTrack = buildRadioTrack({
      id: 'radio-mixx-party',
      title: safeString(mixx?.data?.currentTrack?.title || 'Mixx Party Radio', 'Mixx Party Radio'),
      artist: safeString(mixx?.data?.currentTrack?.artist || 'Mixx Party', 'Mixx Party'),
      streamUrl: safeString(mixx?.data?.streamUrl, 'https://manager11.streamradio.fr:2425/stream'),
      coverUrl: '/mixxparty1.png',
      genres: ['Electronic', 'Dance'],
    });
    nextRadios.push({
      id: 'radio-mixx',
      kind: 'radio',
      title: safeString(mixx?.data?.name || 'Mixx Party Radio', 'Mixx Party Radio'),
      subtitle: safeString(mixx?.data?.description || 'radio live en continu', 'radio live en continu'),
      station: 'Mixx Party',
      listeners: formatCompact(mixx?.data?.stats?.listeners || 0),
      color: '#EF4444',
      track: mixxTrack,
    });

    const ximamTrack = buildRadioTrack({
      id: 'radio-ximam',
      title: safeString(ximam?.data?.currentTrack?.title || 'XimaM Music Radio', 'XimaM Music Radio'),
      artist: safeString(ximam?.data?.currentTrack?.artist || 'XimaM', 'XimaM'),
      streamUrl: safeString(ximam?.data?.streamUrl, 'https://manager11.streamradio.fr:2745/stream'),
      coverUrl: '/ximam-radio-x.svg',
      genres: ['Creator Radio', 'Synaura'],
    });
    nextRadios.push({
      id: 'radio-ximam',
      kind: 'radio',
      title: safeString(ximam?.data?.name || 'XimaM Music Radio', 'XimaM Music Radio'),
      subtitle: safeString(ximam?.data?.description || 'radio createur en continu', 'radio createur en continu'),
      station: 'XimaM Radio',
      listeners: formatCompact(ximam?.data?.stats?.listeners || 0),
      color: '#8B5CF6',
      track: ximamTrack,
    });

    setRadioItems(nextRadios);
  }, []);

  const refreshHomeData = useCallback(async () => {
    setLoading(true);

    const [
      feedJson,
      trendingJson,
      recentJson,
      boostedJson,
      playlistsJson,
      artistsJson,
      libraryPlaylistsJson,
      libraryFavoritesJson,
      libraryRecentJson,
    ] = await Promise.all([
      fetchJson('/api/recommendations/feed?limit=24'),
      fetchJson('/api/tracks/trending?limit=18'),
      fetchJson('/api/tracks/recent?limit=18'),
      fetchJson('/api/tracks/boosted?limit=8'),
      fetchJson('/api/playlists/popular?limit=8'),
      fetchJson('/api/artists?sort=trending&limit=8'),
      userId ? fetchJson(`/api/playlists?user=${encodeURIComponent(userId)}`) : Promise.resolve(null),
      userId ? fetchJson('/api/tracks?liked=true&limit=60') : Promise.resolve(null),
      userId ? fetchJson('/api/tracks?recent=true&limit=40') : Promise.resolve(null),
    ]);

    const forYou = uniqueTracks((Array.isArray(feedJson?.tracks) ? feedJson.tracks : []).map(normalizeTrack));
    const trending = uniqueTracks((Array.isArray(trendingJson?.tracks) ? trendingJson.tracks : []).map(normalizeTrack));
    const recent = uniqueTracks((Array.isArray(recentJson?.tracks) ? recentJson.tracks : []).map(normalizeTrack));
    const boosted = uniqueTracks((Array.isArray(boostedJson?.tracks) ? boostedJson.tracks : []).map(normalizeTrack));

    const fallbackCovers = uniqueTracks([...forYou, ...trending, ...recent])
      .slice(0, 4)
      .map((track) => track.cover);

    const nextPlaylists = (Array.isArray(playlistsJson?.playlists) ? playlistsJson.playlists : [])
      .map((playlist: any) => normalizePlaylist(playlist, fallbackCovers))
      .filter((playlist: Playlist | null): playlist is Playlist => Boolean(playlist));

    const nextCreators = (Array.isArray(artistsJson?.artists) ? artistsJson.artists : [])
      .map(normalizeCreator)
      .filter((creator: Creator | null): creator is Creator => Boolean(creator));

    const nextPosts = (Array.isArray(feedJson?.posts) ? feedJson.posts : [])
      .map(normalizePost)
      .filter((post: PostItem | null): post is PostItem => Boolean(post));

    setForYouTracks(forYou);
    setTrendingTracks(trending);
    setRecentTracks(recent);
    setBoostedTracks(boosted);
    setPlaylists(nextPlaylists);
    setCreators(nextCreators);
    setPosts(nextPosts);
    setPostCursor(typeof feedJson?.nextCursor === 'string' ? feedJson.nextCursor : null);
    setHasMorePosts(Boolean(feedJson?.hasMore));
    setMusicStrategy('reco');
    setMusicCursor(typeof feedJson?.nextCursor === 'string' ? Number(feedJson.nextCursor) || forYou.length : forYou.length);
    setHasMoreMusic(Boolean(feedJson?.hasMore));
    setExtraFeedItems([]);
    setLoadingMoreFeed(false);
    seenTrackIdsRef.current = new Set(
      uniqueTracks([...forYou, ...trending, ...recent, ...boosted])
        .map((track) => track.id)
        .filter(Boolean),
    );

    if (userId) {
      setLibraryStats({
        playlists: Array.isArray(libraryPlaylistsJson?.playlists) ? libraryPlaylistsJson.playlists.length : 0,
        favorites: Array.isArray(libraryFavoritesJson?.tracks) ? libraryFavoritesJson.tracks.length : 0,
        recent: Array.isArray(libraryRecentJson?.tracks) ? libraryRecentJson.tracks.length : 0,
        ai: Array.isArray(libraryRecentJson?.tracks)
          ? libraryRecentJson.tracks.filter((track: any) => String(track?._id || track?.id || '').startsWith('ai-')).length
          : 0,
      });
    } else {
      setLibraryStats(null);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refreshHomeData();
  }, [refreshHomeData]);

  const loadMoreFeed = useCallback(async () => {
    if (loadingMoreFeed) return;

    const wantsPosts = filter !== 'Sons';
    const wantsMusic = filter !== 'Posts';
    const canLoadPosts = wantsPosts && hasMorePosts;
    const canLoadMusic = wantsMusic && hasMoreMusic;

    if (!canLoadPosts && !canLoadMusic) return;

    setLoadingMoreFeed(true);

    try {
      let nextItems: FeedItem[] = [];
      let nextPosts: PostItem[] = [];
      let nextMusicItems: FeedItem[] = [];

      if (filter === 'Pour toi') {
        const feedUrl = postCursor
          ? `/api/recommendations/feed?limit=${MUSIC_BATCH_SIZE + POST_BATCH_SIZE}&cursor=${encodeURIComponent(postCursor)}`
          : `/api/recommendations/feed?limit=${MUSIC_BATCH_SIZE + POST_BATCH_SIZE}`;
        const feedJson = await fetchJson(feedUrl);
        nextItems = normalizeUnifiedFeedItems(Array.isArray(feedJson?.items) ? feedJson.items : [], seenTrackIdsRef.current.size);
        setPostCursor(typeof feedJson?.nextCursor === 'string' ? feedJson.nextCursor : null);
        setMusicCursor(typeof feedJson?.nextCursor === 'string' ? Number(feedJson.nextCursor) || musicCursor : musicCursor);
        setHasMorePosts(Boolean(feedJson?.hasMore));
        setHasMoreMusic(Boolean(feedJson?.hasMore));

        nextItems.forEach((item) => {
          if (item.kind === 'track') seenTrackIdsRef.current.add(item.track.id);
        });
        if (nextItems.length) {
          setExtraFeedItems((current) => [...current, ...nextItems]);
        }
        return;
      }

      if (canLoadPosts) {
        const postsUrl = postCursor
          ? `/api/recommendations/mixed?limit=${POST_BATCH_SIZE}&cursor=${encodeURIComponent(postCursor)}`
          : `/api/recommendations/mixed?limit=${POST_BATCH_SIZE}`;
        const postsJson = await fetchJson(postsUrl);
        nextPosts = (Array.isArray(postsJson?.posts) ? postsJson.posts : [])
          .map(normalizePost)
          .filter((post: PostItem | null): post is PostItem => Boolean(post));

        setPostCursor(typeof postsJson?.nextCursor === 'string' ? postsJson.nextCursor : null);
        setHasMorePosts(Boolean(postsJson?.hasMore));
      }

      if (canLoadMusic) {
        const activeStrategy = musicStrategy;
        const musicJson = await fetchJson(
          `/api/ranking/feed?limit=${MUSIC_BATCH_SIZE}&ai=1&strategy=${activeStrategy}&cursor=${musicCursor}`,
        );
        const rawTracks = Array.isArray(musicJson?.tracks) ? musicJson.tracks : [];
        const normalizedTracks = uniqueTracks(rawTracks.map(normalizeTrack));
        const musicOffset = seenTrackIdsRef.current.size;
        const uniqueNewTracks = normalizedTracks.filter((track) => !seenTrackIdsRef.current.has(track.id));

        uniqueNewTracks.forEach((track) => {
          seenTrackIdsRef.current.add(track.id);
        });

        const nextCursorValue =
          typeof musicJson?.nextCursor === 'number' ? musicJson.nextCursor : musicCursor + rawTracks.length;
        const apiHasMore = Boolean(musicJson?.hasMore);

        setMusicCursor(nextCursorValue);

        if (!apiHasMore && activeStrategy === 'reco') {
          setMusicStrategy('trending');
          setMusicCursor(0);
          setHasMoreMusic(true);
        } else {
          setHasMoreMusic(apiHasMore);
        }

        if (uniqueNewTracks.length) {
          nextMusicItems = buildInfiniteMusicItems(uniqueNewTracks, activeStrategy, musicOffset);
        }
      }

      if (filter === 'Posts') {
        nextItems = nextPosts;
      } else if (filter === 'Sons') {
        nextItems = nextMusicItems;
      } else {
        const max = Math.max(nextPosts.length, nextMusicItems.length);
        for (let i = 0; i < max; i++) {
          if (nextMusicItems[i]) nextItems.push(nextMusicItems[i]);
          if (nextPosts[i]) nextItems.push(nextPosts[i]);
        }
      }

      if (nextItems.length) {
        setExtraFeedItems((current) => [...current, ...nextItems]);
      }
    } catch {
      notify.error('', 'Impossible de charger la suite du feed');
    } finally {
      setLoadingMoreFeed(false);
    }
  }, [filter, hasMoreMusic, hasMorePosts, loadingMoreFeed, musicCursor, musicStrategy, postCursor]);

  const heroTracks = useMemo(() => {
    const merged = uniqueTracks([...forYouTracks, ...trendingTracks, ...recentTracks]);
    return merged.slice(0, 5);
  }, [forYouTracks, trendingTracks, recentTracks]);

  const baseFeedItems = useMemo(
    () =>
      buildFeedItems({
        posts,
        forYouTracks,
        trendingTracks,
        recentTracks,
        boostedTracks,
        playlists,
        creators,
        radios: [],
        libraryStats,
      }),
    [posts, forYouTracks, trendingTracks, recentTracks, boostedTracks, playlists, creators, libraryStats],
  );

  const feedItems = useMemo(() => [...baseFeedItems, ...extraFeedItems], [baseFeedItems, extraFeedItems]);
  const visibleItems = useMemo(() => feedItems.filter((item) => matchesFilter(item, filter)), [feedItems, filter]);
  const canLoadMoreFeed = useMemo(() => {
    if (loading) return false;
    if (filter === 'Playlists' || filter === 'Createurs' || filter === 'Radio') return false;
    if (filter === 'Posts') return hasMorePosts;
    if (filter === 'Sons') return hasMoreMusic;
    return hasMorePosts || hasMoreMusic;
  }, [filter, hasMoreMusic, hasMorePosts, loading]);

  const rightColumnTracks = useMemo(() => uniqueTracks([...boostedTracks, ...trendingTracks, ...forYouTracks]).slice(0, 6), [boostedTracks, trendingTracks, forYouTracks]);
  const primaryRadio = null;

  const handlePostCreated = useCallback((post: PostItem) => {
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setHasMorePosts(true);
    if (filter !== 'Pour toi' && filter !== 'Communauté') setFilter('Communauté');
  }, [filter]);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setExtraFeedItems((current) => current.filter((item) => !(item.kind === 'post' && item.id === postId)));
  }, []);

  const homeFeedActions = useMemo(() => ({ onPostCreated: handlePostCreated }), [handlePostCreated]);

  useEffect(() => {
    const handleExternalPostCreated = (event: Event) => {
      const post = normalizePost((event as CustomEvent).detail);
      if (post) handlePostCreated(post);
    };

    window.addEventListener('synaura:post-created', handleExternalPostCreated);
    return () => window.removeEventListener('synaura:post-created', handleExternalPostCreated);
  }, [handlePostCreated]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !canLoadMoreFeed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreFeed();
        }
      },
      { rootMargin: '420px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMoreFeed, loadMoreFeed, visibleItems.length]);

  useEffect(() => {
    if (typeof document === 'undefined' || !visibleItems.length) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reco-impression="1"]'));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const impressions: Array<ReturnType<typeof feedItemImpression>> = [];
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const key = (entry.target as HTMLElement).dataset.recoKey || '';
          if (!key || impressionSeenRef.current.has(key)) continue;
          impressionSeenRef.current.add(key);
          const [type, ...idParts] = key.split(':');
          const id = idParts.join(':');
          const rank = visibleItems.findIndex((item) => {
            const impression = feedItemImpression(item, 0);
            return impression?.contentType === type && impression.contentId === id;
          });
          if (rank >= 0) impressions.push(feedItemImpression(visibleItems[rank], rank));
        }
        sendRecommendationImpressions(impressions);
      },
      { threshold: [0.55], rootMargin: '0px 0px -12% 0px' },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visibleItems]);

  return (
    <HomeFeedActionsContext.Provider value={homeFeedActions}>
      <AppShell>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <TopBar />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />
      <SynauraAndroidHomeBanner />
      <MiniCarousel tracks={heroTracks} />
      <SynauraEventsRail className="mb-5 mt-4" />
      <MobileActions />

      <div className="grid min-w-0 gap-5 overflow-hidden xl:grid-cols-[minmax(0,760px)_330px] xl:justify-center">
        <main className="mx-auto w-full max-w-[760px] min-w-0 pb-36 sm:pb-28">
          <div className="-mx-2 mb-4 border-y border-black/[0.08] bg-[#F4EFE6]/88 px-2 py-3 backdrop-blur-2xl sm:-mx-3 sm:px-3 md:mx-0 md:rounded-[1.3rem] md:border">
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`h-9 min-w-0 rounded-full px-2 text-[11px] font-black transition ${
                    filter === item ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/55 hover:bg-black/[0.09]'
                  }`}
                >
                  <span className="block truncate">{item}</span>
                </button>
              ))}
            </div>
            <div className="no-scrollbar hidden gap-2 overflow-x-auto sm:flex">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
                    filter === item ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/55 hover:bg-black/[0.09]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading && !visibleItems.length ? <FeedLoadingState /> : null}

          {!loading && !visibleItems.length ? <FeedEmptyState filter={filter} /> : null}

          {visibleItems.length ? (
            <div className="space-y-4">
              {visibleItems.map((item, index) => (
                <FeedRenderer key={item.id} item={item} rank={index} onPostCreated={handlePostCreated} onPostDeleted={handlePostDeleted} />
              ))}
            </div>
          ) : null}

          {canLoadMoreFeed ? (
            <div className="pb-6 pt-4">
              {loadingMoreFeed ? (
                <div className="rounded-[1.4rem] border border-black/[0.08] bg-[#fffaf2]/80 px-4 py-3 text-center text-sm font-bold text-black/46">
                  Le feed charge la suite...
                </div>
              ) : null}
              <div ref={loadMoreRef} className="h-6" />
            </div>
          ) : null}
        </main>

        <RightColumn
          topTracks={rightColumnTracks}
          radioItem={primaryRadio}
          libraryStats={libraryStats}
          playlistCount={playlists.length}
        />
      </div>
      </AppShell>
    </HomeFeedActionsContext.Provider>
  );
}
