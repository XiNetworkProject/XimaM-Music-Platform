import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

  const { data: app, error: dbError } = await supabaseAdmin
    .from('star_academy_applications')
    .select('audio_url, audio_filename')
    .eq('id', params.id)
    .single();

  if (dbError || !app) {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }

  if (!app.audio_url) {
    return NextResponse.json({ error: 'Aucun audio associé.' }, { status: 404 });
  }

  // Extraire le chemin relatif depuis l'URL publique stockée
  // Format: https://xxx.supabase.co/storage/v1/object/public/star-academy-audio/<path>
  const marker = '/star-academy-audio/';
  const idx = app.audio_url.indexOf(marker);

  if (idx === -1) {
    // Pas le bon format — retourner l'URL telle quelle
    return NextResponse.json({ signedUrl: app.audio_url, filename: app.audio_filename });
  }

  const storagePath = app.audio_url.slice(idx + marker.length);

  const { data, error: signError } = await supabaseAdmin.storage
    .from('star-academy-audio')
    .createSignedUrl(storagePath, 3600); // valide 1h

  if (signError || !data?.signedUrl) {
    console.error('[admin/audio] signed URL error:', signError?.message);
    // Fallback sur l'URL publique
    return NextResponse.json({ signedUrl: app.audio_url, filename: app.audio_filename });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, filename: app.audio_filename });
}
