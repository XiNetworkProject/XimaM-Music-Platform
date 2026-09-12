'use client';
import { Heart } from 'lucide-react';
import { useTrackLike } from '@/contexts/LikeContext';
import { useFavoriteActions, useActionFavoriteStatus } from '@/lib/organizationClient';
import { normalizeActionTrack } from '@/lib/trackActions';
import { notify } from '@/components/NotificationCenter';

export default function FavoriteAction({ track, className = '', label = false, resolveStatus = false }: { track: any; className?: string; label?: boolean; resolveStatus?: boolean }) {
  const t = normalizeActionTrack(track);
  useActionFavoriteStatus(t._id, resolveStatus || label);
  const state = useTrackLike(t._id, typeof track.likes === 'number' ? track.likes : t.likes.length, Boolean(track.isLiked));
  const favorite = useFavoriteActions();
  return <button type="button" aria-label={state.isLiked ? `Retirer ${t.title} des favoris` : `Ajouter ${t.title} aux favoris`} aria-pressed={state.isLiked} disabled={favorite.pending || t._id.startsWith('radio-')}
    onClick={event => { event.preventDefault(); event.stopPropagation(); void favorite.toggle(t._id).catch(e => notify.error('Favoris', e.message)); }}
    className={`syn-interactive inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full disabled:opacity-50 ${className}`}><Heart className={`h-5 w-5 ${state.isLiked ? 'fill-current text-[var(--syn-accent)]' : ''}`} />{label ? state.isLiked ? 'Favori' : 'Favoris' : null}</button>;
}
