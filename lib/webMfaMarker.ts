export const WEB_MFA_COOKIE = 'synaura.web-mfa';
export const WEB_MFA_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type WebMfaMarker = {
  sub: string;
  sid: string;
  exp: number;
  purpose: 'web-mfa';
};

function toBase64Url(value: string) {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return atob(padded);
}

async function hmac(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  const binary = Array.from(
    new Uint8Array(signature),
    (byte) => String.fromCharCode(byte),
  ).join('');
  return toBase64Url(binary);
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createWebMfaMarker(
  userId: string,
  sessionId: string,
  secret: string,
  now = Date.now(),
) {
  const payload: WebMfaMarker = {
    sub: userId,
    sid: sessionId,
    exp: Math.floor(now / 1000) + WEB_MFA_MAX_AGE_SECONDS,
    purpose: 'web-mfa',
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${await hmac(encoded, secret)}`;
}

export async function verifyWebMfaMarker(
  marker: string | null | undefined,
  expected: { userId: string; sessionId: string },
  secret: string,
  now = Date.now(),
) {
  if (!marker || !secret) return false;
  const [encoded, suppliedSignature, extra] = marker.split('.');
  if (!encoded || !suppliedSignature || extra) return false;

  const expectedSignature = await hmac(encoded, secret);
  if (!timingSafeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as Partial<WebMfaMarker>;
    return payload.purpose === 'web-mfa'
      && payload.sub === expected.userId
      && payload.sid === expected.sessionId
      && typeof payload.exp === 'number'
      && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}
