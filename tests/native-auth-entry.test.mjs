import test from 'node:test';
import assert from 'node:assert/strict';
import { entryIdentity, entryRoute, rememberAuthDestination, takeAuthDestination } from '../synaura-app/src/auth/entryGate.ts';

const guest = { loading: false, token: null, user: null, biometricLocked: false, mfaRequired: false };
const member = { ...guest, token: 'test-token', user: { id: 'member', profileComplete: true } };

test('guest > password > TOTP > Live never reuses Welcome', () => {
  const guestGate = { identity: entryIdentity(guest), route: entryRoute('guest', false) };
  assert.equal(guestGate.route, 'Welcome');
  assert.equal(entryIdentity({ ...member, mfaRequired: true }), null);
  const authorized = entryIdentity(member);
  assert.notEqual(authorized, guestGate.identity);
  assert.equal(entryRoute(authorized, true), 'Tabs');
  assert.equal(entryRoute(authorized, false), 'Onboarding');
});
test('loading, biometrics, MFA and incomplete profile cannot resolve the app entry', () => {
  for (const blocked of [{ loading: true }, { biometricLocked: true }, { mfaRequired: true }, { user: { id: 'member', profileComplete: false } }]) {
    assert.equal(entryIdentity({ ...member, ...blocked }), null);
  }
});
test('refresh leaves navigation stable; logout and account switching invalidate it', () => {
  assert.equal(entryIdentity({ ...member, token: 'refreshed-token' }), entryIdentity(member));
  assert.notEqual(entryIdentity(guest), entryIdentity(member));
  assert.notEqual(entryIdentity({ ...member, user: { id: 'other' } }), entryIdentity(member));
});
test('return destination survives the unmounted login/MFA screens and is consumed once', () => {
  rememberAuthDestination({ screen: 'Library' });
  assert.equal(entryIdentity({ ...member, mfaRequired: true }), null);
  assert.deepEqual(takeAuthDestination(), { screen: 'Library' });
  assert.equal(takeAuthDestination(), undefined);
});
