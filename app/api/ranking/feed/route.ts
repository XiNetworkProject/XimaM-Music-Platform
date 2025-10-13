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
      console.error('ranking: erreur stats 30d, fallback recent', statsErr);
      try {
        const limitFallback = Math.max(1, Math.min(limit, 50));
        const results: any[] = [];

        // Pistes normales récentes
        const { data: recentTracks, error: recentErr } = await supabaseAdmin
          .from('tracks')
          .select(`
            id, title, creator_id, created_at, is_public, cover_url, audio_url, duration, genre, plays,
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
              plays: t.plays || 0,
              createdAt: t.created_at,
              isFeatured: false,
              isVerified: t.profiles?.is_verified || false,
              rankingScore: 0,
              isAI: false,
            }))
          );
        }

        if (includeAi) {
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

        const final = results.slice(0, limitFallback);
        if (final.length) {
          // Diversifier l'ordre pour Trending (et éviter de mimer "nouveautés")
          final.sort(() => Math.random() - 0.5);
        }
        return NextResponse.json({ tracks: final });
      } catch (e) {
        console.error('ranking: fallback trending error (statsErr)', e);
        return NextResponse.json({ tracks: [] });
      }
    }

    // Stats filtrées et horodatage courant (nécessaires au scoring)
    const now = Date.now();
    const filteredStats = (statsRows || []).filter((r: any) => (includeAi ? true : !r.is_ai_track));

    // Fallback 1: si aucune stat agrégée, calculer "trending" à partir des track_events récents
    if (!filteredStats.length) {
      try {
        const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: evs, error: evErr } = await supabaseAdmin
          .from('track_events')
          .select('track_id, event_type, created_at, is_ai_track')
          .gte('created_at', sinceIso);
        if (evErr) throw evErr;

        const agg = new Map<string, { plays: number; completes: number; likes: number; shares: number; favs: number; last: number; isAI: boolean }>();
        (evs || []).forEach((e: any) => {
          const id = String(e.track_id);
          const cur = agg.get(id) || { plays: 0, completes: 0, likes: 0, shares: 0, favs: 0, last: 0, isAI: Boolean(e.is_ai_track) };
          switch (e.event_type) {
            case 'play_start': cur.plays++; break;
            case 'play_complete': cur.completes++; break;
            case 'favorite': cur.favs++; break;
            case 'share': cur.shares++; break;
            case 'like': cur.likes++; break;
            default: break;
          }
          cur.last = Math.max(cur.last, new Date(e.created_at).getTime());
          agg.set(id, cur);
        });

        const ids = Array.from(agg.keys());
        const normalIds = ids.filter((id) => !String(id).startsWith('ai-'));
        const aiIds = ids.filter((id) => String(id).startsWith('ai-')).map((id) => String(id).slice(3));

        let normalTracks: any[] = [];
        if (normalIds.length) {
          const { data } = await supabaseAdmin
            .from('tracks')
            .select(`
              id, title, creator_id, created_at, is_public, cover_url, audio_url, duration, genre, plays,
              profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
            `)
            .in('id', normalIds)
            .eq('is_public', true);
          normalTracks = data || [];
        }

        let aiTracks: any[] = [];
        if (includeAi && aiIds.length) {
          const { data } = await supabaseAdmin
            .from('ai_tracks')
            .select(`
              id, title, user_id, created_at, image_url, audio_url, duration, tags,
              profiles:profiles!ai_tracks_user_id_fkey ( id, username, name, avatar, is_verified )
            `)
            .in('id', aiIds as any);
          aiTracks = (data || []).map((t: any) => ({ ...t, _aiPrefixedId: `ai-${t.id}` }));
        }

        const scoredNormal = normalTracks.map((t: any) => {
          const r = agg.get(String(t.id))!;
          const ageHours = Math.max(1, (now - (r?.last || new Date(t.created_at).getTime())) / 3_600_000);
          // Score simple basé sur les événements + décroissance
          const score = (
            Math.log10(1 + (r?.plays || 0)) +
            1.5 * Math.log10(1 + (r?.completes || 0)) +
            1.2 * Math.log10(1 + (r?.likes || 0)) +
            1.3 * Math.log10(1 + (r?.shares || 0)) +
            1.0 * Math.log10(1 + (r?.favs || 0))
          ) * Math.exp(-ageHours * Math.LN2 / 24); // demi‑vie 24h
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
            plays: t.plays || 0,
            createdAt: t.created_at,
            isFeatured: false,
            isVerified: t.profiles?.is_verified || false,
            rankingScore: Number(score.toFixed(6)),
            isAI: false,
          };
        });

        const scoredAI = aiTracks.map((t: any) => {
          const r = agg.get(`ai-${t.id}`)!;
          const ageHours = Math.max(1, (now - (r?.last || new Date(t.created_at).getTime())) / 3_600_000);
          const score = (
            Math.log10(1 + (r?.plays || 0)) +
            1.5 * Math.log10(1 + (r?.completes || 0)) +
            1.2 * Math.log10(1 + (r?.likes || 0)) +
            1.3 * Math.log10(1 + (r?.shares || 0)) +
            1.0 * Math.log10(1 + (r?.favs || 0))
          ) * Math.exp(-ageHours * Math.LN2 / 24);
          return {
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
            rankingScore: Number(score.toFixed(6)),
            isAI: true,
          };
        });

        const combined = [...scoredNormal, ...(includeAi ? scoredAI : [])]
          .sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0))
          .slice(0, limit);

        // Si toujours vide, fallback 2: récents publics
        if (!combined.length) {
          const { data: recentTracks } = await supabaseAdmin
            .from('tracks')
            .select('id, title, creator_id, created_at, is_public, cover_url, audio_url, duration, genre')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(limit);
          return NextResponse.json({ tracks: (recentTracks || []).map((t: any) => ({
            _id: t.id,
            title: t.title,
            artist: { _id: t.creator_id, username: '', name: '', avatar: '', isArtist: false, artistName: '' },
            duration: t.duration || 0,
            coverUrl: t.cover_url,
            audioUrl: t.audio_url,
            genre: t.genre || [],
            likes: [], plays: 0, createdAt: t.created_at, isFeatured: false, isVerified: false, rankingScore: 0, isAI: false,
          })) });
        }

        return NextResponse.json({ tracks: combined });
      } catch (e) {
        console.error('ranking: fallback track_events error', e);
        // En dernier recours
        return NextResponse.json({ tracks: [] });
      }
    }

    // Séparer pistes normales et IA
    const normalIds = filteredStats.filter((r: any) => !r.is_ai_track).map((r: any) => r.track_id);
    const aiIds = filteredStats.filter((r: any) => r.is_ai_track).map((r: any) => r.track_id);

    // Récupérer métadonnées pour pistes normales
    let normalTracks: any[] = [];
    if (normalIds.length) {
      const { data, error } = await supabaseAdmin
        .from('tracks')
        .select(`
          id, title, creator_id, created_at, is_public, cover_url, audio_url, duration, genre, lyrics, plays,
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
      const rawAiIds = aiIds.map((id: any) => (String(id).startsWith('ai-') ? String(id).slice(3) : id));
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

    const statsMap = new Map<string, any>(filteredStats.map((r: any) => [r.track_id, r]));

    // Charger les boosts actifs pour les pistes normales
    const activeBoostsMap = new Map<string, number>();
    try {
      const trackIdsForBoost = normalTracks.map((t: any) => t.id);
      if (trackIdsForBoost.length > 0) {
        const { data: activeBoosts, error: boostErr } = await supabaseAdmin
          .from('active_track_boosts')
          .select('track_id, multiplier, expires_at')
          .in('track_id', trackIdsForBoost)
          .gt('expires_at', new Date().toISOString());
        if (!boostErr && Array.isArray(activeBoosts)) {
          for (const b of activeBoosts) {
            const current = activeBoostsMap.get(b.track_id) || 1;
            const next = Math.max(current, Number(b.multiplier) || 1);
            activeBoostsMap.set(b.track_id, next);
          }
        }
      }
    } catch (e) {
      // Ne pas bloquer le feed si l'appel échoue
    }

    // Scoring + formatage pour pistes normales
    const scoredNormal = normalTracks.map((t) => {
      const r = statsMap.get(t.id);
      const created = t?.created_at ? new Date(t.created_at).getTime() : now;
      const ageHours = (now - created) / 3_600_000;
      let score = computeRankingScore({
        plays_30d: r?.plays_30d || 0,
        completes_30d: r?.completes_30d || 0,
        likes_30d: r?.likes_30d || 0,
        shares_30d: r?.shares_30d || 0,
        favorites_30d: r?.favorites_30d || 0,
        listen_ms_30d: r?.listen_ms_30d || 0,
        unique_listeners_30d: r?.unique_listeners_30d || 0,
        retention_complete_rate_30d: r?.retention_complete_rate_30d || 0,
      }, ageHours, 0);
      // Appliquer boost actif (plafonné à x1.3)
      const boost = activeBoostsMap.get(t.id) || 1;
      const capped = Math.min(boost, 1.3);
      score = score * capped;
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
        lyrics: t.lyrics || null,
        likes: [],
        plays: t.plays || 0,
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


