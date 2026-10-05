import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SETTINGS_GROUPS, matchesSetting } from '../synaura-app/src/settings/settingsCatalog.ts';
import { createNotificationRequestGate } from '../synaura-app/src/notifications/requestGate.ts';

const settings = fs.readFileSync('synaura-app/src/screens/SettingsScreen.tsx', 'utf8');
const activity = fs.readFileSync('synaura-app/src/screens/NotificationsScreen.tsx', 'utf8');

test('settings retains each existing category exactly once', () => {
  const keys = SETTINGS_GROUPS.flatMap(group => group.keys).sort();
  assert.deepEqual(keys, ['abonnement', 'compte', 'events', 'legal', 'notifications', 'parrainage', 'preferences', 'profil', 'securite', 'updates']);
  assert.equal(new Set(keys).size, keys.length);
});
test('settings search is accent/case/space tolerant', () => {
  assert.equal(matchesSetting(' THEME ', 'Préférences', 'Thème, lecture et animations'), true);
  assert.equal(matchesSetting('securite', 'Sécurité', 'Protection du compte'), true);
  assert.equal(matchesSetting('', 'Profil', 'Identité'), true);
  assert.equal(matchesSetting('inexistant', 'Profil', 'Identité'), false);
});
test('late notification response cannot replace the most recent filter', async () => {
  const gate = createNotificationRequestGate();
  const active = [];
  const first = gate.begin();
  const second = gate.begin();
  const third = gate.begin();
  if (third()) active.push('C');
  await Promise.resolve();
  if (first()) active.push('A');
  if (second()) active.push('B');
  assert.deepEqual(active, ['C']);
});
test('blur/account change/mutation invalidates an in-flight notification load', () => {
  const gate = createNotificationRequestGate();
  const old = gate.begin();
  assert.equal(old(), true);
  gate.invalidate();
  assert.equal(old(), false);
  const current = gate.begin();
  assert.equal(current(), true);
  assert.equal(old(), false);
});
test('guest settings expose only local preferences and legal documents', () => {
  const guest = settings.slice(settings.indexOf('  if (!auth.user) {'), settings.indexOf('  const activeCategory'));
  assert.match(guest, /LocalPreferences/);
  assert.match(guest, /legalDocuments.map/);
  assert.match(guest, /returnTo: \{ screen: 'Settings' \}/);
  const local = settings.slice(settings.indexOf('function LocalPreferences'), settings.indexOf('function Section'));
  for (const key of ['autoplay', 'highQuality', 'dataSaver', 'coverVideos', 'dynamicBackground', 'reducedMotion', 'themeMode']) assert.ok(local.includes(key));
  assert.doesNotMatch(local, /updateUserPreferences|updateProfile|nativePush|deleteAccount/);
  assert.match(settings, /deleteConfirm.trim\(\).toUpperCase\(\) !== 'SUPPRIMER'/);
  assert.match(settings, /auth.enableBiometric|auth.*Biometric/);
});
test('settings fields and toggles have explicit accessible names; Android Back follows sections', () => {
  assert.match(settings, /TextInput accessibilityLabel=\{label\}/);
  assert.match(settings, /Switch accessibilityLabel=\{label\}/);
  assert.match(settings, /BackHandler.addEventListener\('hardwareBackPress'/);
  assert.match(settings, /if \(tab !== 'overview'\) \{ setTab\('overview'\); return true;/);
  assert.match(settings, /keyboardDismissMode="on-drag"/);
});
test('activity guards guest fetches, keeps actual actions and restores failed mutations in cache', () => {
  assert.match(activity, /if \(!auth.user \|\| !auth.token\)/);
  assert.match(activity, /if \(!isCurrent\(\)\) return;/);
  for (const name of ['getNotifications', 'markAllNotificationsRead', 'markNotificationRead', 'deleteNotification', 'openInternalLink']) assert.ok(activity.includes(name));
  assert.equal(activity.match(/persistCache\(previousItems, previousUnread\)/g).length, 2);
  assert.match(activity, /label="Tout marquer comme lu"/);
  assert.match(activity, /label="Préférences de notifications"/);
  assert.match(activity, /error \? 'Activité indisponible' : 'Tout est calme'/);
});
test('swipe reveals delete without automatically deleting; reduced motion is respected', () => {
  const release = activity.slice(activity.indexOf('onPanResponderRelease:'), activity.indexOf('onPanResponderTerminate:'));
  assert.doesNotMatch(release, /onRemove|remove\(/);
  assert.match(activity, /accessibilityActions=\{\[\{ name: 'delete'/);
  assert.match(activity, /if \(!motion\) \{ translateX.setValue/);
  assert.match(activity, /rowUnread: \{ backgroundColor: colors.surface \}/);
});
