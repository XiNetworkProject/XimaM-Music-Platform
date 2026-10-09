import { COMMUNITY_CLUBS } from './communityClubs';

export type CommunityAuthor = { id?: string; name?: string; username?: string; avatar?: string | null };
export type CommunityTrack = {
  id: string; title?: string; artist_id?: string; artist_name?: string; artist_username?: string;
  coverUrl?: string | null; cover_url?: string | null; coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null; audioUrl?: string | null; audio_url?: string | null;
  duration?: number; genre?: string[]; plays?: number; style?: string;
};
export type CommunityPost = {
  id: string; title: string; content: string; category: string; created_at?: string;
  tags?: string[]; likes_count?: number; replies_count?: number; is_liked?: boolean;
  author?: CommunityAuthor; track?: CommunityTrack | null;
};
export type CommunitySort = 'recent' | 'popular' | 'most_replied';
export const COMMUNITY_PAGE_SIZE = 15;
export const COMMUNITY_OTHER_CATEGORIES = [
  ['general', 'Discussions libres'], ['question', 'Questions'], ['suggestion', 'Suggestions'],
  ['announcement', 'Annonces'], ['bug', 'Entraide technique'], ['prompts', 'Prompts'],
  ['weekly-top', 'Découvertes'], ['top_tracks', 'Top morceaux'],
] as const;
export const COMMUNITY_FILTERS = [
  { category: 'all', label: 'Tout', slug: 'all' },
  ...COMMUNITY_CLUBS.map((club) => ({ category: club.category, slug: club.slug, label: ({ feedback: 'Avis', collab: 'Collabs', remix: 'Remixes', ai: 'Création IA' })[club.slug] })),
];
export function communityCategory(value: string | null | undefined): string {
  return [...COMMUNITY_FILTERS.map((item) => item.category), ...COMMUNITY_OTHER_CATEGORIES.map(([key]) => key)].includes(value || '') ? value! : 'all';
}
export function communitySort(value: string | null | undefined): CommunitySort {
  return value === 'popular' || value === 'most_replied' ? value : 'recent';
}
export function communityCategoryLabel(category: string) {
  return COMMUNITY_FILTERS.find((item) => item.category === category)?.label
    || COMMUNITY_OTHER_CATEGORIES.find(([key]) => key === category)?.[1] || 'Discussion';
}
export function communityFeedParams(category: string, search: string, sort: string, page = 1) {
  const params = new URLSearchParams({ limit: String(COMMUNITY_PAGE_SIZE), page: String(Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1), sort: communitySort(sort) });
  const validCategory = communityCategory(category);
  if (validCategory !== 'all') params.set('category', validCategory);
  if (search.trim()) params.set('search', search.trim().slice(0, 120));
  return params;
}
export function mergeCommunityPosts(previous: CommunityPost[], incoming: CommunityPost[]) {
  const posts = new Map(previous.map((post) => [post.id, post]));
  for (const post of incoming) if (typeof post?.id === 'string' && post.id) posts.set(post.id, post);
  return Array.from(posts.values());
}
export function communityParticipants(posts: CommunityPost[]) {
  const authors = new Map<string, CommunityAuthor>();
  for (const post of posts) if (post.author?.username) authors.set(post.author.username, post.author);
  return Array.from(authors.values()).slice(0, 5);
}
export function communityDate(value?: string) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '';
  const diff = Math.max(0, Date.now() - date.getTime());
  if (diff < 3_600_000) return 'Il y a moins d’une heure';
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
export function communityPostHref(id: string, publicPreview = false) {
  return `${publicPreview ? 'https://synaura.fr' : ''}/community/forum/${encodeURIComponent(id)}`;
}
