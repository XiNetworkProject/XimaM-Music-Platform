import { supabaseAdmin } from '@/lib/supabase';
import { getPublicPlaylistTrackCounts } from '@/lib/publicTracks';

export type EditorialCollectionRow = {
  id: string;
  playlist_id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  kind?: string | null;
  banner_url?: string | null;
  cover_url?: string | null;
  theme_colors?: string[] | null;
  badge?: string | null;
  is_featured?: boolean | null;
  is_published?: boolean | null;
  download_enabled?: boolean | null;
  comments_enabled?: boolean | null;
  position?: number | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EditorialCollectionView = {
  id: string;
  playlistId: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  kind: string;
  bannerUrl: string | null;
  coverUrl: string | null;
  themeColors: string[];
  badge: string;
  isFeatured: boolean;
  isPublished: boolean;
  downloadEnabled: boolean;
  commentsEnabled: boolean;
  position: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const LEGACY_MARKER = 'SYNAURA_COLLECTION:';

export function packLegacyCollectionDescription(description: string, metadata: Record<string, unknown>) {
  return `<!--${LEGACY_MARKER}${JSON.stringify(metadata)}-->\n${description || ''}`.trim();
}

export function unpackLegacyCollectionDescription(description?: string | null) {
  const value = String(description || '');
  const match = value.match(/^<!--SYNAURA_COLLECTION:([\s\S]*?)-->\s*/);
  if (!match) return { metadata: null as Record<string, any> | null, description: value };
  try {
    const metadata = JSON.parse(match[1]);
    return {
      metadata: metadata && typeof metadata === 'object' ? metadata : null,
      description: value.slice(match[0].length).trim(),
    };
  } catch {
    return { metadata: null as Record<string, any> | null, description: value.replace(match[0], '').trim() };
  }
}

export function normalizeLegacyCollectionFromPlaylist(playlist: any): EditorialCollectionView | null {
  const unpacked = unpackLegacyCollectionDescription(playlist?.description);
  const meta = unpacked.metadata;
  if (!meta || !playlist?.id) return null;
  return {
    id: String(playlist.id),
    playlistId: String(playlist.id),
    slug: String(meta.slug || playlist.id),
    title: String(meta.title || playlist.name || 'Collection Synaura'),
    subtitle: String(meta.subtitle || ''),
    description: String(meta.description || unpacked.description || ''),
    kind: String(meta.kind || 'collection'),
    bannerUrl: typeof meta.bannerUrl === 'string' ? meta.bannerUrl : (playlist.cover_url || null),
    coverUrl: typeof meta.coverUrl === 'string' ? meta.coverUrl : (playlist.cover_url || null),
    themeColors: normalizeThemeColors(meta.themeColors),
    badge: String(meta.badge || 'Synaura Originals'),
    isFeatured: meta.isFeatured !== false,
    isPublished: meta.isPublished === true,
    downloadEnabled: meta.downloadEnabled !== false,
    commentsEnabled: meta.commentsEnabled !== false,
    position: Number(meta.position || 0),
    createdBy: playlist.creator_id || null,
    createdAt: playlist.created_at || null,
    updatedAt: playlist.updated_at || null,
  };
}

export function isMissingEditorialCollectionsTable(error: unknown) {
  const msg = String((error as any)?.message || (error as any)?.details || '');
  return msg.includes('editorial_collections') && (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('Could not find')
  );
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function slugifyCollectionTitle(value: string) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return normalized || `collection-${Date.now()}`;
}

export function normalizeThemeColors(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const colors = raw
    .map((entry) => String(entry || '').trim())
    .filter((entry) => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(entry))
    .slice(0, 4);
  return colors.length ? colors : ['#7357C6', '#4A9EAA', '#D96D63'];
}

export function normalizeEditorialCollection(row?: Partial<EditorialCollectionRow> | null): EditorialCollectionView | null {
  if (!row?.id || !row?.playlist_id || !row?.slug) return null;
  const colors = normalizeThemeColors(row.theme_colors);
  return {
    id: row.id,
    playlistId: row.playlist_id,
    slug: row.slug,
    title: row.title || 'Collection Synaura',
    subtitle: row.subtitle || '',
    description: row.description || '',
    kind: row.kind || 'collection',
    bannerUrl: row.banner_url || null,
    coverUrl: row.cover_url || null,
    themeColors: colors,
    badge: row.badge || 'Synaura Originals',
    isFeatured: row.is_featured !== false,
    isPublished: row.is_published === true,
    downloadEnabled: row.download_enabled !== false,
    commentsEnabled: row.comments_enabled !== false,
    position: Number(row.position || 0),
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function getEditorialCollectionByPlaylistId(playlistId: string) {
  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .select('*')
    .eq('playlist_id', playlistId)
    .maybeSingle();

  if (error) {
    if (isMissingEditorialCollectionsTable(error)) return null;
    throw error;
  }
  return normalizeEditorialCollection(data as any);
}

export async function getEditorialCollectionBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    if (isMissingEditorialCollectionsTable(error)) return null;
    throw error;
  }
  return normalizeEditorialCollection(data as any);
}

export async function getFeaturedEditorialCollections(limit = 12): Promise<EditorialCollectionView[]> {
  const safeLimit = Math.max(1, Math.min(24, limit));
  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  let collections: EditorialCollectionView[] = [];
  if (error) {
    if (!isMissingEditorialCollectionsTable(error)) throw error;
    const { data: playlists } = await supabaseAdmin
      .from('playlists')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(80);
    collections = (playlists || [])
      .map(normalizeLegacyCollectionFromPlaylist)
      .filter((collection): collection is EditorialCollectionView => Boolean(collection?.isPublished && collection?.isFeatured))
      .sort((a, b) => a.position - b.position)
      .slice(0, safeLimit);
  } else {
    collections = (data || [])
      .map((row) => normalizeEditorialCollection(row as EditorialCollectionRow))
      .filter((collection): collection is EditorialCollectionView => Boolean(collection));
  }

  const counts = await getPublicPlaylistTrackCounts(collections.map((collection) => collection.playlistId));
  return collections.map((collection) => ({
    ...collection,
    trackCount: counts.get(collection.playlistId) || 0,
    publicUrl: `/playlists/${collection.slug || collection.playlistId}`,
  })) as Array<EditorialCollectionView & { trackCount: number; publicUrl: string }>;
}
