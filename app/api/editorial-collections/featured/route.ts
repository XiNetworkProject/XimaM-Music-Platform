import { NextResponse } from 'next/server';
import { getFeaturedEditorialCollections } from '@/lib/editorialCollections';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const collections = await getFeaturedEditorialCollections(12);
    return NextResponse.json({ collections }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=180' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Collections indisponibles' }, { status: 500 });
  }
}
