import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('tracks')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Erreur récupération pistes' }, { status: 500 });
    }

    const tracks = (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      coverUrl: t.cover_url,
      coverVideoUrl: (t as any).cover_video_url || (t as any).data?.cover_video_url || null,
      coverVideoPosterUrl: (t as any).cover_video_poster_url || (t as any).data?.cover_video_poster_url || null,
      audioUrl: t.audio_url,
      duration: t.duration,
      createdAt: t.created_at,
      lyrics: (t as any).lyrics || null,
    }));

    return NextResponse.json({ tracks });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


