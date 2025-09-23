import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ hasAccess: false, reason: 'not_authenticated' });
    }

    // Vérifier si l'utilisateur a l'accès anticipé
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('early_access')
      .eq('id', session.user.id)
      .single();

    const hasAccess = profile?.early_access === true;

    return NextResponse.json({ 
      hasAccess,
      reason: hasAccess ? 'early_access_granted' : 'no_early_access'
    });

  } catch (error) {
    console.error('Erreur vérification accès anticipé:', error);
    // En cas d'erreur, permettre l'accès pour éviter de bloquer l'app
    return NextResponse.json({ hasAccess: true, reason: 'error_fallback' });
  }
}