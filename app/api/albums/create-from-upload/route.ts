import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { albumName, coverUrl, coverPublicId } = await request.json();
    if (!albumName || typeof albumName !== 'string') {
      return NextResponse.json({ error: 'Nom d\'album requis' }, { status: 400 });
    }

    const albumId = `album_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const { error } = await supabaseAdmin.from('albums').insert({
      id: albumId,
      title: albumName,
      cover_url: coverUrl || null,
      cover_public_id: coverPublicId || null,
      creator_id: session.user.id,
      is_public: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, albumId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}


