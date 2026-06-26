import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { isMissingEditorialCollectionsTable, normalizeLegacyCollectionFromPlaylist } from '@/lib/editorialCollections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ImportItem = {
  title?: string;
  description?: string;
  audioUrl?: string;
  audioPublicId?: string;
  coverUrl?: string;
  coverPublicId?: string;
  duration?: number | string;
  genre?: string[] | string;
  tags?: string[] | string;
  style?: string;
  audioBytes?: number;
};

function asStringList(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function publicTrackSelect() {
  return `
    track_id,
    position,
    tracks(
      id, title, creator_id, created_at, cover_url, audio_url, duration, genre, album,
      profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name )
    )
  `;
}

function formatTrack(t: any) {
  return {
    _id: t.id,
    title: t.title,
    artist: {
      _id: t.creator_id,
      username: t.profiles?.username,
      name: t.profiles?.name,
      avatar: t.profiles?.avatar,
      isArtist: t.profiles?.is_artist,
      artistName: t.profiles?.artist_name,
    },
    duration: t.duration || 0,
    coverUrl: t.cover_url,
    audioUrl: t.audio_url,
    album: t.album || null,
    genre: Array.isArray(t.genre) ? t.genre : [],
    likes: [],
    plays: 0,
    createdAt: t.created_at,
    isLiked: false,
  };
}

async function getCollection(id: string) {
  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

async function getCollectionOrLegacy(id: string, userId?: string | null) {
  try {
    const collection = await getCollection(id);
    if (collection) return collection;
  } catch (error) {
    if (!isMissingEditorialCollectionsTable(error)) throw error;
  }
  let query = supabaseAdmin.from('playlists').select('*').eq('id', id);
  if (userId) query = query.eq('creator_id', userId);
  const { data } = await query.maybeSingle();
  const legacy = normalizeLegacyCollectionFromPlaylist(data);
  if (!legacy) return null;
  return {
    id: legacy.id,
    playlist_id: legacy.playlistId,
    slug: legacy.slug,
    title: legacy.title,
    cover_url: legacy.coverUrl,
    banner_url: legacy.bannerUrl,
  };
}

async function nextPosition(playlistId: string) {
  const { data } = await supabaseAdmin
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number(data?.position ?? -1) + 1;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  try {
    const collection = await getCollectionOrLegacy(params.id, guard.userId);
    if (!collection) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    const { data, error } = await supabaseAdmin
      .from('playlist_tracks')
      .select(publicTrackSelect())
      .eq('playlist_id', collection.playlist_id)
      .order('position', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tracks: (data || []).map((row: any) => row.tracks).filter(Boolean).map(formatTrack) });
  } catch (error: any) {
    if (isMissingEditorialCollectionsTable(error)) return NextResponse.json({ error: 'Table editorial_collections manquante' }, { status: 422 });
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok || !guard.userId) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  try {
    const collection = await getCollectionOrLegacy(params.id, guard.userId);
    if (!collection) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const items: ImportItem[] = Array.isArray(body?.items) ? body.items : [];
    const existingTrackIds = Array.isArray(body?.existingTrackIds) ? body.existingTrackIds.map((id: unknown) => String(id).trim()).filter(Boolean) : [];
    if (!items.length && !existingTrackIds.length) {
      return NextResponse.json({ error: 'Aucun titre a importer' }, { status: 400 });
    }

    let position = await nextPosition(collection.playlist_id);
    const created: any[] = [];
    const linked: string[] = [];
    const errors: Array<{ title?: string; error: string }> = [];

    for (const trackId of existingTrackIds) {
      const { data: track } = await supabaseAdmin.from('tracks').select('id').eq('id', trackId).maybeSingle();
      if (!track) {
        errors.push({ title: trackId, error: 'Track introuvable' });
        continue;
      }
      const { data: existingLink } = await supabaseAdmin
        .from('playlist_tracks')
        .select('id')
        .eq('playlist_id', collection.playlist_id)
        .eq('track_id', trackId)
        .maybeSingle();
      if (!existingLink) {
        const { error } = await supabaseAdmin.from('playlist_tracks').insert({
          playlist_id: collection.playlist_id,
          track_id: trackId,
          position: position++,
          added_at: new Date().toISOString(),
        });
        if (error) errors.push({ title: trackId, error: error.message });
        else linked.push(trackId);
      }
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const audioUrl = String(item.audioUrl || '').trim();
      const title = String(item.title || '').trim() || `Synaura Original ${index + 1}`;
      if (!audioUrl) {
        errors.push({ title, error: 'Audio URL manquante' });
        continue;
      }

      const genre = asStringList(item.genre);
      const tags = asStringList(item.tags);
      const trackPayload: Record<string, any> = {
        id: `track_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`,
        title,
        description: String(item.description || '').trim(),
        lyrics: null,
        genre,
        audio_url: audioUrl,
        cover_url: String(item.coverUrl || collection.cover_url || collection.banner_url || '').trim() || null,
        album: collection.title,
        duration: Math.round(Number(item.duration || 0) || 0),
        creator_id: guard.userId,
        is_public: true,
        plays: 0,
        likes: 0,
        is_featured: false,
        audio_size_mb: item.audioBytes ? Math.round(Number(item.audioBytes) / (1024 * 1024)) : null,
        audio_public_id: item.audioPublicId || null,
        cover_public_id: item.coverPublicId || null,
        data: {
          source: 'admin_editorial_collection',
          editorial_collection_id: collection.id,
          editorial_collection_slug: collection.slug,
          editorial_collection_title: collection.title,
          tags,
          style: item.style || genre[0] || null,
        },
      };

      let insert = await supabaseAdmin.from('tracks').insert(trackPayload).select('*').single();
      if (insert.error && String(insert.error.message || '').includes('data')) {
        const { data: _drop, ...fallback } = trackPayload;
        insert = await supabaseAdmin.from('tracks').insert(fallback).select('*').single();
      }
      if (insert.error || !insert.data) {
        errors.push({ title, error: insert.error?.message || 'Insertion impossible' });
        continue;
      }

      const link = await supabaseAdmin.from('playlist_tracks').insert({
        playlist_id: collection.playlist_id,
        track_id: insert.data.id,
        position: position++,
        added_at: new Date().toISOString(),
      });
      if (link.error) {
        errors.push({ title, error: link.error.message });
        continue;
      }
      created.push(insert.data);
    }

    return NextResponse.json({ success: true, created: created.length, linked: linked.length, errors });
  } catch (error: any) {
    if (isMissingEditorialCollectionsTable(error)) return NextResponse.json({ error: 'Table editorial_collections manquante' }, { status: 422 });
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get('trackId');
  const deleteTrack = searchParams.get('deleteTrack') === '1';
  if (!trackId) return NextResponse.json({ error: 'Track ID requis' }, { status: 400 });

  try {
    const collection = await getCollectionOrLegacy(params.id, guard.userId);
    if (!collection) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    await supabaseAdmin.from('playlist_tracks').delete().eq('playlist_id', collection.playlist_id).eq('track_id', trackId);
    if (deleteTrack) await supabaseAdmin.from('tracks').delete().eq('id', trackId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
