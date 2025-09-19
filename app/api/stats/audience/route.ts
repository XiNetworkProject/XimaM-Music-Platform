import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');

    // Récupérer les pistes de l'utilisateur
    // Récupérer pistes par creator_id puis fallback artist_id
    let trackIds: string[] = [];
    {
      const { data: rows, error } = await supabaseAdmin
        .from('tracks')
        .select('id')
        .eq('creator_id', session.user.id);
      if (!error && rows) trackIds = rows.map((r: any) => r.id);
      if ((error || trackIds.length === 0)) {
        const { data: rows2, error: err2 } = await supabaseAdmin
          .from('tracks')
          .select('id')
          .eq('artist_id', session.user.id);
        if (!err2 && rows2) trackIds = rows2.map((r: any) => r.id);
      }
    }
    if (trackIds.length === 0) {
      return NextResponse.json({ countries: {}, devices: {} });
    }

    // Fenêtre temporelle simple
    const startDate = getStartDate(range);

    // Charger track_views limité à la période et aux pistes
    const { data: views, error: viewsErr } = await supabaseAdmin
      .from('track_views')
      .select('country, device, user_agent, created_at, track_id')
      .in('track_id', trackIds)
      .gte('created_at', startDate.toISOString());
    if (viewsErr) {
      // Renvoyer vide plutôt que 500 si table/colonnes absentes
      return NextResponse.json({ countries: {}, devices: {} });
    }

    // Agrégation pays/appareils
    const countriesCount = new Map<string, number>();
    const devicesCount = new Map<string, number>();
    for (const v of views || []) {
      const country = normalizeCountry(v.country);
      const device = v.device ? normalizeDevice(v.device) : inferDeviceFromUA(v.user_agent);
      if (country) countriesCount.set(country, (countriesCount.get(country) || 0) + 1);
      if (device) devicesCount.set(device, (devicesCount.get(device) || 0) + 1);
    }

    const countriesObj = toPercentagesObject(countriesCount);
    const devicesObj = toPercentagesObject(devicesCount);

    return NextResponse.json({ countries: countriesObj, devices: devicesObj });
  } catch (e) {
    // Défaut: vide pour ne pas casser l’UI
    return NextResponse.json({ countries: {}, devices: {} });
  }
}

function getStartDate(range: string | null) {
  const now = new Date();
  const d = new Date(now);
  if (range === '7d') d.setDate(d.getDate() - 6);
  else if (range === '30d') d.setDate(d.getDate() - 29);
  else if (range === '90d') d.setDate(d.getDate() - 89);
  else d.setDate(d.getDate() - 179);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeCountry(country?: string | null) {
  if (!country || country.trim() === '') return 'Inconnu';
  return country.toUpperCase();
}

function normalizeDevice(device?: string | null) {
  if (!device) return null;
  const d = device.toLowerCase();
  if (d.includes('android') || d.includes('iphone') || d.includes('mobile')) return 'mobile';
  if (d.includes('tablet') || d.includes('ipad')) return 'tablette';
  return 'desktop';
}

function inferDeviceFromUA(ua?: string | null) {
  if (!ua) return 'desktop';
  const s = ua.toLowerCase();
  if (/mobile|iphone|android/.test(s)) return 'mobile';
  if (/ipad|tablet/.test(s)) return 'tablette';
  return 'desktop';
}

function toPercentagesObject(map: Map<string, number>) {
  const entries = Array.from(map.entries());
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const obj: Record<string, number> = {};
  for (const [k, v] of entries) obj[k] = (v / total) * 100;
  return obj;
}


