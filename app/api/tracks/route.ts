import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const liked = searchParams.get('liked') === 'true';
    const recent = searchParams.get('recent') === 'true';
    const featured = searchParams.get('featured');
    const sort = searchParams.get('sort') || null;
    const category = searchParams.get('category');

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    if ((liked || recent) && !userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Helper pour formatter une piste normale
    const toNormalTrack = (t: any) => ({
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
      genre: Array.isArray(t.genre) ? t.genre : [],
      likes: [],
      plays: t.plays || 0,
      createdAt: t.created_at,
      isLiked: false,
    });

    // Helper pour formatter une piste IA
    const toAiTrack = (t: any) => ({
      _id: `ai-${t.id}`,
      title: t.title || 'Titre IA',
      artist: {
        _id: t.user_id,
        username: t.profiles?.username,
        name: t.profiles?.name || t.profiles?.username,
        avatar: t.profiles?.avatar,
        isArtist: true,
        artistName: t.profiles?.name || t.profiles?.username,
      },
      duration: t.duration || 0,
      coverUrl: t.image_url || '/default-cover.jpg',
      audioUrl: t.audio_url,
      genre: Array.isArray(t.tags) ? t.tags : [],
      likes: [],
      plays: 0,
      createdAt: t.created_at,
      isLiked: false,
    });

    if (liked && userId) {
      // Récupérer les likes de l'utilisateur (les plus récents d'abord)
      const { data: likeRows, error: likeErr } = await supabaseAdmin
        .from('track_likes')
        .select('track_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (likeErr) {
        return NextResponse.json({ tracks: [] });
      }

      const ids = (likeRows || []).map((r: { track_id: string | number }) => String(r.track_id));
      const uniqueIds: string[] = [];
      const seen = new Set<string>();
      for (const id of ids) {
        if (!seen.has(id)) {
          seen.add(id);
          uniqueIds.push(id);
        }
      }

      const normalIds = uniqueIds.filter(id => !id.startsWith('ai-')).slice(0, limit);
      const aiIds = uniqueIds.filter(id => id.startsWith('ai-')).map(id => id.slice(3)).slice(0, limit);

      let tracks: any[] = [];

      if (normalIds.length) {
        const { data, error } = await supabaseAdmin
          .from('tracks')
          .select(`
            id, title, creator_id, created_at, cover_url, audio_url, duration, genre, plays,
            profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name )
          `)
          .in('id', normalIds);
        if (!error && Array.isArray(data)) {
          tracks.push(...data.map(toNormalTrack));
        }
      }

      if (aiIds.length) {
        const { data, error } = await supabaseAdmin
          .from('ai_tracks')
          .select(`
            id, title, user_id, created_at, image_url, audio_url, duration, tags,
            profiles:profiles!ai_tracks_user_id_fkey ( id, username, name, avatar )
          `)
          .in('id', aiIds);
        if (!error && Array.isArray(data)) {
          tracks.push(...data.map(toAiTrack));
        }
      }

      // Conserver l'ordre des likes récents
      const order = new Map<string, number>();
      uniqueIds.forEach((id, idx) => order.set(id, idx));
      tracks.sort((a, b) => (order.get(a._id) ?? 0) - (order.get(b._id) ?? 0));

      return NextResponse.json({ tracks: tracks.slice(0, limit) });
    }

    if (recent && userId) {
      // Récupérer les derniers events de lecture de l'utilisateur
      const { data: events, error: evErr } = await supabaseAdmin
        .from('track_events')
        .select('track_id, created_at')
        .eq('user_id', userId)
        .in('event_type', ['play_start', 'play_complete'])
        .order('created_at', { ascending: false })
        .limit(2000);

      if (evErr) {
        return NextResponse.json({ tracks: [] });
      }

      const orderedUnique: string[] = [];
      const seen = new Set<string>();
      for (const row of events || []) {
        const id = String(row.track_id);
        if (!seen.has(id)) {
          seen.add(id);
          orderedUnique.push(id);
        }
      }

      const normalIds = orderedUnique.filter(id => !id.startsWith('ai-')).slice(0, limit);
      const aiIds = orderedUnique.filter(id => id.startsWith('ai-')).map(id => id.slice(3)).slice(0, limit);

      let tracks: any[] = [];

      if (normalIds.length) {
        const { data, error } = await supabaseAdmin
          .from('tracks')
          .select(`
            id, title, creator_id, created_at, cover_url, audio_url, duration, genre, plays,
            profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name )
          `)
          .in('id', normalIds);
        if (!error && Array.isArray(data)) {
          tracks.push(...data.map(toNormalTrack));
        }
      }

      if (aiIds.length) {
        const { data, error } = await supabaseAdmin
          .from('ai_tracks')
          .select(`
            id, title, user_id, created_at, image_url, audio_url, duration, tags,
            profiles:profiles!ai_tracks_user_id_fkey ( id, username, name, avatar )
          `)
          .in('id', aiIds);
        if (!error && Array.isArray(data)) {
          tracks.push(...data.map(toAiTrack));
        }
      }

      // Conserver l'ordre récent
      const order = new Map<string, number>();
      orderedUnique.forEach((id, idx) => order.set(id, idx));
      tracks.sort((a, b) => (order.get(a._id) ?? 0) - (order.get(b._id) ?? 0));

      return NextResponse.json({ tracks: tracks.slice(0, limit) });
    }

    // Filtres avancés (featured/sort/category)
    if (featured !== null || sort !== null || category) {
      let query = supabaseAdmin
      .from('tracks')
      .select(`
        id,
        title,
        genre,
        plays,
        likes,
        created_at,
        creator_id,
        cover_url,
        audio_url,
        duration,
        is_featured,
          is_public,
          profiles:profiles!tracks_creator_id_fkey (
            id, username, name, avatar, is_artist, artist_name
          )
      `)
      .eq('is_public', true);

    if (category && category !== 'all') {
      query = query.contains('genre', [category]);
    }
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }
      const sortKey = sort || 'trending';
      switch (sortKey) {
      case 'trending':
        query = query.order('plays', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('likes', { ascending: false });
        break;
      case 'featured':
        query = query.order('is_featured', { ascending: false }).order('plays', { ascending: false });
        break;
      default:
        query = query.order('plays', { ascending: false });
    }
    query = query.limit(limit);

    const { data: tracks, error } = await query;
      if (error || !Array.isArray(tracks)) {
        return NextResponse.json({ tracks: [] });
      }

      const formattedTracks = tracks.map((t: any) => ({
        _id: t.id,
        title: t.title,
            artist: {
          _id: t.creator_id,
          username: t.profiles?.username || 'Utilisateur',
          name: t.profiles?.name || t.profiles?.username || 'Utilisateur',
          avatar: t.profiles?.avatar || '',
          isArtist: t.profiles?.is_artist || false,
          artistName: t.profiles?.artist_name || t.profiles?.name || t.profiles?.username || 'Utilisateur'
        },
        genre: Array.isArray(t.genre) ? t.genre : [],
        plays: t.plays || 0,
        likes: Array.isArray(t.likes) ? t.likes.length : (t.likes || 0),
        createdAt: t.created_at,
        coverUrl: t.cover_url,
        audioUrl: t.audio_url,
        duration: t.duration || 0,
        isFeatured: !!t.is_featured,
        isNew: false,
      }));

      return NextResponse.json({ tracks: formattedTracks, total: formattedTracks.length, sort: sortKey, category: category || 'all' });
    }

    // Par défaut: dernières pistes publiques
    const { data: recentTracks, error } = await supabaseAdmin
      .from('tracks')
      .select(`
        id, title, creator_id, created_at, is_public, cover_url, audio_url, duration, genre, plays,
        profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ tracks: [] });
    }

    const formatted = (recentTracks || []).map(toNormalTrack);
    return NextResponse.json({ tracks: formatted });
  } catch (error) {
    console.error('❌ Erreur /api/tracks:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
 
