export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'spotify' | 'soundcloud' | 'deezer' | 'apple_music' | 'twitch' | 'discord' | 'x' | 'website' | 'custom';

const domains: Partial<Record<SocialPlatform, string[]>> = {
  tiktok: ['tiktok.com'],
  instagram: ['instagram.com'],
  youtube: ['youtube.com', 'youtu.be'],
  spotify: ['open.spotify.com'],
  soundcloud: ['soundcloud.com'],
  deezer: ['deezer.com'],
  apple_music: ['music.apple.com'],
  twitch: ['twitch.tv'],
  discord: ['discord.gg', 'discord.com'],
  x: ['x.com', 'twitter.com'],
};

export function validateSocialUrl(platform: SocialPlatform, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!value.startsWith('https://')) return 'doit commencer par https://';
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    const allowed = domains[platform];
    if (allowed && !allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))) return `doit utiliser ${allowed.join(' ou ')}`;
    return null;
  } catch {
    return 'URL invalide';
  }
}
