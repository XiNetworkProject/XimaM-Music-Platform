import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { generateUploadSignature } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { username } = params;
    if (!username) {
      return NextResponse.json({ error: 'Nom d\'utilisateur requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe et que c'est bien son profil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Vérifier que l'utilisateur modifie son propre profil
    if (profile.id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { timestamp, publicId, type } = body;

    if (!timestamp || !publicId || !type) {
      return NextResponse.json({ error: 'timestamp, publicId et type requis' }, { status: 400 });
    }

    if (!['avatar', 'banner'].includes(type)) {
      return NextResponse.json({ error: 'Type doit être avatar ou banner' }, { status: 400 });
    }

    // Générer la signature Cloudinary
    const signature = generateUploadSignature({
      timestamp,
      publicId,
      folder: `ximam/profiles/${username}`,
      resourceType: 'image'
    });

    return NextResponse.json({
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });

  } catch (error: any) {
    console.error('Erreur upload image profil:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
