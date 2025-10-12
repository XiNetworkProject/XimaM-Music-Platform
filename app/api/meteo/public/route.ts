import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Récupérer le bulletin courant (public, pas besoin d'authentification)
    const { data: bulletin, error } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('id, title, content, image_url, created_at, updated_at')
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur récupération bulletin public:', error);
      return NextResponse.json({ bulletin: null });
    }

    return NextResponse.json({ bulletin });

  } catch (error) {
    console.error('Erreur API bulletin public:', error);
    return NextResponse.json({ bulletin: null });
  }
}

