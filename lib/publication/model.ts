import { MUSIC_GENRES, MOODS, LANGUAGES, CREDIT_ROLES } from '../genres';
import { sanitizeRemixPermissions, type RemixPermissions } from '../remixPermissions';

export type ReleaseType = 'single' | 'ep' | 'album';
export type MediaReference = { publicId: string; url: string };
export type PublicationInput = {
  requestKey: string; title: string; description: string; releaseType: ReleaseType;
  visibility: 'public' | 'private'; genres: string[]; mood: string; language: string;
  tags: string[]; lyrics: string; isExplicit: boolean; credits: Record<string, string>;
  featuring: { id: string; name: string; isExternal: boolean }[];
  rightsConfirmed: boolean; remixPermissions: RemixPermissions;
  cover: (MediaReference & { kind: 'cover' | 'cover-video' }) | null;
  tracks: (MediaReference & { title: string; genres: string[] | null; isExplicit: boolean | null; lyrics: string | null })[];
};
export type PublicationResult = { trackIds: string[]; albumId: string | null; visibility: 'public' | 'private' };
export class PublicationError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
const text = (v: unknown, max: number) => {
  if (v == null) return '';
  if (typeof v !== 'string' || v.length > max) throw new PublicationError(`Un texte dépasse la limite de ${max} caractères.`);
  return v.trim();
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const genres = (v: unknown): string[] => {
  if (!Array.isArray(v) || v.length > 5 || v.some(g => typeof g !== 'string' || !MUSIC_GENRES.includes(g))) throw new PublicationError('Choisis jusqu’à 5 styles du catalogue.');
  return Array.from(new Set(v));
};
export function releaseCountError(type: ReleaseType, count: number) {
  if (type === 'single' && count !== 1) return 'Un single contient exactement un morceau.';
  if (type === 'ep' && (count < 2 || count > 6)) return 'Un EP contient de 2 à 6 morceaux.';
  if (type === 'album' && (count < 7 || count > 50)) return 'Un album contient de 7 à 50 morceaux.';
  return '';
}
export function parsePublication(raw: any): PublicationInput {
  if (!raw || !uuid.test(raw.requestKey || '')) throw new PublicationError('Identifiant de publication invalide.');
  if (!['single', 'ep', 'album'].includes(raw.releaseType)) throw new PublicationError('Format de sortie invalide.');
  if (!['public', 'private'].includes(raw.visibility)) throw new PublicationError('Choisis une sortie publique ou privée.');
  if (raw.rightsConfirmed !== true) throw new PublicationError('Confirme que tu disposes des droits nécessaires.');
  if (!Array.isArray(raw.tracks)) throw new PublicationError('Ajoute ton audio.');
  const countError = releaseCountError(raw.releaseType, raw.tracks.length);
  if (countError) throw new PublicationError(countError);
  const reference = (v: any): MediaReference => {
    const publicId = text(v?.publicId, 1024), url = text(v?.url, 2048);
    if (!publicId || !url) throw new PublicationError('Un fichier n’a pas terminé son envoi.');
    return { publicId, url };
  };
  const title = text(raw.title, 200);
  if (!title) throw new PublicationError('Donne un titre à ta sortie.');
  const tracks = raw.tracks.map((t: any) => {
    const title = text(t?.title, 200);
    if (!title) throw new PublicationError('Chaque morceau doit avoir un titre.');
    return { ...reference(t), title, genres: t.genres == null ? null : genres(t.genres), isExplicit: typeof t.isExplicit === 'boolean' ? t.isExplicit : null, lyrics: t.lyrics == null ? null : text(t.lyrics, 20000) };
  });
  if (new Set(tracks.map((t: MediaReference) => t.publicId)).size !== tracks.length) throw new PublicationError('Le même fichier apparaît plusieurs fois.');
  const mood = text(raw.mood, 40), language = text(raw.language, 30);
  if (mood && !MOODS.some(m => m.key === mood)) throw new PublicationError('Ambiance invalide.');
  if (language && !LANGUAGES.some(l => l.key === language)) throw new PublicationError('Langue invalide.');
  const credits: Record<string, string> = {};
  for (const role of CREDIT_ROLES) if (raw.credits?.[role.key]) credits[role.key] = text(raw.credits[role.key], 200);
  if (raw.featuring != null && (!Array.isArray(raw.featuring) || raw.featuring.length > 20)) throw new PublicationError('20 collaborations au maximum.');
  const featuring = (raw.featuring || []).map((f: any) => {
    const name = text(f?.name, 200), id = text(f?.id, 150);
    if (!name || !id) throw new PublicationError('Un artiste invité est incomplet.');
    return { name, id, isExternal: f.isExternal === true };
  });
  if (raw.tags != null && (!Array.isArray(raw.tags) || raw.tags.length > 10)) throw new PublicationError('10 tags au maximum.');
  const tags = Array.from(new Set<string>((raw.tags || []).map((t: unknown) => text(t, 40)).filter(Boolean)));
  let cover: PublicationInput['cover'] = null;
  if (raw.cover) {
    if (!['cover', 'cover-video'].includes(raw.cover.kind)) throw new PublicationError('Pochette invalide.');
    cover = { ...reference(raw.cover), kind: raw.cover.kind };
  }
  return { requestKey: raw.requestKey, title, releaseType: raw.releaseType, visibility: raw.visibility, description: text(raw.description, 5000), genres: genres(raw.genres || []), mood, language, tags, lyrics: text(raw.lyrics, 20000), isExplicit: raw.isExplicit === true, credits, featuring, rightsConfirmed: true, remixPermissions: sanitizeRemixPermissions(raw.remixPermissions), cover, tracks };
}
