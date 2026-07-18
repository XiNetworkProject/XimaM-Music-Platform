import assert from 'node:assert/strict';
import test from 'node:test';

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
