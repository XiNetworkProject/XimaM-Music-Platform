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
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const url = new URL(request.url);
    const idsParam = (url.searchParams.get('ids') || '').trim();
    if (!idsParam) return NextResponse.json({ tracks: [] });

    const ids = Array.from(
      new Set(
        idsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 50),
      ),
    );

    if (!ids.length) return NextResponse.json({ tracks: [] });

    const { data, error } = await supabaseAdmin
      .from('tracks')
      .select(
        `
        id,
        title,
        creator_id,
        cover_url,
        duration,
        profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar )
      `,
      )
      .in('id', ids);

    if (error) return NextResponse.json({ error: 'Erreur récupération tracks' }, { status: 500 });

    const tracks = (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      coverUrl: t.cover_url || null,
      duration: t.duration || 0,
      artist: {
        id: t.creator_id,
        username: t.profiles?.username || null,
        name: t.profiles?.name || t.profiles?.username || null,
        avatar: t.profiles?.avatar || null,
      },
    }));

    // Re-ordonner selon ids
    const order = new Map(ids.map((id, idx) => [id, idx]));
    tracks.sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

