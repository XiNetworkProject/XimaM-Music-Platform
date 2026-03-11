import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bulletinId = params.id;

    const { data: bulletin, error: fetchError } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('id, share_count')
      .eq('id', bulletinId)
      .single();

    if (fetchError || !bulletin) {
      return NextResponse.json({ error: 'Bulletin introuvable' }, { status: 404 });
    }

    const newCount = (bulletin.share_count || 0) + 1;

    const { error: updateError } = await supabaseAdmin
      .from('meteo_bulletins')
      .update({ share_count: newCount })
      .eq('id', bulletinId);

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du compteur', details: updateError.message }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await supabaseAdmin
        .from('meteo_reactions')
        .upsert(
          {
            bulletin_id: bulletinId,
            user_id: session.user.id,
            type: 'share',
          },
          { onConflict: 'bulletin_id,user_id,type' }
        );
    }

    return NextResponse.json({ shareCount: newCount });
  } catch (error) {
    console.error('Erreur API meteo/bulletin/[id]/share POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
