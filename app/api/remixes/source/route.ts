import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getRemixSourceSummary } from '@/lib/remixServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sourceTrackId = searchParams.get('sourceTrackId') || searchParams.get('trackId') || '';
  const sourceTrackType = searchParams.get('sourceTrackType') || searchParams.get('trackType') || null;
  const session = await getApiSession(req).catch(() => null);

  const source = await getRemixSourceSummary({
    sourceTrackId,
    sourceTrackType,
    userId: (session?.user as any)?.id || null,
  });

  if (!source) {
    return NextResponse.json({ error: 'Morceau source introuvable' }, { status: 404 });
  }

  if (!source.canRemixAiVariation) {
    return NextResponse.json({ error: 'Variation IA non autorisee pour ce morceau', source }, { status: 403 });
  }

  return NextResponse.json({ source });
}
