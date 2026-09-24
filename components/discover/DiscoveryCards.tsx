'use client';

import { useState } from 'react';
import { ArrowUpRight, Music2, Heart, MessageCircle, MoreHorizontal, Pause, Play } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { useTrackActions } from '@/components/actions/useTrackActions';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { useCommentsSurface } from '@/components/comments/useCommentsSurface';
import TrackCover from '@/components/TrackCover';
import PilotImage from '@/components/pilot/PilotImage';
import PilotLink from '@/components/pilot/PilotLink';
import { playlistDescription, playlistHref, postArtwork, type LibraryArtist, type LibraryPlaylist, type LibraryPost, type LibraryTrack } from '@/lib/discoverLibrary';

export const artistName = (track: LibraryTrack) => track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
export const durationLabel = (seconds?: number) => seconds && Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '';
export const compactNumber = (n = 0) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export function useDiscoveryPlayback(track: LibraryTrack | undefined, queue: LibraryTrack[]) {
  const { audioState, setQueueAndPlay, pause, play } = useAudioPlayer();
  const current = Boolean(track && audioState.tracks[audioState.currentTrackIndex]?._id === track._id);
  const playing = current && audioState.isPlaying;
  return { playing, current, toggle: () => {
    if (!track?.audioUrl) return;
    if (current) { if (playing) pause(); else void play(); return; }
    const playable = queue.filter(item => Boolean(item.audioUrl));
    const index = playable.findIndex(item => item._id === track._id);
    if (index >= 0) void setQueueAndPlay(playable as Parameters<typeof setQueueAndPlay>[0], index);
  } };
}

export function DiscoveryTrackCard({ track, queue, index = 0 }: { track: LibraryTrack; queue: LibraryTrack[]; index?: number }) {
  const { playing, current, toggle } = useDiscoveryPlayback(track, queue);
  const actions = useTrackActions('discover');
  const profile = useProfilePeek('discover');
  const [hovered, setHovered] = useState(false);
  return <article className="dl-track dl-appear" data-track-id={track._id} data-playing={playing} data-current={current} style={{ animationDelay: `${index % 6 * 35}ms` }}>
    <button type="button" className="dl-track-art" aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`} disabled={!track.audioUrl} onClick={toggle} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}>
      <TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} alt="" rounded="rounded-none" className="dl-cover" animationEnabled={hovered || playing} autoPlayVideo={hovered || playing} />
      {track.isAI && <span className="dl-ai">IA</span>}
      <span className="dl-play">{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</span>
      {!!track.duration && <span className="dl-duration">{durationLabel(track.duration)}</span>}
    </button>
    <div className="dl-track-copy"><PilotLink className="dl-track-title" href={`/track/${encodeURIComponent(track._id)}`}>{track.title}</PilotLink>
      <button type="button" className="dl-artist-name" disabled={!track.artist?.username} onClick={event => profile(track.artist?.username, event.currentTarget)}>{artistName(track)}</button>
    </div>
    <button type="button" className="dl-track-options" aria-label={`Options de ${track.title}`} data-context-surface-trigger-key={`discover-options-${track._id}`} onClick={event => actions.open(track, 'track-options', event.currentTarget)}><MoreHorizontal size={20} /></button>
    <span className="dl-track-stat">{current ? <Music2 size={14} aria-label="Morceau courant" /> : null}{compactNumber(track.plays)} écoutes</span>
  </article>;
}

export function DiscoveryArtistCard({ artist }: { artist: LibraryArtist }) {
  const profile = useProfilePeek('discover');
  return <article className="dl-artist dl-appear">
    <button type="button" className="dl-artist-portrait" disabled={!artist.username} aria-label={`Découvrir ${artist.artistName || artist.name}`} data-context-surface-trigger-key={`discover-artist-${artist._id}`} onClick={event => profile(artist.username, event.currentTarget)}>
      <PilotImage src={artist.avatar || artist.leadTrack?.coverUrl || '/default-cover.svg'} alt="" loading="lazy" /><span><ArrowUpRight /></span>
    </button>
    <button type="button" className="dl-artist-title" disabled={!artist.username} onClick={event => profile(artist.username, event.currentTarget)}>{artist.artistName || artist.name || artist.username}</button>
    <p>{artist.tracksCount != null ? `${artist.tracksCount} morceau${artist.tracksCount > 1 ? 'x' : ''}` : `@${artist.username}`}</p>
    {artist.bio && <p className="dl-artist-bio">{artist.bio}</p>}
  </article>;
}

export function DiscoveryPostCard({ post }: { post: LibraryPost }) {
  const profile = useProfilePeek('discover');
  const comments = useCommentsSurface('discover');
  const visual = postArtwork(post);
  const creator = post.creator;
  const text = post.content || post.original_post?.content || post.track?.title || 'Une publication à découvrir';
  const date = post.created_at || post.createdAt;
  const validDate = date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
  return <article className="dl-post dl-appear">
    {visual && <PilotLink className="dl-post-visual" href={`/posts/${encodeURIComponent(post.id)}`} aria-label={`Lire la publication de ${creator?.name || creator?.username || 'ce créateur'}`}><PilotImage src={visual} alt="" loading="lazy" /></PilotLink>}
    <div className="dl-post-body"><div className="dl-post-author"><button type="button" disabled={!creator?.username} onClick={event => profile(creator?.username, event.currentTarget)}><PilotImage src={creator?.avatar || '/default-cover.svg'} alt="" loading="lazy" /><span>{creator?.name || creator?.username || 'Créateur Synaura'}</span></button><time dateTime={date}>{validDate}</time></div>
      <PilotLink className="dl-post-text" href={`/posts/${encodeURIComponent(post.id)}`}>{text}</PilotLink>
      {post.track && <PilotLink className="dl-post-track" href={`/track/${encodeURIComponent(post.track.id)}`}><Music2 size={16} /><span>{post.track.title}</span><ArrowUpRight size={14} /></PilotLink>}
      <div className="dl-post-actions"><span aria-label={`${post.likes_count ?? post.likes ?? 0} j’aime`}><Heart size={16} />{post.likes_count ?? post.likes ?? 0}</span><button type="button" aria-label={`Commentaires de la publication de ${creator?.name || creator?.username || 'ce créateur'}`} data-context-surface-trigger-key={`discover-post-${post.id}`} onClick={event => comments({ type: 'post', id: post.id, title: 'Publication', artist: creator?.name || creator?.username, creatorId: creator?.id || creator?._id, count: post.comments_count ?? post.comments ?? 0 }, event.currentTarget)}><MessageCircle size={16} />{post.comments_count ?? post.comments ?? 0}</button><PilotLink href={`/posts/${encodeURIComponent(post.id)}`}>Ouvrir <ArrowUpRight size={15} /></PilotLink></div>
    </div>
  </article>;
}

export function DiscoveryPlaylistCard({ playlist }: { playlist: LibraryPlaylist }) {
  // This listing also returns unloaded tracks as []. Only show a confirmed count.
  const count = playlist.trackCount ?? (playlist.tracks?.length ? playlist.tracks.length : undefined);
  const description = playlistDescription(playlist);
  return <PilotLink className="dl-playlist dl-appear" href={playlistHref(playlist)}>
    <div className="dl-playlist-art"><PilotImage src={playlist.bannerUrl || playlist.coverUrl || '/default-cover.svg'} alt="" loading="lazy" /><span><ArrowUpRight /></span></div>
    <h3>{playlist.title || playlist.name || 'Playlist'}</h3><p>{count ? `${count} morceaux` : 'Playlist publique'}{playlist.creator?.name ? ` · ${playlist.creator.name}` : ''}</p>
    {description && <p className="dl-playlist-description">{description}</p>}
  </PilotLink>;
}
