import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  clearProfilePeekClientCache,
  fetchProfilePeek,
  getCachedProfilePeek,
  getSharedFollowState,
  normalizeProfilePeek,
  seedFollowState,
  toggleSharedFollow,
} from '../lib/profilePeekClient.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const profilePayload = {
  id: 'artist-1',
  username: 'Aurore',
  artistName: 'Aurore Noire',
  isArtist: true,
  isVerified: true,
  bio: 'Textures nocturnes.',
  followerCount: 12,
  tracksCount: 5,
  totalPlays: 321,
  isFollowing: false,
  tracks: [
    { id: 'private', title: 'Privé', audio_url: '/private.mp3', is_public: false, created_at: '2026-09-11' },
    { id: 'one', title: 'Une', audio_url: '/one.mp3', is_public: true, created_at: '2026-09-10' },
    { id: 'two', title: 'Deux', audio_url: '/two.mp3', is_public: true, created_at: '2026-09-09' },
    { id: 'three', title: 'Trois', audio_url: '/three.mp3', is_public: true, created_at: '2026-09-08' },
    { id: 'four', title: 'Quatre', audio_url: '/four.mp3', is_public: true, created_at: '2026-09-07' },
  ],
};

test('normalise uniquement trois morceaux publics récents et les stats réelles', () => {
  const profile = normalizeProfilePeek(profilePayload);
  assert.equal(profile.displayName, 'Aurore Noire');
  assert.equal(profile.role, 'Artiste');
  assert.equal(profile.isVerified, true);
  assert.deepEqual(profile.tracks.map((track) => track.id), ['one', 'two', 'three']);
  assert.equal(profile.followerCount, 12);
  assert.equal(profile.totalPlays, 321);
  assert.equal(profile.tracks[0].audioUrl, '/one.mp3');
});

test('première ouverture fetch une fois et réouverture utilise le cache chaud', async () => {
  clearProfilePeekClientCache();
  const previousFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify(profilePayload), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const first = await fetchProfilePeek('Aurore');
    const second = await fetchProfilePeek('aurore');
    assert.equal(first, second);
    assert.equal(requests, 1);
    assert.equal(getCachedProfilePeek('artist-1')?.username, 'Aurore');
  } finally {
    global.fetch = previousFetch;
  }
});

test('profil absent et inaccessible restent des erreurs bornées qui ne cassent pas Live', async () => {
  clearProfilePeekClientCache();
  const previousFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), { status: 404 });
  try {
    await assert.rejects(fetchProfilePeek('absent'), (error) => error.profileStatus === 'missing');
  } finally {
    global.fetch = previousFetch;
  }
});

test('la mutation follow met à jour la source partagée et le compteur', async () => {
  clearProfilePeekClientCache();
  seedFollowState('Aurore', false, 12);
  const previousFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ action: 'followed' }), { status: 200 });
  try {
    await toggleSharedFollow('aurore');
    assert.deepEqual(getSharedFollowState('AURORE'), {
      isFollowing: true,
      followerCount: 13,
      loading: false,
      mutating: false,
      error: null,
    });
  } finally {
    global.fetch = previousFetch;
  }
});

test('Profile Peek est enregistré lazy sans importer la page Profile complète', async () => {
  const registration = await read('components/profile/ProfilePeekRegistration.tsx');
  const surface = await read('components/profile/ProfilePeekSurface.tsx');
  assert.match(registration, /dynamic\(\(\) => import\('\.\/ProfilePeekSurface'\)/);
  assert.match(registration, /useContextSurfaceRenderer\('profile-peek'/);
  assert.doesNotMatch(registration + surface, /app\/profile|SynauraProfile/);
});

test('le harness Live complet est strictement borné au développement', async () => {
  const live = await read('app/dev/live/page.tsx');
  const profile = await read('app/dev/profile-peek/page.tsx');
  const discover = await read('app/dev/discover-profile-peek/page.tsx');
  for (const source of [live, profile, discover]) {
    assert.match(source, /process\.env\.NODE_ENV === 'production'/);
    assert.match(source, /notFound\(\)/);
  }
  assert.match(live, /<SynauraScroll \/>/);
});

test('Live, Discover et Search ouvrent le même contrôleur avec focus logique', async () => {
  const hook = await read('components/profile/useProfilePeek.ts');
  const live = await read('components/home/SynauraScroll.tsx');
  const discover = await read('app/discover/DiscoverMoodTiles.tsx');
  const search = await read('app/search/page.tsx');
  assert.match(hook, /surface: 'profile-peek'/);
  assert.match(hook, /entityType: 'profile'/);
  assert.match(hook, /decodeURIComponent\(pathname\)/);
  assert.match(live, /useProfilePeek\('live'\)/);
  assert.match(discover, /useProfilePeek\('discover'\)/);
  assert.match(search, /useProfilePeek\('search'\)/);
  assert.match(live + discover + search, /data-context-surface-trigger-key/);
});

test('ouvrir ou fermer ne commande pas AudioCore et écouter reste une action explicite', async () => {
  const hook = await read('components/profile/useProfilePeek.ts');
  const surface = await read('components/profile/ProfilePeekSurface.tsx');
  assert.doesNotMatch(hook, /useAudioPlayer|playTrack|setQueue|pause|seek/);
  assert.match(surface, /aria-label=\{`Écouter \$\{track\.title\}`\}/);
  assert.match(surface, /onClick=\{\(\) => playTrack/);
  assert.doesNotMatch(surface, /setQueueAndPlay|seek\(|pause\(|new Audio/);
});

test('le CTA ferme l’history contextuel avant la route canonique', async () => {
  const surface = await read('components/profile/ProfilePeekSurface.tsx');
  assert.match(surface, /`\/profile\/\$\{encodeURIComponent\(username\)\}`/);
  assert.match(surface, /window\.addEventListener\('popstate', navigate/);
  assert.ok(surface.indexOf('closeSurface();') < surface.indexOf('window.setTimeout(navigate'));
  assert.match(surface, /Ouvrir le profil complet/);
});

test('follow est partagé par Peek, Live et la route Profile', async () => {
  const followButton = await read('components/FollowButton.tsx');
  const profilePage = await read('app/profile/[username]/page.tsx');
  const surface = await read('components/profile/ProfilePeekSurface.tsx');
  for (const source of [followButton, profilePage, surface]) assert.match(source, /useSharedFollowState/);
  assert.doesNotMatch(followButton, /useState\(false\)/);
});

test('le rendu respecte drawer/sheet canonique, touch targets et focus initial', async () => {
  const overlay = await read('components/ui/SynauraOverlay.tsx');
  const controller = await read('components/context-surfaces/ContextSurfaceController.tsx');
  const surface = await read('components/profile/ProfilePeekSurface.tsx');
  assert.match(overlay, /clamp\(23\.75rem,30vw,30rem\)/);
  assert.match(surface, /h-\[82dvh\]/);
  assert.match(surface, /pb-\[calc\(9rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.doesNotMatch(surface, /Écoute explicite/);
  assert.match(controller, /data-context-surface-initial-focus/);
  assert.match(surface, /min-h-11/);
  assert.match(surface, /env\(safe-area-inset-bottom\)/);
});

test('Live reste monté et le peek ne crée pas de snapshot 4B.1 à son ouverture', async () => {
  const hook = await read('components/profile/useProfilePeek.ts');
  const live = await read('components/home/SynauraScroll.tsx');
  assert.doesNotMatch(hook, /saveLiveNavigationContext|attachLiveSnapshotToHistory|activeItemId/);
  assert.match(live, /persistOnNavigationIntent/);
  assert.match(live, /data-testid="synaura-scroll-feed"/);
});
