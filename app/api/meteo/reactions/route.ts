import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getReactionCounts(bulletinId: string) {
  const { data: reactions, error } = await supabaseAdmin
    .from('meteo_reactions')
    .select('type')
    .eq('bulletin_id', bulletinId);

  const counts = { likes: 0, useful: 0, shares: 0 };
  if (error || !reactions) return counts;
  for (const r of reactions) {
    if (r.type === 'like') counts.likes++;
    else if (r.type === 'useful') counts.useful++;
    else if (r.type === 'share') counts.shares++;
  }
  return counts;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bulletinId = searchParams.get('bulletinId');

    if (!bulletinId) {
      return NextResponse.json({ error: 'bulletinId requis' }, { status: 400 });
    }

    let counts = { likes: 0, useful: 0, shares: 0 };
    let userReactions: string[] = [];

    try {
      counts = await getReactionCounts(bulletinId);
    } catch {
      return NextResponse.json({ ...counts, userReactions });
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const { data: userReacts } = await supabaseAdmin
        .from('meteo_reactions')
        .select('type')
        .eq('bulletin_id', bulletinId)
        .eq('user_id', session.user.id);

      if (userReacts) {
        userReactions = userReacts.map((r: any) => r.type);
      }
    }

    return NextResponse.json({ ...counts, userReactions });
  } catch (error) {
    console.error('Erreur API meteo/reactions GET:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { bulletinId, type } = body as { bulletinId: string; type: 'like' | 'useful' };

    if (!bulletinId || !type) {
      return NextResponse.json({ error: 'bulletinId et type requis' }, { status: 400 });
    }

    if (!['like', 'useful'].includes(type)) {
      return NextResponse.json({ error: 'Type de réaction invalide (like ou useful)' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('meteo_reactions')
      .select('id')
      .eq('bulletin_id', bulletinId)
      .eq('user_id', session.user.id)
      .eq('type', type)
      .single();

    let reacted: boolean;

    if (existing) {
      const { error } = await supabaseAdmin
        .from('meteo_reactions')
        .delete()
        .eq('id', existing.id);

      if (error) {
        return NextResponse.json({ error: 'Erreur lors de la suppression de la réaction', details: error.message }, { status: 500 });
      }
      reacted = false;
    } else {
      const { error } = await supabaseAdmin
        .from('meteo_reactions')
        .insert({
          bulletin_id: bulletinId,
          user_id: session.user.id,
          type,
        });

      if (error) {
        return NextResponse.json({ error: 'Erreur lors de l\'ajout de la réaction', details: error.message }, { status: 500 });
      }
      reacted = true;
    }

    const counts = await getReactionCounts(bulletinId);

    return NextResponse.json({ reacted, type, counts });
  } catch (error) {
    console.error('Erreur API meteo/reactions POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
