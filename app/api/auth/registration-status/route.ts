import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Compter le nombre total d'utilisateurs
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const userCount = totalUsers || 0;
    const isRegistrationOpen = userCount < 50;

    return NextResponse.json({ 
      userCount,
      isRegistrationOpen,
      maxUsers: 50,
      remainingSlots: Math.max(0, 50 - userCount)
    });

  } catch (error) {
    console.error('Erreur comptage utilisateurs:', error);
    // En cas d'erreur, permettre l'inscription pour éviter de bloquer
    return NextResponse.json({ 
      userCount: 0,
      isRegistrationOpen: true,
      maxUsers: 50,
      remainingSlots: 50
    });
  }
}
