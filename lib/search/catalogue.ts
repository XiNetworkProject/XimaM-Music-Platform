import { createHash } from 'node:crypto';
import { normalizeSearch, type SearchKind } from './model.ts';

// No DDL: pg_trgm is already part of the production baseline. User input is parameterized.
const owner = `jsonb_build_object('_id',p.id,'id',p.id,'username',p.username,'name',p.name,'artistName',p.artist_name,'avatar',p.avatar)`;
const ownerText = `concat_ws(' ',p.username,p.name,p.artist_name)`;
const playable = (alias: string) =>
  `${alias}.is_public IS TRUE AND nullif(btrim(${alias}.audio_url),'') IS NOT NULL`;
const publicAi = `${playable('t')} AND g.is_public IS TRUE AND g.status='completed'`;
const normal = `SELECT t.id::text id, t.title title, ${ownerText} owner_text, concat_ws(' ',array_to_string(t.genre,' '),t.description) body,
 jsonb_build_object('_id',t.id,'id',t.id,'title',t.title,'artist',${owner},'genre',t.genre,'coverUrl',t.cover_url,'audioUrl',t.audio_url,'duration',t.duration,'plays',t.plays,'likes',t.likes,'createdAt',t.created_at) payload
 FROM public.tracks t LEFT JOIN public.profiles p ON p.id=t.creator_id WHERE ${playable('t')}`;
const ai = `SELECT 'ai-'||t.id::text id, t.title title, ${ownerText} owner_text, concat_ws(' ',array_to_string(t.tags,' '),t.style) body,
 jsonb_build_object('_id','ai-'||t.id::text,'id','ai-'||t.id::text,'title',t.title,'artist',${owner},'genre',t.tags,'coverUrl',t.image_url,'audioUrl',t.audio_url,'duration',t.duration,'plays',t.play_count,'likes',t.like_count,'createdAt',t.created_at,'isAI',true) payload
 FROM public.ai_tracks t JOIN public.ai_generations g ON g.id=t.generation_id LEFT JOIN public.profiles p ON p.id=g.user_id WHERE ${publicAi}`;
const sourcePublic = `((c.source_track_type='track' AND EXISTS (SELECT 1 FROM public.tracks t WHERE t.id=c.source_track_id AND ${playable('t')})) OR
 (c.source_track_type='ai_track' AND EXISTS (SELECT 1 FROM public.ai_tracks t JOIN public.ai_generations g ON g.id=t.generation_id WHERE t.id::text=regexp_replace(c.source_track_id,'^ai-','') AND ${publicAi})))`;
const sources: Record<SearchKind, string> = {
  tracks: `${normal} UNION ALL ${ai}`,
  artists: `SELECT p.id::text id, coalesce(nullif(p.artist_name,''),p.name,p.username) title, ${ownerText} owner_text, coalesce(p.bio,'') body,
 jsonb_build_object('_id',p.id,'id',p.id,'username',p.username,'name',p.name,'artistName',p.artist_name,'avatar',p.avatar,'bio',p.bio,'isArtist',p.is_artist,'totalPlays',p.total_plays,'totalLikes',p.total_likes) payload FROM public.profiles p`,
  playlists: `SELECT l.id::text id,l.name title,${ownerText} owner_text,coalesce(l.description,'') body,
 jsonb_build_object('_id',l.id,'id',l.id,'title',l.name,'name',l.name,'description',l.description,'coverUrl',l.cover_url,'creator',${owner},'trackCount',(SELECT count(*) FROM public.playlist_tracks pt JOIN public.tracks t ON t.id=pt.track_id WHERE pt.playlist_id=l.id AND ${playable('t')})) payload
 FROM public.playlists l LEFT JOIN public.profiles p ON p.id=l.creator_id WHERE l.is_public IS TRUE`,
  posts: `SELECT s.id::text id,coalesce(s.content,'') title,${ownerText} owner_text,coalesce(s.content,'') body,
 jsonb_build_object('_id',s.id,'id',s.id,'content',s.content,'excerpt',s.content,'imageUrl',coalesce(s.image_url,t.cover_url),'creator',${owner},'createdAt',s.created_at,'likes',s.likes_count,'comments',s.comments_count) payload
 FROM public.creator_posts s LEFT JOIN public.profiles p ON p.id=s.creator_id LEFT JOIN public.tracks t ON t.id=s.track_id AND ${playable('t')} WHERE s.is_public IS TRUE`,
  clips: `SELECT c.id::text id,coalesce(nullif(c.caption,''),'Clip') title,${ownerText} owner_text,array_to_string(c.tags,' ') body,
 jsonb_build_object('_id',c.id,'id',c.id,'caption',c.caption,'title',coalesce(nullif(c.caption,''),'Clip'),'posterUrl',c.poster_url,'coverUrl',c.poster_url,'creator',${owner},'createdAt',c.created_at,'duration',c.source_track_duration_seconds) payload
 FROM public.music_clips c LEFT JOIN public.profiles p ON p.id=c.creator_id WHERE c.visibility='published' AND nullif(btrim(c.video_url),'') IS NOT NULL AND ${sourcePublic}`,
};
function folded(expression: string) {
  return `replace(replace(lower(translate(coalesce(${expression},''),'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñŸÿ','AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYy')),'œ','oe'),'æ','ae')`;
}
function scope(query: string, kind: SearchKind) {
  return createHash('sha256')
    .update(`${kind}\0${normalizeSearch(query)}`)
    .digest('hex')
    .slice(0, 24);
}
type Cursor = { v: number; scope: string; score: number; id: string };
export function readSearchCursor(
  raw: string | null,
  query: string,
  kind: SearchKind,
): Cursor | null {
  if (!raw) return null;
  if (raw.length > 1200) throw new Error('Invalid cursor');
  let value: Cursor;
  try {
    value = JSON.parse(Buffer.from(raw, 'base64url').toString());
  } catch {
    throw new Error('Invalid cursor');
  }
  if (
    value?.v !== 1 ||
    value.scope !== scope(query, kind) ||
    !Number.isInteger(value.score) ||
    value.score < 0 ||
    value.score > 1000 ||
    typeof value.id !== 'string' ||
    !value.id ||
    value.id.length > 200
  )
    throw new Error('Invalid cursor');
  return value;
}
export function searchCursor(row: { score: number; id: string }, query: string, kind: SearchKind) {
  return Buffer.from(
    JSON.stringify({ v: 1, scope: scope(query, kind), score: row.score, id: row.id }),
  ).toString('base64url');
}
export function searchStatement(
  query: string,
  kind: SearchKind,
  limit: number,
  cursor: Cursor | null,
) {
  const normalized = normalizeSearch(query);
  const tokens = normalized.split(' ').filter(Boolean);
  return {
    text: `WITH catalogue AS (${sources[kind]}), folded AS (
    SELECT id,payload,${folded('title')} title,${folded('owner_text')} owner_text,${folded('body')} body FROM catalogue
  ), scored AS (
    SELECT id,payload,CASE
      WHEN title=$1 THEN 1000
      WHEN owner_text=$1 OR $1=ANY(string_to_array(owner_text,' ')) THEN 900
      WHEN starts_with(title,$1) THEN 800
      WHEN position($1 in title)>0 THEN 700
      WHEN NOT EXISTS (SELECT 1 FROM unnest($2::text[]) token WHERE position(token in title||' '||owner_text)=0) THEN 600
      WHEN NOT EXISTS (SELECT 1 FROM unnest($2::text[]) token WHERE position(token in title||' '||owner_text||' '||body)=0) THEN 400
      WHEN length($1)>=4 AND greatest(public.word_similarity($1,title),public.word_similarity($1,owner_text))>=0.62
        THEN 100+round(100*greatest(public.word_similarity($1,title),public.word_similarity($1,owner_text)))::integer
      ELSE 0 END score FROM folded
  ) SELECT id,payload,score FROM scored WHERE score>0
    AND ($3::integer IS NULL OR (score,id COLLATE "C") < ($3::integer,$4::text COLLATE "C"))
    ORDER BY score DESC,id COLLATE "C" DESC LIMIT $5`,
    values: [normalized, tokens, cursor?.score ?? null, cursor?.id ?? null, limit + 1],
  };
}
