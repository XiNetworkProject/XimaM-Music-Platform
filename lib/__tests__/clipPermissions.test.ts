// Tests de la micro-correction de securite : droits de creation des Clips.
// Execution : node --test lib/__tests__/clipPermissions.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canCreateClip, canUseSoundClientSide } from '../clipPermissions.ts';

test('1. proprietaire + allowClips=false sur morceau public -> creation autorisee', () => {
  const result = canCreateClip({
    isPublic: true,
    isOwner: true,
    allowClips: false,
    remixVisibility: 'disabled',
    isFollower: false,
  });
  assert.equal(result, true);
});

test('2. autre utilisateur + allowClips=false -> refuse (403)', () => {
  const result = canCreateClip({
    isPublic: true,
    isOwner: false,
    allowClips: false,
    remixVisibility: 'everyone',
    isFollower: false,
  });
  assert.equal(result, false);
});

test("3. autre utilisateur + remixVisibility=followers sans suivi reel -> refuse (403)", () => {
  const result = canCreateClip({
    isPublic: true,
    isOwner: false,
    allowClips: true,
    remixVisibility: 'followers',
    isFollower: false,
  });
  assert.equal(result, false);
});

test('4. follower reel autorise -> creation autorisee', () => {
  const result = canCreateClip({
    isPublic: true,
    isOwner: false,
    allowClips: true,
    remixVisibility: 'followers',
    isFollower: true,
  });
  assert.equal(result, true);
});

test('5. morceau prive -> creation de Clip public refusee (meme pour le proprietaire)', () => {
  const asOwner = canCreateClip({
    isPublic: false,
    isOwner: true,
    allowClips: true,
    remixVisibility: 'everyone',
    isFollower: false,
  });
  const asOther = canCreateClip({
    isPublic: false,
    isOwner: false,
    allowClips: true,
    remixVisibility: 'everyone',
    isFollower: false,
  });
  assert.equal(asOwner, false);
  assert.equal(asOther, false);
});

test('bonus: remixVisibility=disabled bloque toujours les autres utilisateurs, meme allowClips=true', () => {
  const result = canCreateClip({
    isPublic: true,
    isOwner: false,
    allowClips: true,
    remixVisibility: 'disabled',
    isFollower: false,
  });
  assert.equal(result, false);
});

// Pré-vérification côté client (bouton "Utiliser ce son" / "Créer un clip officiel")

test('canUseSoundClientSide: proprietaire -> bouton visible meme si allowClips=false', () => {
  assert.equal(canUseSoundClientSide({ isOwner: true, allowClips: false, remixVisibility: 'disabled' }), true);
});

test('canUseSoundClientSide: autre utilisateur + allowClips=false -> bouton masque', () => {
  assert.equal(canUseSoundClientSide({ isOwner: false, allowClips: false, remixVisibility: 'everyone' }), false);
});

test('canUseSoundClientSide: autre utilisateur + remixVisibility=disabled -> bouton masque', () => {
  assert.equal(canUseSoundClientSide({ isOwner: false, allowClips: true, remixVisibility: 'disabled' }), false);
});

test('canUseSoundClientSide: autre utilisateur + allowClips=true + everyone -> bouton visible', () => {
  assert.equal(canUseSoundClientSide({ isOwner: false, allowClips: true, remixVisibility: 'everyone' }), true);
});

test('canUseSoundClientSide: autre utilisateur + allowClips=true + followers -> optimiste (le serveur tranche au moment de la creation)', () => {
  assert.equal(canUseSoundClientSide({ isOwner: false, allowClips: true, remixVisibility: 'followers' }), true);
});
