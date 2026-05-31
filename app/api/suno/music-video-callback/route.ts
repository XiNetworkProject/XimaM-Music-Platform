import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function posterFromVideoUrl(videoUrl: string | null) {
  if (!videoUrl) return null;
  if (videoUrl.includes('/video/upload/')) {
    return videoUrl.replace('/video/upload/', '/video/upload/so_0,f_jpg/').replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, '.jpg$2');
  }
  return null;
}

function extractPayload(body: any) {
  const data = body?.data || body;
  const item = Array.isArray(data?.data) ? data.data[0] : Array.isArray(data?.videos) ? data.videos[0] : data;
  const taskId = data?.taskId || data?.task_id || body?.taskId || body?.task_id;
  const videoUrl =
    item?.video_url ||
    item?.videoUrl ||
    item?.mp4_url ||
    item?.mp4Url ||
    item?.url ||
    data?.video_url ||
    data?.videoUrl ||
    null;
  return { taskId: taskId ? String(taskId) : '', videoUrl: videoUrl ? String(videoUrl) : null };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { taskId, videoUrl } = extractPayload(body);
    if (!taskId) {
      return NextResponse.json({ received: false, error: 'taskId manquant' }, { status: 400 });
    }

    const posterUrl = posterFromVideoUrl(videoUrl);
    const patch = {
      cover_video_url: videoUrl,
      cover_video_poster_url: posterUrl,
      video_task_id: taskId,
    };

    const { error } = await supabaseAdmin.from('ai_tracks').update(patch).eq('video_task_id', taskId);
    if (!error) return NextResponse.json({ received: true });

    const message = String(error.message || error.details || '').toLowerCase();
    if (!message.includes('cover_video') && !message.includes('video_task_id') && !message.includes('schema cache') && !message.includes('could not find')) {
      return NextResponse.json({ received: false, error: error.message }, { status: 500 });
    }

    const { data: rows } = await supabaseAdmin.from('ai_tracks').select('id, source_links').limit(500);
    const match = (rows || []).find((row: any) => {
      try {
        return JSON.parse(row.source_links || '{}')?.video_task_id === taskId;
      } catch {
        return false;
      }
    });
    if (match) {
      let sourceLinks: Record<string, unknown> = {};
      try {
        sourceLinks = JSON.parse((match as any).source_links || '{}');
      } catch {}
      await supabaseAdmin
        .from('ai_tracks')
        .update({
          source_links: JSON.stringify({
            ...sourceLinks,
            cover_video_url: videoUrl,
            cover_video_poster_url: posterUrl,
            video_task_id: taskId,
          }),
        })
        .eq('id', (match as any).id);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ received: false, error: error?.message || 'Erreur callback MP4' }, { status: 500 });
  }
}
