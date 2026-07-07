/**
 * Source unique de vérité pour la visibilité publique des morceaux (tracks
 * classiques et créations IA). Un visiteur ou un utilisateur non propriétaire ne
 * doit jamais recevoir un morceau si : is_public !== true, l'audio n'est pas
 * réellement lisible, ou (IA) la génération parente n'est pas publiée/terminée.
 * Toute route publique qui lit `tracks` ou `ai_tracks` doit passer par ces helpers.
 *
 * Ce module reste volontairement pur (pas d'import Supabase au niveau module) afin
 * d'être directement testable avec `node --test`, comme lib/clipPermissions.ts.
 * `getPublicPlaylistTrackCounts` importe `supabaseAdmin` dynamiquement, uniquement
 * quand elle est réellement appelée.
 */

export function hasPlayableAudio(url: unknown): boolean {
  return typeof url === 'string' && url.trim().length > 0;
}

export function isTrackPublic(track: any): boolean {
  if (!track) return false;
  return track.is_public === true && hasPlayableAudio(track.audio_url);
}

export function isAiTrackPublic(aiTrack: any, generationField: string = 'generation'): boolean {
  if (!aiTrack) return false;
  const generation = aiTrack[generationField] || aiTrack.ai_generations || {};
  return (
    aiTrack.is_public === true &&
    generation?.is_public === true &&
    generation?.status === 'completed' &&
    hasPlayableAudio(aiTrack.audio_url)
  );
}

function ownerIdOf(entity: any, ownerField: string): string | null {
  const value = entity?.[ownerField];
  return value ? String(value) : null;
}

export function isOwnerOf(entity: any, viewerId: string | null | undefined, ownerField: string = 'creator_id'): boolean {
  if (!viewerId) return false;
  const ownerId = ownerIdOf(entity, ownerField);
  return Boolean(ownerId) && ownerId === String(viewerId);
}

/** Track classique : le propriétaire voit toujours son morceau, même privé/brouillon. */
export function canViewTrack(track: any, viewerId?: string | null): boolean {
  return isOwnerOf(track, viewerId, 'creator_id') || isTrackPublic(track);
}

/** Track IA : le propriétaire de la génération voit toujours sa création. */
export function canViewAiTrack(aiTrack: any, viewerId?: string | null, generationField: string = 'generation'): boolean {
  const generation = aiTrack?.[generationField] || aiTrack?.ai_generations || {};
  return isOwnerOf(generation, viewerId, 'user_id') || isAiTrackPublic(aiTrack, generationField);
}

// Le cast interne en `any` évite de faire vérifier par TypeScript la chaîne
// `.eq()/.not()` contre le type (récursif) du PostgrestFilterBuilder de supabase-js,
// qui provoque sinon des erreurs "Type instantiation is excessively deep" sur
// certains call sites. `T` reste néanmoins précisément inféré à l'appel, donc le
// query builder retourné garde son type concret (chaînage `.order()/.limit()`
// et typage de `data` après `await` toujours corrects).

/** Applique le filtre de visibilité publique à une requête Supabase sur `tracks`. */
export function applyPublicTrackFilter<T>(query: T): T {
  return (query as any).eq('is_public', true).not('audio_url', 'is', null);
}

/**
 * Applique le filtre de visibilité publique à une requête Supabase sur `ai_tracks`
 * jointe (`!inner`) à `ai_generations`. Le select doit inclure `is_public` et
 * `status` sur l'alias de génération pour que le filtre s'applique.
 */
export function applyPublicAiTrackFilter<T>(query: T, generationAlias: string = 'generation'): T {
  return (query as any)
    .eq('is_public', true)
    .eq(`${generationAlias}.is_public`, true)
    .eq(`${generationAlias}.status`, 'completed');
}

/** Filtre en mémoire une liste de tracks déjà chargée (ex: résultat d'une jointure imbriquée). */
export function filterPublicTracks<T extends Record<string, any>>(tracks: T[], viewerId?: string | null): T[] {
  return (tracks || []).filter((track) => canViewTrack(track, viewerId));
}

/**
 * Règle d'ajout d'un morceau à une playlist :
 * - playlist publique -> le morceau doit être publiquement visible (isTrackPublic) ;
 * - playlist privée -> morceau public, OU brouillon appartenant au propriétaire de
 *   la playlist (jamais le brouillon d'un autre utilisateur).
 */
export function canAddTrackToPlaylist(input: {
  playlistIsPublic: boolean;
  playlistOwnerId: string | null | undefined;
  track: any;
}): boolean {
  return input.playlistIsPublic
    ? isTrackPublic(input.track)
    : canViewTrack(input.track, input.playlistOwnerId);
}

/**
 * Morceaux d'une playlist qui bloquent son passage en public (non publiquement
 * visibles). Une liste vide signifie que la playlist peut devenir publique.
 */
export function findNonPublicTracks<T extends Record<string, any>>(tracks: T[]): T[] {
  return (tracks || []).filter((track) => !isTrackPublic(track));
}

/**
 * Compte, pour chaque playlist, uniquement les morceaux actuellement publics
 * (utilisé pour les compteurs affichés sur les landings collections/playlists,
 * qui ne doivent jamais inclure des morceaux devenus privés entretemps).
 */
export async function getPublicPlaylistTrackCounts(playlistIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!playlistIds.length) return counts;
  const { supabaseAdmin } = await import('@/lib/supabase');
  const { data } = await supabaseAdmin
    .from('playlist_tracks')
    .select('playlist_id, tracks!inner(is_public, audio_url)')
    .in('playlist_id', playlistIds)
    .eq('tracks.is_public', true)
    .not('tracks.audio_url', 'is', null);
  for (const row of data || []) {
    counts.set(row.playlist_id, (counts.get(row.playlist_id) || 0) + 1);
  }
  return counts;
}
