import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getUserTrackIds(userId: string): Promise<string[]> {
  const ids: string[] = [];
  const { data, error } = await supabaseAdmin
    .from('tracks').select('id').or(`creator_id.eq.${userId},user_id.eq.${userId}`);
  if (!error && data) for (const r of data) ids.push(r.id);
  else {
    const { data: fb } = await supabaseAdmin.from('tracks').select('id').eq('creator_id', userId);
    if (fb) for (const r of fb) ids.push(r.id);
  }
  try {
    const { data: aiRows, error: aiErr } = await supabaseAdmin
      .from('ai_tracks').select('id, generation:ai_generations!inner(user_id)').eq('generation.user_id', userId);
    if (!aiErr && aiRows) for (const r of aiRows) ids.push(r.id);
  } catch {}
  return ids;
}

function viewDate(row: any): Date | null {
  const raw = row.created_at || row.viewed_at;
  return raw ? new Date(raw) : null;
}

export async function GET(request: NextRequest) {
  const empty = { countries: {}, devices: {}, os: {}, browsers: {} };
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');
    const trackParam = searchParams.get('track');

    let trackIds = await getUserTrackIds(session.user.id);
    if (trackParam && trackParam !== 'all' && trackIds.includes(trackParam)) {
      trackIds = [trackParam];
    }
    if (trackIds.length === 0) return NextResponse.json(empty);

    const startDate = getStartDate(range);
    const startMs = startDate.getTime();

    /* ── Fetch views with both date columns + audience data ── */
    let views: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('track_views')
        .select('country, device, user_agent, created_at, viewed_at, track_id')
        .in('track_id', trackIds)
        .limit(100000);
      if (!error && data) views = data;
      else if (error) {
        console.error('audience: views with viewed_at failed, retrying:', error.message);
        const { data: fb } = await supabaseAdmin
          .from('track_views')
          .select('country, device, user_agent, created_at, track_id')
          .in('track_id', trackIds)
          .limit(100000);
        views = fb || [];
      }
    } catch (e) {
      console.error('audience: views exception:', e);
      return NextResponse.json(empty);
    }

    const countriesCount = new Map<string, number>();
    const devicesCount = new Map<string, number>();
    const osCount = new Map<string, number>();
    const browserCount = new Map<string, number>();

    for (const v of views) {
      const d = viewDate(v);
      if (!d || d.getTime() < startMs) continue;

      const country = v.country?.trim() ? v.country.trim().toUpperCase() : 'Inconnu';
      const device = v.device ? normDev(v.device) : devFromUA(v.user_agent);
      const os = osFromUA(v.user_agent);
      const br = brFromUA(v.user_agent);

      countriesCount.set(country, (countriesCount.get(country) || 0) + 1);
      if (device) devicesCount.set(device, (devicesCount.get(device) || 0) + 1);
      osCount.set(os, (osCount.get(os) || 0) + 1);
      browserCount.set(br, (browserCount.get(br) || 0) + 1);
    }

    return NextResponse.json({
      countries: toPct(countriesCount),
      devices: toPct(devicesCount),
      os: toPct(osCount),
      browsers: toPct(browserCount),
    });
  } catch {
    return NextResponse.json(empty);
  }
}

function getStartDate(range: string | null) {
  const d = new Date();
  if (range === '7d') d.setDate(d.getDate() - 6);
  else if (range === '30d') d.setDate(d.getDate() - 29);
  else if (range === '90d') d.setDate(d.getDate() - 89);
  else d.setDate(d.getDate() - 179);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normDev(d: string) {
  const s = d.toLowerCase();
  if (/android|iphone|mobile/.test(s)) return 'Mobile';
  if (/tablet|ipad/.test(s)) return 'Tablette';
  return 'Desktop';
}

function devFromUA(ua?: string | null) {
  if (!ua) return 'Desktop';
  const s = ua.toLowerCase();
  if (/mobile|iphone|android/.test(s)) return 'Mobile';
  if (/ipad|tablet/.test(s)) return 'Tablette';
  return 'Desktop';
}

function osFromUA(ua?: string | null) {
  if (!ua) return 'Autre';
  const s = ua.toLowerCase();
  if (s.includes('windows')) return 'Windows';
  if (s.includes('mac os') || s.includes('macintosh')) return 'macOS';
  if (s.includes('android')) return 'Android';
  if (/iphone|ipad|ios/.test(s)) return 'iOS';
  if (s.includes('linux')) return 'Linux';
  return 'Autre';
}

function brFromUA(ua?: string | null) {
  if (!ua) return 'Autre';
  const s = ua.toLowerCase();
  if (s.includes('edg/')) return 'Edge';
  if (s.includes('chrome/')) return 'Chrome';
  if (s.includes('safari/') && !s.includes('chrome/')) return 'Safari';
  if (s.includes('firefox/')) return 'Firefox';
  return 'Autre';
}

function toPct(map: Map<string, number>) {
  const entries = Array.from(map.entries());
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const obj: Record<string, number> = {};
  for (const [k, v] of entries) obj[k] = Math.round((v / total) * 1000) / 10;
  return obj;
}
