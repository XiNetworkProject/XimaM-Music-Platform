import { NextRequest, NextResponse } from 'next/server';
import { getLatestMobileRelease } from '@/lib/mobileRelease';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const currentVersionCode = Number(body?.currentVersionCode || 0);
  const release = await getLatestMobileRelease();

  if (!release || release.versionCode <= currentVersionCode) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json({
    available: true,
    version: release.versionName,
    versionCode: release.versionCode,
    downloadUrl: release.apkUrl,
    changelog: release.releaseNotes.join('\n'),
    isRequired: release.mandatory || currentVersionCode < release.minimumVersionCode,
    sizeBytes: release.sizeBytes,
    sha256: release.sha256,
  });
}
