import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getApiSession } from '@/lib/getApiSession';
import { getMoodById, matchesMoodKeywords } from '@/lib/discoverMoods';
import { getPublicTrackPool, attachLikedFlag } from '@/lib/discoverData';
import { applyPublicAiTrackFilter } from '@/lib/publicTracks';

export const dynamic = 'force-dynamic';

// Seuil interne (jamais affiché) pour décider si l'ambiance a une vraie sélection
// à montrer, ou si on doit afficher l'état honnête "pas encore assez de morceaux".
const MIN_MOOD_TRACKS = 3;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mood = getMoodById(searchParams.get('mood'));
    const limit = Math.min(60, Math.max(6, Number(searchParams.get('limit') || 30)));
    if (!mood) return NextResponse.json({ error: 'Ambiance inconnue' }, { status: 400 });

    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    if (mood.isAiOnly) {
      const { data: aiRows, error } = await applyPublicAiTrackFilter(supabaseAdmin
        .from('ai_tracks')
        .select(`
          id, title, audio_url, image_url, duration, tags, play_count, created_at,
          generation:ai_generations!inner (id, user_id, is_public, status)
        `))
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      const playable = (aiRows || []).filter((row: any) => Boolean(row.audio_url));
      const userIds = Array.from(new Set(playable.map((row: any) => row.generation?.user_id).filter(Boolean)));
      const profiles = new Map<string, any>();
      if (userIds.length) {
        const { data } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').in('id', userIds);
        (data || []).forEach((profile: any) => profiles.set(profile.id, profile));
      }

      const tracks = playable.map((row: any) => {
        const profile = profiles.get(row.generation?.user_id) || {};
        return {
          _id: `ai-${row.id}`,
          title: row.title || 'Création IA',
          artist: {
            _id: row.generation?.user_id || 'ai',
            username: profile.username || '',
            name: profile.name || profile.username || 'Artiste Synaura',
            avatar: profile.avatar || '',
          },
          coverUrl: row.image_url || null,
          audioUrl: row.audio_url,
          duration: row.duration || 0,
          plays: row.play_count || 0,
          likes: [],
          genre: Array.isArray(row.tags) ? row.tags : [],
          createdAt: row.created_at,
          isAI: true,
          isLiked: false,
        };
      });

      return NextResponse.json({ mood: mood.id, tracks, hasEnough: tracks.length >= MIN_MOOD_TRACKS });
    }

    const pool = await getPublicTrackPool({ limit: 400, order: 'plays_desc' });
    const matched = pool.filter((track) => matchesMoodKeywords(track, mood)).slice(0, limit);

    const tracks = await attachLikedFlag(matched, userId);
    return NextResponse.json({ mood: mood.id, tracks, hasEnough: tracks.length >= MIN_MOOD_TRACKS });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
