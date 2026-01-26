import { NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_MUX_RTMPS_URL, SYNAURA_TV_TABLE } from '@/lib/synauraTv';
import { muxCreateLiveStream, muxPlaybackUrl } from '@/lib/mux';

export async function POST() {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ ok: false, error: 'Interdit' }, { status: 403 });

  try {
    const created = await muxCreateLiveStream({ name: 'SYNAURA TV' });
    if (!created.id || !created.streamKey || !created.playbackId) {
      return NextResponse.json({ ok: false, error: 'Réponse Mux incomplète' }, { status: 500 });
    }

    const playbackUrl = muxPlaybackUrl(created.playbackId);

    const { data, error } = await supabaseAdmin
      .from(SYNAURA_TV_TABLE)
      .upsert(
        {
          id: 1,
          provider: 'mux',
          enabled: true,
          mux_live_stream_id: created.id,
          mux_playback_id: created.playbackId,
          playback_url: playbackUrl,
          rtmp_url: DEFAULT_MUX_RTMPS_URL,
          stream_key: created.streamKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: 'Erreur base de données' }, { status: 500 });

    return NextResponse.json({
      ok: true,
      mux: {
        liveStreamId: created.id,
        playbackId: created.playbackId,
        playbackUrl,
        rtmpUrl: DEFAULT_MUX_RTMPS_URL,
        streamKey: created.streamKey,
      },
      settings: data || null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erreur Mux' }, { status: 500 });
  }
}

