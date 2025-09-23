import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

const LIMIT = Number(process.env.EARLY_ACCESS_LIMIT || '50');

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Si pas connecté, autoriser l'accès aux pages publiques (middleware gère la redirection)
    if (!userId) return NextResponse.json({ allowed: false });

    // Vérifier si l'utilisateur a déjà le flag
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_early_access')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_early_access) {
      return NextResponse.json({ allowed: true });
    }

    // Compter le nombre d'utilisateurs en accès anticipé
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_early_access', true);

    if ((count || 0) < LIMIT) {
      // Accorder l'accès et marquer l'utilisateur
      await supabaseAdmin
        .from('profiles')
        .update({ is_early_access: true, early_access_at: new Date().toISOString(), is_waitlisted: false })
        .eq('id', userId);
      return NextResponse.json({ allowed: true });
    }

    // Sinon refuser (waitlist)
    await supabaseAdmin
      .from('profiles')
      .update({ is_waitlisted: true })
      .eq('id', userId);
    return NextResponse.json({ allowed: false });
  } catch (e: any) {
    return NextResponse.json({ allowed: false, error: e.message || 'Erreur' }, { status: 200 });
  }
}


