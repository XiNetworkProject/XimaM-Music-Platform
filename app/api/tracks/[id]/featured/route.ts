import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { dbAdmin } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;
    const { isFeatured, featuredBanner } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID de track requis' }, { status: 400 });
    }

    console.log(`🌟 Mise en vedette track: ${id}, featured: ${isFeatured}`);

    // Vérifier que l'utilisateur est le propriétaire de la track
    const { data: track, error: trackError } = await dbAdmin
      .from('tracks')
      .select('id, creator_id')
      .eq('id', id)
      .single();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    if (track.creator_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Mettre à jour le statut en vedette
    const { data: updatedTrack, error: updateError } = await dbAdmin
      .from('tracks')
      .update({
        is_featured: isFeatured,
        featured_banner: featuredBanner || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour featured:', {
        id,
        updateError: updateError.message || updateError,
        updateData: {
          is_featured: isFeatured,
          featured_banner: featuredBanner || null,
          updated_at: new Date().toISOString()
        }
      });
      return NextResponse.json({ 
        error: `Erreur lors de la mise à jour: ${updateError.message || updateError}` 
      }, { status: 500 });
    }

    console.log(`✅ Track ${isFeatured ? 'mise en vedette' : 'retirée de la vedette'}: ${id}`);
    
    return NextResponse.json({ 
      success: true, 
      track: {
        ...updatedTrack,
        id: updatedTrack.id,
        is_featured: updatedTrack.is_featured,
        featuredBanner: updatedTrack.featured_banner
      }
    });

  } catch (error) {
    console.error('❌ Erreur featured track:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
