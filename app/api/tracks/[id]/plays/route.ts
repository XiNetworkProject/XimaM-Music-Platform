import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({ 
        plays: 0, 
        message: 'Radio - pas de lectures à compter' 
      });
    }

    // Récupérer le nombre de lectures de la piste
    const { data: track, error } = await supabaseAdmin
      .from('tracks')
      .select('plays')
      .eq('id', trackId)
      .single();

    if (error) {
      console.error('❌ Erreur Supabase plays GET:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des lectures' },
        { status: 500 }
      );
    }

    if (!track) {
      return NextResponse.json(
        { error: 'Piste non trouvée' },
        { status: 404 }
      );
    }

    console.log(`✅ Lectures récupérées pour la piste ${trackId}: ${track.plays || 0}`);
    return NextResponse.json({ plays: track.plays || 0 });

  } catch (error) {
    console.error('❌ Erreur serveur plays GET:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({ 
        plays: 0, 
        message: 'Radio - pas de mise à jour des lectures' 
      });
    }

    // Incrémenter le nombre de lectures de la piste
    const { data: track, error } = await supabaseAdmin
      .from('tracks')
      .select('plays')
      .eq('id', trackId)
      .single();

    if (error) {
      console.error('❌ Erreur Supabase plays POST:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la piste' },
        { status: 500 }
      );
    }

    if (!track) {
      return NextResponse.json(
        { error: 'Piste non trouvée' },
        { status: 404 }
      );
    }

    const newPlays = (track.plays || 0) + 1;

    // Mettre à jour le nombre de lectures
    const { error: updateError } = await supabaseAdmin
      .from('tracks')
      .update({ plays: newPlays })
      .eq('id', trackId);

    if (updateError) {
      console.error('❌ Erreur Supabase plays update:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des lectures' },
        { status: 500 }
      );
    }

    console.log(`✅ Lectures incrémentées pour la piste ${trackId}: ${newPlays}`);
    return NextResponse.json({ plays: newPlays });

  } catch (error) {
    console.error('❌ Erreur serveur plays POST:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
