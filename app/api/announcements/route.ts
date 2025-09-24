import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { data: announcements, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Erreur récupération annonces:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ announcements: announcements || [] });
  } catch (error) {
    console.error('Erreur API annonces:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
