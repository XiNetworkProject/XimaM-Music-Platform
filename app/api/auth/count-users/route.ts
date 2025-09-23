import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Compter le nombre total d'utilisateurs dans la table profiles
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Erreur lors du comptage des utilisateurs:', error);
      return NextResponse.json({ error: 'Erreur lors du comptage' }, { status: 500 });
    }

    const userCount = count || 0;
    const maxUsers = 50;
    const canRegister = userCount < maxUsers;

    return NextResponse.json({
      userCount,
      maxUsers,
      canRegister,
      remainingSlots: Math.max(0, maxUsers - userCount)
    });
  } catch (error) {
    console.error('Erreur dans count-users API:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
