import { createHash, randomUUID } from 'node:crypto';
import { queryDatabase, withDatabaseTransaction } from '../postgres';
import { getEntitlements } from '../entitlements';
import { inspectOwnedPublicationMedia, isLocalMediaReference } from '../localMediaStorage';
import { parsePublication, PublicationError, type PublicationResult } from './model';

type Inspector = typeof inspectOwnedPublicationMedia;
export async function publishRelease(userId: string, raw: unknown, inspect: Inspector = inspectOwnedPublicationMedia) {
  const input = parsePublication(raw);
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous = await queryDatabase('SELECT request_hash, result FROM publication_requests WHERE user_id=$1 AND request_key=$2', [userId, input.requestKey]);
  const replay = (row: any) => {
    if (row.request_hash !== hash) throw new PublicationError('Cette tentative a déjà été utilisée pour une autre version. Vérifie ta bibliothèque avant de recommencer.', 409);
    return { result: row.result as PublicationResult, replayed: true };
  };
  if (previous.rows[0]) return replay(previous.rows[0]);
  // Filesystem and ffprobe work must stay OUTSIDE the database transaction.
  const verified: Awaited<ReturnType<Inspector>>[] = [];
  for (const [index, track] of Array.from(input.tracks.entries())) {
    if (!isLocalMediaReference(track.url, track.publicId, 'audio')) throw new PublicationError(`Fichier invalide pour le morceau ${index + 1}.`);
    try { verified.push(await inspect(track.publicId, userId, 'audio')); }
    catch (error) { throw new PublicationError(`« ${track.title} » : ${error instanceof Error ? error.message : 'contrôle audio impossible'}`); }
  }
  let cover = null;
  if (input.cover) {
    if (!isLocalMediaReference(input.cover.url, input.cover.publicId, input.cover.kind)) throw new PublicationError('Référence de pochette invalide.');
    try { cover = await inspect(input.cover.publicId, userId, input.cover.kind); }
    catch (error) { throw new PublicationError(`Pochette : ${error instanceof Error ? error.message : 'contrôle impossible'}`); }
  }
  return withDatabaseTransaction(async client => {
    await client.query("SET LOCAL lock_timeout='5s'");
    // All submissions for this account serialize the quota calculation and receipt check.
    const profile = await client.query('SELECT plan FROM profiles WHERE id=$1 FOR UPDATE', [userId]);
    if (!profile.rows[0]) throw new PublicationError('Ton profil est introuvable.', 403);
    const existing = await client.query('SELECT request_hash, result FROM publication_requests WHERE user_id=$1 AND request_key=$2', [userId, input.requestKey]);
    if (existing.rows[0]) return replay(existing.rows[0]);
    const ent = getEntitlements(profile.rows[0].plan || 'free').uploads;
    if (verified.some(m => m.bytes > ent.maxFileMb * 1024 ** 2)) throw new PublicationError(`Ton offre autorise ${ent.maxFileMb} Mo par morceau.`, 413);
    const usage = await client.query('SELECT count(*)::int AS count, coalesce(sum(coalesce(audio_size_mb,0)+coalesce(cover_size_mb,0)),0) AS mb FROM tracks WHERE creator_id=$1', [userId]);
    if (ent.maxTracks >= 0 && usage.rows[0].count + input.tracks.length > ent.maxTracks) throw new PublicationError(`Limite de ${ent.maxTracks} titres atteinte pour ton offre.`, 403);
    const addedMb = (verified.reduce((n, v) => n + v.bytes, 0) + (cover?.bytes || 0) * input.tracks.length) / 1024 ** 2;
    if (ent.maxStorageGb >= 0 && Number(usage.rows[0].mb) + addedMb > ent.maxStorageGb * 1024) throw new PublicationError('Ton espace de stockage ne suffit pas pour cette sortie.', 403);
    const duplicate = await client.query('SELECT id FROM tracks WHERE creator_id=$1 AND audio_public_id=ANY($2::text[]) LIMIT 1', [userId, input.tracks.map(t => t.publicId)]);
    if (duplicate.rows.length) throw new PublicationError('Un de ces fichiers est déjà dans ta bibliothèque. Aucun doublon n’a été ajouté.', 409);
    const albumId = input.releaseType === 'single' ? null : randomUUID();
    const coverUrl = cover?.posterUrl || input.cover?.url || null;
    if (albumId) {
      const count = await client.query('SELECT count(*)::int AS count FROM playlists WHERE creator_id=$1', [userId]);
      if (ent.maxPlaylists >= 0 && count.rows[0].count >= ent.maxPlaylists) throw new PublicationError('La limite de collections de ton offre est atteinte.', 403);
      await client.query('INSERT INTO playlists(id,name,description,creator_id,is_public,is_album,cover_url) VALUES($1,$2,$3,$4,$5,true,$6)', [albumId, input.title, input.description, userId, input.visibility === 'public', coverUrl]);
    }
    const trackIds: string[] = [];
    const perms = input.remixPermissions;
    for (const [index, track] of Array.from(input.tracks.entries())) {
      const id = randomUUID(); trackIds.push(id);
      const metadata = {
        mood: input.mood, language: input.language, tags: input.tags, featuring: input.featuring,
        credits: input.credits, isExplicit: track.isExplicit ?? input.isExplicit, release_type: input.releaseType,
        visibility: input.visibility, rights_confirmed_at: new Date().toISOString(), publication_version: 1,
        audio_check: { container: 'verified', duration: verified[index].duration, bytes: verified[index].bytes },
      };
      await client.query(`INSERT INTO tracks
        (id,title,description,audio_url,audio_public_id,duration,audio_size_mb,cover_url,cover_public_id,cover_size_mb,
        cover_video_url,cover_video_public_id,cover_video_poster_url,genre,creator_id,is_public,lyrics,album_id,track_number,album,data,
        allow_clips,allow_audio_remix,allow_ai_variation,remix_approval_required,remix_visibility)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
      [id, input.releaseType === 'single' ? input.title : track.title, input.description, track.url, track.publicId, Math.round(verified[index].duration), verified[index].bytes / 1024 ** 2,
        coverUrl, input.cover?.kind === 'cover' ? input.cover.publicId : null, (cover?.bytes || 0) / 1024 ** 2,
        input.cover?.kind === 'cover-video' ? input.cover.url : null, input.cover?.kind === 'cover-video' ? input.cover.publicId : null, cover?.posterUrl || null,
        track.genres ?? input.genres, userId, input.visibility === 'public', track.lyrics ?? input.lyrics, albumId, index + 1, albumId ? input.title : null, JSON.stringify(metadata),
        perms.allowClips, perms.allowAudioRemix, perms.allowAiVariation, perms.remixApprovalRequired, perms.remixVisibility]);
      if (albumId) await client.query('INSERT INTO playlist_tracks(playlist_id,track_id,position) VALUES($1,$2,$3)', [albumId, id, index]);
    }
    const result: PublicationResult = { trackIds, albumId, visibility: input.visibility };
    await client.query('INSERT INTO publication_requests(user_id,request_key,request_hash,result) VALUES($1,$2,$3,$4)', [userId, input.requestKey, hash, JSON.stringify(result)]);
    return { result, replayed: false };
  });
}
