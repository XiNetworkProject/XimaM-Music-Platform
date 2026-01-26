import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SYNAURA_TV_TABLE } from '@/lib/synauraTv';
import { isMuxConfigured, muxGetLiveStream } from '@/lib/mux';

export async function GET() {
  try {
    const { data: row, error } = await supabaseAdmin
      .from(SYNAURA_TV_TABLE)
      .select('provider, enabled, playback_url, mux_live_stream_id, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: 'Erreur base de données' }, { status: 500 });
    }

    const enabled = Boolean(row?.enabled);
    const provider = String(row?.provider || 'manual');
    const playbackUrl = String(row?.playback_url || '');
    const muxLiveStreamId = String(row?.mux_live_stream_id || '');

    let isLive = false;
    let providerStatus: string | null = null;
    if (enabled && playbackUrl) {
      if (provider === 'mux' && muxLiveStreamId && isMuxConfigured()) {
        try {
          const { status } = await muxGetLiveStream(muxLiveStreamId);
          providerStatus = status || null;
          isLive = status === 'active';
        } catch {
          // fallback: considérer offline si le status provider échoue
          providerStatus = null;
          isLive = false;
        }
      } else {
        // mode manuel: on considère live si la config existe (l'admin contrôle)
        isLive = true;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        provider,
        enabled,
        isLive,
        providerStatus,
        // Important: on renvoie la playbackUrl si la TV est "activée", même si le statut live
        // n'est pas confirmé (ex: Mux status indispo). Le player fera foi.
        playbackUrl: enabled && playbackUrl ? playbackUrl : null,
        updatedAt: row?.updated_at || null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

