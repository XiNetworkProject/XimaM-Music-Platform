import { db } from '@/lib/database';
import { canViewTrack } from '@/lib/publicTracks';

const TRACK_REF_RE = /<!--\s*synaura-track:([^>\s]+)\s*-->/i;
const ALL_TRACK_REFS = /<!--\s*synaura-track:[^>]*-->/gi;

export function withTrackRef(content: string, trackId?: string | null) {
  const clean = content.replace(ALL_TRACK_REFS, '').trim();
  return trackId ? `${clean}\n\n<!--synaura-track:${trackId}-->` : clean;
}

export function stripTrackRef(content?: string | null) {
  return String(content || '').replace(ALL_TRACK_REFS, '').trim();
}

export function getPostTrackId(post: any) {
  return post?.track_id || String(post?.content || '').match(TRACK_REF_RE)?.[1] || null;
}

function readTrackData(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeAttachedTrack(track: any) {
  if (!track) return null;
  const profile = Array.isArray(track.profiles) ? track.profiles[0] : track.profiles;
  const data = readTrackData(track.data);
  return {
    id: track.id,
    _id: track.id,
    title: track.title,
    artist_id: track.creator_id || track.user_id || '',
    artist_name: track.artist_name || profile?.name || profile?.username || 'Artiste',
    artist_username: profile?.username || '',
    coverUrl: track.cover_url || track.coverUrl || null,
    cover_url: track.cover_url || track.coverUrl || null,
    coverVideoUrl: track.cover_video_url || track.coverVideoUrl || data.cover_video_url || data.coverVideoUrl || null,
    cover_video_url: track.cover_video_url || track.coverVideoUrl || data.cover_video_url || data.coverVideoUrl || null,
    coverVideoPosterUrl: track.cover_video_poster_url || track.coverVideoPosterUrl || data.cover_video_poster_url || data.coverVideoPosterUrl || null,
    cover_video_poster_url: track.cover_video_poster_url || track.coverVideoPosterUrl || data.cover_video_poster_url || data.coverVideoPosterUrl || null,
    audioUrl: track.audio_url || track.audioUrl || null,
    audio_url: track.audio_url || track.audioUrl || null,
    duration: track.duration || 0,
    genre: track.genre || [],
    plays: track.plays || 0,
    likes: track.likes || 0,
    style: Array.isArray(track.genre) ? track.genre.slice(0, 2).join(', ') : track.genre || '',
  };
}

export async function attachTracks(posts: any[], viewerId?: string | null) {
  const normalizedPosts = (posts || []).map((post) => ({ ...post, content: stripTrackRef(post.content), _attached_track_id: getPostTrackId(post) }));
  const trackIds = Array.from(new Set(normalizedPosts.map((post) => post._attached_track_id).filter(Boolean)));
  if (!trackIds.length) return normalizedPosts.map(({ _attached_track_id, ...post }) => ({ ...post, track: null }));

  const { data: trackRows, error } = await db
    .from('tracks')
    .select('*')
    .in('id', trackIds);
  if (error) throw error;
  let tracks = trackRows || [];
  const creatorIds = Array.from(new Set(tracks.map((track: any) => track.creator_id).filter(Boolean)));
  if (creatorIds.length) {
    const { data: profiles, error: profileError } = await db.from('profiles').select('id, name, username, avatar').in('id', creatorIds);
    if (profileError) throw profileError;
    const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
    tracks = tracks.map((track: any) => ({ ...track, profiles: profilesById.get(track.creator_id) || null }));
  }

  const rawTracksById = new Map((tracks || []).map((track: any) => [track.id, track]));
  const tracksById = new Map((tracks || []).map((track: any) => [track.id, normalizeAttachedTrack(track)]));
  return normalizedPosts.map((post) => {
    // Un morceau attaché à un post peut être devenu privé depuis la publication du
    // post : dans ce cas il ne doit plus jamais être exposé (sauf à son propriétaire).
    const rawTrack = post._attached_track_id ? rawTracksById.get(post._attached_track_id) : null;
    const trackVisible = Boolean(rawTrack && canViewTrack(rawTrack, viewerId));
    return {
      ...post,
      author: post.author || post.profiles
        ? {
            id: (post.author || post.profiles).id,
            name: (post.author || post.profiles).name,
            username: (post.author || post.profiles).username,
            avatar: (post.author || post.profiles).avatar,
          }
        : undefined,
      track_id: trackVisible ? (post.track_id || post._attached_track_id || null) : null,
      track: trackVisible ? tracksById.get(post._attached_track_id) || null : null,
      _attached_track_id: undefined,
    };
  });
}

export function shouldFallbackSelect(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === 'PGRST200' ||
    error?.code === 'PGRST201' ||
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    message.includes('relationship') ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('column')
  );
}

export async function attachAuthors(posts: any[]) {
  const userIds = Array.from(new Set((posts || []).map((post) => post.user_id).filter(Boolean)));
  if (!userIds.length) return posts || [];

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, name, username, avatar')
    .in('id', userIds);
  // A missing profile is allowed; a failed database read is not an absent author.
  if (error) throw error;
  const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  return (posts || []).map((post) => ({
    ...post,
    author: post.profiles
      ? {
          id: post.profiles.id,
          name: post.profiles.name,
          username: post.profiles.username,
          avatar: post.profiles.avatar,
        }
      : profilesById.get(post.user_id)
        ? {
            id: profilesById.get(post.user_id).id,
            name: profilesById.get(post.user_id).name,
            username: profilesById.get(post.user_id).username,
            avatar: profilesById.get(post.user_id).avatar,
          }
        : undefined,
  }));
}

export function shouldRetryWithoutOptionalColumns(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    message.includes('could not find') ||
    message.includes('column') ||
    message.includes('schema cache')
  );
}

export async function insertForumPost(insertPayload: any) {
  const attempts: any[] = [insertPayload];
  if ('track_id' in insertPayload) {
    const withoutTrack = { ...insertPayload };
    delete withoutTrack.track_id;
    attempts.push(withoutTrack);
  }
  if ('tags' in insertPayload) {
    const withoutTags = { ...insertPayload };
    delete withoutTags.tags;
    attempts.push(withoutTags);
  }
  if ('track_id' in insertPayload || 'tags' in insertPayload) {
    const minimal = { ...insertPayload };
    delete minimal.track_id;
    delete minimal.tags;
    attempts.push(minimal);
  }

  let lastError: any = null;
  for (const payload of attempts) {
    const { data, error } = await db
      .from('forum_posts')
      .insert(payload)
      .select('*')
      .single();

    if (!error) return { post: data, error: null };
    lastError = error;
    if (!shouldRetryWithoutOptionalColumns(error)) break;
  }

  return { post: null, error: lastError };
}

export async function attachReplies(replies: any[], viewerId?: string | null) {
  const rows = await attachAuthors(replies);
  let liked = new Set<string>();
  if (viewerId && rows.length) {
    const { data, error } = await db.from('forum_reply_likes').select('reply_id').eq('user_id', viewerId).in('reply_id', rows.map((row: any) => row.id));
    if (error) throw error;
    liked = new Set((data || []).map((row: any) => row.reply_id));
  }
  return rows.map((row: any) => ({ ...row, profiles: row.author || null, is_liked: liked.has(row.id) }));
}

export async function validateAttachedTrack(trackId: string | null, viewerId: string) {
  if (!trackId) return true;
  const { data, error } = await db.from('tracks').select('*').eq('id', trackId).maybeSingle();
  if (error) throw error;
  return Boolean(data && canViewTrack(data, viewerId));
}
