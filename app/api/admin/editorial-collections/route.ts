import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import {
  isMissingEditorialCollectionsTable,
  normalizeEditorialCollection,
  normalizeLegacyCollectionFromPlaylist,
  packLegacyCollectionDescription,
  normalizeThemeColors,
  slugifyCollectionTitle,
} from '@/lib/editorialCollections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function uniqueSlug(base: string) {
  let slug = slugifyCollectionTitle(base);
  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data, error } = await supabaseAdmin
      .from('editorial_collections')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (error && isMissingEditorialCollectionsTable(error)) throw error;
    if (!data) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

async function getTrackCounts(playlistIds: string[]) {
  if (!playlistIds.length) return new Map<string, number>();
  const { data } = await supabaseAdmin
    .from('playlist_tracks')
    .select('playlist_id')
    .in('playlist_id', playlistIds);
  const counts = new Map<string, number>();
  for (const row of data || []) {
    counts.set(row.playlist_id, (counts.get(row.playlist_id) || 0) + 1);
  }
  return counts;
}

export async function GET() {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingEditorialCollectionsTable(error)) {
      const { data: playlists } = await supabaseAdmin
        .from('playlists')
        .select('*')
        .eq('creator_id', guard.userId)
        .order('created_at', { ascending: false });
      const legacyCollections = (playlists || [])
        .map((playlist) => normalizeLegacyCollectionFromPlaylist(playlist))
        .filter(Boolean) as any[];
      const counts = await getTrackCounts(legacyCollections.map((collection) => collection.playlistId));
      return NextResponse.json({
        collections: legacyCollections.map((collection) => ({
          ...collection,
          trackCount: counts.get(collection.playlistId) || 0,
          legacy: true,
        })),
        needsMigration: true,
        migrationCommand: 'npm run migrate:collections',
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const collections = (data || [])
    .map((row) => normalizeEditorialCollection(row as any))
    .filter(Boolean) as any[];
  const counts = await getTrackCounts(collections.map((collection) => collection.playlistId));

  return NextResponse.json({
    collections: collections.map((collection) => ({
      ...collection,
      trackCount: counts.get(collection.playlistId) || 0,
    })),
    needsMigration: false,
  });
}

export async function POST(request: NextRequest) {
  const guard = await getAdminGuard();
  if (!guard.ok || !guard.userId) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || '').trim();
  if (!title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });

  let slug = '';
  let useLegacyStorage = false;
  try {
    slug = await uniqueSlug(String(body?.slug || title));
  } catch (error) {
    if (isMissingEditorialCollectionsTable(error)) {
      slug = slugifyCollectionTitle(String(body?.slug || title));
      useLegacyStorage = true;
    } else {
      throw error;
    }
  }
  const playlistId = randomUUID();
  const coverUrl = String(body?.coverUrl || body?.cover_url || '').trim() || null;
  const bannerUrl = String(body?.bannerUrl || body?.banner_url || '').trim() || null;
  const subtitle = String(body?.subtitle || '').trim();
  const description = String(body?.description || '').trim();
  const badge = String(body?.badge || 'Synaura Originals').trim() || 'Synaura Originals';
  const themeColors = normalizeThemeColors(body?.themeColors || body?.theme_colors);

  const legacyMetadata = {
    slug,
    title,
    subtitle,
    description,
    kind: String(body?.kind || 'originals').trim() || 'originals',
    bannerUrl,
    coverUrl,
    themeColors,
    badge,
    isFeatured: body?.isFeatured !== false && body?.is_featured !== false,
    isPublished: body?.isPublished === true || body?.is_published === true,
    downloadEnabled: body?.downloadEnabled !== false && body?.download_enabled !== false,
    commentsEnabled: body?.commentsEnabled !== false && body?.comments_enabled !== false,
    position: Number(body?.position || 0),
  };

  const playlistPayload: Record<string, any> = {
    id: playlistId,
    name: title,
    description: useLegacyStorage ? packLegacyCollectionDescription(description, legacyMetadata) : description,
    is_public: true,
    creator_id: guard.userId,
    cover_url: coverUrl || bannerUrl,
    is_album: false,
  };

  let playlistInsert = await supabaseAdmin.from('playlists').insert(playlistPayload).select('id').single();
  if (playlistInsert.error && String(playlistInsert.error.message || '').includes('is_album')) {
    const { is_album, ...fallback } = playlistPayload;
    playlistInsert = await supabaseAdmin.from('playlists').insert(fallback).select('id').single();
  }
  if (playlistInsert.error) {
    return NextResponse.json({ error: playlistInsert.error.message }, { status: 500 });
  }

  if (useLegacyStorage) {
    return NextResponse.json({
      collection: normalizeLegacyCollectionFromPlaylist({
        id: playlistId,
        name: title,
        description: playlistPayload.description,
        cover_url: coverUrl || bannerUrl,
        creator_id: guard.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      legacy: true,
    }, { status: 201 });
  }

  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .insert({
      playlist_id: playlistId,
      slug,
      title,
      subtitle,
      description,
      kind: String(body?.kind || 'originals').trim() || 'originals',
      banner_url: bannerUrl,
      cover_url: coverUrl,
      theme_colors: themeColors,
      badge,
      is_featured: body?.isFeatured !== false && body?.is_featured !== false,
      is_published: body?.isPublished === true || body?.is_published === true,
      download_enabled: body?.downloadEnabled !== false && body?.download_enabled !== false,
      comments_enabled: body?.commentsEnabled !== false && body?.comments_enabled !== false,
      position: Number(body?.position || 0),
      created_by: guard.userId,
    })
    .select('*')
    .single();

  if (error) {
    await supabaseAdmin.from('playlists').delete().eq('id', playlistId);
    if (isMissingEditorialCollectionsTable(error)) {
      return NextResponse.json({
        error: 'Table editorial_collections manquante',
        action: 'Lance npm run migrate:collections puis reessaie.',
      }, { status: 422 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ collection: normalizeEditorialCollection(data as any) }, { status: 201 });
}
