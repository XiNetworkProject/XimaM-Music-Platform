'use client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, MessageCircle, MoreHorizontal, Pause, Play, Share2, Clock3, ListMusic, Heart } from 'lucide-react';
import SynauraScroll, { type LivePilotModel } from '@/components/home/SynauraScroll';
import { useAudioPlayer } from '@/app/providers';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { useCommentsSurface } from '@/components/comments/useCommentsSurface';
import { useTrackActions } from '@/components/actions/useTrackActions';
import FollowButton from '@/components/FollowButton';
import Waveform from './PilotWaveform';
import CommentCount from '@/components/comments/CommentCount';
import { trackFromScrollPost, type ScrollFeedItem, type ScrollTrack, type ScrollPost } from '@/lib/scrollFeed';
import PilotLink from './PilotLink';
import PilotImage from './PilotImage';
import TrackCover from '@/components/TrackCover';
import PilotClipFavorite from './PilotClipFavorite';
import PilotLiveEntry from './PilotLiveEntry';
import { LiveFavorite, LiveReactions } from './LiveSocial';
import LiveAtmosphere from './LiveAtmosphere';
import LiveArtwork from './LiveArtwork';
import LiveAmbienceControls, { useLiveAmbienceSettings } from './LiveAmbienceControls';
import LiveSwipeLight from './LiveSwipeLight';
import LiveFilters from './LiveFilters';
import LiveClipVideo from './LiveClipVideo';
import './live-clips.css';
import { useLiveAudioPulse } from './useLiveAudioPulse';
import { liveItemCover } from '@/lib/liveAmbience';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import './live-experience.css';
import './live-ambience.css';

const filters = [{ id: 'foryou', name: 'Pour vous' }, { id: 'new', name: 'Nouveaux' }, { id: 'clips', name: 'Clips' }, { id: 'creators', name: 'Artistes' }, { id: 'challenges', name: 'Défis' }] as const;
const count = (value: number | string[]) => Array.isArray(value) ? value.length : value;
const entity = (track: ScrollTrack) => ({ type: 'track' as const, id: track._id, title: track.title, artist: track.artist.name, creatorId: track.artist._id, audioUrl: track.audioUrl, coverUrl: track.coverUrl, duration: track.duration, count: count(track.comments) });

export default function PilotLive() { return <SynauraScroll renderPilot={model => <LiveScene model={model} />} />; }

function LiveScene({ model }: { model: LivePilotModel }) {
  const { items, activeIndex, filter, loading, ready, error, range, scrollSnap } = model;
  const motion = useLivingMotion();
  const scene = useRef<HTMLDivElement>(null);
  const { settings,update } = useLiveAmbienceSettings();
  const activeItem = items[activeIndex];
  const cover = liveItemCover(activeItem);
  const pulseTrack = activeItem && 'track' in activeItem ? activeItem.track : activeItem?.type === 'post' ? trackFromScrollPost(activeItem.post) : null;
  const pulseStatus=useLiveAudioPulse(scene,pulseTrack?._id || null,motion.enabled,settings.pulse,settings.sensitivity,settings.musicParticles);
  const entryGuardUntil = useRef(0);
  const mountedFeed = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const feed = scrollSnap.containerRef.current;
    if (feed && feed !== mountedFeed.current) {
      // Loading can recreate the scroller after the continuity snapshot settled.
      // Align only on mount; never interrupt a user swipe or its animation.
      scrollSnap.scrollTo(activeIndex, 'auto');
    }
    mountedFeed.current = feed;
  }, [activeIndex, loading, ready, scrollSnap.containerRef, scrollSnap.scrollTo]);
  useEffect(() => {
    const feed = scrollSnap.containerRef.current;
    if (!feed) return;
    const guard = (event: WheelEvent) => { if (performance.now() < entryGuardUntil.current) { event.preventDefault(); event.stopImmediatePropagation(); } };
    feed.addEventListener('wheel', guard, { capture: true, passive: false });
    return () => feed.removeEventListener('wheel', guard, true);
  }, [loading, ready, scrollSnap.containerRef]);
  const enterFeed = () => {
    entryGuardUntil.current = performance.now() + 650;
    model.enterFeed();
    requestAnimationFrame(() => scrollSnap.containerRef.current?.focus({ preventScroll: true }));
  };
  return <div ref={scene} className="pilot-live live-experience" data-motion={motion.enabled} data-audio-analysis={pulseStatus} data-entry-open={model.entryOpen} data-active-item-id={items[activeIndex]?.id} data-filter={filter}
    style={{'--live-cover-blur':`${settings.blur}px`,'--live-halo':settings.halo/100,'--live-darkness':settings.darkness/100,'--music-particle-speed':`${18-settings.particleSpeed*.13}s`,'--music-particle-scale':.5+settings.particleSize*.015,'--music-particle-light':settings.particleLight/100} as CSSProperties}
    onPointerMove={event => { if (!motion.enabled || !settings.parallax || event.pointerType !== 'mouse') return; const bounds = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--live-x', `${(event.clientX - bounds.left) / bounds.width * 20 - 10}px`); event.currentTarget.style.setProperty('--live-y', `${(event.clientY - bounds.top) / bounds.height * 16 - 8}px`); }}
    onPointerLeave={()=>{scene.current?.style.setProperty('--live-x','0px');scene.current?.style.setProperty('--live-y','0px');}}>
    <LiveAtmosphere cover={cover} particles={motion.enabled?settings.musicParticles:0}/>
    <h1 className="sr-only">Live Synaura</h1>
    <div className="live-top-controls">
      <LiveFilters items={filters} active={filter} onSelect={model.selectFilter} animated={motion.enabled}/>
      <LiveAmbienceControls settings={settings} update={update} enabled={motion.preferred} setEnabled={motion.setEnabled} constrained={motion.constrained} status={pulseStatus}/>
    </div>
    <LiveSwipeLight id={activeItem?.id || ''} cover={cover} enabled={motion.enabled&&!model.entryOpen&&!loading} duration={settings.transition} count={settings.particles}/>
    {!ready || loading ? <div className="pilot-state" role="status">Le son approche<span>Votre salle d’écoute se prépare.</span></div> : error || !items.length ? <div className="pilot-state" role="status">{error || 'Cet espace attend ses prochains sons.'}<button onClick={model.retry}>Réessayer</button><button onClick={() => model.selectFilter('foryou')}>Revenir à Pour vous</button></div> :
      <div ref={node => { scrollSnap.containerRef.current = node; node?.toggleAttribute('inert', model.entryOpen); }} className="pilot-feed" aria-hidden={model.entryOpen} tabIndex={-1} aria-label="Live Synaura" data-testid="synaura-scroll-feed" data-context-surface-origin="live" onTouchStart={scrollSnap.onTouchStart} onTouchEnd={scrollSnap.onTouchEnd} onScroll={scrollSnap.onScroll}>
        {items.map((item, index) => <section key={item.id} ref={element => { scrollSnap.itemRefs.current[index] = element; element?.toggleAttribute('inert', index !== activeIndex); }} className={`pilot-slide pilot-slide--${item.type}`} data-feed-item-id={item.id} data-feed-item-type={item.type} data-active={index === activeIndex} aria-hidden={index !== activeIndex}>
          {index >= range.lo && index <= range.hi && <PilotItem item={item} index={index} model={model} />}
        </section>)}
      </div>}
    <footer className="pilot-live-position" ref={node => { node?.toggleAttribute('inert', model.entryOpen); }} aria-hidden={model.entryOpen}><span aria-live="polite">{items.length ? String(activeIndex + 1).padStart(2, '0') : '—'}<i> / {items.length}</i></span><span>Suivez ce qui vous traverse.</span><div><button aria-label="Item précédent" disabled={!activeIndex} onClick={() => model.jump(activeIndex - 1)}><ArrowUp /></button><button aria-label="Item suivant" disabled={activeIndex >= items.length - 1} onClick={() => model.jump(activeIndex + 1)}><ArrowDown /></button></div></footer>
    {model.entryOpen && ready && !loading && !error && items.length > 0 && <PilotLiveEntry model={{ ...model, enterFeed }} />}
  </div>;
}

function PilotItem({ item, index, model }: { item: ScrollFeedItem; index: number; model: LivePilotModel }) {
  const audio = useAudioPlayer();
  const profile = useProfilePeek('live');
  const comments = useCommentsSurface('live');
  const actions = useTrackActions('live');
  const [shareStatus, setShareStatus] = useState('');
  const active = index === model.activeIndex && !model.entryOpen;
  const track = 'track' in item ? item.track : item.type === 'post' ? trackFromScrollPost(item.post) : null;
  const current = !!track && audio.audioState.tracks[audio.audioState.currentTrackIndex]?._id === track._id;
  const playing = current && audio.audioState.isPlaying;
  const toggle = () => { if (!current) model.playIndex(index); else if (playing) audio.pause(); else void audio.play(); };
  const author = item.type === 'artist_spotlight' ? item.artist : item.type === 'clip' ? item.clip.creator : item.type === 'post' ? item.post.creator : track?.artist;
  const visual = item.type === 'post' ? liveItemCover(item) : item.type === 'clip' ? item.clip.posterUrl : item.type === 'artist_spotlight' ? item.artist.avatar || track?.coverUrl : item.type === 'collection' ? item.collection.coverUrl || item.collection.bannerUrl : track?.coverUrl;
  // Artwork does not depend on audio availability; a post's own photo stays first.
  const postArtwork = item.type === 'post' && !item.post.image_url && (item.post.track?.cover_url || item.post.track?.cover_video_url || item.post.track?.cover_video_poster_url) ? item.post.track : null;
  const title = item.type === 'artist_spotlight' ? item.artist.name : item.type === 'post' ? item.post.content : item.type === 'clip' ? item.clip.caption || track?.title : item.type === 'collection' ? item.collection.title : item.type === 'challenge' ? item.challenge.title : item.type === 'announcement' ? item.announcement.title : track?.title;
  const category = { track: 'Une nouvelle écoute', clip: 'Le son en mouvement', post: 'De l’autre côté du son', artist_spotlight: 'Rencontre', collection: 'Une sélection, un monde', challenge: 'À vous de jouer', announcement: 'Dans Synaura' }[item.type];
  const openComments = (trigger: HTMLElement) => {
    if (item.type === 'post') comments({ type: 'post', id: item.post.id, title: 'Publication', artist: item.post.creator.name || item.post.creator.username, creatorId: item.post.creator.id, count: item.post.comments_count }, trigger);
    else if (item.type === 'clip') comments({ type: 'clip', id: item.clip.id, title: item.clip.caption || 'Clip Synaura', artist: item.clip.creator.name, creatorId: item.clip.creator.id, sourceTrackId: item.track._id, count: item.clip.commentsCount }, trigger);
    else if (track) comments(entity(track), trigger);
  };
  return <>
    {visual && <PilotImage className="pilot-local-light" src={visual} alt="" loading="lazy" />}
    <div className="pilot-composition" data-playing={playing}>
      <LiveArtwork active={active}>
        <span className="live-record-orbit" aria-hidden="true" />
        {item.type === 'clip' && item.clip.videoUrl ? <LiveClipVideo src={item.clip.videoUrl} poster={item.clip.posterUrl} active={active && current} playing={playing} offset={item.clip.sourceTrackOffsetSeconds || 0} getAudioElement={audio.getAudioElement} onEnd={() => { if (index < model.items.length - 1) model.jump(index + 1); else audio.pause(); }} /> : item.type === 'track' ? <TrackCover trackId={item.track._id} src={item.track.coverUrl} videoSrc={item.track.coverVideoUrl} posterSrc={item.track.coverVideoPosterUrl} title={item.track.title} alt={`Pochette de ${item.track.title}`} animationEnabled={active} autoPlayVideo={active} playOnHover={false} rounded="rounded-none" className="live-track-cover" /> : postArtwork ? <TrackCover trackId={postArtwork.id} src={postArtwork.cover_url || postArtwork.cover_video_poster_url} videoSrc={postArtwork.cover_video_url} posterSrc={postArtwork.cover_video_poster_url} title={postArtwork.title} alt={`Pochette de ${postArtwork.title}`} animationEnabled={active} autoPlayVideo={active} playOnHover={false} rounded="rounded-none" className="live-track-cover" /> : visual ? <PilotImage src={visual} alt={item.type === 'artist_spotlight' ? item.artist.name : ''} loading={active ? 'eager' : 'lazy'} /> : <div className="pilot-typographic-art" aria-hidden="true">{item.type === 'post' ? '“' : 'S'}</div>}
        <span className="pilot-media-caption">SYNAURA <i> / {String(index + 1).padStart(2, '0')}</i></span>
        {track && <button className="live-cover-play" type="button" onClick={toggle} aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`}>{playing ? <Pause size={23} /> : <Play size={23} />}</button>}
      </LiveArtwork>
      <div className="pilot-copy">
        <div className="live-identity">
        <p className="pilot-kicker">{category}</p>
        <h2 className={item.type === 'post' ? 'pilot-post-quote' : ''}>{title || 'À découvrir'}</h2>
        {author && <div className="pilot-author"><button data-context-surface-trigger-key={`pilot-profile-${item.id}`} onClick={event => profile(author.username, event.currentTarget)}>{author.name || author.username}<ArrowUpRight size={16} /></button>{active && (('id' in author ? author.id : author._id)) && <FollowButton artistId={'id' in author ? author.id : author._id} artistUsername={author.username} size="sm" />}</div>}
        {item.type === 'artist_spotlight' && <p className="pilot-description">{item.artist.bio || 'Un univers à rencontrer. Commencez par un morceau.'}</p>}
        {item.type === 'collection' && <><p className="pilot-description">{item.collection.subtitle}</p><p className="pilot-kicker">{item.collection.trackCount} morceaux</p><div className="pilot-buttons"><button className="pilot-primary" disabled={model.launchingCollectionId === item.collection.id} onClick={() => void model.launchCollection(item.collection.id, item.collection.slug)}><Play size={18} />Écouter la sélection</button><PilotLink href={item.collection.href}>Explorer <ArrowUpRight size={16} /></PilotLink></div></>}
        {(item.type === 'challenge' || item.type === 'announcement') && <><p className="pilot-description">{item.type === 'challenge' ? item.challenge.description : item.announcement.description}</p><PilotLink className="pilot-primary" href={item.type === 'challenge' ? item.challenge.href : item.announcement.href}>Entrer <ArrowUpRight size={18} /></PilotLink></>}
        {track && <>
          {item.type !== 'track' && <p className="pilot-sound-credit">Sur le son <PilotLink href={`/track/${encodeURIComponent(track._id)}`}>{track.title}</PilotLink></p>}
          {item.type === 'track' && <p className="pilot-genres">{track.genre?.slice(0, 3).join(' · ') || 'Musique indépendante'} <span>{count(track.plays || 0).toLocaleString('fr-FR')} écoutes</span></p>}
          <div className="pilot-transport"><span><i aria-hidden="true" />{playing ? 'À l’écoute' : 'À votre rythme'}<small>{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</small></span><PilotLink href={`/track/${encodeURIComponent(track._id)}`} aria-label={`Ouvrir ${track.title}`}><ArrowUpRight /></PilotLink></div>
        </>}
        </div>
          {active && item.type === 'track' && track && <div className="pilot-waveform" key={track._id}>
            <Waveform canSeek={current} peaks={model.waveform.peaks} duration={model.waveform.duration || track.duration} loading={model.waveform.loading} getAudioElement={current ? audio.getAudioElement : () => null} onSeek={seconds => { if (current) audio.seek(seconds); }} markers={model.moments.markers} onMarkerSeek={marker => comments(entity(track), document.activeElement as HTMLElement, undefined, marker.id)} reactionClusters={model.reactions.clusters} />
            <div className="pilot-moment-bar"><button aria-label="Commenter cet instant" title="Commenter cet instant" onClick={event => comments(entity(track), event.currentTarget, Math.max(0, current ? audio.getAudioElement()?.currentTime || 0 : 0))}><Clock3 size={20} /></button></div>
            <LiveReactions active={active} onReact={type => model.react(type, current ? audio.getAudioElement()?.currentTime || 0 : 0)} />
          </div>}
        <div className="pilot-interactions live-social">
          {track && item.type !== 'post' && item.type !== 'clip' && <LiveFavorite track={track} active={active} />}
          {item.type === 'post' && <PostFavorite key={item.post.id} post={item.post} />}
          {item.type === 'clip' && <PilotClipFavorite id={item.clip.id} active={active} count={item.clip.likesCount} />}
          {(track || item.type === 'post') && <button className="live-comment-action" title="Commentaires" data-context-surface-trigger-key={`pilot-comments-${item.id}`} onClick={event => openComments(event.currentTarget)} aria-label="Ouvrir les commentaires"><MessageCircle size={22} /><CommentCount type={item.type === 'post' ? 'post' : item.type === 'clip' ? 'clip' : 'track'} id={item.type === 'post' ? item.post.id : item.type === 'clip' ? item.clip.id : track!._id} fallback={item.type === 'post' ? item.post.comments_count : item.type === 'clip' ? item.clip.commentsCount : count(track!.comments)} /></button>}
          {(track || item.type === 'post') && <button aria-label="Partager" title="Partager" onClick={async event => {
            if (item.type === 'post') { await model.sharePost(item.post); return; }
            if (item.type !== 'clip') { if (track) await actions.share(track, event.currentTarget); return; }
            const url = `${window.location.origin}/live?filter=clips&clipId=${encodeURIComponent(item.clip.id)}`;
            try {
              if (navigator.share) await navigator.share({ title: item.clip.caption || 'Clip Synaura', url });
              else { await navigator.clipboard.writeText(url); setShareStatus('Lien du clip copié.'); }
            } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setShareStatus('Partage indisponible. Réessayez.'); }
          }}><Share2 size={22} /></button>}
          {track && <><button className="live-queue-action" aria-label="File de lecture" onClick={event => actions.open(track, 'queue', event.currentTarget)}><ListMusic size={20} /></button><button data-context-surface-trigger-key={`pilot-options-${item.id}`} aria-label={`Options de ${track.title}`} onClick={event => actions.open(track, 'track-options', event.currentTarget)}><MoreHorizontal /></button></>}
          {item.type === 'post' && <PilotLink href={`/posts/${encodeURIComponent(item.post.id)}`}>Lire le post <ArrowUpRight size={16} /></PilotLink>}
        </div>
        {shareStatus && <p className="pilot-sound-credit" role="status">{shareStatus}</p>}
      </div>
    </div>
  </>;
}

/** Same public Post contract as ScrollPostSlide; mutation only after a user's click. */
function PostFavorite({ post }: { post: ScrollPost }) {
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <><button data-live-like aria-label={liked ? 'Ne plus aimer le post' : 'Aimer le post'} aria-pressed={liked} disabled={busy} onClick={async () => {
    if (busy) return; setBusy(true); setError('');
    try { const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}/like`, { method: 'POST' }); if (!response.ok) throw new Error(); const data = await response.json(); setLiked(Boolean(data.liked)); }
    catch { setError('Impossible de modifier le favori. Réessayez.'); } finally { setBusy(false); }
  }}><Heart size={20} fill={liked ? 'currentColor' : 'none'} /></button>{error && <span role="alert">{error}</span>}</>;
}
