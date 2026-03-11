import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data: alerts, error } = await supabaseAdmin
      .from('meteo_alerts')
      .select('*')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('sent_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ alerts: [] });
      }
      console.error('Erreur meteo/alerts/active:', error);
      return NextResponse.json({ alerts: [] });
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error) {
    console.error('Erreur API meteo/alerts/active GET:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
