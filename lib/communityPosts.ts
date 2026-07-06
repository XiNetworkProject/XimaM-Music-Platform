import { supabase } from '@/lib/supabase';

const TRACK_REF_RE = /<!--\s*synaura-track:([^>\s]+)\s*-->/i;

export function withTrackRef(content: string, trackId?: string | null) {
  const clean = content.replace(TRACK_REF_RE, '').trim();
  return trackId ? `${clean}\n\n<!--synaura-track:${trackId}-->` : clean;
}

export function stripTrackRef(content?: string | null) {
  return String(content || '').replace(TRACK_REF_RE, '').trim();
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

export async function attachTracks(posts: any[]) {
  const normalizedPosts = (posts || []).map((post) => ({ ...post, content: stripTrackRef(post.content), _attached_track_id: getPostTrackId(post) }));
  const trackIds = Array.from(new Set(normalizedPosts.map((post) => post._attached_track_id).filter(Boolean)));
  if (!trackIds.length) return normalizedPosts;

  let { data: tracks, error } = await supabase
    .from('tracks')
    .select(`
      *,
      profiles:creator_id (
        id,
        name,
        username,
        avatar
      )
    `)
    .in('id', trackIds);

  if (error) {
    const fallback = await supabase
      .from('tracks')
      .select('*')
      .in('id', trackIds);
    tracks = fallback.data || [];

    const creatorIds = Array.from(new Set((tracks || []).map((track: any) => track.creator_id).filter(Boolean)));
    if (creatorIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .in('id', creatorIds);
      const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
      tracks = (tracks || []).map((track: any) => ({ ...track, profiles: profilesById.get(track.creator_id) || null }));
    }
  }

  const tracksById = new Map((tracks || []).map((track: any) => [track.id, normalizeAttachedTrack(track)]));
  return normalizedPosts.map((post) => ({
    ...post,
    author: post.author || post.profiles
      ? {
          id: (post.author || post.profiles).id,
          name: (post.author || post.profiles).name,
          username: (post.author || post.profiles).username,
          avatar: (post.author || post.profiles).avatar,
        }
      : undefined,
    track_id: post.track_id || post._attached_track_id || null,
    track: post._attached_track_id ? tracksById.get(post._attached_track_id) || null : null,
    _attached_track_id: undefined,
  }));
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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, username, avatar')
    .in('id', userIds);
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

export function legacyCategory(category: string) {
  if (category === 'feedback') return 'question';
  if (category === 'collab' || category === 'remix' || category === 'prompts' || category === 'weekly-top' || category === 'ai_prompt' || category === 'top_tracks' || category === 'announcement') return 'suggestion';
  return category;
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

export function shouldRetryLegacyCategory(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === '23514' ||
    message.includes('category') ||
    message.includes('check constraint')
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
    const { data, error } = await supabase
      .from('forum_posts')
      .insert(payload)
      .select('*')
      .single();

    if (!error) return { post: data, error: null };
    lastError = error;
    if (!shouldRetryWithoutOptionalColumns(error) && !shouldRetryLegacyCategory(error)) break;
  }

  const fallbackCategory = legacyCategory(insertPayload.category);
  if (fallbackCategory !== insertPayload.category && shouldRetryLegacyCategory(lastError)) {
    const legacyPayload = { ...insertPayload, category: fallbackCategory };
    delete legacyPayload.track_id;
    delete legacyPayload.tags;
    const { data, error } = await supabase
      .from('forum_posts')
      .insert(legacyPayload)
      .select('*')
      .single();
    if (!error) return { post: { ...data, category: insertPayload.category }, error: null };
    lastError = error;
  }

  return { post: null, error: lastError };
}
