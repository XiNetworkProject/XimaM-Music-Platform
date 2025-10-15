import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { title, description, coverUrl, coverPublicId, isPublic = true, releasedAt, tracks } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    const albumId = `album_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const { error: albumErr } = await supabaseAdmin.from('albums').insert({
      id: albumId,
      title,
      description: description || null,
      cover_url: coverUrl || null,
      cover_public_id: coverPublicId || null,
      creator_id: session.user.id,
      is_public: !!isPublic,
      released_at: releasedAt ? new Date(releasedAt).toISOString() : null,
    });
    if (albumErr) return NextResponse.json({ error: albumErr.message }, { status: 500 });

    // Optionnel: associer des pistes existantes si fournies
    if (Array.isArray(tracks) && tracks.length) {
      const updates = tracks.map((t: any, idx: number) => ({ id: t.id, album_id: albumId, track_number: t.trackNumber ?? idx + 1 }));
      const { error: linkErr } = await supabaseAdmin.from('tracks').upsert(updates, { onConflict: 'id' });
      if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, albumId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const search = new URL(request.url).searchParams;
    const albumId = search.get('id');
    if (albumId) {
      const { data: album, error } = await supabaseAdmin
        .from('albums')
        .select('*, tracks:tracks(id, title, duration, cover_url, track_number)')
        .eq('id', albumId)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ album });
    }

    const { data: albums, error } = await supabaseAdmin
      .from('albums')
      .select('id, title, cover_url, created_at, released_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ albums });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}


