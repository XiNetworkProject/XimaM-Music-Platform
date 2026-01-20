import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;

    // Gestion spéciale pour les pistes IA (id préfixé par "ai-")
    if (trackId.startsWith('ai-')) {
      const aiTrackId = trackId.slice(3);

      const { data: aiTrack, error: aiError } = await supabaseAdmin
        .from('ai_tracks')
        .select('play_count')
        .eq('id', aiTrackId)
        .single();

      if (aiError) {
        console.error('❌ Erreur Supabase AI plays GET:', aiError);
        return NextResponse.json(
          { error: 'Erreur lors de la récupération des lectures (AI)' },
          { status: 500 }
        );
      }

      if (!aiTrack) {
        return NextResponse.json(
          { error: 'Piste IA non trouvée' },
          { status: 404 }
        );
      }

      const plays = aiTrack.play_count || 0;
      console.log(`✅ Lectures récupérées pour la piste IA ${aiTrackId}: ${plays}`);
      return NextResponse.json({ plays });
    }

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam') {
      return NextResponse.json({ 
        plays: 0, 
        message: 'Radio - pas de lectures à compter' 
      });
    }

    // Récupérer le nombre de lectures de la piste
    const { data: track, error } = await supabaseAdmin
      .from('tracks')
      .select('plays')
      .eq('id', trackId)
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur Supabase plays GET:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des lectures' },
        { status: 500 }
      );
    }

    if (!track) {
      // Si la piste n'existe pas côté DB, renvoyer 0 pour ne pas casser le client
      return NextResponse.json({ plays: 0 });
    }

    console.log(`✅ Lectures récupérées pour la piste ${trackId}: ${track.plays || 0}`);
    return NextResponse.json({ plays: track.plays || 0 });

  } catch (error) {
    console.error('❌ Erreur serveur plays GET:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Gestion spéciale pour les pistes IA (id préfixé par "ai-")
    if (trackId.startsWith('ai-')) {
      const aiTrackId = trackId.slice(3);

      const { data: aiTrack, error: aiFetchError } = await supabaseAdmin
        .from('ai_tracks')
        .select('play_count')
        .eq('id', aiTrackId)
        .single();

      if (aiFetchError) {
        console.error('❌ Erreur Supabase AI plays POST (fetch):', aiFetchError);
        return NextResponse.json(
          { error: 'Erreur lors de la récupération de la piste IA' },
          { status: 500 }
        );
      }

      if (!aiTrack) {
        return NextResponse.json(
          { error: 'Piste IA non trouvée' },
          { status: 404 }
        );
      }

      const newPlays = (aiTrack.play_count || 0) + 1;

      const { error: aiUpdateError } = await supabaseAdmin
        .from('ai_tracks')
        .update({ play_count: newPlays })
        .eq('id', aiTrackId);

      if (aiUpdateError) {
        console.error('❌ Erreur Supabase AI plays update:', aiUpdateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour des lectures (IA)' },
          { status: 500 }
        );
      }

      console.log(`✅ Lectures incrémentées pour la piste IA ${aiTrackId}: ${newPlays}`);
      return NextResponse.json({ plays: newPlays });
    }

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam') {
      return NextResponse.json({ 
        plays: 0, 
        message: 'Radio - pas de mise à jour des lectures' 
      });
    }

    // Incrémenter le nombre de lectures de la piste
    const { data: track, error } = await supabaseAdmin
      .from('tracks')
      .select('plays')
      .eq('id', trackId)
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur Supabase plays POST:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la piste' },
        { status: 500 }
      );
    }

    if (!track) {
      // Si la piste n'existe pas côté DB, ne pas échouer — retourner 0
      return NextResponse.json({ plays: 0 });
    }

    const newPlays = (track.plays || 0) + 1;

    // Mettre à jour le nombre de lectures
    const { error: updateError } = await supabaseAdmin
      .from('tracks')
      .update({ plays: newPlays })
      .eq('id', trackId);

    if (updateError) {
      console.error('❌ Erreur Supabase plays update:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des lectures' },
        { status: 500 }
      );
    }

    // Enregistrer la vue pour les stats (y compris anonymes)
    {
      const ua = request.headers.get('user-agent') || '';
      const device = /mobile|iphone|android/i.test(ua)
        ? 'mobile'
        : /ipad|tablet/i.test(ua)
        ? 'tablet'
        : 'desktop';

      const headerCountry =
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-geo-country') ||
        null;
      let country = (headerCountry || '').toUpperCase() || null;

      const acceptLang = request.headers.get('accept-language') || '';
      if (!country) country = extractCountryFromAcceptLanguage(acceptLang);

      const xff = request.headers.get('x-forwarded-for') || '';
      const ip = (xff.split(',')[0] || '').trim() || null;
      if (!country && ip) {
        country = await lookupCountryFromIp(ip, 400).catch(() => null);
      }

      const viewerId = userId || '00000000-0000-0000-0000-000000000000';
      const insertPayload: any = { track_id: trackId, user_id: viewerId, device, user_agent: ua };
      if (country) insertPayload.country = country;
      if (ip) insertPayload.ip = ip;

      const { error: viewError } = await supabaseAdmin
        .from('track_views')
        .insert(insertPayload);
      if (viewError) {
        console.warn('⚠️ Erreur insertion track_views:', viewError);
      }
    }

    console.log(`✅ Lectures incrémentées pour la piste ${trackId}: ${newPlays}`);
    return NextResponse.json({ plays: newPlays });

  } catch (error) {
    console.error('❌ Erreur serveur plays POST:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

function extractCountryFromAcceptLanguage(al: string): string | null {
  // Exemples: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  const first = al.split(',')[0]?.trim();
  if (!first) return null;
  const parts = first.split('-');
  if (parts.length === 2) return parts[1].toUpperCase();
  // fallback: code langue -> pays par défaut
  const lang = parts[0]?.toLowerCase();
  if (!lang) return null;
  const map: Record<string, string> = { fr: 'FR', en: 'US', es: 'ES', de: 'DE', it: 'IT' };
  return map[lang] || null;
}

async function lookupCountryFromIp(ip: string, timeoutMs = 400): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    // ipapi.co est simple; vous pouvez passer à ipinfo ou un provider pro si besoin
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (/^[A-Z]{2}$/.test(text)) return text;
    return null;
  } catch {
    return null;
  }
}
