import { API_BASE_URL, getTrackById } from '@/api/client';
import type { Track } from '@/api/types';
import { navigatePrimaryTab } from '@/navigation/navigatePrimaryTab';

type NavigationLike = {
  getState?: () => { routeNames?: string[] } | undefined;
  navigate: (name: string, params?: Record<string, unknown>) => void;
};

function toPath(input?: string | null) {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);
      const base = new URL(API_BASE_URL);
      if (parsed.host !== base.host) return null;
      return parsed.pathname;
    }
  } catch {
    return null;
  }
  const pathname = value.split(/[?#]/, 1)[0];
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

/** Extrait les query params d'un lien interne (`/profile/x?tab=variations`), sans
 * dependre d'un hote absolu (URL exige une base pour les chemins relatifs). */
function toQuery(input?: string | null): URLSearchParams {
  if (!input) return new URLSearchParams();
  const qIndex = input.indexOf('?');
  if (qIndex === -1) return new URLSearchParams();
  const hashIndex = input.indexOf('#');
  const query = hashIndex === -1 ? input.slice(qIndex + 1) : input.slice(qIndex + 1, hashIndex);
  return new URLSearchParams(query);
}

export async function openInternalLink(
  navigation: NavigationLike,
  urlOrPath?: string | null,
  options?: { playTrack?: (track: Track) => void },
) {
  const path = toPath(urlOrPath);
  if (!path) return false;
  const parts = path.split('/').filter(Boolean);
  const [root, id] = parts;

  if (root === 'profile' && id) {
    // Ces deux parametres ne sont jamais generes que pour designer le profil du
    // destinataire lui-meme (notifications "Variations a valider" / "Mes
    // variations") : on ouvre alors l'ecran Profil (proprietaire), jamais
    // PublicProfile (vue visiteur, qui ne montre ni statut ni inbox pending).
    const query = toQuery(urlOrPath);
    const tab = query.get('tab');
    const openPendingVariations = query.get('openPendingVariations') === '1';
    if (tab || openPendingVariations) {
      navigatePrimaryTab(navigation, 'Profile', {
        tab: (['sons', 'clips', 'variations', 'playlists', 'posts'].includes(tab || '') ? tab : undefined) as any,
        openPendingVariations: openPendingVariations || undefined,
      });
      return true;
    }
    navigation.navigate('PublicProfile', { username: decodeURIComponent(id) });
    return true;
  }
  if ((root === 'posts' || root === 'post') && id) {
    navigation.navigate('PostDetail', { postId: decodeURIComponent(id) });
    return true;
  }
  if ((root === 'playlists' || root === 'playlist') && id) {
    navigation.navigate('PlaylistDetail', { playlistId: decodeURIComponent(id) });
    return true;
  }
  if ((root === 'clips' || root === 'clip') && id) {
    navigatePrimaryTab(navigation, 'Swipe', { mode: 'clips', clipId: decodeURIComponent(id) });
    return true;
  }
  if ((root === 'track' || root === 'tracks') && id) {
    const track = await getTrackById(decodeURIComponent(id));
    if (track && options?.playTrack) {
      options.playTrack(track);
      return true;
    }
    navigation.navigate('TrackDetail', { trackId: decodeURIComponent(id), track: track || undefined });
    return true;
  }
  if (root === 'notifications') {
    navigation.navigate('Notifications');
    return true;
  }
  if (root === 'settings') {
    navigation.navigate('Settings');
    return true;
  }
  if (root === 'community') {
    navigation.navigate('Community');
    return true;
  }
  if (root === 'city') {
    navigation.navigate('City');
    return true;
  }
  if (root === 'stats') {
    const query = toQuery(urlOrPath);
    navigation.navigate('Stats', { trackId: query.get('track') || undefined });
    return true;
  }
  if (root === 'challenges' && id) {
    navigation.navigate('ChallengeDetail', { challengeId: decodeURIComponent(id) });
    return true;
  }
  if (root === 'upload') {
    navigation.navigate('Upload');
    return true;
  }
  if (root === 'ai-generator' || root === 'studio') {
    navigation.navigate('AIStudio');
    return true;
  }
  if (root === 'boosters' || root === 'subscriptions' || root === 'pricing') {
    navigation.navigate('Subscriptions');
    return true;
  }
  return false;
}
