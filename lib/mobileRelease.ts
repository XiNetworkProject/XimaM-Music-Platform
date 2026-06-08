import { supabaseAdmin } from '@/lib/supabase';

export const MOBILE_RELEASE_BUCKET = 'mobile-releases';
export const MOBILE_RELEASE_MANIFEST = 'latest.json';

export type MobileRelease = {
  platform: 'android';
  versionName: string;
  versionCode: number;
  minimumVersionCode: number;
  title: string;
  releaseNotes: string[];
  mandatory: boolean;
  apkUrl: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeMobileRelease(raw: any): MobileRelease | null {
  const versionCode = Number(raw?.versionCode || 0);
  const apkUrl = stringValue(raw?.apkUrl);
  if (!Number.isInteger(versionCode) || versionCode <= 0 || !apkUrl) return null;

  return {
    platform: 'android',
    versionName: stringValue(raw?.versionName) || String(versionCode),
    versionCode,
    minimumVersionCode: Math.max(1, Number(raw?.minimumVersionCode || versionCode)),
    title: stringValue(raw?.title) || 'Nouvelle version Synaura',
    releaseNotes: Array.isArray(raw?.releaseNotes)
      ? raw.releaseNotes.map((item: unknown) => stringValue(item)).filter(Boolean).slice(0, 12)
      : [],
    mandatory: Boolean(raw?.mandatory),
    apkUrl,
    sha256: stringValue(raw?.sha256),
    sizeBytes: Math.max(0, Number(raw?.sizeBytes || 0)),
    publishedAt: stringValue(raw?.publishedAt) || new Date().toISOString(),
  };
}

export async function getLatestMobileRelease(): Promise<MobileRelease | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(MOBILE_RELEASE_BUCKET)
      .download(MOBILE_RELEASE_MANIFEST);

    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      const release = normalizeMobileRelease(parsed);
      if (release) return release;
    }
  } catch {
    // Environment fallback below keeps local/dev deployments usable.
  }

  return normalizeMobileRelease({
    versionName: process.env.SYNAURA_ANDROID_VERSION_NAME,
    versionCode: process.env.SYNAURA_ANDROID_VERSION_CODE,
    minimumVersionCode: process.env.SYNAURA_ANDROID_MINIMUM_VERSION_CODE,
    title: process.env.SYNAURA_ANDROID_RELEASE_TITLE,
    releaseNotes: process.env.SYNAURA_ANDROID_RELEASE_NOTES?.split('|'),
    mandatory: process.env.SYNAURA_ANDROID_MANDATORY === 'true',
    apkUrl: process.env.SYNAURA_ANDROID_APK_URL,
    sha256: process.env.SYNAURA_ANDROID_SHA256,
    sizeBytes: process.env.SYNAURA_ANDROID_SIZE_BYTES,
    publishedAt: process.env.SYNAURA_ANDROID_PUBLISHED_AT,
  });
}
