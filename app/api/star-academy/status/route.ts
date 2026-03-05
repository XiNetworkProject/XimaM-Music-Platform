import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // Mode count-only (pour la landing page)
  if (req.nextUrl.searchParams.has('count')) {
    const { count } = await supabaseAdmin
      .from('star_academy_applications')
      .select('id', { count: 'exact', head: true });
    return NextResponse.json({ total: count ?? 0 });
  }

  const token = req.nextUrl.searchParams.get('token');
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase();

  if (!token && !email) {
    return NextResponse.json({ error: 'Token ou email requis.' }, { status: 400 });
  }

  try {
    let query = supabaseAdmin
      .from('star_academy_applications')
      .select('id, created_at, updated_at, full_name, tiktok_handle, category, status, synaura_username, tracking_token, notification_sent_at, audio_filename');

    if (token) {
      query = query.eq('tracking_token', token);
    } else {
      query = query.eq('email', email!);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ application: data });
  } catch (err) {
    console.error('[star-academy/status]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
