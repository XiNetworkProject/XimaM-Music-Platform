import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readTrackData(value: any): Record<string, any> {
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

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
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

    const tracks = (data || []).map((t) => {
      const trackData = readTrackData((t as any).data);
      return {
        id: t.id,
        title: t.title,
        coverUrl: t.cover_url,
        coverVideoUrl: (t as any).cover_video_url || trackData.cover_video_url || trackData.coverVideoUrl || null,
        coverVideoPosterUrl: (t as any).cover_video_poster_url || trackData.cover_video_poster_url || trackData.coverVideoPosterUrl || null,
        audioUrl: t.audio_url,
        duration: t.duration,
        createdAt: t.created_at,
        lyrics: (t as any).lyrics || null,
      };
    });

    return NextResponse.json({ tracks });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


