import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getEntitlements } from '@/lib/entitlements';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Récupérer les playlists d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        *,
        tracks:playlist_tracks(
          track_id,
          tracks(*)
        )
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des playlists' }, { status: 500 });
    }

    // Formater les données
    const formattedPlaylists = playlists?.map(playlist => ({
      _id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      coverUrl: playlist.cover_url,
      trackCount: playlist.tracks?.length || 0,
      duration: playlist.tracks?.reduce((total: number, pt: any) => total + (pt.tracks?.duration || 0), 0) || 0,
      isPublic: playlist.is_public,
      tracks: playlist.tracks?.map((pt: any) => pt.tracks).filter(Boolean) || [],
      createdBy: playlist.created_by,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
      likes: playlist.likes || [],
      followers: playlist.followers || []
    })) || [];

    return NextResponse.json({ 
      playlists: formattedPlaylists,
      total: formattedPlaylists.length 
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Créer une nouvelle playlist
export async function POST(request: NextRequest) {
  try {
    const { name, description, isPublic } = await request.json();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nom de playlist requis' }, { status: 400 });
    }

    // Appliquer quota playlists
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.user.id)
      .maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const ent = getEntitlements(plan);
    if (ent.uploads.maxPlaylists > -1) {
      const { count } = await supabase
        .from('playlists')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', session.user.id);
      if ((count || 0) >= ent.uploads.maxPlaylists) {
        return NextResponse.json({ error: `Quota playlists atteint: ${ent.uploads.maxPlaylists}` }, { status: 403 });
      }
    }

    const userId = session.user.id;
    
    console.log('🎵 Création de playlist:', { name, description, isPublic, userId });

    console.log('🔍 Tentative d\'insertion dans Supabase...');
    
    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        is_public: isPublic !== false,
        created_by: userId,
        cover_url: null,
        likes: [],
        followers: []
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de la playlist',
        details: error.message 
      }, { status: 500 });
    }
    
    console.log('✅ Playlist créée avec succès:', playlist);

    const formattedPlaylist = {
      _id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.cover_url,
      trackCount: 0,
      duration: 0,
      isPublic: playlist.is_public,
      tracks: [],
      createdBy: playlist.created_by,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
      likes: playlist.likes || [],
      followers: playlist.followers || []
    };

    return NextResponse.json(formattedPlaylist, { status: 201 });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
