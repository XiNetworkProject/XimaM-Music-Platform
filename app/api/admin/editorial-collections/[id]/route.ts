import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import {
  isMissingEditorialCollectionsTable,
  normalizeEditorialCollection,
  normalizeLegacyCollectionFromPlaylist,
  packLegacyCollectionDescription,
  unpackLegacyCollectionDescription,
  normalizeThemeColors,
  slugifyCollectionTitle,
} from '@/lib/editorialCollections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getCollection(id: string) {
  const query = supabaseAdmin.from('editorial_collections').select('*');
  const { data, error } = await query.eq('id', id).maybeSingle();
  if (error) throw error;
  return data as any;
}

async function getLegacyPlaylist(id: string, userId?: string | null) {
  let query = supabaseAdmin.from('playlists').select('*').eq('id', id);
  if (userId) query = query.eq('creator_id', userId);
  const { data } = await query.maybeSingle();
  return data && normalizeLegacyCollectionFromPlaylist(data) ? data : null;
}

function boolPatch(body: any, camel: string, snake: string, current: boolean) {
  if (typeof body?.[camel] === 'boolean') return body[camel];
  if (typeof body?.[snake] === 'boolean') return body[snake];
  return current;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  try {
    const row = await getCollection(params.id);
    if (!row) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    return NextResponse.json({ collection: normalizeEditorialCollection(row) });
  } catch (error: any) {
    if (isMissingEditorialCollectionsTable(error)) {
      const legacy = await getLegacyPlaylist(params.id, guard.userId);
      const collection = normalizeLegacyCollectionFromPlaylist(legacy);
      if (!collection) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
      return NextResponse.json({ collection, legacy: true });
    }
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  let isLegacy = false;
  const existing = await getCollection(params.id).catch(async (error) => {
    if (isMissingEditorialCollectionsTable(error)) {
      isLegacy = true;
      return getLegacyPlaylist(params.id, guard.userId);
    }
    throw error;
  });
  if (!existing) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });

  if (isLegacy) {
    const unpacked = unpackLegacyCollectionDescription(existing.description);
    const meta = unpacked.metadata || {};
    const title = String(body?.title ?? meta.title ?? existing.name ?? '').trim();
    const description = String(body?.description ?? meta.description ?? unpacked.description ?? '').trim();
    const coverUrl = String(body?.coverUrl ?? body?.cover_url ?? meta.coverUrl ?? existing.cover_url ?? '').trim() || null;
    const bannerUrl = String(body?.bannerUrl ?? body?.banner_url ?? meta.bannerUrl ?? existing.cover_url ?? '').trim() || null;
    const nextMeta = {
      slug: body?.slug ? slugifyCollectionTitle(String(body.slug)) : String(meta.slug || existing.id),
      title,
      subtitle: String(body?.subtitle ?? meta.subtitle ?? '').trim(),
      description,
      kind: String(body?.kind ?? meta.kind ?? 'collection').trim() || 'collection',
      bannerUrl,
      coverUrl,
      themeColors: normalizeThemeColors(body?.themeColors ?? body?.theme_colors ?? meta.themeColors),
      badge: String(body?.badge ?? meta.badge ?? 'Synaura Originals').trim() || 'Synaura Originals',
      isFeatured: boolPatch(body, 'isFeatured', 'is_featured', meta.isFeatured !== false),
      isPublished: boolPatch(body, 'isPublished', 'is_published', meta.isPublished === true),
      downloadEnabled: boolPatch(body, 'downloadEnabled', 'download_enabled', meta.downloadEnabled !== false),
      commentsEnabled: boolPatch(body, 'commentsEnabled', 'comments_enabled', meta.commentsEnabled !== false),
      position: Number(body?.position ?? meta.position ?? 0),
    };
    const { data, error } = await supabaseAdmin
      .from('playlists')
      .update({
        name: title,
        description: packLegacyCollectionDescription(description, nextMeta),
        cover_url: coverUrl || bannerUrl,
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ collection: normalizeLegacyCollectionFromPlaylist(data), legacy: true });
  }

  const title = String(body?.title ?? existing.title ?? '').trim();
  const description = String(body?.description ?? existing.description ?? '').trim();
  const coverUrl = String(body?.coverUrl ?? body?.cover_url ?? existing.cover_url ?? '').trim() || null;
  const bannerUrl = String(body?.bannerUrl ?? body?.banner_url ?? existing.banner_url ?? '').trim() || null;
  const nextSlug = body?.slug ? slugifyCollectionTitle(String(body.slug)) : existing.slug;

  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .update({
      slug: nextSlug,
      title,
      subtitle: String(body?.subtitle ?? existing.subtitle ?? '').trim(),
      description,
      kind: String(body?.kind ?? existing.kind ?? 'collection').trim() || 'collection',
      banner_url: bannerUrl,
      cover_url: coverUrl,
      theme_colors: normalizeThemeColors(body?.themeColors ?? body?.theme_colors ?? existing.theme_colors),
      badge: String(body?.badge ?? existing.badge ?? 'Synaura Originals').trim() || 'Synaura Originals',
      is_featured: boolPatch(body, 'isFeatured', 'is_featured', existing.is_featured !== false),
      is_published: boolPatch(body, 'isPublished', 'is_published', existing.is_published === true),
      download_enabled: boolPatch(body, 'downloadEnabled', 'download_enabled', existing.download_enabled !== false),
      comments_enabled: boolPatch(body, 'commentsEnabled', 'comments_enabled', existing.comments_enabled !== false),
      position: Number(body?.position ?? existing.position ?? 0),
    })
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin
    .from('playlists')
    .update({
      name: title,
      description,
      cover_url: coverUrl || bannerUrl,
      is_public: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.playlist_id);

  return NextResponse.json({ collection: normalizeEditorialCollection(data as any) });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  let isLegacy = false;
  const existing = await getCollection(params.id).catch(async (error) => {
    if (isMissingEditorialCollectionsTable(error)) {
      isLegacy = true;
      return getLegacyPlaylist(params.id, guard.userId);
    }
    return null;
  });
  if (!existing) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });

  const { error } = await supabaseAdmin.from('playlists').delete().eq('id', isLegacy ? existing.id : existing.playlist_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
