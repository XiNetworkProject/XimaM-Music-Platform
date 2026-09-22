'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useTrackLike } from '@/contexts/LikeContext';
import { useActionFavoriteStatus, useFavoriteActions } from '@/lib/organizationClient';
import { notify } from '@/components/NotificationCenter';
import { useCommentsSurface } from '@/components/comments/useCommentsSurface';
import { useTrackActions } from '@/components/actions/useTrackActions';
import CommentCount from '@/components/comments/CommentCount';
import { useLiveReactionBurst } from '@/components/player/LiveReactionBurst';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { MOMENT_REACTION_TYPES, MOMENT_REACTION_META, type MomentReactionType } from '@/lib/momentReactions';
import type { ScrollTrack } from '@/lib/scrollFeed';

const total = (value: number | string[] | undefined) => Array.isArray(value) ? value.length : value || 0;

/** The existing favorite mutation/cache, with an accessible icon-only action. */
export function LiveFavorite({ track, active }: { track: ScrollTrack; active: boolean }) {
  const status = useActionFavoriteStatus(track._id, active);
  const state = useTrackLike(track._id, total(track.likes), Boolean(track.isLiked));
  const favorite = useFavoriteActions();
  return <button type="button" data-live-like className="live-like" aria-label={`${state.isLiked ? 'Ne plus aimer' : 'Aimer'} ${track.title}`} title={state.isLiked ? 'Ne plus aimer' : 'Aimer'} aria-pressed={state.isLiked}
    disabled={!active || favorite.pending || status.isFetching || track._id.startsWith('radio-')}
    onClick={event => { event.preventDefault(); event.stopPropagation(); void favorite.toggle(track._id).catch(error => notify.error('Favoris', error.message)); }}>
    <Heart size={20} fill={state.isLiked ? 'currentColor' : 'none'} aria-hidden="true" />
    <small>{state.likesCount.toLocaleString('fr-FR')}</small>
  </button>;
}

/** Entry actions stay in Live, including draft-preserving comments and native share. */
export function LiveEntrySocial({ track, openTrack }: { track: ScrollTrack; openTrack: () => void }) {
  const comments = useCommentsSurface('live');
  const actions = useTrackActions('live');
  return <div className="pilot-entry-actions live-social">
    <LiveFavorite track={track} active />
    <button type="button" className="live-comment-action" aria-label="Ouvrir les commentaires" title="Commentaires" data-context-surface-trigger-key={`entry-comments-${track._id}`} onClick={event => comments({ type: 'track', id: track._id, title: track.title, artist: track.artist.name, creatorId: track.artist._id, coverUrl: track.coverUrl, audioUrl: track.audioUrl, duration: track.duration, count: total(track.comments) }, event.currentTarget)}>
      <MessageCircle size={22} aria-hidden="true" /><CommentCount type="track" id={track._id} fallback={total(track.comments)} />
    </button>
    <button type="button" aria-label="Partager ce morceau" title="Partager" onClick={event => void actions.share(track, event.currentTarget)}><Share2 size={22} aria-hidden="true" /></button>
    <button type="button" className="live-track-details" onClick={openTrack} aria-label="Voir le morceau"><ArrowUpRight size={18} aria-hidden="true" /></button>
  </div>;
}

/** Six explicit choices. The burst acknowledges the gesture, never fake audience activity. */
export function LiveReactions({ onReact, active }: { onReact: (type: MomentReactionType) => Promise<void>; active: boolean }) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const burst = useLiveReactionBurst();
  const motion = useLivingMotion();
  return <div className="live-reactions" role="group" aria-label="Réagir à cet instant du morceau">
    <div className="live-reaction-choices">{MOMENT_REACTION_TYPES.map(type => <button key={type} type="button" title={MOMENT_REACTION_META[type].label} aria-label={MOMENT_REACTION_META[type].label} disabled={!active || busy} onClick={async () => {
      if (!active || busyRef.current) return;
      busyRef.current = true; setBusy(true);
      if (motion.enabled) burst.emit(type);
      try { await onReact(type); } catch { notify.error('Réaction', 'Impossible d’enregistrer la réaction. Réessayez.'); }
      finally { busyRef.current = false; setBusy(false); }
    }}><span aria-hidden="true">{MOMENT_REACTION_META[type].emoji}</span></button>)}</div>
    {burst.layer}
  </div>;
}
