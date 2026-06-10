import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { generateMusicVideo } from '@/lib/suno';

export const dynamic = 'force-dynamic';

const MUSIC_VIDEO_CREDIT_COST = 100;

function getSiteUrl(req: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || req.nextUrl.origin || '').replace(/\/$/, '');
}

async function updateAiTrackWithMusicVideo(trackId: string, videoUrl: string | null, posterUrl: string | null, videoTaskId: string | null) {
  const patch = {
    music_video_url: videoUrl,
    music_video_poster_url: posterUrl,
    music_video_task_id: videoTaskId,
  };
  const { error } = await supabaseAdmin.from('ai_tracks').update(patch).eq('id', trackId);
  if (!error) return;

  const message = String(error.message || error.details || '').toLowerCase();
  if (!message.includes('music_video') && !message.includes('schema cache') && !message.includes('could not find')) {
    throw error;
  }

  const { data: existing } = await supabaseAdmin
    .from('ai_tracks')
    .select('source_links')
    .eq('id', trackId)
    .maybeSingle();

  let sourceLinks: Record<string, unknown> = {};
  try {
    sourceLinks = existing?.source_links ? JSON.parse(existing.source_links) : {};
  } catch {
    sourceLinks = {};
  }

  await supabaseAdmin
    .from('ai_tracks')
    .update({
      source_links: JSON.stringify({
        ...sourceLinks,
        music_video_url: videoUrl,
        music_video_poster_url: posterUrl,
        music_video_task_id: videoTaskId,
      }),
    })
    .eq('id', trackId);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const user = session?.user as any;
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const trackId = String(body.trackId || '').trim();
    const taskId = String(body.taskId || '').trim();
    const audioId = String(body.audioId || body.sunoAudioId || '').trim();

    if (!trackId || !taskId || !audioId) {
      return NextResponse.json({ error: 'trackId, taskId et audioId requis' }, { status: 400 });
    }

    const { data: track, error: trackError } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, suno_id, title, generation:ai_generations!inner(user_id, task_id)')
      .eq('id', trackId)
      .maybeSingle();

    const generation = Array.isArray((track as any)?.generation) ? (track as any).generation[0] : (track as any)?.generation;
    if (trackError || !track || generation?.user_id !== userId) {
      return NextResponse.json({ error: 'Piste Suno introuvable' }, { status: 404 });
    }

    if (generation?.task_id !== taskId || String((track as any).suno_id || '') !== audioId) {
      return NextResponse.json({ error: 'Cette piste ne correspond pas aux IDs Suno fournis' }, { status: 400 });
    }

    const { data: balanceRow } = await supabaseAdmin
      .from('ai_credit_balances')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    const currentBalance = Number(balanceRow?.balance || 0);
    if (currentBalance < MUSIC_VIDEO_CREDIT_COST) {
      return NextResponse.json({
        error: 'Crédits insuffisants',
        insufficientCredits: true,
        required: MUSIC_VIDEO_CREDIT_COST,
        balance: currentBalance,
      }, { status: 402 });
    }

    const { data: debitOk, error: debitError } = await (supabaseAdmin as any).rpc('ai_debit_credits', {
      p_user_id: userId,
      p_amount: MUSIC_VIDEO_CREDIT_COST,
      p_source: 'action_spend',
      p_description: 'Génération clip vidéo Suno',
    });
    if (debitError || debitOk === false) {
      return NextResponse.json({
        error: 'Impossible de débiter les crédits',
        insufficientCredits: true,
        required: MUSIC_VIDEO_CREDIT_COST,
        balance: currentBalance,
      }, { status: 402 });
    }

    try {
      const siteUrl = getSiteUrl(req);
      const result = await generateMusicVideo({
        taskId,
        audioId,
        author: user?.name || user?.username || 'Synaura',
        domainName: new URL(siteUrl).hostname,
        callBackUrl: `${siteUrl}/api/suno/music-video-callback`,
      });

      const videoTaskId = result?.data?.taskId || (result as any)?.taskId || null;
      await updateAiTrackWithMusicVideo(trackId, null, null, videoTaskId);

      const { data: newBalanceRow } = await supabaseAdmin
        .from('ai_credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        taskId: videoTaskId,
        raw: result,
        credits: {
          debited: MUSIC_VIDEO_CREDIT_COST,
          balance: newBalanceRow?.balance ?? (currentBalance - MUSIC_VIDEO_CREDIT_COST),
        },
      });
    } catch (error: any) {
      try {
        await (supabaseAdmin as any).rpc('ai_add_credits', {
          p_user_id: userId,
          p_amount: MUSIC_VIDEO_CREDIT_COST,
          p_source: 'refund',
          p_description: 'Remboursement échec clip vidéo Suno',
        });
      } catch {}
      return NextResponse.json({ error: error?.message || 'Erreur Suno MP4' }, { status: 502 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
