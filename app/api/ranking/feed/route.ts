import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { computeRankingScore } from '@/lib/ranking';
import { buildAnonymousRecommendationSignals, buildUserRecommendationSignals, rerankTracks } from '@/lib/recommendation';
import { getApiSession } from '@/lib/getApiSession';
import { remixPermissionsFromRow } from '@/lib/remixPermissions';
import { getPublishedVariationCounts, getRemixAttributionForChildren, normalizeRemixTrackRef } from '@/lib/remixServer';
import { applyPublicAiTrackFilter, applyPublicTrackFilter } from '@/lib/publicTracks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Jitter déterministe : même userId + trackId → même valeur, différente entre users.
 * Permet de différencier l'ordre des tracks entre comptes sans historique.
 * Retourne une valeur entre -0.20 et +0.20 (±20% du score).
 */
function userTrackJitter(userId: string, trackId: string): number {
  const key = `${userId}\x00${trackId}`;
  let h = 2166136261; // FNV-1a 32bit
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return ((h % 1000) / 1000) * 0.40 - 0.20; // [-0.20, +0.20]
}

function diversifyConsecutiveArtists(tracks: any[], maxConsecutive = 3): any[] {
  if (tracks.length <= maxConsecutive) return tracks;
  const result: any[] = [];
  const deferred: any[] = [];
  for (const track of tracks) {
    const artistId = track.artist?._id;
    let consecutive = 0;
    for (let i = result.length - 1; i >= 0 && i >= result.length - maxConsecutive; i--) {
      if (result[i].artist?._id === artistId) consecutive++;
      else break;
    }
    if (consecutive >= maxConsecutive) {
      deferred.push(track);
    } else {
      result.push(track);
    }
  }
  for (const track of deferred) {
    let inserted = false;
    for (let i = maxConsecutive; i < result.length; i++) {
      const artistId = track.artist?._id;
      let safe = true;
      for (let j = Math.max(0, i - maxConsecutive + 1); j < i; j++) {
        if (result[j].artist?._id === artistId) { safe = false; break; }
      }
      if (safe) { result.splice(i, 0, track); inserted = true; break; }
    }
    if (!inserted) result.push(track);
  }
  return result;
}

function readJsonObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalTrackVideoMeta(track: any) {
  const data = readJsonObject(track?.data);
  return {
    coverVideoUrl: track?.cover_video_url || data.cover_video_url || data.coverVideoUrl || null,
    coverVideoPosterUrl: track?.cover_video_poster_url || data.cover_video_poster_url || data.coverVideoPosterUrl || track?.cover_url || null,
    visualUrl: data.visual_url || data.visualUrl || null,
    visualType: data.visual_type || data.visualType || null,
    dominantColors: Array.isArray(data.dominant_colors) ? data.dominant_colors : Array.isArray(data.dominantColors) ? data.dominantColors : [],
    auraVisualEnabled: data.aura_visual_enabled !== false && data.auraVisualEnabled !== false,
  };
}

function aiTrackVideoMeta(track: any) {
  const sourceLinks = readJsonObject(track?.source_links);
  return {
    coverVideoUrl: null,
    coverVideoPosterUrl: track?.cover_video_poster_url || sourceLinks.cover_video_poster_url || sourceLinks.coverVideoPosterUrl || track?.image_url || null,
    musicVideoUrl: track?.music_video_url || sourceLinks.music_video_url || sourceLinks.musicVideoUrl || track?.cover_video_url || sourceLinks.cover_video_url || sourceLinks.coverVideoUrl || null,
    musicVideoPosterUrl: track?.music_video_poster_url || sourceLinks.music_video_poster_url || sourceLinks.musicVideoPosterUrl || track?.cover_video_poster_url || sourceLinks.cover_video_poster_url || sourceLinks.coverVideoPosterUrl || track?.image_url || null,
    visualUrl: sourceLinks.visual_url || sourceLinks.visualUrl || null,
    visualType: sourceLinks.visual_type || sourceLinks.visualType || null,
    dominantColors: Array.isArray(sourceLinks.dominant_colors) ? sourceLinks.dominant_colors : Array.isArray(sourceLinks.dominantColors) ? sourceLinks.dominantColors : [],
    auraVisualEnabled: sourceLinks.aura_visual_enabled !== false && sourceLinks.auraVisualEnabled !== false,
  };
}

async function enrichRemixFeedFields(tracks: any[], userId: string | null) {
  if (!tracks.length) return tracks;
  const artistIds = Array.from(new Set(tracks.map((track) => String(track.artist?._id || '')).filter(Boolean)));
  const following = new Set<string>();
  if (userId && artistIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
      .in('following_id', artistIds);
    (data || []).forEach((row: any) => row.following_id && following.add(String(row.following_id)));
  }

  const refs = tracks.map((track) => normalizeRemixTrackRef(String(track._id || '')));
  const [attributions, counts] = await Promise.all([
    getRemixAttributionForChildren(refs),
    getPublishedVariationCounts(refs),
  ]);

  return tracks.map((track) => {
    const ref = normalizeRemixTrackRef(String(track._id || ''));
    const creatorId = String(track.artist?._id || '');
    const visibility = track.remixVisibility || 'disabled';
    const canRemixAiVariation = Boolean(
      track.allowAiVariation &&
      visibility !== 'disabled' &&
      (visibility === 'everyone' || (userId && creatorId === userId) || following.has(creatorId)),
    );
    return {
      ...track,
      canRemixAiVariation,
      remixAttribution: attributions.get(`${ref.type}:${ref.id}`) || null,
      variationsCount: counts.get(`${ref.type}:${ref.id}`) || 0,
    };
  });
}

async function applyGlobalTrendingScores(tracks: any[], now: number) {
  if (!tracks.length) return tracks;
  const ids = tracks.map((track: any) => String(track._id || '')).filter((id: string) => id && !id.startsWith('ai-'));
  if (!ids.length) return tracks;

  const since72h = new Date(now - 72 * 60 * 60 * 1000).toISOString();
  const since6hMs = now - 6 * 60 * 60 * 1000;
  const momentum = new Map<string, { score: number; last: number; users: Set<string> }>();

  try {
    const { data: events } = await supabaseAdmin
      .from('track_events')
      .select('track_id, event_type, created_at, user_id, session_id')
      .in('track_id', ids.slice(0, 500))
      .gte('created_at', since72h)
      .in('event_type', ['view', 'play_start', 'play_complete', 'like', 'favorite', 'share'])
      .limit(5000);

    for (const event of events || []) {
      const trackId = String(event.track_id || '');
      if (!trackId) continue;
      const created = event.created_at ? new Date(event.created_at).getTime() : now;
      const ageHours = Math.max(0.25, (now - created) / 3_600_000);
      const recentBoost = created >= since6hMs ? 1.65 : 1;
      const decay = Math.exp(-ageHours * Math.LN2 / 24);
      const weights: Record<string, number> = {
        view: 0.35,
        play_start: 1.2,
        play_complete: 2.6,
        like: 3.2,
        favorite: 3.8,
        share: 4.4,
      };
      const current = momentum.get(trackId) || { score: 0, last: 0, users: new Set<string>() };
      current.score += (weights[event.event_type] || 0.5) * decay * recentBoost;
      current.last = Math.max(current.last, created);
      const actor = String(event.user_id || event.session_id || '');
      if (actor) current.users.add(actor);
      momentum.set(trackId, current);
    }
  } catch (error) {
    console.error('ranking: global trending events failed', error);
  }

  return tracks
    .map((track: any, index: number) => {
      const current = momentum.get(String(track._id));
      const ageHours = track.createdAt ? Math.max(1, (now - new Date(track.createdAt).getTime()) / 3_600_000) : 72;
      const freshness = 4 * Math.exp(-ageHours * Math.LN2 / 48);
      const crowd = current ? Math.log10(current.users.size + 1) * 7 : 0;
      const base = Number(track.rankingScore || 0) * 0.32;
      const score = base + (current?.score || 0) + crowd + freshness - index * 0.002;
      return {
        ...track,
        rankingScore: Number(score.toFixed(6)),
        recommendationScore: Number(score.toFixed(6)),
        recommendationReasons: current ? ['global_performance', 'social_engagement'] : ['fresh'],
        recommendationDebug: {
          globalTrend: Number((current?.score || 0).toFixed(3)),
          uniqueActors: current?.users.size || 0,
          freshness: Number(freshness.toFixed(3)),
        },
      };
    })
    .sort((a: any, b: any) => (b.rankingScore || 0) - (a.rankingScore || 0));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 200);
    const includeAi = searchParams.get('ai') === '1';
    const cursor = Math.max(0, parseInt(searchParams.get('cursor') || '0', 10) || 0);
    const strategy = (searchParams.get('strategy') || 'reco').toLowerCase(); // reco | trending
    const genreFilter = searchParams.get('genre')?.trim().toLowerCase() || null;
    const debug = searchParams.get('debug') === '1';
    
    // Récupérer l'utilisateur connecté (session cookie > fallback query param)
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || searchParams.get('userId') || null;

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
            *,
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
              ...normalTrackVideoMeta(t),
              audioUrl: t.audio_url,
              album: t.album || null,
              genre: t.genre || [],
              likes: [],
              plays: t.plays || 0,
              createdAt: t.created_at,
              isFeatured: false,
              isVerified: t.profiles?.is_verified || false,
              rankingScore: 0,
              isAI: false,
              ...remixPermissionsFromRow(t),
            }))
          );
        }

        if (includeAi) {
          const { data: recentAI, error: recentAIErr } = await applyPublicAiTrackFilter(supabaseAdmin
            .from('ai_tracks')
            .select(`
              *,
              generation:ai_generations!inner (
                user_id, is_public, status
              )
            `))
            .order('created_at', { ascending: false })
            .limit(limitFallback);

          if (!recentAIErr && Array.isArray(recentAI)) {
            let recentAIWithProfiles = recentAI;
            if (recentAI.length > 0) {
              const userIds = Array.from(new Set(recentAI.map((t: any) => t.generation?.user_id).filter(Boolean)));
              if (userIds.length > 0) {
                const { data: profiles } = await supabaseAdmin
                  .from('profiles')
                  .select('id, username, name, avatar, is_verified')
                  .in('id', userIds);
                
                const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
                
                recentAIWithProfiles = recentAI.map(t => ({
                  ...t,
                  generation: {
                    ...t.generation,
                    profiles: profilesMap.get((t as any).generation?.user_id)
                  }
                }));
              }
            }
            
            results.push(
              ...recentAIWithProfiles.map((t: any) => ({
                _id: `ai-${t.id}`,
                title: t.title || 'Titre IA',
                artist: {
                  _id: t.generation?.user_id,
                  username: t.generation?.profiles?.username,
                  name: t.generation?.profiles?.name || t.generation?.profiles?.username,
                  avatar: t.generation?.profiles?.avatar,
                  isArtist: true,
                  artistName: t.generation?.profiles?.name || t.generation?.profiles?.username,
                },
                duration: t.duration || 0,
                coverUrl: t.image_url || '/default-cover.svg',
                ...aiTrackVideoMeta(t),
                audioUrl: t.audio_url,
                genre: Array.isArray(t.tags) ? t.tags : [],
                likes: [],
                plays: t.play_count || 0,
                createdAt: t.created_at,
                isFeatured: false,
                isVerified: t.generation?.profiles?.is_verified || false,
                rankingScore: 0,
                isAI: true,
                ...remixPermissionsFromRow(t),
              }))
            );
          }
        }

        const finalAll = results;
        const final = finalAll.slice(cursor, cursor + limitFallback);
        if (final.length) {
          // Diversifier l'ordre pour Trending (et éviter de mimer "nouveautés")
          final.sort(() => Math.random() - 0.5);
        }
        const nextCursor = cursor + final.length;
        return NextResponse.json({ tracks: await enrichRemixFeedFields(final, userId), nextCursor, hasMore: nextCursor < finalAll.length });
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
              *,
              profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
            `)
            .in('id', normalIds)
            .eq('is_public', true);
          normalTracks = data || [];
        }

        let aiTracks: any[] = [];
        if (includeAi && aiIds.length) {
          const { data } = await applyPublicAiTrackFilter(supabaseAdmin
            .from('ai_tracks')
            .select(`
              *,
              generation:ai_generations!inner (
                user_id, is_public, status
              )
            `)
            .in('id', aiIds as any));
          aiTracks = (data || []).map((t: any) => ({ ...t, _aiPrefixedId: `ai-${t.id}` }));
          
          if (aiTracks.length > 0) {
            const userIds = Array.from(new Set(aiTracks.map(t => t.generation?.user_id).filter(Boolean)));
            if (userIds.length > 0) {
              const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, username, name, avatar, is_verified')
                .in('id', userIds);
              
              const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
              
              aiTracks = aiTracks.map(t => ({
                ...t,
                generation: {
                  ...t.generation,
                  profiles: profilesMap.get((t as any).generation?.user_id)
                }
              }));
            }
          }
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
            ...normalTrackVideoMeta(t),
            audioUrl: t.audio_url,
            album: t.album || null,
            genre: t.genre || [],
            likes: [],
            plays: t.plays || 0,
            createdAt: t.created_at,
            isFeatured: false,
            isVerified: t.profiles?.is_verified || false,
            rankingScore: Number(score.toFixed(6)),
            isAI: false,
            ...remixPermissionsFromRow(t),
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
              _id: t.generation?.user_id,
              username: t.generation?.profiles?.username,
              name: t.generation?.profiles?.name || t.generation?.profiles?.username,
              avatar: t.generation?.profiles?.avatar,
              isArtist: true,
              artistName: t.generation?.profiles?.name || t.generation?.profiles?.username,
            },
            duration: t.duration || 0,
            coverUrl: t.image_url || '/default-cover.svg',
            ...aiTrackVideoMeta(t),
            audioUrl: t.audio_url,
            genre: Array.isArray(t.tags) ? t.tags : [],
            likes: [],
            plays: t.play_count || 0,
            createdAt: t.created_at,
            isFeatured: false,
            isVerified: t.generation?.profiles?.is_verified || false,
            rankingScore: Number(score.toFixed(6)),
            isAI: true,
            ...remixPermissionsFromRow(t),
          };
        });

        // Récupérer les likes de l'utilisateur pour les tracks normales
        let likedTrackIds = new Set<string>();
        if (userId && normalIds.length) {
          const { data: likes } = await supabaseAdmin
            .from('track_likes')
            .select('track_id')
            .eq('user_id', userId)
            .in('track_id', normalIds);
          
          if (likes) {
            likes.forEach((like: any) => likedTrackIds.add(like.track_id));
          }
        }

        // Ajouter isLiked aux tracks normales
        scoredNormal.forEach((track: any) => {
          track.isLiked = likedTrackIds.has(track._id);
        });

        // Pour les tracks IA, on ne gère pas les likes pour le moment
        scoredAI.forEach((track: any) => {
          track.isLiked = false;
        });

        const combinedAll = [...scoredNormal, ...(includeAi ? scoredAI : [])].sort(
          (a, b) => (b.rankingScore || 0) - (a.rankingScore || 0)
        );
        const combined = combinedAll.slice(cursor, cursor + limit);

        // Si toujours vide, fallback 2: récents publics
        if (!combined.length) {
          const { data: recentTracks } = await supabaseAdmin
            .from('tracks')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(limit);
          const recentFallback = (recentTracks || []).map((t: any) => ({
            _id: t.id,
            title: t.title,
            artist: { _id: t.creator_id, username: '', name: '', avatar: '', isArtist: false, artistName: '' },
            duration: t.duration || 0,
            coverUrl: t.cover_url,
            ...normalTrackVideoMeta(t),
            audioUrl: t.audio_url,
            genre: t.genre || [],
            likes: [], plays: 0, createdAt: t.created_at, isFeatured: false, isVerified: false, rankingScore: 0, isAI: false,
            ...remixPermissionsFromRow(t),
          }));
          return NextResponse.json({ tracks: await enrichRemixFeedFields(recentFallback, userId) });
        }

        const nextCursor = cursor + combined.length;
        return NextResponse.json({ tracks: await enrichRemixFeedFields(combined, userId), nextCursor, hasMore: nextCursor < combinedAll.length });
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
      const { data, error } = await applyPublicTrackFilter(supabaseAdmin
        .from('tracks')
        .select(`
          *,
          profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
        `)
        .in('id', normalIds));
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
        const { data, error } = await applyPublicAiTrackFilter(supabaseAdmin
          .from('ai_tracks')
          .select(`
            *,
            generation:ai_generations!inner (
              user_id, is_public, status
            )
          `)
          .in('id', rawAiIds));
      if (error) {
        console.error('ranking: erreur ai_tracks meta', error);
      } else {
        aiTracks = (data || []).map((t: any) => ({ ...t, _aiPrefixedId: `ai-${t.id}` }));
        
        // Récupérer les profils séparément et les associer
        if (aiTracks.length > 0) {
          const userIds = Array.from(new Set(aiTracks.map(t => t.generation?.user_id).filter(Boolean)));
          if (userIds.length > 0) {
            const { data: profiles } = await supabaseAdmin
              .from('profiles')
              .select('id, username, name, avatar, is_verified')
              .in('id', userIds);
            
            const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
            
            // Associer les profils aux tracks
            aiTracks = aiTracks.map(t => ({
              ...t,
              generation: {
                ...t.generation,
                profiles: profilesMap.get(t.generation?.user_id)
              }
            }));
          }
        }
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

    // Récupérer les likes de l'utilisateur pour les tracks normales
    let likedTrackIds = new Set<string>();
    if (userId && normalIds.length) {
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', userId)
        .in('track_id', normalIds);
      
      if (likes) {
        likes.forEach((like: any) => likedTrackIds.add(like.track_id));
      }
    }

    // Scoring + formatage pour pistes normales
    let scoredNormal = normalTracks.map((t) => {
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
      // Appliquer boost actif (plafonné à x2.5)
      const boost = activeBoostsMap.get(t.id) || 1;
      const capped = Math.min(boost, 2.5);
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
        ...normalTrackVideoMeta(t),
        audioUrl: t.audio_url,
        album: t.album || null,
        genre: t.genre || [],
        lyrics: t.lyrics || null,
        likes: [],
        plays: t.plays || 0,
        createdAt: t.created_at,
        isFeatured: false,
        isVerified: t.profiles?.is_verified || false,
        rankingScore: score,
        isAI: false,
        ...remixPermissionsFromRow(t),
        isLiked: likedTrackIds.has(t.id),
        isBoosted: capped > 1,
        boostMultiplier: capped > 1 ? capped : undefined,
      };
    });

    // Personnalisation simple (si user connecté + strategy=reco)
    if (userId && strategy !== 'trending') {
      try {
        // 1) Suivis => boost des artistes suivis
        const { data: follows } = await supabaseAdmin
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId)
          .limit(500);
        const followingIds = new Set<string>((follows || []).map((f: any) => f.following_id).filter(Boolean));

        // 2) Historique récent => éviter la répétition immédiate + extra signaux
        const sinceIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentEvents } = await supabaseAdmin
          .from('track_events')
          .select('track_id, event_type, created_at')
          .eq('user_id', userId)
          .gte('created_at', sinceIso)
          .in('event_type', ['play_start', 'play_complete', 'favorite', 'like', 'skip'])
          .order('created_at', { ascending: false })
          .limit(500);
        const recentTrackIds = (recentEvents || []).map((e: any) => String(e.track_id)).filter(Boolean);
        const avoid = new Set<string>(recentTrackIds.slice(0, 50));

        // 2b) Signal de skip — tracks skippées = pénalité forte
        const skippedIds = new Set<string>();
        const startedIds = new Map<string, number>();
        const completedIds = new Set<string>();
        for (const ev of recentEvents || []) {
          const tid = String(ev.track_id);
          if (ev.event_type === 'play_start') startedIds.set(tid, (startedIds.get(tid) || 0) + 1);
          if (ev.event_type === 'play_complete') completedIds.add(tid);
          if (ev.event_type === 'skip') skippedIds.add(tid);
        }
        // Tracks started but never completed and not liked = implicit skip
        startedIds.forEach((starts, tid) => {
          if (starts >= 2 && !completedIds.has(tid)) skippedIds.add(tid);
        });

        // 3) Goûts (genres) — combiner track_events ET track_likes pour couvrir les deux sources
        const eventLikedIds = new Set(
          (recentEvents || [])
            .filter((e: any) => e.event_type === 'like' || e.event_type === 'favorite' || e.event_type === 'play_complete')
            .map((e: any) => String(e.track_id))
        );

        // Récupérer aussi les likes directs (table track_likes) — plus fiable que les events
        const { data: directLikes } = await supabaseAdmin
          .from('track_likes')
          .select('track_id')
          .eq('user_id', userId)
          .limit(200);
        for (const l of directLikes || []) {
          if (l.track_id) eventLikedIds.add(String(l.track_id));
        }

        const likedOrCompleted = Array.from(eventLikedIds)
          .filter((id) => id && !id.startsWith('ai-'))
          .slice(0, 120);

        let preferredGenres: string[] = [];
        if (likedOrCompleted.length) {
          const { data: tasteTracks } = await supabaseAdmin
            .from('tracks')
            .select('id, genre')
            .in('id', likedOrCompleted as any)
            .limit(80);
          const freq = new Map<string, number>();
          for (const t of tasteTracks || []) {
            const g = (t as any)?.genre;
            const arr = Array.isArray(g) ? g : typeof g === 'string' ? [g] : [];
            for (const tag of arr) {
              const k = String(tag || '').trim().toLowerCase();
              if (!k) continue;
              freq.set(k, (freq.get(k) || 0) + 1);
            }
          }
          preferredGenres = Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([k]) => k);
        }

        const listenedArtists = new Map<string, number>();
        for (const ev of (recentEvents || []).filter((e: any) => e.event_type === 'play_start' || e.event_type === 'play_complete')) {
          const tid = String(ev.track_id);
          const matched = scoredNormal.find((t: any) => String(t._id) === tid);
          if (matched?.artist?._id) {
            listenedArtists.set(matched.artist._id, (listenedArtists.get(matched.artist._id) || 0) + 1);
          }
        }

        // 2c) Filtrage collaboratif simple : utilisateurs similaires
        const collabBoostIds = new Set<string>();
        try {
          const userLikedIds = Array.from(
            new Set((recentEvents || []).filter((e: any) => e.event_type === 'like' || e.event_type === 'favorite').map((e: any) => String(e.track_id)))
          ).filter(id => id && !id.startsWith('ai-')).slice(0, 30);

          if (userLikedIds.length >= 3) {
            const { data: otherLikers } = await supabaseAdmin
              .from('track_likes')
              .select('user_id')
              .in('track_id', userLikedIds)
              .neq('user_id', userId)
              .limit(200);

            const likerCounts = new Map<string, number>();
            for (const l of otherLikers || []) {
              likerCounts.set(l.user_id, (likerCounts.get(l.user_id) || 0) + 1);
            }
            // Users who liked at least 2 of the same tracks
            const similarUsers = Array.from(likerCounts.entries())
              .filter(([, c]) => c >= 2)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([uid]) => uid);

            if (similarUsers.length) {
              const { data: theirLikes } = await supabaseAdmin
                .from('track_likes')
                .select('track_id')
                .in('user_id', similarUsers)
                .limit(200);
              const userLikedSet = new Set(userLikedIds);
              for (const l of theirLikes || []) {
                if (!userLikedSet.has(l.track_id)) collabBoostIds.add(l.track_id);
              }
            }
          }
        } catch {}

        // 2d) Conscience temporelle — boost genres selon l'heure
        const currentHour = new Date().getHours();
        let timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
        if (currentHour >= 6 && currentHour < 12) timeSlot = 'morning';
        else if (currentHour >= 12 && currentHour < 18) timeSlot = 'afternoon';
        else if (currentHour >= 18 && currentHour < 24) timeSlot = 'evening';
        else timeSlot = 'night';

        const timeGenreBoosts: Record<string, string[]> = {
          morning: ['pop', 'indie', 'folk', 'acoustic', 'funk'],
          afternoon: ['hip-hop', 'rap', 'rock', 'electronic', 'dance'],
          evening: ['r&b', 'soul', 'jazz', 'lo-fi', 'chill'],
          night: ['ambient', 'lo-fi', 'classical', 'chill', 'downtempo'],
        };
        const timeBoostGenres = new Set(timeGenreBoosts[timeSlot] || []);

        scoredNormal = scoredNormal
          .map((t: any) => {
            let mult = 1;
            // Artistes suivis : boost massif pour que les follows aient un vrai impact
            if (followingIds.has(t.artist?._id)) mult *= 3.0;
            // Artiste souvent écouté (non suivi) : boost fort
            const artistListens = listenedArtists.get(t.artist?._id) || 0;
            if (!followingIds.has(t.artist?._id) && artistListens >= 3) mult *= 2.0;
            else if (!followingIds.has(t.artist?._id) && artistListens >= 1) mult *= 1.4;
            // Pistes récemment écoutées : pénalité pour éviter la répétition
            if (avoid.has(String(t._id))) mult *= 0.25;
            // Pistes skippées : pénalité sévère
            if (skippedIds.has(String(t._id))) mult *= 0.15;
            // Filtrage collaboratif : boost fort
            if (collabBoostIds.has(String(t._id))) mult *= 2.5;
            if (preferredGenres.length && Array.isArray(t.genre)) {
              const gset = new Set((t.genre || []).map((x: any) => String(x || '').trim().toLowerCase()).filter(Boolean));
              const overlap = preferredGenres.filter((g) => gset.has(g)).length;
              // Genre match : boost très fort pour que les goûts comptent vraiment
              if (overlap >= 2) mult *= 2.5;
              else if (overlap === 1) mult *= 1.8;
              const timeOverlap = Array.from(gset).filter(g => timeBoostGenres.has(g as string)).length;
              if (timeOverlap > 0) mult *= 1.15;
            }
            return { ...t, rankingScore: (t.rankingScore || 0) * mult };
          })
          .sort((a: any, b: any) => (b.rankingScore || 0) - (a.rankingScore || 0));
      } catch (e) {
        // silencieux: on reste sur le ranking global si algo perso échoue
      }
    }

    // Jitter déterministe par userId — différencie l'ordre entre comptes même sans historique.
    // Le jitter (±20%) est assez fort pour réordonner des tracks au score similaire
    // mais pas assez pour reléguer une track très populaire derrière une médiocre.
    if (userId) {
      scoredNormal = scoredNormal
        .map((t: any) => {
          const jitter = userTrackJitter(userId, String(t._id));
          const base = t.rankingScore || 0;
          return { ...t, rankingScore: base * (1 + jitter) };
        })
        .sort((a: any, b: any) => (b.rankingScore || 0) - (a.rankingScore || 0));
    }

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
          _id: t.generation?.user_id,
          username: t.generation?.profiles?.username,
          name: t.generation?.profiles?.name || t.generation?.profiles?.username,
          avatar: t.generation?.profiles?.avatar,
          isArtist: true,
          artistName: t.generation?.profiles?.name || t.generation?.profiles?.username,
        },
        duration: t.duration || 0,
        isLiked: false,
        coverUrl: t.image_url || '/default-cover.svg',
        ...aiTrackVideoMeta(t),
        audioUrl: t.audio_url,
        genre: Array.isArray(t.tags) ? t.tags : [],
        likes: [],
        plays: t.play_count || 0,
        createdAt: t.created_at,
        isFeatured: false,
        isVerified: t.generation?.profiles?.is_verified || false,
        rankingScore: score,
        isAI: true,
        ...remixPermissionsFromRow(t),
      };
    });

    let combinedAll = [...scoredNormal, ...scoredAI].sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));

    // Les nouvelles musiques n'ont pas toujours de ligne dans track_stats_rolling_30d.
    // On les injecte quand même dans le feed pour éviter l'effet "bloqué à 50 titres".
    try {
      const existingIds = new Set(combinedAll.map((track: any) => String(track._id)));
      const { data: freshTracks } = await supabaseAdmin
        .from('tracks')
        .select(`
          *,
          profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
        `)
        .eq('is_public', true)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);

      const freshFormatted = (freshTracks || [])
        .filter((track: any) => !existingIds.has(String(track.id)))
        .map((track: any, index: number) => {
          const ageHours = track?.created_at ? Math.max(1, (now - new Date(track.created_at).getTime()) / 3_600_000) : 24;
          const freshnessScore = 12 * Math.exp(-ageHours * Math.LN2 / 72);
          return {
            _id: track.id,
            title: track.title,
            artist: {
              _id: track.creator_id,
              username: track.profiles?.username,
              name: track.profiles?.name,
              avatar: track.profiles?.avatar,
              isArtist: track.profiles?.is_artist,
              artistName: track.profiles?.artist_name,
            },
            duration: track.duration || 0,
            coverUrl: track.cover_url,
            ...normalTrackVideoMeta(track),
            audioUrl: track.audio_url,
            album: track.album || null,
            genre: track.genre || [],
            lyrics: track.lyrics || null,
            likes: [],
            plays: track.plays || 0,
            createdAt: track.created_at,
            isFeatured: false,
            isVerified: track.profiles?.is_verified || false,
            rankingScore: freshnessScore - index * 0.01,
            isAI: false,
            ...remixPermissionsFromRow(track),
            isLiked: false,
            isBoosted: false,
            boostMultiplier: undefined,
            isFresh: true,
          };
        });

      combinedAll = [...combinedAll, ...freshFormatted].sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
    } catch (e) {
      console.error('ranking: fresh injection failed', e);
    }

    if (strategy === 'trending') {
      combinedAll = await applyGlobalTrendingScores(combinedAll, now);
    } else {
    try {
      const signals = userId
        ? await buildUserRecommendationSignals({ supabase: supabaseAdmin, userId, candidateTracks: combinedAll })
        : buildAnonymousRecommendationSignals();
      combinedAll = rerankTracks(combinedAll as any[], signals, {
        strategy: strategy === 'trending' ? 'trending' : 'reco',
        debug,
        genreFilter,
        maxConsecutiveArtists: 2,
      }) as any[];
    } catch (e) {
      console.error('ranking: recommendation engine failed', e);
    }
    }

    if (genreFilter) {
      combinedAll = combinedAll.filter((t: any) => {
        const genres = Array.isArray(t.genre) ? t.genre : t.genre ? [t.genre] : [];
        return genres.some((g: string) => String(g || '').trim().toLowerCase().includes(genreFilter));
      });
    }
    combinedAll = diversifyConsecutiveArtists(combinedAll, 3);
    const combined = combinedAll.slice(cursor, cursor + limit);
    const nextCursor = cursor + combined.length;
    return NextResponse.json(
      { tracks: await enrichRemixFeedFields(combined, userId), nextCursor, hasMore: nextCursor < combinedAll.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (error) {
    console.error('Erreur ranking feed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
