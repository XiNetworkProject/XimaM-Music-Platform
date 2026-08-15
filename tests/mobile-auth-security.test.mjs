import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NEXTAUTH_SECRET = 'test-only-mobile-auth-secret-with-enough-entropy';

const security = await import('../lib/mobileAuthSecurity.ts');

test('verifie les codes TOTP compatibles avec les applications Authenticator', () => {
  const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(security.totpCodeAt(rfcSecret, 59_000), '287082');
  assert.equal(security.verifyTotpCode(rfcSecret, '287082', 59_000), true);
  assert.equal(security.verifyTotpCode(rfcSecret, '000000', 59_000), false);
});

test('accepte une fenetre TOTP adjacente sans elargir au-dela', () => {
  const secret = security.generateTotpSecret();
  const now = 1_750_000_000_000;
  const previous = security.totpCodeAt(secret, now - 30_000);
  const tooOld = security.totpCodeAt(secret, now - 60_000);
  assert.equal(security.verifyTotpCode(secret, previous, now), true);
  assert.equal(security.verifyTotpCode(secret, tooOld, now), false);
});

test('le challenge SMS signe ne contient pas le code et refuse les substitutions', () => {
  const phone = '+33612345678';
  const challenge = security.createPhoneOtpChallenge(phone, 'phone-login');
  assert.equal(challenge.challengeToken.includes(challenge.code), false);
  assert.equal(security.verifyPhoneOtpChallenge(phone, challenge.code, challenge.challengeToken, 'phone-login'), true);
  assert.equal(security.verifyPhoneOtpChallenge(phone, '000000', challenge.challengeToken, 'phone-login'), false);
  assert.equal(security.verifyPhoneOtpChallenge('+33600000000', challenge.code, challenge.challengeToken, 'phone-login'), false);
  assert.equal(security.verifyPhoneOtpChallenge(phone, challenge.code, challenge.challengeToken, 'phone-link'), false);
});
