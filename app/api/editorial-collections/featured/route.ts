import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  isMissingEditorialCollectionsTable,
  normalizeEditorialCollection,
  normalizeLegacyCollectionFromPlaylist,
} from '@/lib/editorialCollections';

export const dynamic = 'force-dynamic';

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

async function getLegacyFeaturedCollections() {
  const { data } = await supabaseAdmin
    .from('playlists')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(80);

  const collections = (data || [])
    .map((playlist) => normalizeLegacyCollectionFromPlaylist(playlist))
    .filter((collection) => collection?.isPublished && collection?.isFeatured) as any[];
  const counts = await getTrackCounts(collections.map((collection) => collection.playlistId));

  return collections
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .slice(0, 12)
    .map((collection) => ({
      ...collection,
      trackCount: counts.get(collection.playlistId) || 0,
      publicUrl: `/playlists/${collection.slug || collection.playlistId}`,
      legacy: true,
    }));
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    if (isMissingEditorialCollectionsTable(error)) {
      const collections = await getLegacyFeaturedCollections();
      return NextResponse.json({ collections, needsMigration: true });
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
      publicUrl: `/playlists/${collection.slug}`,
    })),
  });
}
