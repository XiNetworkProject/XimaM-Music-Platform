import { NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GRADIENT_COVERS = [
  'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/e_gradient_fade:symmetric_pad,x_0.5,b_rgb:8b5cf6/e_colorize:60,co_rgb:6366f1/sample.jpg',
];

const DEFAULT_COVER = '/default-cover.svg';

export async function POST() {
  try {
    await getAdminGuard();

    const { data: tracks, error } = await supabaseAdmin
      .from('tracks')
      .select('id, title, cover_url')
      .or('cover_url.is.null,cover_url.eq.');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!tracks?.length) {
      return NextResponse.json({ fixed: 0, message: 'Aucune track sans cover' });
    }

    let fixed = 0;
    for (const track of tracks) {
      const { error: updateErr } = await supabaseAdmin
        .from('tracks')
        .update({ cover_url: DEFAULT_COVER })
        .eq('id', track.id);

      if (!updateErr) fixed++;
    }

    return NextResponse.json({
      fixed,
      total: tracks.length,
      message: `${fixed} tracks mises a jour avec une cover par defaut`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await getAdminGuard();

    const { count, error } = await supabaseAdmin
      .from('tracks')
      .select('id', { count: 'exact', head: true })
      .or('cover_url.is.null,cover_url.eq.');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tracksWithoutCover: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
