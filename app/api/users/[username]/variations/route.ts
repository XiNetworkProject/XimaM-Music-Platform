import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { isAiTrackPublic } from '@/lib/publicTracks';

// Variations IA d'un createur, pour l'onglet "Variations" de son profil.
// Visiteurs : uniquement les variations publiees (comportement inchange).
// Proprietaire connecte : aussi son vrai statut (en attente / refusee), jamais
// expose a personne d'autre. Reutilise les regles de visibilite existantes
// (publicTracks.ts), ne modifie ni les permissions de remix ni le moteur de generation.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } },
) {
  try {
    const { username } = params;
    if (!username) {
      return NextResponse.json({ error: "Nom d'utilisateur requis" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, name, artist_name')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Utilisateur non trouve' }, { status: 404 });
    }

    const session = await getApiSession(request);
    const isOwner = Boolean(session?.user?.id) && String(session!.user.id) === String(profile.id);
    const statusFilter = isOwner ? ['published', 'pending_approval', 'rejected'] : ['published'];

    const { data: remixes, error: remixesError } = await supabaseAdmin
      .from('track_remixes')
      .select('id, child_track_id, source_track_id, source_track_type, status, created_at')
      .eq('creator_id', profile.id)
      .eq('remix_type', 'ai_variation')
      .in('status', statusFilter)
      .order('created_at', { ascending: false })
      .limit(60);

    if (remixesError) throw remixesError;

    const rows = remixes || [];
    if (!rows.length) {
      return NextResponse.json({ variations: [] });
    }

    const childIds = rows.map((row) => row.child_track_id);
    const { data: aiTracks, error: aiTracksError } = await supabaseAdmin
      .from('ai_tracks')
      .select(`
        id, title, audio_url, image_url, duration, play_count, like_count, created_at, is_public,
        generation:ai_generations!inner(id, is_public, status)
      `)
      .in('id', childIds);

    if (aiTracksError) throw aiTracksError;

    const tracksById = new Map((aiTracks || []).map((track: any) => [String(track.id), track]));

    const variations = rows
      .map((row) => {
        const track = tracksById.get(String(row.child_track_id));
        if (!track) return null;
        if (row.status === 'published') {
          // Toujours revalider la visibilite reelle, meme pour le proprietaire.
          if (!isAiTrackPublic(track)) return null;
        } else if (!isOwner) {
          // Un visiteur (ou un autre createur) ne doit jamais voir une variation
          // en attente ou refusee.
          return null;
        }
        return {
          id: `ai-${track.id}`,
          title: track.title || 'Variation IA',
          coverUrl: track.image_url || null,
          audioUrl: track.audio_url || '',
          duration: Number(track.duration || 0),
          plays: Number(track.play_count || 0),
          likes: Number(track.like_count || 0),
          createdAt: track.created_at,
          isAi: true,
          sourceTrackId: row.source_track_id,
          sourceTrackType: row.source_track_type,
          status: isOwner ? row.status : undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return NextResponse.json({ variations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Impossible de charger les variations' },
      { status: 500 },
    );
  }
}
