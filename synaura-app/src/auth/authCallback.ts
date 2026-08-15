export const MOBILE_AUTH_CALLBACK_URL = 'synaura://auth/callback';

export function parseMobileAuthCallback(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== 'synaura:'
    || parsed.hostname !== 'auth'
    || parsed.pathname !== '/callback'
  ) {
    return null;
  }
  const query = parsed.search.slice(1);
  const fragment = parsed.hash.slice(1);
  const params = new URLSearchParams([query, fragment].filter(Boolean).join('&'));
  const error = params.get('error_description') || params.get('error');
  if (error) throw new Error(error);
  const accessToken = params.get('access_token') || '';
  const refreshToken = params.get('refresh_token') || '';
  if (!accessToken || !refreshToken) throw new Error('La connexion externe est incomplete.');
  return { accessToken, refreshToken };
}

export function mobileAuthCallbackSignature(url: string) {
  let hash = 2166136261;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${url.length}:${hash >>> 0}`;
}
