import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
      const resErr = NextResponse.json({ bulletin: null });
      resErr.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      resErr.headers.set('Pragma', 'no-cache');
      resErr.headers.set('Expires', '0');
      resErr.headers.set('CDN-Cache-Control', 'no-store');
      return resErr;
    }

    const res = NextResponse.json({ bulletin });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    res.headers.set('CDN-Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('Erreur API bulletin public:', error);
    const resCatch = NextResponse.json({ bulletin: null });
    resCatch.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    resCatch.headers.set('Pragma', 'no-cache');
    resCatch.headers.set('Expires', '0');
    resCatch.headers.set('CDN-Cache-Control', 'no-store');
    return resCatch;
  }
}

