import { NextRequest, NextResponse } from 'next/server';
import { communityFeedParams } from '@/lib/communityFeed';

/** Local visual review only: public GET, no cookies/tokens and no write forwarding. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 });
  const input = request.nextUrl.searchParams;
  const params = communityFeedParams(input.get('category') || 'all', input.get('search') || '', input.get('sort') || 'recent', Math.min(1000, Number(input.get('page')) || 1));
  try {
    const response = await fetch(`https://synaura.fr/api/community/posts?${params}`, {
      method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok) return NextResponse.json({ error: 'Aperçu public indisponible' }, { status: 502 });
    const data = await response.json();
    return NextResponse.json({ posts: data.posts, pagination: data.pagination }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Aperçu public indisponible' }, { status: 502 });
  }
}
