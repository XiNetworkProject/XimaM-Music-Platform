'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import Link from '@/components/navigation/HandoffLink';
import { Play, Pause, Music2, Headphones, Share2, ArrowLeft, ArrowUpRight, MessageCircle, Clock3, Film, Trophy, ListPlus, AlignLeft, Sparkles } from 'lucide-react';
import { SynauraAppShell } from '@/components/synaura/SynauraShell';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';
import TrackCover from '@/components/TrackCover';
import PilotImage from '@/components/pilot/PilotImage';
import { getCdnUrl } from '@/lib/cdn';
import TrackPostsSection from '@/components/posts/TrackPostsSection';
import { useCommentsSurface } from '@/components/comments/useCommentsSurface';
import CommentCount from '@/components/comments/CommentCount';
import TrackActionButton from '@/components/actions/TrackActionButton';
import FavoriteAction from '@/components/actions/FavoriteAction';
import { useTrackActions } from '@/components/actions/useTrackActions';
import { canPlaylistTrack } from '@/lib/trackActions';
import Waveform from '@/components/player/Waveform';
import { useTrackWaveform } from '@/hooks/useTrackWaveform';
import { useMomentComments } from '@/hooks/useMomentComments';
import './track-experience.css';

interface TrackData {
  id: string;
  title: string;
  artist: string;
  artistUsername: string;
  artistAvatar: string | null;
  creatorId?: string | null;
  coverUrl: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  audioUrl: string;
  duration: number;
  genre: string[];
  plays: number;
  likes: number;
  createdAt: string;
  isAI: boolean;
  canRemixAiVariation?: boolean;
  allowClips?: boolean;
  allowAiVariation?: boolean;
  remixVisibility?: 'everyone' | 'followers' | 'disabled';
  remixAttribution?: { sourceTrackId: string; title: string; artist: string; artistUsername?: string; trackUrl?: string } | null;
  variationsCount?: number;
  musicClipsCount?: number;
  linkedChallenge?: { id: string; title: string; status: 'upcoming' | 'active' | 'ended' } | null;
}

const mmss = (seconds: number) => { const sec = Math.max(0, Math.floor(Number(seconds) || 0)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
const fmt = new Intl.NumberFormat('fr-FR', { notation: 'compact' });

export default function TrackPageClient({ track }: { track: TrackData | null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const openComments = useCommentsSurface('other');
  const actions = useTrackActions('other');
  const { playTrack, audioState, play, pause, seek, getAudioElement, setShowPlayer, setIsMinimized } = useAudioPlayer();
  const currentTrack = audioState.tracks?.[audioState.currentTrackIndex];
  const isCurrentTrack = currentTrack?._id === track?.id;
  const isPlaying = isCurrentTrack && audioState.isPlaying;
  // Only the global current native track loads its waveform and musical moments.
  const waveformTrackId = isCurrentTrack && track && !track.isAI ? track.id : undefined;
  const waveform = useTrackWaveform(waveformTrackId, waveformTrackId ? track?.audioUrl : undefined, track?.duration);
  const moments = useMomentComments(waveformTrackId);

  if (!track) return <SynauraAppShell className="track-experience-shell" contentClassName="track-experience-content"><main className="track-missing"><Music2 size={40} /><h1>Morceau introuvable</h1><p>Ce morceau n’est plus disponible.</p><Link href="/discover">Découvrir d’autres sons <ArrowUpRight size={18} /></Link></main></SynauraAppShell>;

  const handlePlay = async () => {
    if (isCurrentTrack) {
      if (audioState.isPlaying) pause(); else play();
    } else {
      const normalized = {
        _id: track.id,
        title: track.title,
        artist: {
          _id: track.artistUsername || 'unknown',
          name: track.artist,
          username: track.artistUsername || 'unknown',
          avatar: track.artistAvatar,
        },
        audioUrl: track.audioUrl,
        coverUrl: track.coverUrl,
        coverVideoUrl: track.coverVideoUrl,
        coverVideoPosterUrl: track.coverVideoPosterUrl,
        duration: track.duration,
        likes: [],
        comments: [],
        plays: track.plays,
        genre: track.genre,
        isLiked: false,
      } as any;
      await playTrack(normalized);
      try { setShowPlayer(true); setIsMinimized(false); } catch {}
    }
  };

  const entity = { type: 'track' as const, id: track.id, title: track.title, artist: track.artist, creatorId: track.creatorId || undefined, audioUrl: track.audioUrl, coverUrl: track.coverUrl, duration: track.duration };
  const released = new Date(track.createdAt);
  const releaseLabel = Number.isNaN(released.getTime()) ? null : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(released);

  return <SynauraAppShell className="track-experience-shell" contentClassName="track-experience-content">
    <ExperienceMotionFrame className="track-experience-page">
      <div className="track-world" aria-hidden="true"><PilotImage src={track.coverVideoPosterUrl || track.coverUrl || undefined} alt="" /><i /><b /></div>
      <article className="track-page" data-chambre-music="track" data-track-id={track.id} data-playing={isPlaying}>
        <nav className="track-topline" aria-label="Navigation du morceau">
          <button type="button" onClick={() => router.back()}><ArrowLeft size={18} />Retour</button>
          <span>LE SON, AU PREMIER PLAN</span>
          <TrackActionButton track={track} className="track-icon-action" />
        </nav>

        <section className="track-stage" aria-labelledby="track-title">
          <div className="track-art-stage">
            <div className="track-art-halo" aria-hidden="true" />
            <div className="track-artwork"><TrackCover trackId={track.id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} alt={`Pochette de ${track.title}`} autoPlayVideo playOnHover={false} rounded="rounded-none" className="track-art-media" /></div>
            <span className="track-art-footnote"><i aria-hidden="true" />{isPlaying ? 'EN ÉCOUTE' : 'À VOTRE RYTHME'}<span>SYNAURA / MUSIC</span></span>
          </div>
          <div className="track-identity">
            <div className="track-eyebrow">{track.isAI ? <><Sparkles size={13} />Création IA</> : 'Morceau'}<span>·</span>{track.genre?.[0] || 'Indépendant'}</div>
            <h1 id="track-title">{track.title}</h1>
            <div className="track-artist">
              {track.artistAvatar ? <PilotImage src={getCdnUrl(track.artistAvatar) || undefined} alt="" /> : <span className="track-artist-initial" aria-hidden="true">{track.artist.slice(0, 1)}</span>}
              <div>{track.artistUsername ? <Link href={`/profile/${encodeURIComponent(track.artistUsername)}`}>{track.artist}<ArrowUpRight size={16} /></Link> : <strong>{track.artist}</strong>}<small>{releaseLabel || 'Sur Synaura'}</small></div>
            </div>
            <div className="track-listening-stats"><span><Headphones size={14} />{fmt.format(track.plays || 0)} écoutes</span>{track.duration > 0 && <span><Clock3 size={14} />{mmss(track.duration)}</span>}</div>

            <div data-track-actions-row className="track-main-actions flex flex-wrap">
              <button type="button" onClick={handlePlay} className="track-play" aria-label={`${isPlaying ? 'Mettre en pause' : 'Écouter'} ${track.title}`}>{isPlaying ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}<span>{isPlaying ? 'Pause' : 'Écouter'}</span></button>
              <FavoriteAction track={track} resolveStatus className="track-icon-action" />
              <button type="button" className="track-icon-action" aria-label="Partager ce morceau" title="Partager" onClick={event => void actions.share(track, event.currentTarget)}><Share2 size={22} /></button>
              {canPlaylistTrack(track.id) && <button type="button" className="track-icon-action" aria-label="Ajouter à une playlist" title="Ajouter à une playlist" onClick={event => actions.open(track, 'playlist-picker', event.currentTarget)}><ListPlus size={24} /></button>}
            </div>

            {!track.isAI && <div className="track-timeline">
              <div className="track-section-caption"><span>DANS LE MORCEAU</span><button type="button" onClick={event => actions.open(track, 'lyrics', event.currentTarget)}><AlignLeft size={15} />Paroles</button></div>
              {isCurrentTrack ? <Waveform peaks={waveform.peaks} loading={waveform.loading} duration={audioState.duration || waveform.duration || track.duration} getAudioElement={getAudioElement} onSeek={seek} markers={moments.markers} onMarkerSeek={marker => openComments(entity, document.activeElement as HTMLElement, undefined, marker.id)} variant="dark" /> : <p className="track-timeline-idle">Lancez l’écoute pour explorer les moments du morceau.</p>}
            </div>}
            {track.isAI && <button className="track-text-action" type="button" onClick={event => actions.open(track, 'lyrics', event.currentTarget)}><AlignLeft size={16} />Paroles</button>}
            <button type="button" disabled={!isCurrentTrack} title={isCurrentTrack ? 'Ouvrir le lecteur du morceau en cours' : 'Écoute ce morceau pour ouvrir son lecteur'} onClick={() => { setShowPlayer(true); setIsMinimized(false); window.dispatchEvent(new Event('synaura:open-full-player')); }} className="track-player-link"><Headphones size={15} />Ouvrir le lecteur<ArrowUpRight size={14} /></button>
          </div>
        </section>

        {!track.isAI && <section className="track-conversation" aria-labelledby="track-conversation-title">
          <div><p className="track-eyebrow">LE MORCEAU SE PARTAGE AUSSI ICI</p><h2 id="track-conversation-title">Et vous, ça vous fait quoi ?</h2><p>Un avis, une émotion, un instant à partager.</p></div>
          <div className="track-conversation-actions">
            <button type="button" className="track-conversation-open" data-context-surface-trigger-key={`track-comments-${track.id}`} onClick={event => openComments(entity, event.currentTarget)}><MessageCircle size={24} /><span>Commentaires<small>Ouvrir la conversation</small></span><CommentCount type="track" id={track.id} /><ArrowUpRight size={20} /></button>
            <button type="button" className="track-moment-open" disabled={!isCurrentTrack} onClick={event => openComments(entity, event.currentTarget, Math.max(0, getAudioElement()?.currentTime || 0))}><Clock3 size={18} /><span>{isCurrentTrack ? 'Commenter cet instant' : 'Écoutez pour commenter un instant'}</span></button>
          </div>
        </section>}

        <section className="track-beyond" aria-labelledby="track-beyond-title">
          <div className="track-beyond-heading"><p className="track-eyebrow">À PARTIR DE CE SON</p><h2 id="track-beyond-title">Laissez une trace.</h2></div>
          <div className="track-paths">
            {track.allowClips && <button type="button" onClick={event => actions.open(track, 'track-clip', event.currentTarget)}><Film size={22} /><span>Créer un clip<small>Votre image. Ce son.</small></span><ArrowUpRight size={20} /></button>}
            {track.canRemixAiVariation && <button type="button" onClick={event => actions.open(track, 'track-remix', event.currentTarget)}><Sparkles size={22} /><span>Réinventer ce son<small>Créer une variation</small></span><ArrowUpRight size={20} /></button>}
            <Link href={`/community/forum/new?category=feedback&trackId=${encodeURIComponent(track.id)}&title=${encodeURIComponent(track.title)}&source=track`}><MessageCircle size={22} /><span>Demander un avis<small>La communauté vous écoute</small></span><ArrowUpRight size={20} /></Link>
            <Link href={`/community/forum/new?category=remix&trackId=${encodeURIComponent(track.id)}&title=${encodeURIComponent(track.title)}&source=track`}><Music2 size={22} /><span>Lancer un défi remix<small>Une autre façon de l’entendre</small></span><ArrowUpRight size={20} /></Link>
          </div>
        </section>

        {(track.remixAttribution || track.linkedChallenge) && <section className="track-origins" aria-label="Origines et défi du morceau">
          {track.remixAttribution && <Link href={track.remixAttribution.trackUrl || `/track/${track.remixAttribution.sourceTrackId}`}><Music2 size={22} /><span><small>INSPIRÉ DE</small><strong>{track.remixAttribution.title}</strong><span>par {track.remixAttribution.artistUsername || track.remixAttribution.artist}</span></span><ArrowUpRight size={20} /></Link>}
          {track.linkedChallenge && <Link href={`/challenges/${track.linkedChallenge.id}`}><Trophy size={22} /><span><small>{track.linkedChallenge.status === 'active' ? 'DÉFI EN COURS' : track.linkedChallenge.status === 'upcoming' ? 'DÉFI À VENIR' : 'DÉFI TERMINÉ'}</small><strong>{track.linkedChallenge.title}</strong></span><ArrowUpRight size={20} /></Link>}
        </section>}

        <div className="track-bottom-grid"><section className="track-community" aria-label="Publications liées"><TrackPostsSection key={track.id} track={track} /></section>
          <aside className="track-facts"><h2>Le morceau en bref</h2><dl><div><dt>Durée</dt><dd>{track.duration > 0 ? mmss(track.duration) : 'Non renseignée'}</dd></div><div><dt>Écoutes</dt><dd>{fmt.format(track.plays || 0)}</dd></div><div><dt>J’aime</dt><dd>{fmt.format(track.likes || 0)}</dd></div>{track.genre?.length > 0 && <div><dt>Genres</dt><dd>{track.genre.join(' · ')}</dd></div>}{releaseLabel && <div><dt>Sortie</dt><dd>{releaseLabel}</dd></div>}{Number(track.variationsCount || 0) > 0 && <div><dt>Variations</dt><dd>{fmt.format(track.variationsCount || 0)}</dd></div>}</dl>
            {Number(track.musicClipsCount || 0) > 0 && <Link className="track-clips-link" href={`/live?filter=clips&sourceTrackId=${encodeURIComponent(track.id)}`}><Film size={18} />{fmt.format(track.musicClipsCount || 0)} clips avec ce son<ArrowUpRight size={16} /></Link>}
            {!session && <div className="track-join"><h3>Gardez ce qui vous touche.</h3><p>Vos favoris, vos artistes, votre univers.</p><Link href={`/auth/signup?callbackUrl=/track/${encodeURIComponent(track.id)}`}>Créer un compte<ArrowUpRight size={17} /></Link><Link href={`/auth/signin?callbackUrl=/track/${encodeURIComponent(track.id)}`}>Se connecter</Link></div>}
          </aside>
        </div>
      </article>
    </ExperienceMotionFrame>
  </SynauraAppShell>;
}
