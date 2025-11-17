import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le paramètre source depuis la query string
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || null;

    // Récupérer le bulletin courant (public, pas besoin d'authentification)
    // On accepte les bulletins avec status='published' OU sans status (pour compatibilité avec les anciens bulletins)
    // Priorité 1 : bulletin avec is_current=true
    let { data: bulletin, error } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('id, title, content, image_url, created_at, updated_at')
      .eq('is_current', true)
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Si aucun bulletin avec is_current=true, prendre le dernier bulletin publié (ou sans status)
    if (!bulletin && (!error || error.code === 'PGRST116')) {
      const { data: fallbackBulletin, error: fallbackError } = await supabaseAdmin
        .from('meteo_bulletins')
        .select('id, title, content, image_url, created_at, updated_at')
        .or('status.eq.published,status.is.null')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fallbackBulletin) {
        bulletin = fallbackBulletin;
        error = null;
      } else if (fallbackError && fallbackError.code !== 'PGRST116') {
        error = fallbackError;
      }
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur récupération bulletin public:', error);
      const resErr = NextResponse.json({ bulletin: null });
      resErr.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      resErr.headers.set('Pragma', 'no-cache');
      resErr.headers.set('Expires', '0');
      resErr.headers.set('CDN-Cache-Control', 'no-store');
      return resErr;
    }

    // Logger la vue si un bulletin existe (de manière asynchrone, ne pas bloquer la réponse)
    if (bulletin?.id) {
      // Ne pas attendre la fin de l'insertion pour répondre
      (async () => {
        try {
          await supabaseAdmin
            .from('meteo_views')
            .insert({
              bulletin_id: bulletin.id,
              source: source || 'unknown',
            });
        } catch (logError) {
          // Logger l'erreur mais ne pas casser la réponse principale
          console.error('Erreur logging vue bulletin:', logError);
        }
      })();
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

