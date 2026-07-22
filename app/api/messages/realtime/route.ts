import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !publishableKey) {
    return NextResponse.json({ error: 'Temps reel indisponible' }, { status: 503 });
  }

  return NextResponse.json(
    { url, publishableKey },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  );
}
