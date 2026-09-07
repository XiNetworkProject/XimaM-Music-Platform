import { NextRequest } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { isLocalMediaOwnedBy, isLocalMediaUrl, localPublicIdFromUrl } from '@/lib/localMediaStorage';
import { handleAuddCopyrightCheck } from '@/lib/security/auddCopyrightHandler';
import { consumeRequestRateLimit } from '@/lib/security/requestSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return handleAuddCopyrightCheck(req, {
    getUserId: async (request) => (await getApiSession(request as NextRequest))?.user?.id || null,
    ownsAudio: (audioUrl, userId) => {
      const publicId = localPublicIdFromUrl(audioUrl);
      return Boolean(publicId && isLocalMediaUrl(audioUrl, 'audio') && isLocalMediaOwnedBy(publicId, userId));
    },
    consumeRateLimit: (request, userId) => {
      const byUser = consumeRequestRateLimit(request, 'audd-user', 10, 60 * 60_000, userId);
      return byUser.allowed
        ? consumeRequestRateLimit(request, 'audd-ip', 20, 60 * 60_000)
        : byUser;
    },
    recognize: async (audioUrl, signal) => {
      const token = process.env.AUDD_API_TOKEN;
      if (!token) return { ok: false };
      const form = new URLSearchParams({ api_token: token, url: audioUrl, method: 'recognize' });
      const response = await fetch('https://api.audd.io/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal,
      });
      return { ok: response.ok, payload: await response.json().catch(() => ({})) };
    },
    reportFailure: () => console.error('[copyright-check] fournisseur indisponible'),
  });
}
