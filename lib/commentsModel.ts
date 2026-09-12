import { isMomentReactionType, type MomentReactionType } from './momentReactions.ts';

export type CommentEntityType = 'track' | 'post' | 'clip';
export type CommentEntity = { type: CommentEntityType; id: string; title?: string; artist?: string; creatorId?: string; audioUrl?: string; coverUrl?: string | null; duration?: number; count?: number; sourceTrackId?: string };
export type SocialComment = {
  id: string; content: string; createdAt: string; timestampSeconds: number | null;
  user: { id: string; username: string; name: string; avatar: string };
  likesCount: number; isLiked: boolean; replies: SocialComment[];
  isDeleted: boolean; customFiltered: boolean; isCreatorFavorite: boolean;
};
export type MomentReaction = { id: string; reactionType: MomentReactionType; timestampSeconds: number };
export type MusicalCluster = { id: string; timestampSeconds: number; comments: SocialComment[]; reactions: MomentReaction[] };
export const commentsEntityKey = (type: CommentEntityType, id: string) => `${type}:${id}`;
export const commentsEndpoint = (type: CommentEntityType, id: string) => `/api/${type === 'track' ? 'tracks' : type === 'post' ? 'posts' : 'music-clips'}/${encodeURIComponent(id)}/comments`;
export const supportsMoments = (type: CommentEntityType, id: string) => type === 'track' && !id.startsWith('ai-') && !id.startsWith('radio-');
export function momentTime(value: number) { const s = Math.max(0, Math.floor(value || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
export function normalizeComment(raw: any): SocialComment {
  const timestamp = raw?.timestampSeconds ?? raw?.timestamp_seconds;
  return {
    id: String(raw?.id || ''), content: String(raw?.content || ''), createdAt: String(raw?.createdAt || raw?.created_at || ''),
    timestampSeconds: timestamp != null && Number.isFinite(Number(timestamp)) && Number(timestamp) >= 0 ? Number(timestamp) : null,
    user: { id: String(raw?.user?.id || raw?.user_id || ''), username: String(raw?.user?.username || 'utilisateur'), name: String(raw?.user?.name || raw?.user?.username || 'Membre'), avatar: String(raw?.user?.avatar || '') },
    likesCount: Math.max(0, Number(raw?.likesCount) || 0), isLiked: Boolean(raw?.isLiked),
    replies: Array.isArray(raw?.replies) ? raw.replies.map(normalizeComment) : [],
    isDeleted: Boolean(raw?.isDeleted), customFiltered: Boolean(raw?.customFiltered), isCreatorFavorite: Boolean(raw?.isCreatorFavorite),
  };
}
export function mergeComments(...lists: SocialComment[][]) { return Array.from(new Map(lists.flat().filter(c => c.id).map(c => [c.id, c])).values()); }
export function normalizeReactions(rows: any[]): MomentReaction[] {
  return Array.from(new Map(rows.filter(r => r?.id && isMomentReactionType(r.reactionType) && Number.isFinite(Number(r.timestampSeconds)) && Number(r.timestampSeconds) >= 0).map(r => [String(r.id), { id: String(r.id), reactionType: r.reactionType as MomentReactionType, timestampSeconds: Number(r.timestampSeconds) }])).values());
}
// At most six markers on a 300px waveform; full precision remains in the list.
export function clusterMusicalMoments(comments: SocialComment[], reactions: MomentReaction[], duration: number, maxClusters = 6): MusicalCluster[] {
  const events = [
    ...comments.filter(c => c.timestampSeconds != null && !c.isDeleted && !c.customFiltered).map(c => ({ time: c.timestampSeconds!, comment: c, reaction: null as MomentReaction | null })),
    ...reactions.map(r => ({ time: r.timestampSeconds, comment: null as SocialComment | null, reaction: r })),
  ].sort((a, b) => a.time - b.time);
  const bucketSize = Math.max(3, Math.max(duration, events.at(-1)?.time || 0) / maxClusters);
  const buckets = new Map<number, MusicalCluster>();
  for (const event of events) {
    const bucket = Math.min(maxClusters - 1, Math.floor(event.time / bucketSize));
    const cluster = buckets.get(bucket) || { id: `moment-${bucket}`, timestampSeconds: event.time, comments: [], reactions: [] };
    if (event.comment) cluster.comments.push(event.comment);
    if (event.reaction) cluster.reactions.push(event.reaction);
    buckets.set(bucket, cluster);
  }
  return Array.from(buckets.values());
}
