// synaura-mobile/src/config/env.ts

// Expo: tu peux définir EXPO_PUBLIC_API_BASE_URL dans ton .env
// Exemple:
// - dev (LAN): EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3000
// - prod:      EXPO_PUBLIC_API_BASE_URL=https://synaura.fr

const fallbackBaseUrl = 'https://xima-m-music-platform.vercel.app';

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

export const ENV = {
  API_BASE_URL: stripTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL || fallbackBaseUrl),
};

export function apiUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${ENV.API_BASE_URL}${p}`;
}

