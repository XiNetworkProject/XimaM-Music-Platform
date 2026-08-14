import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

const TOKEN_PARAM = 'synaura_webhook_token';

function configuredSecret() {
  const secret = process.env.SUNO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error('SUNO_WEBHOOK_SECRET est requis pour securiser les callbacks Suno');
  }
  return secret;
}

function callbackToken(pathname: string) {
  return createHmac('sha256', configuredSecret()).update(pathname).digest('base64url');
}

export function buildSunoCallbackUrl(request: NextRequest, pathname: string) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const url = new URL(pathname, baseUrl);
  url.searchParams.set(TOKEN_PARAM, callbackToken(url.pathname));
  return url.toString();
}

export function verifySunoCallback(request: NextRequest) {
  const received = (
    request.headers.get('x-synaura-webhook-token')
    || request.nextUrl.searchParams.get(TOKEN_PARAM)
    || ''
  ).trim();
  if (!received) return false;

  let expected: string;
  try {
    expected = callbackToken(request.nextUrl.pathname);
  } catch {
    return false;
  }
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}
