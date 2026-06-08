import { NextRequest, NextResponse } from 'next/server';
import { getLatestMobileRelease } from '@/lib/mobileRelease';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const release = await getLatestMobileRelease();
  if (!release) {
    return NextResponse.json({ available: false }, { status: 404 });
  }

  const currentVersionCode = Number(request.nextUrl.searchParams.get('versionCode') || 0);
  return NextResponse.json(
    {
      available: release.versionCode > currentVersionCode,
      release,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}
