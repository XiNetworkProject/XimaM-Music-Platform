import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { isMissingEditorialCollectionsTable, normalizeEditorialCollection, normalizeLegacyCollectionFromPlaylist, unpackLegacyCollectionDescription } from '@/lib/editorialCollections';
import { getPublicPlaylistTrackCounts } from '@/lib/publicTracks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const [{ data: playlists, error }, editorialResult] = await Promise.all([
      supabase
        .from('playlists')
        .select(`
          *,
          profiles!playlists_creator_id_fkey (
            id,
            username,
            name,
            avatar,
            is_artist,
            artist_name
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('editorial_collections')
        .select('*')
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(Math.min(6, limit)),
    ]);

    if (error) {
      console.error('popular playlists error:', error);
      return NextResponse.json({ error: 'Erreur lors de la recuperation des playlists populaires' }, { status: 500 });
    }

    let editorialPlaylists: any[] = [];
    if (editorialResult.error) {
      if (!isMissingEditorialCollectionsTable(editorialResult.error)) {
        console.warn('popular playlists editorial error:', editorialResult.error.message);
      }
    } else {
      const collections = (editorialResult.data || [])
        .map((row) => normalizeEditorialCollection(row as any))
        .filter(Boolean) as any[];
      const playlistIds = collections.map((collection) => collection.playlistId);
      const counts = await getPublicPlaylistTrackCounts(playlistIds);

      editorialPlaylists = collections.map((collection) => ({
        _id: collection.playlistId,
        id: collection.playlistId,
        name: collection.title,
        title: collection.title,
        description: collection.subtitle || collection.description,
        coverUrl: collection.coverUrl || collection.bannerUrl,
        bannerUrl: collection.bannerUrl,
        creator: {
          _id: collection.createdBy,
          username: 'synaura',
          name: 'Synaura',
          avatar: '/brand/2026/synaura-symbol-2026.png',
          isArtist: true,
          artistName: 'Synaura',
        },
        tracks: [],
        trackCount: counts.get(collection.playlistId) || 0,
        likes: [],
        isPublic: true,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        isVerified: true,
        isEditorial: true,
        editorialCollection: collection,
        collection,
        publicUrl: `/playlists/${collection.slug}`,
      }));
    }

    const normalPlaylists = (playlists || []).map((playlist: any) => {
      const legacy = normalizeLegacyCollectionFromPlaylist(playlist);
      const cleanDescription = unpackLegacyCollectionDescription(playlist.description).description;
      if (legacy) {
        if (!legacy.isPublished) return null;
        return {
          _id: playlist.id,
          id: playlist.id,
          name: legacy.title,
          title: legacy.title,
          description: legacy.subtitle || legacy.description,
          coverUrl: legacy.coverUrl || playlist.cover_url,
          bannerUrl: legacy.bannerUrl,
          creator: {
            _id: playlist.creator_id,
            username: 'synaura',
            name: 'Synaura',
            avatar: '/brand/2026/synaura-symbol-2026.png',
            isArtist: true,
            artistName: 'Synaura',
          },
          tracks: playlist.tracks || [],
          likes: [],
          isPublic: true,
          createdAt: playlist.created_at,
          updatedAt: playlist.updated_at,
          isVerified: true,
          isEditorial: true,
          editorialCollection: legacy,
          collection: legacy,
          publicUrl: `/playlists/${playlist.id}`,
        };
      }
      return {
        _id: playlist.id,
        id: playlist.id,
        name: playlist.name,
        title: playlist.name,
        description: cleanDescription,
        coverUrl: playlist.cover_url,
        creator: {
          _id: playlist.creator_id,
          username: playlist.profiles?.username || 'unknown',
          name: playlist.profiles?.name || playlist.profiles?.artist_name || 'Unknown',
          avatar: playlist.profiles?.avatar || null,
          isArtist: Boolean(playlist.profiles?.is_artist),
          artistName: playlist.profiles?.artist_name || null,
        },
        tracks: playlist.tracks || [],
        likes: [],
        isPublic: playlist.is_public,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at,
        isVerified: false,
      };
    }).filter(Boolean);

    const seen = new Set<string>();
    const merged = [...editorialPlaylists, ...normalPlaylists]
      .filter((playlist) => {
        const key = String(playlist._id || playlist.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);

    return NextResponse.json({ playlists: merged });
  } catch (error) {
    console.error('popular playlists server error:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
