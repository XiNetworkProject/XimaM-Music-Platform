import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Piste IA non trouvée' }, { status: 404 });
    }

    const formatted = {
      _id: `ai-${data.id}`,
      title: data.title || 'Titre inconnu',
      artist: {
        _id: data.user_id || 'ai',
        name: data.artist_name || data.username || 'Synaura IA',
        username: data.username || 'synaura-ia',
        avatar: data.artist_avatar || null,
      },
      audioUrl: data.audio_url,
      coverUrl: data.image_url || data.cover_url || null,
      duration: data.duration || 0,
      likes: [],
      comments: [],
      plays: data.play_count || 0,
      genre: [],
      isLiked: false,
    };

    return NextResponse.json(formatted);
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


