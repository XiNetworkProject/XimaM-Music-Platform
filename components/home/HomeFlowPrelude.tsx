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
  Pause,
  Play,
  Radar,
  Radio,
  Search,
  Share2,
  Sparkles,
} from 'lucide-react';
import MessageInboxButton from '@/components/messaging/MessageInboxButton';
import SynauraLogo from '@/components/brand/SynauraLogo';
import { type ScrollPost, type ScrollTrack } from '@/lib/scrollFeed';
import { SynauraImage } from '@/components/ui/SynauraImage';
import './home-flow-prelude.css';

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
  'Un son. Un autre horizon.',
  'La musique, point de rencontre.',
  'Entre ici. Écoute ailleurs.',
  'Fais une place à l’inattendu.',
  'Chaque écoute ouvre une porte.',
  'Trouve le son qui te ressemble.',
  'Des voix à découvrir.',
  'Laisse la musique prendre place.',
  'Une nouvelle écoute commence ici.',
  'Au rythme de tes découvertes.',
  'Explore ce qui te fait vibrer.',
  'Ta prochaine rencontre est musicale.',
];

const BANNER_ROTATION_MS = 4200;

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
  const [bannerIndex, setBannerIndex] = useState(0);
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

  const bannerItems = useMemo(
    () => [
      latestPost
        ? `${latestPost.creator.name || latestPost.creator.username} vient de publier`
        : 'Explore les publications de la communauté',
      featuredTrack
        ? `À découvrir : « ${featuredTrack.title} »`
        : 'Les morceaux disponibles apparaîtront ici',
      'Découvre les artistes derrière les morceaux',
      'Explore une autre sélection dans le Radar',
      'Écouter, créer, partager',
      'Ouvre le Flow pour poursuivre la découverte',
    ],
    [featuredTrack, latestPost],
  );

  const avatarCandidates = playableTracks
    .map((track) => track.artist?.avatar)
    .filter((avatar): avatar is string => Boolean(avatar))
    .slice(0, 3);

  useEffect(() => {
    if (open) {
      leavingRef.current = false;
      wheelDeltaRef.current = 0;
      setLeaving(false);
      setPhraseIndex(Math.floor(Math.random() * PUNCHLINES.length));
      setBannerIndex(0);
    }

    return () => {
      if (leaveTimerRef.current != null) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || bannerItems.length < 2) return;

    const intervalId = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % bannerItems.length);
    }, BANNER_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [bannerItems.length, open]);

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
        if (
          style.position === 'fixed' &&
          zIndex > 120 &&
          !node.classList.contains('synaura-home-prelude')
        ) {
          return;
        }
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
    { label: 'Découvrir', sub: 'Sons & artistes', icon: Compass, onClick: onDiscover },
    { label: 'Radar', sub: 'Une autre sélection', icon: Radar, onClick: onRadar },
    { label: 'Studio IA', sub: 'Donne forme au son', icon: Sparkles, onClick: onStudio },
    { label: 'Événements', sub: 'La scène Synaura', icon: CalendarDays, onClick: onEvents },
  ];

  return (
    <div
      className={"synaura-home-prelude v2-live-prelude chambre-live-start fixed inset-x-0 bottom-[var(--synaura-primary-dock-space)] top-0 z-[120] overflow-hidden lg:bottom-0" + (leaving ? ' is-leaving' : '')}
      data-chambre-live="start"
      data-experience="listening-room"
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
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') enterFlow();
      }}
      tabIndex={-1}
    >
      <div className="chambre-live-stage">
        <header className="chambre-live-header">
          <button type="button" onClick={enterFlow} className="group chambre-live-brand" aria-label="Ouvrir le Live">
            <span className="chambre-live-symbol">
              <SynauraLogo size={24} className="relative transition group-hover:scale-110" decorative />
            </span>
            <span className="chambre-live-brand-copy">
              <span className="chambre-live-eyebrow">Synaura</span>
              <span>Live<span className="chambre-live-brand-dot" aria-hidden="true">.</span></span>
            </span>
          </button>
          <p className="chambre-live-greeting">{greetingName ? 'Bonjour ' + greetingName : 'Ton espace d’écoute'}</p>
          <div className="chambre-live-utilities">
            <button type="button" onClick={onSearch} aria-label="Rechercher" title="Rechercher"><Search /></button>
            <MessageInboxButton className="chambre-live-inbox" />
            <button type="button" onClick={onNotifications} aria-label="Notifications" title="Notifications"><Bell /></button>
          </div>
        </header>

        <div className="chambre-live-composition">
          <section className="chambre-live-current" aria-label="Écouter et poursuivre le Live" data-playing={isPlayingFeatured} data-empty={!featuredTrack}>
            <div className="experience-prelude-light" aria-hidden="true"><span /><span /><span /></div>
            <div className="chambre-live-current-top">
              <button type="button" onClick={enterFlow} className="chambre-live-flow-label"><Radio /><span>Le fil musical</span></button>
              <div className="chambre-live-alternatives">
                <button type="button" onClick={onDiscover}>Découvrir</button>
                <button type="button" onClick={onRadar}>Radar</button>
              </div>
            </div>

            <div className="chambre-live-current-body">
              <p className="chambre-live-eyebrow chambre-live-status"><span aria-hidden="true" />{isCurrentTrack ? (isPlayingFeatured ? 'À l’écoute' : 'Prêt à reprendre') : 'Première découverte'}</p>
              <div className="chambre-live-record">
                <div className="chambre-live-artwork"><SynauraImage src={featuredTrack?.coverUrl || '/default-cover.svg'} fallbackSrc="/default-cover.svg" alt="" /></div>
                <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} className="chambre-live-track-link">
                  <h1>{featuredTrack?.title || 'Ton Live est prêt.'}</h1>
                  <p>{featuredTrack ? artistName(featuredTrack) : 'Aucun morceau disponible pour le moment. Le fil et les autres espaces restent accessibles.'}</p>
                  {featuredTrack ? <span className="chambre-live-track-detail">Voir le morceau <ChevronRight /></span> : null}
                </button>
              </div>
              {featuredTrack ? (
                <div className="chambre-live-track-stats">
                  <span><Headphones />{compactCount(featuredTrack.plays)} écoutes</span>
                  <span>{compactCount(countOf(featuredTrack.likes))} j’aime</span>
                  {nextTrack ? <span className="chambre-live-next">Autre écoute : {nextTrack.title}</span> : null}
                </div>
              ) : null}
              <div className="chambre-live-primary-actions">
                <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onPlayTrack(featuredTrack)} className="chambre-live-play" aria-label={isPlayingFeatured ? 'Mettre en pause' : 'Écouter le morceau'}>
                  {isPlayingFeatured ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                  <span>{isPlayingFeatured ? 'Pause' : 'Écouter'}</span>
                </button>
                <button type="button" onClick={enterFlow} className="chambre-live-enter">Continuer dans Live <ChevronUp /></button>
              </div>
              <div className="chambre-live-current-footer">
                <div className="chambre-live-track-actions">
                  <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} aria-label="Voir les mentions J’aime du morceau"><Heart /><span>{featuredTrack ? compactCount(countOf(featuredTrack.likes)) : '0'}</span></button>
                  <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} aria-label="Commentaires"><MessageCircle /><span>{featuredTrack ? compactCount(countOf(featuredTrack.comments)) : '0'}</span></button>
                  <button type="button" disabled={!featuredTrack} onClick={() => featuredTrack && onOpenTrack(featuredTrack)} aria-label="Partager depuis la fiche du morceau"><Share2 /></button>
                </div>
                <button type="button" onClick={enterFlow} className="chambre-live-gesture" aria-label="Glisser vers le haut pour ouvrir le Flow"><ChevronUp /><span>Glisse pour continuer</span></button>
              </div>
            </div>
          </section>

          <aside className="chambre-live-around" aria-label="Autres écoutes et publications">
            <div className="chambre-live-around-heading">
              <p className="chambre-live-eyebrow">À portée d’écoute</p>
              <h2>La suite t’appartient<span aria-hidden="true">.</span></h2>
              <p className="chambre-live-aside-note">{PUNCHLINES[phraseIndex]}</p>
            </div>
            <div className="chambre-live-ticker" aria-live="off">
              <span>{bannerItems[bannerIndex]}</span>
              <span aria-hidden="true">{String(bannerIndex + 1).padStart(2, '0')} / {String(bannerItems.length).padStart(2, '0')}</span>
            </div>
            <div className="chambre-live-selection">
              <div className="chambre-live-selection-heading"><span>À écouter et à lire</span><span>Faire défiler <ChevronRight /></span></div>
              <div className="chambre-live-rail" aria-label="Morceaux et publications disponibles">
                <button type="button" onClick={() => latestPost && onOpenPost(latestPost)} disabled={!latestPost} className="chambre-live-card chambre-live-post-card">
                  <span className="chambre-live-card-type">Communauté</span>
                  <span className="chambre-live-post-author"><SynauraImage src={latestPost?.creator.avatar || '/default-avatar.svg'} fallbackSrc="/default-avatar.svg" alt="" /><strong>{latestPost?.creator.name || latestPost?.creator.username || 'Publications'}</strong></span>
                  <span className="chambre-live-post-excerpt">{latestPost ? postPreview(latestPost) : 'Aucune publication disponible pour le moment.'}</span>
                  <span className="chambre-live-card-link">Lire la publication <ChevronRight /></span>
                </button>
                <button type="button" onClick={onDiscover} className="chambre-live-card chambre-live-artist-card">
                  <span className="chambre-live-card-type">Artistes</span>
                  <strong>Trouver une nouvelle voix.</strong>
                  <span className="chambre-live-avatars">{(avatarCandidates.length ? avatarCandidates : ['/default-avatar.svg']).map((avatar, index) => (
                    <SynauraImage key={avatar + '-' + index} src={avatar} fallbackSrc="/default-avatar.svg" alt="" />
                  ))}</span>
                  <span className="chambre-live-card-link">Découvrir les artistes <ChevronRight /></span>
                </button>
                {(discoveryTracks.length ? discoveryTracks : featuredTrack ? [featuredTrack] : []).map((track) => (
                  <button key={track._id} type="button" onClick={() => onOpenTrack(track)} className="chambre-live-card chambre-live-music-card">
                    <SynauraImage src={track.coverUrl || '/default-cover.svg'} fallbackSrc="/default-cover.svg" alt="" />
                    <span className="chambre-live-music-card-copy"><span className="chambre-live-card-type">Morceau</span><strong>{track.title}</strong><span>{artistName(track)}</span><span className="chambre-live-card-listens"><Headphones />{compactCount(track.plays)} écoutes</span></span>
                  </button>
                ))}
                {recentPosts.slice(1).map((post) => (
                  <button key={post.id} type="button" onClick={() => onOpenPost(post)} className="chambre-live-card chambre-live-post-card">
                    <span className="chambre-live-card-type">Publication</span>
                    <span className="chambre-live-post-author"><SynauraImage src={post.creator.avatar || '/default-avatar.svg'} fallbackSrc="/default-avatar.svg" alt="" /><strong>{post.creator.name || post.creator.username}</strong></span>
                    <span className="chambre-live-post-excerpt">{postPreview(post)}</span>
                    <span className="chambre-live-post-counts"><span><Heart />{post.likes_count}</span><span><MessageCircle />{post.comments_count}</span></span>
                  </button>
                ))}
                <button type="button" onClick={onStudio} className="chambre-live-card chambre-live-studio-card">
                  <span className="chambre-live-card-type">Studio IA</span>
                  <Sparkles />
                  <strong>Composer le prochain.</strong>
                  <span className="chambre-live-card-link">Ouvrir le Studio <ChevronRight /></span>
                </button>
              </div>
            </div>
            <nav className="chambre-live-shortcuts" aria-label="Explorer et créer">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <button key={shortcut.label} type="button" onClick={shortcut.onClick}>
                    <Icon /><span><strong>{shortcut.label}</strong><span>{shortcut.sub}</span></span><ChevronRight />
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}
