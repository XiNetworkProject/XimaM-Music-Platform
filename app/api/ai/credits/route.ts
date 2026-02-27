import { NextRequest, NextResponse } from 'next/server';
import { getApiSession, getSessionFromToken } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

async function handleCredits(session: { user: { id: string } } | null) {
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const userId = session.user.id;
  const { data, error } = await supabaseAdmin
    .from('ai_credit_balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Erreur lecture crédits:', error);
    return NextResponse.json({ balance: 0 });
  }
  return NextResponse.json({ balance: data?.balance ?? 0 });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    return handleCredits(session);
  } catch (e: any) {
    return NextResponse.json({ balance: 0 });
  }
}

/** POST pour le mobile : token dans le body (équivalent des cookies sur le web). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : null;
    const session = accessToken
      ? await getSessionFromToken(accessToken)
      : await getApiSession(req);
    if (process.env.NODE_ENV === 'development' && req.url) {
      console.log('[api/ai/credits POST] accessToken:', !!accessToken, 'session:', !!session?.user?.id);
    }
    return handleCredits(session);
  } catch (e: any) {
    return NextResponse.json({ balance: 0 });
  }
}


