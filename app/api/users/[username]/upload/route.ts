import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;

    if (!username) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur requis' },
        { status: 400 }
      );
    }

    console.log(`📤 Upload pour l'utilisateur: ${username}`);

    // Vérifier que l'utilisateur existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      console.log(`❌ Utilisateur non trouvé: ${username}`);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier le type de contenu
    const contentType = request.headers.get('content-type');
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Type de contenu invalide. Utilisez multipart/form-data' },
        { status: 400 }
      );
    }

    // Récupérer les données du formulaire
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const genre = formData.get('genre') as string;
    const isPublic = formData.get('isPublic') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    console.log(`📁 Fichier reçu: ${file.name} (${file.size} bytes)`);
    console.log(`📝 Titre: ${title}`);
    console.log(`🎵 Genre: ${genre}`);

    // Vérifier la taille du fichier (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximum: 50MB' },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier (audio)
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/flac',
      'audio/ogg',
      'audio/aac',
      'audio/m4a'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez un fichier audio' },
        { status: 400 }
      );
    }

    try {
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${username}_${timestamp}.${fileExtension}`;
      const filePath = `uploads/${username}/${fileName}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erreur upload Supabase:', uploadError);
        return NextResponse.json(
          { error: 'Erreur lors de l\'upload du fichier' },
          { status: 500 }
        );
      }

      // Obtenir l'URL publique du fichier
      const { data: urlData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath);

      // Créer l'entrée dans la table tracks
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .insert({
          title: title || file.name,
          description: description || '',
          genre: genre ? [genre] : [],
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          duration: 0, // À calculer plus tard
          user_id: profile.id,
          is_public: isPublic,
          plays: 0,
          likes: 0
        })
        .select()
        .single();

      if (trackError) {
        console.error('❌ Erreur création track:', trackError);
        return NextResponse.json(
          { error: 'Erreur lors de la création de la piste' },
          { status: 500 }
        );
      }

      console.log(`✅ Upload réussi pour: ${username}`);
      console.log(`🎵 Track créée: ${trackData.id}`);

      return NextResponse.json({
        success: true,
        message: 'Fichier uploadé avec succès',
        track: {
          id: trackData.id,
          title: trackData.title,
          file_url: trackData.file_url,
          created_at: trackData.created_at
        }
      });

    } catch (uploadError) {
      console.error('❌ Erreur lors de l\'upload:', uploadError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Erreur générale upload:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;

    if (!username) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur requis' },
        { status: 400 }
      );
    }

    console.log(`📋 Récupération des uploads pour: ${username}`);

    // Vérifier que l'utilisateur existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les tracks de l'utilisateur
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false });

    if (tracksError) {
      console.error('❌ Erreur récupération tracks:', tracksError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des pistes' },
        { status: 500 }
      );
    }

    console.log(`✅ ${tracks?.length || 0} tracks trouvées pour ${username}`);

    return NextResponse.json({
      success: true,
      tracks: tracks || [],
      count: tracks?.length || 0
    });

  } catch (error) {
    console.error('❌ Erreur récupération uploads:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
