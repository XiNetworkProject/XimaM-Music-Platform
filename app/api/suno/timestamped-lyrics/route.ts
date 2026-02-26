import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE = process.env.SUNO_API_BASE || 'https://api.sunoapi.org';

export async function POST(req: NextRequest) {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'SUNO_API_KEY manquant' }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { taskId?: string; audioId?: string };
    const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
    const audioId = typeof body.audioId === 'string' ? body.audioId.trim() : '';

    if (!taskId || !audioId) {
      return NextResponse.json({ error: 'taskId et audioId requis' }, { status: 400 });
    }

    const res = await fetch(`${BASE}/api/v1/generate/get-timestamped-lyrics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, audioId }),
      cache: 'no-store',
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || Number(json?.code) !== 200) {
      const providerCode = Number(json?.code);
      const status = Number.isFinite(providerCode) && providerCode >= 400 && providerCode <= 599 ? providerCode : res.status;
      return NextResponse.json({ error: json?.msg || 'Erreur timestamped lyrics', raw: json }, { status: Number.isFinite(status) ? status : 502 });
    }

    return NextResponse.json({
      alignedWords: Array.isArray(json?.data?.alignedWords) ? json.data.alignedWords : [],
      waveformData: Array.isArray(json?.data?.waveformData) ? json.data.waveformData : [],
      hootCer: typeof json?.data?.hootCer === 'number' ? json.data.hootCer : null,
      isStreamed: Boolean(json?.data?.isStreamed),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}

