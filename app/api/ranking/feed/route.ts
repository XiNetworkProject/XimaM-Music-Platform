import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { computeRankingScore } from '@/lib/ranking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);
    const includeAi = searchParams.get('ai') === '1';

    // Récupérer dernières 30j stats + infos track minimales
    const { data: statsRows, error: statsErr } = await supabaseAdmin
      .from('track_stats_rolling_30d')
      .select('*');

    if (statsErr) {
      console.error('ranking: erreur stats 30d', statsErr);
      return NextResponse.json({ error: 'Erreur stats' }, { status: 500 });
    }

    const now = Date.now();
    const filteredStats = (statsRows || []).filter((r) => (includeAi ? true : !r.is_ai_track));
    if (!filteredStats.length) {
      // Fallback: aucune stat agrégée encore -> renvoyer les dernières pistes publiques (et IA si demandé)
      try {
        const limitFallback = Math.max(1, Math.min(limit, 50));
        const results: any[] = [];

        // Pistes normales récentes
        const { data: recentTracks, error: recentErr } = await supabaseAdmin
          .from('tracks')
          .select(`
            id, title, creator_id, created_at, is_public, cover_url, audio_url, duration, genre,
            profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
          `)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(limitFallback);

        if (!recentErr && Array.isArray(recentTracks)) {
          results.push(
            ...recentTracks.map((t: any) => ({
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
              genre: t.genre || [],
              likes: [],
              plays: 0,
              createdAt: t.created_at,
              isFeatured: false,
              isVerified: t.profiles?.is_verified || false,
              rankingScore: 0,
              isAI: false,
            }))
          );
        }

        if (includeAi) {
          // Pistes IA récentes
          const { data: recentAI, error: recentAIErr } = await supabaseAdmin
            .from('ai_tracks')
            .select(`
              id, title, user_id, created_at, image_url, audio_url, duration, tags,
              profiles:profiles!ai_tracks_user_id_fkey ( id, username, name, avatar, is_verified )
            `)
            .order('created_at', { ascending: false })
            .limit(limitFallback);

          if (!recentAIErr && Array.isArray(recentAI)) {
            results.push(
              ...recentAI.map((t: any) => ({
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
                isFeatured: false,
                isVerified: t.profiles?.is_verified || false,
                rankingScore: 0,
                isAI: true,
              }))
            );
          }
        }

        // Limiter et renvoyer le fallback
        return NextResponse.json({ tracks: results.slice(0, limitFallback) });
      } catch (e) {
        console.error('ranking: fallback trending error', e);
        return NextResponse.json({ tracks: [] });
      }
    }

    // Séparer pistes normales et IA
    const normalIds = filteredStats.filter((r) => !r.is_ai_track).map((r) => r.track_id);
    const aiIds = filteredStats.filter((r) => r.is_ai_track).map((r) => r.track_id);

    // Récupérer métadonnées pour pistes normales
    let normalTracks: any[] = [];
    if (normalIds.length) {
      const { data, error } = await supabaseAdmin
        .from('tracks')
        .select(`
          id, title, creator_id, created_at, is_public, cover_url, audio_url, duration, genre,
          profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
        `)
        .in('id', normalIds);
      if (error) {
        console.error('ranking: erreur tracks meta', error);
      } else {
        normalTracks = data || [];
      }
    }

    // Récupérer métadonnées pour pistes IA
    let aiTracks: any[] = [];
    if (aiIds.length) {
      // Les track_id IA peuvent être préfixés 'ai-<id>'. On retire le préfixe pour la jointure.
      const rawAiIds = aiIds.map((id) => (String(id).startsWith('ai-') ? String(id).slice(3) : id));
      const { data, error } = await supabaseAdmin
        .from('ai_tracks')
        .select(`
          id, title, user_id, created_at, image_url, audio_url, duration, tags,
          profiles:profiles!ai_tracks_user_id_fkey ( id, username, name, avatar, is_verified )
        `)
        .in('id', rawAiIds);
      if (error) {
        console.error('ranking: erreur ai_tracks meta', error);
      } else {
        aiTracks = (data || []).map((t: any) => ({ ...t, _aiPrefixedId: `ai-${t.id}` }));
      }
    }

    const statsMap = new Map<string, any>(filteredStats.map((r) => [r.track_id, r]));

    // Scoring + formatage pour pistes normales
    const scoredNormal = normalTracks.map((t) => {
      const r = statsMap.get(t.id);
      const created = t?.created_at ? new Date(t.created_at).getTime() : now;
      const ageHours = (now - created) / 3_600_000;
      const score = computeRankingScore({
        plays_30d: r?.plays_30d || 0,
        completes_30d: r?.completes_30d || 0,
        likes_30d: r?.likes_30d || 0,
        shares_30d: r?.shares_30d || 0,
        favorites_30d: r?.favorites_30d || 0,
        listen_ms_30d: r?.listen_ms_30d || 0,
        unique_listeners_30d: r?.unique_listeners_30d || 0,
        retention_complete_rate_30d: r?.retention_complete_rate_30d || 0,
      }, ageHours, 0);
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
        genre: t.genre || [],
        likes: [],
        plays: 0,
        createdAt: t.created_at,
        isFeatured: false,
        isVerified: t.profiles?.is_verified || false,
        rankingScore: score,
        isAI: false,
      };
    });

    // Scoring + formatage pour pistes IA
    const scoredAI = aiTracks.map((t) => {
      const trackId = t._aiPrefixedId as string;
      const r = statsMap.get(trackId);
      const created = t?.created_at ? new Date(t.created_at).getTime() : now;
      const ageHours = (now - created) / 3_600_000;
      const score = computeRankingScore({
        plays_30d: r?.plays_30d || 0,
        completes_30d: r?.completes_30d || 0,
        likes_30d: r?.likes_30d || 0,
        shares_30d: r?.shares_30d || 0,
        favorites_30d: r?.favorites_30d || 0,
        listen_ms_30d: r?.listen_ms_30d || 0,
        unique_listeners_30d: r?.unique_listeners_30d || 0,
        retention_complete_rate_30d: r?.retention_complete_rate_30d || 0,
      }, ageHours, 0);
      return {
        _id: trackId,
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
        isFeatured: false,
        isVerified: t.profiles?.is_verified || false,
        rankingScore: score,
        isAI: true,
      };
    });

    const combined = [...scoredNormal, ...scoredAI]
      .sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0))
      .slice(0, limit);

    return NextResponse.json({ tracks: combined });
  } catch (error) {
    console.error('Erreur ranking feed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


