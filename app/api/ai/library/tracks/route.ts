import { NextRequest, NextResponse } from 'next/server';
import { getApiSession, getSessionFromToken } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function handleTracks(
  session: { user: { id: string } } | null,
  limit: number,
  offset: number,
  search: string
) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: generations, error } = await supabaseAdmin
    .from('ai_generations')
    .select('id, user_id, task_id, model, prompt, status, created_at, tracks:ai_tracks(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const tracks: Array<Record<string, unknown> & { generation?: Record<string, unknown> }> = [];
  for (const g of generations ?? []) {
    const gTyped = g as { id: string; user_id: string; task_id?: string; model?: string; created_at?: string; prompt?: string; status?: string; tracks?: unknown[] };
    const list = gTyped.tracks ?? [];
    for (const t of list) {
      const track = (t && typeof t === 'object' ? { ...(t as object) } : {}) as Record<string, unknown>;
      const title = String(track?.title ?? '');
      if (search && !title.toLowerCase().includes(search.toLowerCase())) continue;
      tracks.push({
        ...track,
        generation: {
          id: gTyped.id,
          user_id: gTyped.user_id,
          model: gTyped.model,
          created_at: gTyped.created_at,
          prompt: gTyped.prompt,
          status: gTyped.status,
          task_id: gTyped.task_id,
        },
      });
    }
  }

  const total = tracks.length;
  const paginated = tracks.slice(offset, offset + limit);

  return NextResponse.json({
    tracks: paginated,
    pagination: { limit, offset, total },
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = (searchParams.get('search') || '').trim();
    return handleTracks(session, limit, offset, search);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

/** POST pour le mobile : token + params dans le body (équivalent des cookies sur le web). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : null;
    const session = accessToken ? await getSessionFromToken(accessToken) : await getApiSession(req);
    const limit = parseInt(body?.limit ?? req.nextUrl?.searchParams?.get('limit') ?? '100');
    const offset = parseInt(body?.offset ?? req.nextUrl?.searchParams?.get('offset') ?? '0');
    const search = String(body?.search ?? req.nextUrl?.searchParams?.get('search') ?? '').trim();
    return handleTracks(session, limit, offset, search);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}


