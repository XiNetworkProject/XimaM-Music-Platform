import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
  } catch (e: any) {
    return NextResponse.json({ balance: 0 });
  }
}


