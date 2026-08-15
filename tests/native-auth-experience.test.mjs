import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const appConfig = JSON.parse(read('synaura-app/app.json')).expo;
const nativePackage = JSON.parse(read('synaura-app/package.json'));
const appSource = read('synaura-app/src/App.tsx');
const authProvider = read('synaura-app/src/auth/AuthProvider.tsx');
const accountRoute = read('app/api/auth/mobile/account/route.ts');
const phoneStartRoute = read('app/api/auth/mobile/phone/start/route.ts');
const phoneVerifyRoute = read('app/api/auth/mobile/phone/verify/route.ts');
const authSecurity = read('lib/mobileAuthSecurity.ts');

test('la biometrie reste un verrou local fort et ne devient jamais une identite serveur', () => {
  assert.equal(nativePackage.dependencies['expo-local-authentication'], '~17.0.8');
  assert.ok(appConfig.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-local-authentication'));
  assert.match(authProvider, /LocalAuthentication\.authenticateAsync/);
  assert.match(authProvider, /biometricsSecurityLevel:\s*'strong'/);
  assert.match(authProvider, /SecureStore\.(?:getItemAsync|setItemAsync)/);
  assert.match(appSource, /auth\.biometricLocked/);
  assert.match(appSource, /<BiometricLockScreen\s*\/\s*>/);
  assert.doesNotMatch(authProvider, /\/api\/auth\/mobile\/biometric/);
});

test('la finalisation de compte exige la session MFA, les champs prives et les consentements', () => {
  assert.match(appSource, /<CompleteAccountScreen\s*\/\s*>/);
  assert.match(authProvider, /completeProfile:\s*true/);
  assert.match(accountRoute, /if\s*\(!auth\.authorized\)/);
  assert.match(accountRoute, /body\.acceptTerms\s*!==\s*true/);
  assert.match(accountRoute, /body\.acceptPrivacy\s*!==\s*true/);
  assert.match(accountRoute, /validateBirthDate/);
  assert.match(accountRoute, /withDatabaseTransaction/);
});

test('le telephone utilise un challenge signe et reste desactive sans passerelle configuree', () => {
  assert.match(phoneStartRoute, /getMobileAuthCapabilities/);
  assert.match(phoneStartRoute, /createPhoneOtpChallenge/);
  assert.match(phoneVerifyRoute, /verifyPhoneOtpChallenge/);
  assert.match(phoneVerifyRoute, /matchOrCreatePhoneAccount/);
  assert.match(authSecurity, /MOBILE_PHONE_AUTH_ENABLED/);
  assert.match(authSecurity, /SMS_GATEWAY_URL/);
  assert.match(authSecurity, /timingSafeEqual/);
});

test('le provider natif avance reste independant de Supabase, Vercel et Cloudinary', () => {
  assert.doesNotMatch(authProvider, /@supabase|supabase\.co|vercel\.app|cloudinary\.com/i);
  assert.match(authProvider, /\/api\/auth\/mobile\/mfa/);
  assert.match(authProvider, /\/api\/auth\/mobile\/account/);
  assert.match(authProvider, /toPublicMediaUrl/);
});
