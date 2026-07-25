import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getWebProfileHref,
  isPrimaryWebRouteActive,
  PRIMARY_WEB_NAV_ITEMS,
  shouldShowPrimaryWebDock,
} from '../lib/primaryNavigation.ts';
import { navigatePrimaryTab, primaryTabTarget } from '../synaura-app/src/navigation/navigatePrimaryTab.ts';

test('reste dans le navigateur d onglets quand la destination y existe', () => {
  assert.deepEqual(
    primaryTabTarget(['Swipe', 'Discover', 'Create', 'Library', 'Profile'], 'Profile'),
    { name: 'Profile', params: undefined },
  );
});

test('repasse par Tabs depuis un ecran secondaire du stack racine', () => {
  assert.deepEqual(
    primaryTabTarget(['Tabs', 'TrackDetail', 'Stats'], 'Swipe'),
    { name: 'Tabs', params: { screen: 'Swipe' } },
  );
});

test('conserve les parametres lors du retour vers un onglet', () => {
  const calls = [];
  navigatePrimaryTab({
    getState: () => ({ routeNames: ['Tabs', 'CreatePost'] }),
    navigate: (...args) => calls.push(args),
  }, 'Profile', { tab: 'posts' });

  assert.deepEqual(calls, [['Tabs', { screen: 'Profile', params: { tab: 'posts' } }]]);
});

test('le dock web reprend les cinq destinations principales du natif', () => {
  assert.deepEqual(
    PRIMARY_WEB_NAV_ITEMS.map(({ id, label }) => ({ id, label })),
    [
      { id: 'home', label: 'Accueil' },
      { id: 'discover', label: 'Découvrir' },
      { id: 'create', label: 'Créer' },
      { id: 'library', label: 'Bibliothèque' },
      { id: 'profile', label: 'Profil' },
    ],
  );
});

test('les ecrans secondaires conservent leur onglet web actif', () => {
  assert.equal(isPrimaryWebRouteActive('discover', '/radar'), true);
  assert.equal(isPrimaryWebRouteActive('create', '/ai-generator'), true);
  assert.equal(isPrimaryWebRouteActive('library', '/playlists/playlist-1'), true);
  assert.equal(isPrimaryWebRouteActive('profile', '/settings'), true);
  assert.equal(isPrimaryWebRouteActive('home', '/discover'), false);
});

test('le dock web disparait sur les ecrans secondaires comme dans le natif', () => {
  assert.equal(shouldShowPrimaryWebDock('/discover'), true);
  assert.equal(shouldShowPrimaryWebDock('/library'), true);
  assert.equal(shouldShowPrimaryWebDock('/profile/XimaMOff', 'ximamoff'), true);
  assert.equal(shouldShowPrimaryWebDock('/profile/mixxparty', 'ximamoff'), false);
  assert.equal(shouldShowPrimaryWebDock('/profile/XimaMOff'), false);
  assert.equal(shouldShowPrimaryWebDock('/notifications'), false);
  assert.equal(shouldShowPrimaryWebDock('/messages/conversation-1'), false);
  assert.equal(shouldShowPrimaryWebDock('/track/track-1'), false);
  assert.equal(shouldShowPrimaryWebDock('/settings'), false);
});

test('le profil web cible le compte courant ou la connexion', () => {
  assert.equal(getWebProfileHref('xima m', true), '/profile/xima%20m');
  assert.equal(getWebProfileHref(null, true), '/settings');
  assert.equal(getWebProfileHref(null, false), '/auth/signin?callbackUrl=%2F');
});
