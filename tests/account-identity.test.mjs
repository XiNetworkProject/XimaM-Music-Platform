import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MOBILE_AUTH_CALLBACK_URL,
  ageOnDate,
  isAllowedMobileAuthRedirect,
  isValidUsername,
  normalizeEmail,
  normalizePhoneNumber,
  normalizeUsername,
  parseBirthDate,
  validateBirthDate,
} from '../lib/accountIdentity.ts';
import {
  MOBILE_AUTH_CALLBACK_URL as NATIVE_CALLBACK_URL,
  mobileAuthCallbackSignature,
  parseMobileAuthCallback,
} from '../synaura-app/src/auth/authCallback.ts';

test('normalise les identifiants saisis par un membre', () => {
  assert.equal(normalizeEmail('  MAX@Example.COM '), 'max@example.com');
  assert.equal(normalizeUsername(' Maxime Musique! '), 'maxime_musique');
  assert.equal(isValidUsername('max_music_75'), true);
  assert.equal(isValidUsername('ab'), false);
});

test('convertit les numeros francais en E.164 sans accepter une valeur ambigue', () => {
  assert.equal(normalizePhoneNumber('06 12 34 56 78'), '+33612345678');
  assert.equal(normalizePhoneNumber('0033 6 12 34 56 78'), '+33612345678');
  assert.equal(normalizePhoneNumber('+1 (415) 555-2671'), '+14155552671');
  assert.equal(normalizePhoneNumber('123'), '');
});

test('valide une vraie date et calcule un age sans decalage de fuseau', () => {
  const leapDay = parseBirthDate('2008-02-29');
  assert.ok(leapDay);
  assert.equal(ageOnDate(leapDay, new Date('2026-02-28T12:00:00Z')), 17);
  assert.equal(ageOnDate(leapDay, new Date('2026-03-01T12:00:00Z')), 18);
  assert.equal(parseBirthDate('2025-02-29'), null);
});

test('applique la limite de quinze ans au jour pres', () => {
  const now = new Date('2026-07-27T12:00:00Z');
  assert.deepEqual(validateBirthDate('2011-07-27', now), {
    valid: true,
    value: '2011-07-27',
  });
  assert.equal(validateBirthDate('2011-07-28', now).valid, false);
  assert.equal(validateBirthDate('2027-01-01', now).valid, false);
});

test('n autorise que le lien profond mobile prevu pour OAuth', () => {
  assert.equal(isAllowedMobileAuthRedirect(MOBILE_AUTH_CALLBACK_URL), true);
  assert.equal(isAllowedMobileAuthRedirect('https://evil.example/callback'), false);
  assert.equal(isAllowedMobileAuthRedirect('synaura://auth/callback/extra'), false);
});

test('lit les jetons OAuth dans le fragment sans les conserver dans la signature', () => {
  const url = `${NATIVE_CALLBACK_URL}#access_token=access-secret&refresh_token=refresh-secret&type=bearer`;
  assert.deepEqual(parseMobileAuthCallback(url), {
    accessToken: 'access-secret',
    refreshToken: 'refresh-secret',
  });
  const signature = mobileAuthCallbackSignature(url);
  assert.equal(signature.includes('secret'), false);
  assert.match(signature, /^\d+:\d+$/);
});

test('refuse un callback externe incomplet ou en erreur', () => {
  assert.equal(parseMobileAuthCallback('synaura://messages/123'), null);
  assert.equal(
    parseMobileAuthCallback('synaura://auth/callback-attacker#access_token=a&refresh_token=b'),
    null,
  );
  assert.throws(
    () => parseMobileAuthCallback(`${NATIVE_CALLBACK_URL}#error_description=Acces+refuse`),
    /Acces refuse/,
  );
  assert.throws(
    () => parseMobileAuthCallback(`${NATIVE_CALLBACK_URL}#access_token=only-one-token`),
    /incomplete/,
  );
});
