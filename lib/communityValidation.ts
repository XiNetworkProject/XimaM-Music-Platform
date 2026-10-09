export const COMMUNITY_CATEGORIES = ['feedback', 'collab', 'remix', 'prompts', 'weekly-top', 'ai_prompt', 'top_tracks', 'question', 'announcement', 'suggestion', 'bug', 'general'] as const;
export const COMMUNITY_REPLY_LIMIT = 5000;
export function communityText(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
}
export function communityPostInput(body: any) {
  const title = communityText(body?.title, 255);
  const content = communityText(body?.content, 20000);
  if (!title || !content) return { error: 'Titre (255 caractères max.) et message (20 000 max.) requis.' };
  if (!COMMUNITY_CATEGORIES.includes(body?.category)) return { error: 'Catégorie invalide.' };
  if (body.tags != null && (!Array.isArray(body.tags) || body.tags.length > 10 || body.tags.some((tag: unknown) => !communityText(tag, 40)))) return { error: '10 mots-clés de 40 caractères maximum.' };
  if (body.track_id != null && (typeof body.track_id !== 'string' || body.track_id.length > 200 || /[\s<>]/.test(body.track_id))) return { error: 'Son attaché invalide.' };
  return { value: { title, content, category: body.category, tags: Array.from(new Set<string>((body.tags || []).map((tag: string) => tag.trim()))) } };
}
export function communityPage(value: string | null, fallback: number, max = 10000) {
  const number = Number(value);
  return value && Number.isFinite(number) ? Math.min(max, Math.max(1, Math.floor(number))) : fallback;
}
