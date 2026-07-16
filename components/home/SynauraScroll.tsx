'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { applyCdnToTracks } from '@/lib/cdnHelpers';
import FollowButton from '@/components/FollowButton';
import NotificationCenter, { notify } from '@/components/NotificationCenter';
import { isAiVariationAvailable } from '@/lib/remixPermissions';
import { canUseSoundClientSide } from '@/lib/clipPermissions';
import { recordClipFunnelEvent } from '@/lib/analyticsClient';
import { getRecommendationSessionId } from '@/lib/recommendation/clientSession';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import { useLibraryFavorites } from '@/hooks/useLibraryFavorites';
import { useTrackWaveform } from '@/hooks/useTrackWaveform';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useMomentReactions } from '@/hooks/useMomentReactions';
import { type MomentReactionType } from '@/lib/momentReactions';
import Waveform from '@/components/player/Waveform';
import ReactionPicker from '@/components/player/ReactionPicker';
import ClipUploadIndicator from '@/components/clips/ClipUploadIndicator';
import HomeFlowPrelude from '@/components/home/HomeFlowPrelude';
import ScrollPostSlide from '@/components/home/ScrollPostSlide';
import {
  buildAnnouncementItem,
  buildArtistSpotlightItems,
  buildChallengeItem,
  buildChallengesFilterFeed,
  buildCollectionItems,
  buildCreatorsFilterFeed,
  buildMusicChallengeItem,
  composeScrollFeed,
  normalizeScrollPosts,
  trackFromScrollPost,
  type ScrollClip,
  type ScrollFeedItem,
  type ScrollPost,
  type ScrollTrack,
} from '@/lib/scrollFeed';
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Compass,
  CreditCard,
  Download,
  Film,
  Heart,
  Library,
  ListMusic,
  LogOut,
  Loader2,
  Megaphone,
  MessageCircle,
  Pause,
  Play,
  Search,
  Settings,
  Share2,
  SmilePlus,
  Sparkles,
  Trophy,
  User,
  Users,
  Wand2,
  X,
} from 'lucide-react';

type FeedFilter = 'foryou' | 'new' | 'clips' | 'creators' | 'challenges';

const FILTER_ORDER: FeedFilter[] = ['foryou', 'new', 'clips', 'creators', 'challenges'];

const FILTER_META: Record<FeedFilter, { label: string; comingSoon?: boolean }> = {
  foryou: { label: 'Pour toi' },
  new: { label: 'Nouveau' },
  clips: { label: 'Clips' },
  creators: { label: 'Créateurs' },
  challenges: { label: 'Défis' },
};

const STRATEGY_BY_FILTER: Partial<Record<FeedFilter, string>> = {
  foryou: 'reco',
  new: 'fresh',
};

const FALLBACK_COVER = '/brand/2026/synaura-symbol-2026-white.png';

/** Moteur de scroll repris de components/TikTokPlayer.tsx : détection de position
 * par wheel/touch/clavier + repli scroll natif, plutôt qu'un IntersectionObserver
 * (classe de bug déjà rencontrée : l'observer ne se relance pas de façon fiable
 * après un changement de filtre ou pendant l'état de chargement). */
const RENDER_BUFFER = 5;
const WHEEL_LOCK_MS = 260;
const SNAP_SETTLE_MS = 90;
const AUTOPLAY_DELAY_MS = 110;
const INITIAL_TRACK_LIMIT = 12;
const MORE_TRACK_LIMIT = 40;
const FEED_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CachedScrollFeed = {
  savedAt: number;
  tracks: ScrollTrack[];
  nextCursor: number;
  hasMore: boolean;
};

function readScrollFeedCache(key: string): CachedScrollFeed | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null') as CachedScrollFeed | null;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > FEED_CACHE_MAX_AGE_MS || !parsed.tracks?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeScrollFeedCache(key: string, value: CachedScrollFeed) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
};

const fmtCount = (n: number) => {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

function countOf(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'number') return value;
  return 0;
}

/** Vidéo d'un Clip : lecture pilotée par ref (play/pause impératifs) plutôt que par
 * l'attribut HTML autoPlay, qui ne se redéclenche pas quand le scroll change l'item
 * actif. Reprend le pattern de MusicVideoLayer dans components/TikTokPlayer.tsx. */
function ClipVideoLayer({ src, poster, active }: { src: string; poster?: string | null; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      if (video.currentTime > 0) video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      className="absolute inset-0 h-full w-full object-cover"
      muted
      loop
      playsInline
      preload={active ? 'auto' : 'metadata'}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOOK: useFeedScrollSnap — wheel, keyboard, touch, scroll fallback
   Adapté de useScrollSnap (components/TikTokPlayer.tsx) : la home est une
   page permanente (pas un overlay), donc pas de isOpen/onClose/locked-close.
   ═══════════════════════════════════════════════════════════════ */

interface FeedScrollSnapOpts {
  itemCount: number;
  activeIndex: number;
  locked: boolean;
  ready: boolean;
  onNavigate: (index: number, source: string) => void;
  onTogglePlay: () => void;
  onReturnHome?: () => void;
}

function useFeedScrollSnap(opts: FeedScrollSnapOpts) {
  const { itemCount, activeIndex, locked, ready, onNavigate, onTogglePlay, onReturnHome } = opts;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const wheelLockRef = useRef(false);
  const isTouchingRef = useRef(false);
  const programmaticRef = useRef(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const getItemTop = useCallback((idx: number) => {
    const el = itemRefs.current[idx];
    if (el) return el.offsetTop;
    const c = containerRef.current;
    return idx * Math.max(1, c?.clientHeight || window.innerHeight);
  }, []);

  const scrollTo = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (!el) return;
    const i = clamp(idx, 0, Math.max(0, itemCount - 1));
    const top = getItemTop(i);
    if (Math.abs(el.scrollTop - top) < 2) return;
    programmaticRef.current = true;
    el.scrollTo({ top, behavior });
    setTimeout(() => { programmaticRef.current = false; }, behavior === 'smooth' ? 500 : 100);
  }, [getItemTop, itemCount]);

  const visibleIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight <= 0) return activeIndex;
    return clamp(Math.round(el.scrollTop / el.clientHeight), 0, Math.max(0, itemCount - 1));
  }, [activeIndex, itemCount]);

  // Wheel (desktop) — un item par geste, listener natif pour garantir preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (locked) return;
      e.preventDefault();
      if (wheelLockRef.current) return;
      if (Math.abs(e.deltaY) < 8) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      if (dir < 0 && activeIndex === 0 && onReturnHome) {
        wheelLockRef.current = true;
        onReturnHome();
        setTimeout(() => { wheelLockRef.current = false; }, WHEEL_LOCK_MS);
        return;
      }
      const next = clamp(activeIndex + dir, 0, itemCount - 1);
      if (next === activeIndex) return;
      wheelLockRef.current = true;
      scrollTo(next, 'smooth');
      onNavigate(next, 'scroll-wheel');
      setTimeout(() => { wheelLockRef.current = false; }, WHEEL_LOCK_MS);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [ready, activeIndex, itemCount, locked, scrollTo, onNavigate, onReturnHome]);

  // Clavier
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (locked) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown': {
          e.preventDefault();
          const next = Math.min(itemCount - 1, activeIndex + 1);
          scrollTo(next, 'smooth');
          onNavigate(next, 'scroll-key');
          break;
        }
        case 'ArrowUp':
        case 'PageUp': {
          e.preventDefault();
          if (activeIndex === 0 && onReturnHome) {
            onReturnHome();
            break;
          }
          const prev = Math.max(0, activeIndex - 1);
          scrollTo(prev, 'smooth');
          onNavigate(prev, 'scroll-key');
          break;
        }
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          onTogglePlay();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIndex, itemCount, locked, scrollTo, onNavigate, onReturnHome, onTogglePlay]);

  const onTouchStart = useCallback(() => {
    isTouchingRef.current = true;
    clearTimeout(snapTimerRef.current);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (locked) return;
    isTouchingRef.current = false;
    clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      onNavigate(visibleIndex(), 'scroll-touch');
    }, SNAP_SETTLE_MS);
  }, [locked, visibleIndex, onNavigate]);

  // Repli scroll natif (trackpad continu, ou navigateurs sans event wheel discret)
  const onScroll = useCallback(() => {
    if (locked) return;
    if (programmaticRef.current || isTouchingRef.current || wheelLockRef.current) return;
    clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      const idx = visibleIndex();
      if (idx !== activeIndex) onNavigate(idx, 'scroll-fallback');
    }, 60);
  }, [locked, visibleIndex, activeIndex, onNavigate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !('onscrollend' in window)) return;
    const handler = () => {
      if (locked) return;
      const idx = visibleIndex();
      if (idx !== activeIndex) onNavigate(idx, 'scroll-end');
    };
    el.addEventListener('scrollend', handler);
    return () => el.removeEventListener('scrollend', handler);
  }, [ready, activeIndex, locked, onNavigate, visibleIndex]);

  useEffect(() => () => clearTimeout(snapTimerRef.current), []);

  return { containerRef, itemRefs, scrollTo, onTouchStart, onTouchEnd, onScroll };
}

export default function SynauraScroll() {
  const router = useRouter();
  const { data: session } = useSession();
  const { audioState, setQueueAndPlay, playTrack, play, pause, seek, getAudioElement, handleLike } = useAudioPlayer();
  const { isFavorite, toggleFavorite } = useLibraryFavorites();

  const [filter, setFilter] = useState<FeedFilter>(() => {
    if (typeof window === 'undefined') return 'foryou';
    const params = new URLSearchParams(window.location.search);
    return params.get('filter') === 'clips' || params.get('sourceTrackId') || params.get('clipId') ? 'clips' : 'foryou';
  });
  const [sourceTrackFilter] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('sourceTrackId') || '';
  });
  const [clipIdFilter] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('clipId') || '';
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [homePreludeOpen, setHomePreludeOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    return !params.get('sourceTrackId') && !params.get('clipId') && params.get('filter') !== 'clips';
  });

  const [loading, setLoading] = useState(true);
  const [baseTracks, setBaseTracks] = useState<ScrollTrack[]>([]);
  const [trackCursor, setTrackCursor] = useState(0);
  const [trackHasMore, setTrackHasMore] = useState(true);
  const [baseClips, setBaseClips] = useState<ScrollClip[]>([]);
  const [basePosts, setBasePosts] = useState<ScrollPost[]>([]);
  const [popularUsersRaw, setPopularUsersRaw] = useState<any[]>([]);
  const [collectionsRaw, setCollectionsRaw] = useState<any[]>([]);
  const [cityEventsRaw, setCityEventsRaw] = useState<any[]>([]);
  const [musicChallengesRaw, setMusicChallengesRaw] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [cityPulse, setCityPulse] = useState<{ title: string; event: string; pulse: number; votes: number } | null>(null);
  const [launchingCollectionId, setLaunchingCollectionId] = useState<string | null>(null);
  const [remixSheetTrack, setRemixSheetTrack] = useState<ScrollTrack | null>(null);
  const [momentComposer, setMomentComposer] = useState<{ track: ScrollTrack; timestampSeconds: number } | null>(null);
  const [momentComposerText, setMomentComposerText] = useState('');
  const [momentComposerSubmitting, setMomentComposerSubmitting] = useState(false);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const clipOffsetSeekedRef = useRef<string | null>(null);
  // Garde-fous anti-race (repris de loadRequestRef dans components/TikTokPlayer.tsx) :
  // un changement de filtre rapide (foryou -> new -> foryou) ne doit pas laisser une
  // réponse réseau périmée écraser un chargement plus récent.
  const trackLoadRequestRef = useRef(0);
  const clipLoadRequestRef = useRef(0);
  const postLoadRequestRef = useRef(0);
  const loadingMoreTracksRef = useRef(false);
  const impressionSeenRef = useRef<Set<string>>(new Set());

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const currentId = currentTrack?._id;
  const username = (session?.user as any)?.username;
  const currentUserId = (session?.user as any)?.id;
  const needsTrackFetch = filter === 'foryou' || filter === 'new';
  const useThisSound = useCallback((track: ScrollTrack) => {
    void recordClipFunnelEvent(track._id, 'clip_use_sound_started');
    const trackType = track._id.startsWith('ai-') ? 'ai_track' : 'track';
    router.push(`/clips/new?trackId=${encodeURIComponent(track._id)}&trackType=${trackType}`);
  }, [router]);
  const openStudioWithRemix = useCallback((track: ScrollTrack) => {
    const params = new URLSearchParams({
      mode: 'remix',
      sourceTrackId: track._id,
      sourceTrackType: track._id.startsWith('ai-') ? 'ai_track' : 'track',
    });
    router.push(`/ai-generator?${params.toString()}`);
  }, [router]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const refreshClips = () => setReloadKey((value) => value + 1);
    window.addEventListener('synaura:clip-upload-completed', refreshClips);
    return () => window.removeEventListener('synaura:clip-upload-completed', refreshClips);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!username) return;
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
        if (!res.ok) return;
        const data = await res.json();
        const c = data?.user?.avatar || data?.user?.image || data?.avatar || data?.image;
        if (c && typeof c === 'string') setAvatarUrl(c);
      } catch {}
    })();
  }, [username]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // Morceaux : trame principale du feed (Pour toi / Nouveau). Créateurs et Défis
  // réutilisent le pool déjà chargé plutôt que de relancer un appel réseau.
  useEffect(() => {
    if (!needsTrackFetch) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const requestId = ++trackLoadRequestRef.current;
    setActiveIndex(0);

    (async () => {
      const strategy = STRATEGY_BY_FILTER[filter] || 'reco';
      const cacheKey = `synaura.scroll.feed.v2:${username || 'anonymous'}:${strategy}`;
      const cached = readScrollFeedCache(cacheKey);
      let cacheWasShown = false;
      if (cached?.tracks.length) {
        setBaseTracks(cached.tracks);
        setTrackCursor(cached.nextCursor);
        setTrackHasMore(cached.hasMore);
        setLoading(false);
        cacheWasShown = true;
      }
      try {
        if (!cacheWasShown) setLoading(true);
        setError(null);
        const feedParams = new URLSearchParams({
          limit: String(INITIAL_TRACK_LIMIT),
          ai: '1',
          strategy,
          session: getRecommendationSessionId(),
        });
        const res = await fetch(`/api/ranking/feed?${feedParams.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Chargement impossible');
        const json = await res.json();
        const list = applyCdnToTracks((Array.isArray(json?.tracks) ? json.tracks : []) as any) as ScrollTrack[];
        if (!mounted || requestId !== trackLoadRequestRef.current) return;
        setBaseTracks(list);
        const nextCursor = typeof json?.nextCursor === 'number' ? json.nextCursor : list.length;
        const hasMore = Boolean(json?.hasMore);
        setTrackCursor(nextCursor);
        setTrackHasMore(hasMore);
        writeScrollFeedCache(cacheKey, { savedAt: Date.now(), tracks: list, nextCursor, hasMore });
      } catch (e: any) {
        if (mounted && requestId === trackLoadRequestRef.current && !cacheWasShown) setError(e?.message || 'Impossible de charger le scroll');
      } finally {
        if (mounted && requestId === trackLoadRequestRef.current) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [filter, needsTrackFetch, reloadKey, username]);

  useEffect(() => {
    if (!(filter === 'clips' || filter === 'foryou' || filter === 'new')) return;
    let mounted = true;
    const requestId = ++clipLoadRequestRef.current;
    if (filter === 'clips') {
      setActiveIndex(0);
      setLoading(true);
    }
    const params = new URLSearchParams({ limit: String(filter === 'clips' ? 16 : 12) });
    params.set('session', getRecommendationSessionId());
    if (filter === 'clips' && sourceTrackFilter) params.set('sourceTrackId', sourceTrackFilter);
    if (filter === 'clips' && clipIdFilter) params.set('clipId', clipIdFilter);
    fetch(`/api/music-clips?${params.toString()}`, { cache: 'no-store' })
      .then((response) => response.json().then((json) => ({ ok: response.ok, json })))
      .then(({ ok, json }) => {
        if (!mounted || requestId !== clipLoadRequestRef.current) return;
        if (!ok) throw new Error(json?.error || 'Impossible de charger les clips');
        setBaseClips(Array.isArray(json?.clips) ? json.clips : []);
        if (filter === 'clips') setError(null);
      })
      .catch((e) => {
        if (mounted && filter === 'clips' && requestId === clipLoadRequestRef.current) setError(e?.message || 'Impossible de charger les clips');
      })
      .finally(() => {
        if (mounted && filter === 'clips' && requestId === clipLoadRequestRef.current) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [clipIdFilter, filter, reloadKey, sourceTrackFilter]);

  useEffect(() => {
    if (filter !== 'foryou') return;
    let mounted = true;
    const requestId = ++postLoadRequestRef.current;
    const params = new URLSearchParams({ limit: '8', session: getRecommendationSessionId() });
    fetch(`/api/recommendations/mixed?${params.toString()}`, { cache: 'no-store' })
      .then((response) => response.json().then((json) => ({ ok: response.ok, json })))
      .then(({ ok, json }) => {
        if (!mounted || requestId !== postLoadRequestRef.current || !ok) return;
        setBasePosts(normalizeScrollPosts(Array.isArray(json?.posts) ? json.posts : []));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [filter, reloadKey]);

  useEffect(() => {
    if (filter !== 'foryou') setHomePreludeOpen(false);
  }, [filter]);

  // Artistes populaires + collections éditoriales : chargés une fois, réutilisés pour
  // composer le feed mixte et pour le filtre Créateurs.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [usersRes, collectionsRes] = await Promise.all([
          fetch('/api/users/popular?limit=20', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch('/api/editorial-collections/featured', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (!mounted) return;
        if (Array.isArray(usersRes?.users)) setPopularUsersRaw(usersRes.users);
        if (Array.isArray(collectionsRes?.collections)) setCollectionsRaw(collectionsRes.collections);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Synaura Pulse (events réels) : alimente la pastille "Events", le défi et l'annonce éditoriale.
  useEffect(() => {
    let mounted = true;
    fetch('/api/city', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((city) => {
        if (!mounted || !city?.dayKey) return;
        const events = Array.isArray(city.events) ? city.events : [];
        setCityEventsRaw(events);
        const liveEvent = events.find((event: any) => event.kind === 'battle' && event.isLive)
          || events.find((event: any) => event.isLive)
          || events[0];
        setCityPulse({
          title: city.cityMood?.title || 'Synaura Pulse',
          event: liveEvent?.title || 'Event live',
          pulse: city.pulse?.[0]?.pulse || 0,
          votes: liveEvent?.totalVotes || 0,
        });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Défis musicaux V1 (réels, éditoriaux) : prennent le pas sur le challenge algorithmique
  // de Synaura Pulse dans le Scroll quand un défi est actif.
  useEffect(() => {
    let mounted = true;
    fetch('/api/challenges?status=active', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (mounted && Array.isArray(json?.challenges)) setMusicChallengesRaw(json.challenges);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Composition du feed mixte : la trame reste les morceaux (>=75%), les cartes non
  // musicales (artiste, collection, défi, annonce) sont réparties avec parcimonie.
  const feedItems = useMemo<ScrollFeedItem[]>(() => {
    if (filter === 'clips') {
      return baseClips
        .filter((clip) => clip?.id && clip.videoUrl && clip.sourceTrack?.audioUrl)
        .map((clip) => ({ id: `clip-${clip.id}`, type: 'clip' as const, clip, track: clip.sourceTrack }));
    }
    if (filter === 'creators') return buildCreatorsFilterFeed(popularUsersRaw, baseTracks);
    if (filter === 'challenges') return buildChallengesFilterFeed(musicChallengesRaw, cityEventsRaw);

    const artistItems = buildArtistSpotlightItems(popularUsersRaw, baseTracks, 3);
    const collectionItems = buildCollectionItems(collectionsRaw, 2);
    const challenge = buildMusicChallengeItem(musicChallengesRaw) || buildChallengeItem(cityEventsRaw);
    const announcement = buildAnnouncementItem(cityEventsRaw);
    return composeScrollFeed({
      tracks: baseTracks,
      clips: baseClips,
      posts: filter === 'foryou' ? basePosts : [],
      artistSpotlights: artistItems,
      collections: collectionItems,
      challenge: challenge?.item || null,
      announcement: announcement?.item || null,
    });
  }, [filter, baseTracks, baseClips, basePosts, popularUsersRaw, collectionsRaw, cityEventsRaw, musicChallengesRaw]);

  useEffect(() => {
    if (loading) return;
    const item = feedItems[activeIndex];
    if (!item || (item.type !== 'track' && item.type !== 'clip' && item.type !== 'post')) return;
    const contentType = item.type === 'clip' ? 'clip' : item.type === 'post' ? 'post' : 'track';
    const contentId = item.type === 'clip' ? item.clip.id : item.type === 'post' ? item.post.id : item.track._id;
    const key = `${contentType}:${contentId}`;
    if (!contentId || impressionSeenRef.current.has(key)) return;
    const timer = window.setTimeout(() => {
      if (impressionSeenRef.current.has(key)) return;
      impressionSeenRef.current.add(key);
      const entity = item.type === 'clip' ? item.clip : item.type === 'post' ? item.post : item.track;
      void fetch('/api/recommendations/impressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          sessionId: getRecommendationSessionId(),
          impressions: [{
            contentType,
            contentId,
            source: 'scroll-web',
            rank: activeIndex,
            score: Number((entity as any).recommendationScore || 0),
            reasons: (entity as any).recommendationReasons || [],
          }],
        }),
      }).catch(() => {
        impressionSeenRef.current.delete(key);
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [activeIndex, feedItems, loading]);

  // Le premier rendu reste petit et rapide; la suite arrive avant que l'auditeur
  // atteigne la fin, sans reconstruire les cartes deja visibles.
  useEffect(() => {
    if (!needsTrackFetch || loading || loadingMoreTracksRef.current || !trackHasMore || !feedItems.length) return;
    if (activeIndex < feedItems.length - 8) return;
    let mounted = true;
    const strategy = STRATEGY_BY_FILTER[filter] || 'reco';
    loadingMoreTracksRef.current = true;
    const params = new URLSearchParams({
      limit: String(MORE_TRACK_LIMIT),
      ai: '1',
      strategy,
      cursor: String(trackCursor),
      session: getRecommendationSessionId(),
    });
    fetch(`/api/ranking/feed?${params.toString()}`, { cache: 'no-store' })
      .then((response) => response.json().then((json) => ({ ok: response.ok, json })))
      .then(({ ok, json }) => {
        if (!mounted || !ok) return;
        const incoming = applyCdnToTracks((Array.isArray(json?.tracks) ? json.tracks : []) as any) as ScrollTrack[];
        setBaseTracks((current) => {
          const seen = new Set(current.map((track) => track._id));
          return [...current, ...incoming.filter((track) => !seen.has(track._id))];
        });
        setTrackCursor(typeof json?.nextCursor === 'number' ? json.nextCursor : trackCursor + incoming.length);
        setTrackHasMore(Boolean(json?.hasMore));
      })
      .catch(() => {})
      .finally(() => {
        loadingMoreTracksRef.current = false;
      });
    return () => {
      mounted = false;
    };
  }, [activeIndex, feedItems.length, filter, loading, needsTrackFetch, trackCursor, trackHasMore]);

  // File de lecture : uniquement les entrées réellement jouables (morceau ou artiste en vedette),
  // dans le même ordre que le feed affiché, pour que suivant/précédent restent cohérents.
  // Les sources du feed (tracks/clips/artistes/collections/défis) arrivent par appels réseau
  // indépendants et redonnent chacune une nouvelle référence à `feedItems` : on ne renvoie une
  // nouvelle référence de `queueByPosition` que si la séquence d'ids a réellement changé, pour
  // que l'effet d'autoplay ci-dessous ne se redéclenche pas en rafale sur des morceaux identiques
  // pendant que le feed finit de se composer (cause du spam réseau/lecture observé au changement
  // de filtre).
  const queueByPositionRef = useRef<Array<ScrollTrack | null>>([]);
  const queueByPosition = useMemo(() => {
    const next = feedItems.map((item): ScrollTrack | null => {
      const track = item.type === 'track' || item.type === 'clip'
        ? item.track
        : item.type === 'artist_spotlight'
          ? item.track
          : item.type === 'post'
            ? trackFromScrollPost(item.post)
            : null;
      if (!track) return null;
      return { ...track, coverUrl: track.coverUrl || FALLBACK_COVER };
    });
    const prev = queueByPositionRef.current;
    const unchanged = prev.length === next.length && prev.every((t, i) => (t?._id || null) === (next[i]?._id || null));
    if (unchanged) return prev;
    queueByPositionRef.current = next;
    return next;
  }, [feedItems]);

  const playableQueue = useMemo(() => queueByPosition.filter((t): t is ScrollTrack => Boolean(t)).map((t) => ({ ...t, source: 'scroll' })), [queueByPosition]);

  const feedIndexToQueueIndex = useMemo(() => {
    const map = new Map<number, number>();
    let qi = 0;
    queueByPosition.forEach((track, idx) => {
      if (track) {
        map.set(idx, qi);
        qi += 1;
      }
    });
    return map;
  }, [queueByPosition]);

  const playIndex = useCallback(
    (index: number) => {
      const track = queueByPosition[index];
      const queueIndex = feedIndexToQueueIndex.get(index);
      if (!track || queueIndex === undefined) return;
      setQueueAndPlay(playableQueue as any, queueIndex);
    },
    [feedIndexToQueueIndex, playableQueue, queueByPosition, setQueueAndPlay],
  );

  const navigateTo = useCallback((index: number) => {
    setActiveIndex((current) => (current === index ? current : index));
  }, []);

  const returnToHome = useCallback(() => {
    if (filter !== 'foryou') return;
    setHomePreludeOpen(true);
  }, [filter]);

  const scrollSnap = useFeedScrollSnap({
    itemCount: feedItems.length,
    activeIndex,
    locked: lyricsOpen,
    ready: !loading,
    onNavigate: navigateTo,
    onTogglePlay: useCallback(() => { audioState.isPlaying ? pause() : play(); }, [audioState.isPlaying, pause, play]),
    onReturnHome: returnToHome,
  });

  const jump = useCallback((index: number) => {
    const clamped = clamp(index, 0, feedItems.length - 1);
    scrollSnap.scrollTo(clamped, 'smooth');
    navigateTo(clamped);
  }, [feedItems.length, scrollSnap, navigateTo]);

  const enterFlow = useCallback(() => {
    setHomePreludeOpen(false);
  }, []);

  const playPreludeTrack = useCallback((track: ScrollTrack) => {
    if (currentId === track._id) {
      if (audioState.isPlaying) pause();
      else void play();
      return;
    }
    playTrack(track as any);
  }, [audioState.isPlaying, currentId, pause, play, playTrack]);

  const openPreludeTrack = useCallback((track: ScrollTrack) => {
    const index = feedItems.findIndex((item) => {
      if (item.type === 'track' || item.type === 'clip' || item.type === 'artist_spotlight') return item.track._id === track._id;
      return item.type === 'post' && item.post.track?.id === track._id;
    });
    setHomePreludeOpen(false);
    if (index < 0) {
      playTrack(track as any);
      return;
    }
    requestAnimationFrame(() => {
      scrollSnap.scrollTo(index, 'auto');
      navigateTo(index);
      if (currentId !== track._id) playIndex(index);
    });
  }, [currentId, feedItems, navigateTo, playIndex, playTrack, scrollSnap]);

  // Déclenche la lecture quand l'item actif change (geste de scroll, clic sur une
  // carte, ou repositionnement après chargement/changement de filtre) : une seule
  // source de vérité, pas de double-déclenchement à traquer.
  // Garde d'idempotence stricte : `lastAutoplayRequestRef` retient le dernier morceau
  // réellement demandé pour la position active, pour ne jamais rappeler setQueueAndPlay
  // une seconde fois sur le même morceau tant que le contexte player n'a pas eu le temps
  // de mettre `currentId` à jour (évite la rafale de lecture/réseau si l'effet se
  // redéclenche plusieurs fois rapprochées pour un même morceau).
  const lastAutoplayRequestRef = useRef<string | null>(null);
  useEffect(() => {
    lastAutoplayRequestRef.current = null;
  }, [activeIndex]);
  useEffect(() => {
    const track = queueByPosition[activeIndex];
    if (!track || lyricsOpen || homePreludeOpen) return;
    const timer = window.setTimeout(() => {
      if (currentId === track._id) return;
      if (lastAutoplayRequestRef.current === track._id) return;
      lastAutoplayRequestRef.current = track._id;
      playIndex(activeIndex);
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, currentId, homePreludeOpen, lyricsOpen, playIndex, queueByPosition]);

  // Un Clip a un point de départ choisi par son créateur à la publication
  // (sourceTrackOffsetSeconds) : une fois le son du morceau original chargé, on
  // le positionne à cet instant pour rester synchro avec la vidéo (ref unique par
  // clip pour ne recaler qu'une seule fois, jamais si l'auditeur navigue lui-même).
  useEffect(() => {
    const item = feedItems[activeIndex];
    if (!item || item.type !== 'clip') return;
    const offset = item.clip.sourceTrackOffsetSeconds || 0;
    if (offset <= 0) return;
    if (currentId !== item.track._id) return;
    if (!audioState.duration) return;
    if (clipOffsetSeekedRef.current === item.clip.id) return;
    clipOffsetSeekedRef.current = item.clip.id;
    seek(Math.min(offset, Math.max(0, audioState.duration - 0.5)));
  }, [activeIndex, feedItems, currentId, audioState.duration, seek]);

  const shareTrack = useCallback(async (track: ScrollTrack) => {
    const url = `${window.location.origin}/track/${track._id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: track.title, text: 'Écoute sur Synaura', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignore
    }
  }, []);

  const shareClip = useCallback(async (clip: ScrollClip) => {
    const sourceUrl = `${window.location.origin}${(clip.sourceTrack as any).trackUrl || `/track/${clip.sourceTrack._id}`}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: clip.sourceTrack.title, text: clip.caption || 'Clip musical Synaura', url: sourceUrl });
      } else {
        await navigator.clipboard.writeText(sourceUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  const sharePost = useCallback(async (post: ScrollPost) => {
    const url = `${window.location.origin}/posts/${encodeURIComponent(post.id)}`;
    const author = post.creator.name || post.creator.username || 'Membre Synaura';
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: `Post de ${author}`, text: post.content || 'Publication Synaura', url });
      } else {
        await navigator.clipboard.writeText(url);
        notify.success('', 'Lien du post copié');
      }
    } catch {
      // Le partage natif peut être annulé volontairement.
    }
  }, []);

  const launchCollection = useCallback(async (collectionId: string, slug: string) => {
    setLaunchingCollectionId(collectionId);
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      const tracks = Array.isArray(json?.tracks) ? json.tracks : [];
      if (tracks.length) setQueueAndPlay(tracks as any, 0);
    } catch {
      // ignore
    } finally {
      setLaunchingCollectionId(null);
    }
  }, [setQueueAndPlay]);

  // Waveform réelle + commentaires horodatés : uniquement quand la carte active
  // est un vrai morceau (pas un clip/artiste/collection/défi/annonce).
  const activeFeedItem = feedItems[activeIndex] || null;
  const waveformTrack = activeFeedItem?.type === 'track' ? activeFeedItem.track : null;
  const trackWaveform = useTrackWaveform(waveformTrack?._id, waveformTrack?.audioUrl, waveformTrack?.duration);
  const momentComments = useMomentComments(waveformTrack?._id);
  const momentReactions = useMomentReactions(waveformTrack?._id);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

  const submitMomentReaction = useCallback(async (reactionType: MomentReactionType, rawTimestamp: number) => {
    if (!waveformTrack?._id) return;
    const timestampSeconds = Math.max(0, Math.round(rawTimestamp));
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(waveformTrack._id)}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType, timestampSeconds }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Impossible d'enregistrer la réaction");
      momentReactions.addOptimistic({
        id: String(payload?.reaction?.id || `local-${Date.now()}`),
        reactionType,
        timestampSeconds,
      });
    } catch (error: any) {
      notify.error('Erreur', error?.message || "Impossible d'enregistrer la réaction");
    }
  }, [waveformTrack, momentReactions]);

  const submitMomentComment = useCallback(async () => {
    if (!momentComposer || !momentComposerText.trim()) return;
    if (!session?.user) {
      notify.error('Erreur', 'Connecte-toi pour commenter');
      return;
    }
    setMomentComposerSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(momentComposer.track._id)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: momentComposerText.trim(), timestampSeconds: momentComposer.timestampSeconds }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Impossible d'envoyer le commentaire");

      momentComments.addOptimistic({
        id: String(payload?.comment?.id || `local-${Date.now()}`),
        content: payload?.comment?.content ?? momentComposerText.trim(),
        createdAt: payload?.comment?.createdAt || new Date().toISOString(),
        timestampSeconds: momentComposer.timestampSeconds,
        user: {
          id: String(payload?.comment?.user?.id || ''),
          username: payload?.comment?.user?.username || 'utilisateur',
          name: payload?.comment?.user?.name || payload?.comment?.user?.username || 'Membre',
          avatar: payload?.comment?.user?.avatar || '',
        },
      });
      notify.success('OK', 'Commentaire ajouté au bon moment');
      setMomentComposer(null);
      setMomentComposerText('');
    } catch (error: any) {
      notify.error('Erreur', error?.message || "Impossible d'envoyer le commentaire");
    } finally {
      setMomentComposerSubmitting(false);
    }
  }, [momentComposer, momentComposerText, session, momentComments]);

  const profileHref = username ? `/profile/${username}` : '/auth/signin';

  const accountLinks = [
    { href: '/clips/new', label: 'Publier un clip', icon: Film },
    { href: profileHref, label: 'Mon profil', icon: User },
    { href: '/discover', label: 'Découvrir', icon: Compass },
    { href: '/library', label: 'Bibliothèque', icon: Library },
    { href: '/community', label: 'Clubs', icon: Users },
    { href: '/ai-generator', label: 'Studio', icon: Sparkles },
    { href: '/settings', label: 'Paramètres', icon: Settings },
    { href: '/subscriptions', label: 'Abonnement', icon: CreditCard },
  ];

  const showEmptyState = !loading && !error && feedItems.length === 0;
  const renderRange = {
    lo: Math.max(0, activeIndex - RENDER_BUFFER),
    hi: Math.min(feedItems.length - 1, activeIndex + RENDER_BUFFER),
  };

  function renderItemBody(item: ScrollFeedItem, index: number) {
    if (item.type === 'clip') {
      const { clip, track } = item;
      const isPlayingThis = currentId === track._id && audioState.isPlaying;
      const sourceHref = (clip.sourceTrack as any).trackUrl || `/track/${track._id}`;
      const isOwnSource = Boolean(currentUserId) && track.artist?._id === currentUserId;
      const canUseSound = canUseSoundClientSide({
        isOwner: isOwnSource,
        allowClips: Boolean((track as any).allowClips),
        remixVisibility: (track as any).remixVisibility || 'disabled',
      });
      return (
        <>
          <div className="absolute inset-0 bg-[#171313]" />
          {clip.videoUrl ? (
            <ClipVideoLayer key={clip.id} src={clip.videoUrl} poster={clip.posterUrl} active={index === activeIndex} />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent via-45% to-black/85" />

          <aside className="absolute right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2.5">
            <button type="button" className="grid min-h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
              <Heart className="h-5 w-5" />
              <span className="text-[10px] font-black">{fmtCount(clip.likesCount)}</span>
            </button>
            <Link href={sourceHref} className="grid min-h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px] font-black">{fmtCount(clip.commentsCount)}</span>
            </Link>
            <button onClick={() => shareClip(clip)} className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
              <Share2 className="h-5 w-5" />
            </button>
          </aside>

          <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="mx-auto max-w-5xl space-y-3">
              <div className="max-w-xl text-white drop-shadow">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#4A9EAA]/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8fd3dc]">
                  <Film className="h-3 w-3" />
                  Clip Synaura
                </div>
                <div className="flex items-center gap-2">
                  {clip.creator.avatar ? <img src={clip.creator.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-white/18 text-xs font-black">{(clip.creator.name || 'S').slice(0, 1).toUpperCase()}</span>}
                  <span className="text-sm font-black">@{clip.creator.username || clip.creator.name || 'synaura'}</span>
                </div>
                {clip.caption ? <p className="mt-3 text-base font-bold leading-6">{clip.caption}</p> : null}
                {clip.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {clip.tags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-white/14 px-2.5 py-1 text-xs font-black">#{tag}</span>)}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.8rem] border border-white/12 bg-[#fffaf2]/95 p-4 text-[#171313] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-3">
                  <img src={track.coverUrl || FALLBACK_COVER} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4A9EAA]">Son original</p>
                    <h2 className="mt-0.5 truncate text-lg font-black">{track.title}</h2>
                    <p className="truncate text-sm font-bold text-black/48">{track.artist?.name || track.artist?.username || 'Artiste Synaura'}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (currentId !== track._id) playIndex(index);
                      else if (audioState.isPlaying) pause();
                      else void play();
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#111111] text-white"
                  >
                    {isPlayingThis ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                  </button>
                  <Link href={sourceHref} className="hidden h-11 shrink-0 items-center rounded-full bg-black/[0.06] px-4 text-xs font-black text-[#111111] transition hover:bg-[#111111] hover:text-white sm:inline-flex">
                    Voir le morceau
                  </Link>
                  {canUseSound ? (
                    <button
                      type="button"
                      onClick={() => useThisSound(track)}
                      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#7357C6] px-4 text-xs font-black text-white transition hover:bg-[#5f45a8]"
                    >
                      <Film className="h-3.5 w-3.5" />
                      {isOwnSource ? 'Créer un clip officiel' : 'Utiliser ce son'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (item.type === 'post') {
      const attachedTrack = trackFromScrollPost(item.post);
      const isPlayingThis = Boolean(attachedTrack && currentId === attachedTrack._id && audioState.isPlaying);
      return (
        <ScrollPostSlide
          post={item.post}
          active={index === activeIndex}
          playing={isPlayingThis}
          onOpenPost={() => router.push(`/posts/${encodeURIComponent(item.post.id)}`, { scroll: false })}
          onOpenProfile={() => {
            if (item.post.creator.username) router.push(`/profile/${encodeURIComponent(item.post.creator.username)}`);
            else router.push(`/posts/${encodeURIComponent(item.post.id)}`, { scroll: false });
          }}
          onPlayTrack={() => {
            if (!attachedTrack) return;
            if (currentId !== attachedTrack._id) playIndex(index);
            else if (audioState.isPlaying) pause();
            else void play();
          }}
          onOpenTrack={(track) => router.push(`/track/${encodeURIComponent(track._id)}`, { scroll: false })}
          getAudioElement={getAudioElement}
          onSeek={(seconds) => {
            if (!attachedTrack) return;
            if (currentId !== attachedTrack._id) {
              playIndex(index);
              window.setTimeout(() => seek(seconds), 120);
            } else {
              seek(seconds);
            }
          }}
          onShare={() => void sharePost(item.post)}
        />
      );
    }

    if (item.type === 'track') {
      const track = item.track;
      const isPlayingThis = currentId === track._id && audioState.isPlaying;
      const duration = currentId === track._id ? audioState.duration || track.duration || 0 : track.duration || 0;
      const likesCount = countOf(track.likes);
      const commentsCount = countOf(track.comments);
      const saved = isFavorite(track._id);
      const canRemixAiVariation = Boolean((track as any).canRemixAiVariation) && isAiVariationAvailable({
        allowAiVariation: Boolean((track as any).allowAiVariation),
        remixVisibility: (track as any).remixVisibility || 'disabled',
      });
      const isOwnTrack = Boolean(currentUserId) && track.artist?._id === currentUserId;
      const canUseSound = canUseSoundClientSide({
        isOwner: isOwnTrack,
        allowClips: Boolean((track as any).allowClips),
        remixVisibility: (track as any).remixVisibility || 'disabled',
      });

      return (
        <>
          <div className="absolute inset-0">
            <img
              src={track.coverUrl || FALLBACK_COVER}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-42 blur-3xl saturate-150"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_COVER;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#171313]/90 via-[#171313]/32 to-[#171313]/94" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(115,87,198,0.16),transparent_46%)]" />
          </div>

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
                src={track.coverUrl || FALLBACK_COVER}
                alt={track.title}
                className="aspect-square w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_COVER;
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

          <aside className="absolute right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2.5">
            <button onClick={() => handleLike(track._id)} className="grid min-h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
              <Heart className={`h-5 w-5 ${track.isLiked ? 'fill-[#D96D63] text-[#D96D63]' : ''}`} />
              <span className="text-[10px] font-black">{fmtCount(likesCount)}</span>
            </button>
            <button onClick={() => router.push(`/track/${track._id}`, { scroll: false })} className="grid min-h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px] font-black">{fmtCount(commentsCount)}</span>
            </button>
            <button onClick={() => shareTrack(track)} className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => toggleFavorite({ _id: track._id, title: track.title, artist: track.artist, coverUrl: track.coverUrl, audioUrl: track.audioUrl })}
              aria-label="Ajouter à la bibliothèque"
              className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16"
            >
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-white' : ''}`} />
            </button>
            {canRemixAiVariation ? (
              <button
                type="button"
                onClick={() => setRemixSheetTrack(track)}
                aria-label="Remixer"
                title="Remixer"
                className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16"
              >
                <Wand2 className="h-5 w-5" />
              </button>) : null}
            {canUseSound ? (
              <button
                type="button"
                onClick={() => useThisSound(track)}
                aria-label={isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'}
                title={isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'}
                className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16"
              >
                <Film className="h-5 w-5" />
              </button>
            ) : null}
            <a href={track.audioUrl} download className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16">
              <Download className="h-5 w-5" />
            </a>
          </aside>

          <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="mx-auto max-w-5xl rounded-[1.8rem] border border-white/12 bg-[#fffaf2]/95 p-4 text-[#171313] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(track.genre?.length ? track.genre.slice(0, 3) : ['Synaura']).map((tag) => (
                      <span key={tag} className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-black/40">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-1.5 truncate text-2xl font-black tracking-tight">{track.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-black/56">{track.artist?.name || track.artist?.username || 'Artiste'}</p>
                    {track.artist?._id ? (
                      <FollowButton artistId={track.artist._id} artistUsername={track.artist.username} size="sm" className="rounded-full px-3 py-1 text-xs" />
                    ) : null}
                  </div>
                  {(track as any).remixAttribution ? (
                    <Link href={(track as any).remixAttribution.trackUrl || `/track/${(track as any).remixAttribution.sourceTrackId}`} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-[#7357C6]/10 px-3 py-1 text-xs font-black text-[#7357C6]">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="truncate">Inspiré de {(track as any).remixAttribution.title}</span>
                    </Link>
                  ) : null}
                  {Number((track as any).variationsCount || 0) > 0 ? (
                    <p className="mt-2 text-xs font-black text-[#4A9EAA]">{fmtCount(Number((track as any).variationsCount || 0))} Variations</p>
                  ) : null}
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
                {index === activeIndex && currentId === track._id ? (
                  <>
                    <Waveform
                      variant="light"
                      peaks={trackWaveform.peaks}
                      duration={duration}
                      loading={trackWaveform.loading}
                      getAudioElement={getAudioElement}
                      onSeek={seek}
                      markers={momentComments.markers}
                      reactionClusters={momentReactions.clusters}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMomentComposer({ track, timestampSeconds: Math.max(0, getAudioElement()?.currentTime || 0) });
                          setMomentComposerText('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-[11px] font-black text-black/56 transition hover:bg-[#171313] hover:text-white"
                      >
                        <MessageCircle className="h-3 w-3" />
                        Commenter ce moment
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setReactionPickerOpen((v) => !v)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-[11px] font-black text-black/56 transition hover:bg-[#171313] hover:text-white"
                        >
                          <SmilePlus className="h-3 w-3" />
                          Réagir
                        </button>
                        <ReactionPicker
                          open={reactionPickerOpen}
                          onClose={() => setReactionPickerOpen(false)}
                          onPick={(type) => {
                            submitMomentReaction(type, getAudioElement()?.currentTime || 0);
                            setReactionPickerOpen(false);
                          }}
                          variant="light"
                          className="bottom-full mb-2 right-0"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold tabular-nums text-black/42">
                    <span>0:00</span>
                    <span>{fmtTime(duration)}</span>
                  </div>
                )}
                <p className="mt-1.5 text-right text-[11px] font-bold text-black/38">
                  {index + 1}/{feedItems.length}
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-28 right-4 z-30 hidden flex-col gap-2 md:flex">
            <button onClick={() => jump(activeIndex - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 backdrop-blur-xl transition hover:bg-white/16">
              <ChevronUp className="h-5 w-5" />
            </button>
            <button onClick={() => jump(activeIndex + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 backdrop-blur-xl transition hover:bg-white/16">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {lyricsOpen && index === activeIndex ? (
            <div className="absolute inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
              <div className="mx-auto w-full max-w-4xl rounded-t-[2rem] border border-white/12 bg-[#fffaf2] p-5 text-[#171313]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">Paroles</h3>
                  <button onClick={() => setLyricsOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06]">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <pre className="mt-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-sm font-semibold leading-7 text-black/64">
                  {track.lyrics?.trim() || 'Aucune parole disponible pour ce titre.'}
                </pre>
              </div>
            </div>
          ) : null}
        </>
      );
    }

    if (item.type === 'artist_spotlight') {
      const { artist, track } = item;
      const isPlayingThis = currentId === track._id && audioState.isPlaying;

      return (
        <>
          <div className="absolute inset-0">
            <img
              src={track.coverUrl || FALLBACK_COVER}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-35 blur-3xl saturate-150"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_COVER;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#171313]/92 via-[#221a2c]/60 to-[#171313]/94" />
          </div>

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <button
              type="button"
              onClick={() => {
                if (currentId !== track._id) playIndex(index);
                else if (audioState.isPlaying) pause();
                else void play();
              }}
              className="group relative h-48 w-48 overflow-hidden rounded-full border border-white/14 bg-white/8 shadow-[0_28px_90px_rgba(0,0,0,0.4)]"
            >
              {artist.avatar ? (
                <img src={artist.avatar} alt={artist.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-[#7357C6]/40 text-5xl font-black text-white">
                  {artist.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                {isPlayingThis ? <Pause className="h-9 w-9 text-white" /> : <Play className="ml-1 h-9 w-9 fill-current text-white" />}
              </div>
            </button>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c9a8ff]">Mise en avant</p>
              <div className="mt-1.5 flex items-center justify-center gap-1.5">
                <h2 className="text-2xl font-black tracking-tight text-white">{artist.name}</h2>
                {artist.isVerified ? <BadgeCheck className="h-5 w-5 text-[#4A9EAA]" /> : null}
              </div>
              {track.genre?.[0] ? (
                <p className="mt-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#4A9EAA]">{track.genre[0]}</p>
              ) : null}
              {artist.bio ? (
                <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-white/60">{artist.bio}</p>
              ) : null}
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/40">
                En vedette · {track.title}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-[1.8rem] border border-white/12 bg-[#fffaf2]/95 p-4 text-[#171313] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{artist.name}</p>
                <p className="truncate text-xs font-bold text-black/48">@{artist.username || 'synaura'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {artist.username ? (
                  <FollowButton artistId={artist.id} artistUsername={artist.username} size="sm" className="rounded-full px-3 py-1.5 text-xs" />
                ) : null}
                <Link
                  href={artist.username ? `/profile/${artist.username}` : '#'}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#171313] px-4 text-xs font-black text-white transition hover:scale-[1.02]"
                >
                  Découvrir son univers
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (item.type === 'collection') {
      const { collection } = item;
      const launching = launchingCollectionId === collection.id;
      const gradient = collection.themeColors && collection.themeColors.length >= 2
        ? `linear-gradient(135deg, ${collection.themeColors.join(', ')})`
        : 'linear-gradient(135deg, #7357C6, #4A9EAA)';

      return (
        <>
          <div className="absolute inset-0" style={{ background: gradient, opacity: 0.9 }} />
          <div className="absolute inset-0 bg-[#171313]/38" />

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="h-48 w-48 overflow-hidden rounded-[1.4rem] border-[3px] border-white/20 bg-white/10 shadow-[0_28px_90px_rgba(0,0,0,0.45)] ring-1 ring-black/20">
              <img
                src={collection.coverUrl || collection.bannerUrl || FALLBACK_COVER}
                alt={collection.title}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_COVER;
                }}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">{collection.badge || 'Collection'}</p>
              <h2 className="mt-1.5 max-w-sm text-2xl font-black tracking-tight text-white">{collection.title}</h2>
              {collection.subtitle ? (
                <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-white/65">{collection.subtitle}</p>
              ) : null}
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/50">
                {collection.trackCount} morceau{collection.trackCount > 1 ? 'x' : ''}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2.5 rounded-[1.8rem] border border-white/12 bg-[#fffaf2]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <button
                type="button"
                disabled={launching}
                onClick={() => launchCollection(collection.id, collection.slug)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-60"
              >
                {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                Lancer la collection
              </button>
              <Link
                href={collection.href}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-black/[0.06] px-5 text-sm font-black text-[#171313] transition hover:bg-black hover:text-white"
              >
                Voir la sélection
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      );
    }

    if (item.type === 'challenge') {
      const { challenge } = item;
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#D96D63] via-[#171313] to-[#171313]" />
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/12 backdrop-blur-xl">
              <Trophy className="h-7 w-7 text-white" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Défi Synaura Pulse</p>
              <h2 className="mt-1.5 max-w-sm text-2xl font-black tracking-tight text-white">{challenge.title}</h2>
              {challenge.description ? (
                <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-white/65">{challenge.description}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-white/55">
                <span className="rounded-full bg-white/10 px-3 py-1.5">{challenge.tracksCount} morceaux inscrits</span>
                {typeof challenge.totalVotes === 'number' ? (
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{challenge.totalVotes} votes</span>
                ) : null}
                {typeof challenge.participationCount === 'number' ? (
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{challenge.participationCount} participants</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="mx-auto max-w-5xl rounded-[1.8rem] border border-white/12 bg-[#fffaf2]/95 p-4 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <Link
                href={challenge.href}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#171313] px-6 text-sm font-black text-white transition hover:scale-[1.02]"
              >
                Voir le défi
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      );
    }

    const { announcement } = item;
    return (
      <>
        <div className="absolute inset-0 bg-gradient-to-br from-[#4A9EAA] via-[#171313] to-[#171313]" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/12 backdrop-blur-xl">
            <Megaphone className="h-7 w-7 text-white" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Actu Synaura</p>
            <h2 className="mt-1.5 max-w-sm text-2xl font-black tracking-tight text-white">{announcement.title}</h2>
            {announcement.description ? (
              <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-white/65">{announcement.description}</p>
            ) : null}
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
              {announcement.tracksCount} morceau{announcement.tracksCount > 1 ? 'x' : ''} à découvrir
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mx-auto max-w-5xl rounded-[1.8rem] border border-white/12 bg-[#fffaf2]/95 p-4 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <Link
              href={announcement.href}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#171313] px-6 text-sm font-black text-white transition hover:scale-[1.02]"
            >
              Découvrir
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#171313] text-white">
      <HomeFlowPrelude
        open={homePreludeOpen && filter === 'foryou'}
        tracks={baseTracks}
        posts={basePosts}
        currentTrack={(currentTrack as ScrollTrack | undefined) || null}
        currentPlaying={audioState.isPlaying}
        userName={(session?.user as any)?.name || username || null}
        onEnterFlow={enterFlow}
        onPlayTrack={playPreludeTrack}
        onOpenTrack={openPreludeTrack}
        onOpenPost={(post) => router.push(`/posts/${encodeURIComponent(post.id)}`, { scroll: false })}
        onSearch={() => router.push('/search')}
        onNotifications={() => router.push('/notifications')}
        onDiscover={() => router.push('/discover')}
        onRadar={() => router.push('/radar')}
        onStudio={() => router.push('/ai-generator')}
        onEvents={() => router.push('/city')}
      />
      <ClipUploadIndicator />
      <div className="absolute left-0 right-0 top-0 z-40 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setFilter('foryou');
              setHomePreludeOpen(true);
            }}
            className="flex min-w-0 items-center gap-2"
            aria-label="Revenir à l'accueil Synaura"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fffaf2] shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
              <Image
                src="/brand/2026/synaura-symbol-2026.png"
                alt="Synaura"
                width={22}
                height={22}
                className="h-5 w-5 object-contain"
                unoptimized
                priority
              />
            </span>
            <span className="hidden truncate text-sm font-black tracking-tight text-white sm:block">Synaura</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Rechercher"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/14 backdrop-blur-xl transition ${
                searchOpen ? 'bg-white text-[#171313]' : 'bg-white/10 text-white hover:bg-white/16'
              }`}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            <NotificationCenter className="h-10 w-10 border border-white/14 bg-white/10 text-white hover:bg-white/16" />
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-label="Profil"
                className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/14 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/16"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </button>

              {accountOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 max-w-none overflow-hidden rounded-[1.2rem] border border-black/[0.08] bg-[#fffaf2] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                  {accountLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2.5 rounded-[0.85rem] px-3 py-2.5 text-sm font-black text-black/70 transition hover:bg-black hover:text-white"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  {session ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className="flex w-full items-center gap-2.5 rounded-[0.85rem] px-3 py-2.5 text-left text-sm font-black text-[#d92d20] transition hover:bg-[#d92d20] hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {searchOpen ? (
          <div className="mt-2.5 rounded-[1.4rem] bg-[#fffaf2] px-1 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.32)]">
            <SynauraUniversalSearch compact />
          </div>
        ) : (
          <div className="synaura-no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
            {FILTER_ORDER.map((key) => {
              const meta = FILTER_META[key];
              const active = key === filter;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={active}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-black transition ${
                    active ? 'bg-white text-[#171313]' : 'bg-white/10 text-white/68 hover:bg-white/16 hover:text-white'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {cityPulse ? (
        <button
          type="button"
          onClick={() => router.push('/city')}
          className="absolute left-4 top-[6.5rem] z-30 hidden max-w-[280px] rounded-[1.4rem] border border-white/12 bg-[#fffaf2]/92 p-3 text-left text-[#171313] shadow-[0_18px_55px_rgba(0,0,0,.26)] backdrop-blur-2xl md:block"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF6F61]">Events · Synaura Pulse</p>
          <p className="mt-1 line-clamp-1 text-sm font-black">{cityPulse.event}</p>
          <p className="mt-1 text-[11px] font-bold text-black/50">{cityPulse.title} · Pulse {cityPulse.pulse}% · {cityPulse.votes} votes</p>
        </button>
      ) : null}

      {loading ? (
        <div className="grid h-full w-full place-items-center">
          <div className="rounded-[2rem] border border-[#dccfbb] bg-white p-8 text-center text-[#171313] shadow-[0_24px_80px_rgba(44,33,19,0.16)]">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm font-black text-black/50">Chargement du scroll...</p>
          </div>
        </div>
      ) : error || showEmptyState ? (
        <div className="grid h-full w-full place-items-center px-6">
          <div className="max-w-md rounded-[2rem] border border-[#dccfbb] bg-white p-8 text-center text-[#171313] shadow-[0_24px_80px_rgba(44,33,19,0.16)]">
            {filter === 'creators' ? (
              <>
                <Users className="mx-auto h-10 w-10 text-black/24" />
                <h1 className="mt-4 text-2xl font-black">Pas de créateur à l'affiche</h1>
                <p className="mt-2 text-sm font-semibold text-black/48">Reviens un peu plus tard, de nouveaux artistes arrivent régulièrement.</p>
              </>
            ) : filter === 'challenges' ? (
              <>
                <Trophy className="mx-auto h-10 w-10 text-black/24" />
                <h1 className="mt-4 text-2xl font-black">Aucun défi en cours</h1>
                <p className="mt-2 text-sm font-semibold text-black/48">Reviens un peu plus tard, le prochain défi Synaura arrive bientôt.</p>
              </>
            ) : (
              <>
                <ListMusic className="mx-auto h-10 w-10 text-black/24" />
                <h1 className="mt-4 text-2xl font-black">Aucun son à afficher</h1>
                <p className="mt-2 text-sm font-semibold text-black/48">{error || 'Le feed est vide pour le moment.'}</p>
              </>
            )}
            <button
              onClick={() => (filter === 'creators' || filter === 'challenges' ? setFilter('foryou') : setReloadKey((v) => v + 1))}
              className="mt-5 h-11 rounded-full bg-[#171313] px-5 text-sm font-black text-white"
            >
              {filter === 'creators' || filter === 'challenges' ? 'Retour à Pour toi' : 'Réessayer'}
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={scrollSnap.containerRef}
          onTouchStart={scrollSnap.onTouchStart}
          onTouchEnd={scrollSnap.onTouchEnd}
          onScroll={scrollSnap.onScroll}
          className="synaura-scroll-feed h-full w-full snap-y snap-mandatory touch-pan-y overflow-y-auto overscroll-contain"
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', scrollbarWidth: 'none' }}
        >
          <style>{`.synaura-scroll-feed::-webkit-scrollbar { display: none; }`}</style>
          {feedItems.map((item, index) => {
            if (index < renderRange.lo || index > renderRange.hi) {
              return (
                <div
                  key={item.id}
                  ref={(el) => { scrollSnap.itemRefs.current[index] = el; }}
                  className="h-[100svh] w-full snap-start"
                  style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', contain: 'layout size paint style' }}
                />
              );
            }
            return (
              <section
                key={item.id}
                ref={(el) => { scrollSnap.itemRefs.current[index] = el; }}
                data-index={index}
                className="relative h-[100svh] w-full snap-start overflow-hidden"
                style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
              >
                {renderItemBody(item, index)}
              </section>
            );
          })}
        </div>
      )}
      {remixSheetTrack ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pb-4 backdrop-blur-sm" onClick={() => setRemixSheetTrack(null)}>
          <div className="w-full max-w-lg rounded-[1.6rem] border border-black/[0.08] bg-[#F7F6F3] p-4 text-[#111111] shadow-[0_30px_100px_rgba(17,17,17,0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3">
              <img src={remixSheetTrack.coverUrl || FALLBACK_COVER} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black">{remixSheetTrack.title}</h3>
                <p className="truncate text-sm font-bold text-black/50">{remixSheetTrack.artist?.name || remixSheetTrack.artist?.username || 'Artiste Synaura'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-black text-black/72">Créer une variation IA inspirée de ce morceau</p>
            <p className="mt-2 text-xs font-semibold text-black/48">Le créateur original sera toujours crédité</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => openStudioWithRemix(remixSheetTrack)} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-black text-white">
                <Wand2 className="h-4 w-4" />
                Ouvrir dans Studio
              </button>
              <button type="button" onClick={() => setRemixSheetTrack(null)} className="h-12 rounded-full border border-black/[0.08] bg-white px-5 text-sm font-black text-black/56">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {momentComposer ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pb-4 backdrop-blur-sm" onClick={() => setMomentComposer(null)}>
          <div className="w-full max-w-lg rounded-[1.6rem] border border-black/[0.08] bg-[#F7F6F3] p-4 text-[#111111] shadow-[0_30px_100px_rgba(17,17,17,0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3">
              <img src={momentComposer.track.coverUrl || FALLBACK_COVER} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7357C6]">Commentaire à {fmtTime(momentComposer.timestampSeconds)}</p>
                <h3 className="truncate text-base font-black">{momentComposer.track.title}</h3>
              </div>
            </div>
            <textarea
              value={momentComposerText}
              onChange={(event) => setMomentComposerText(event.target.value)}
              placeholder={`Que se passe-t-il à ${fmtTime(momentComposer.timestampSeconds)} ?`}
              className="mt-3 min-h-[88px] w-full resize-none rounded-[1rem] border border-black/[0.08] bg-white px-3 py-3 text-sm text-[#171313] outline-none placeholder:text-black/28 focus:border-black/20"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setMomentComposer(null)} className="h-11 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black text-black/56">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void submitMomentComment()}
                disabled={momentComposerSubmitting || !momentComposerText.trim()}
                className="inline-flex h-11 items-center rounded-full bg-[#171313] px-5 text-sm font-black text-white transition disabled:opacity-50"
              >
                {momentComposerSubmitting ? 'Envoi...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
