// Tests de la logique de visibilité publique des morceaux (correctif de
// confidentialité) et des gardes d'ajout/publication de playlist.
// Exécution : node --test lib/__tests__/publicTracks.test.ts
// Ne touche à aucune base de données : tout est joué sur des objets en mémoire.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canAddTrackToPlaylist,
  canViewAiTrack,
  canViewTrack,
  findNonPublicTracks,
  isAiTrackPublic,
  isTrackPublic,
} from '../publicTracks.ts';

const OWNER = 'user-owner';
const OTHER = 'user-other';

function publicTrack(overrides: Record<string, any> = {}) {
  return { id: 't-public', creator_id: OWNER, is_public: true, audio_url: 'https://cdn.example/audio.mp3', ...overrides };
}

function draftTrack(overrides: Record<string, any> = {}) {
  return { id: 't-draft', creator_id: OWNER, is_public: false, audio_url: 'https://cdn.example/audio.mp3', ...overrides };
}

function aiTrack(overrides: Record<string, any> = {}) {
  return {
    id: 'ai-1',
    is_public: true,
    audio_url: 'https://cdn.example/ai-audio.mp3',
    generation: { user_id: OWNER, is_public: true, status: 'completed' },
    ...overrides,
  };
}

// --- Track classique -------------------------------------------------------

test('track classique public avec audio -> visible', () => {
  assert.equal(isTrackPublic(publicTrack()), true);
});

test('track classique privé -> invisible publiquement', () => {
  assert.equal(isTrackPublic(draftTrack()), false);
});

test('track classique public sans audio -> invisible publiquement', () => {
  assert.equal(isTrackPublic(publicTrack({ audio_url: null })), false);
  assert.equal(isTrackPublic(publicTrack({ audio_url: '' })), false);
  assert.equal(isTrackPublic(publicTrack({ audio_url: '   ' })), false);
});

// --- Track IA ---------------------------------------------------------------

test('AI track public mais génération privée -> invisible publiquement', () => {
  const track = aiTrack({ generation: { user_id: OWNER, is_public: false, status: 'completed' } });
  assert.equal(isAiTrackPublic(track), false);
});

test('AI track avec is_public=true mais génération non completed -> invisible publiquement', () => {
  const track = aiTrack({ generation: { user_id: OWNER, is_public: true, status: 'pending' } });
  assert.equal(isAiTrackPublic(track), false);
});

test('AI track public avec génération completed et audio -> visible', () => {
  assert.equal(isAiTrackPublic(aiTrack()), true);
});

test('AI track sans audio jouable -> invisible même si tout le reste est public', () => {
  assert.equal(isAiTrackPublic(aiTrack({ audio_url: null })), false);
});

// --- Bypass propriétaire ------------------------------------------------------

test('propriétaire -> accès à son propre brouillon (track classique)', () => {
  assert.equal(canViewTrack(draftTrack(), OWNER), true);
});

test('autre utilisateur -> aucun accès au brouillon (track classique)', () => {
  assert.equal(canViewTrack(draftTrack(), OTHER), false);
});

test('visiteur anonyme (viewerId absent) -> aucun accès au brouillon', () => {
  assert.equal(canViewTrack(draftTrack(), null), false);
  assert.equal(canViewTrack(draftTrack(), undefined), false);
});

test('propriétaire -> accès à sa propre création IA non publiée', () => {
  const track = aiTrack({ generation: { user_id: OWNER, is_public: false, status: 'pending' } });
  assert.equal(canViewAiTrack(track, OWNER), true);
});

test('autre utilisateur -> aucun accès à une création IA non publiée', () => {
  const track = aiTrack({ generation: { user_id: OWNER, is_public: false, status: 'pending' } });
  assert.equal(canViewAiTrack(track, OTHER), false);
});

// --- Garde d'ajout à une playlist --------------------------------------------

test('playlist publique + track privé -> ajout refusé', () => {
  const result = canAddTrackToPlaylist({ playlistIsPublic: true, playlistOwnerId: OWNER, track: draftTrack() });
  assert.equal(result, false);
});

test('playlist publique + track public -> ajout autorisé', () => {
  const result = canAddTrackToPlaylist({ playlistIsPublic: true, playlistOwnerId: OWNER, track: publicTrack() });
  assert.equal(result, true);
});

test('playlist publique + propre brouillon du propriétaire -> ajout refusé quand même (règle stricte : publique = publiquement visible uniquement)', () => {
  const result = canAddTrackToPlaylist({ playlistIsPublic: true, playlistOwnerId: OWNER, track: draftTrack({ creator_id: OWNER }) });
  assert.equal(result, false);
});

test('playlist privée + propre brouillon -> ajout autorisé', () => {
  const result = canAddTrackToPlaylist({ playlistIsPublic: false, playlistOwnerId: OWNER, track: draftTrack({ creator_id: OWNER }) });
  assert.equal(result, true);
});

test("playlist privée + brouillon d'un autre utilisateur -> ajout refusé", () => {
  const result = canAddTrackToPlaylist({ playlistIsPublic: false, playlistOwnerId: OWNER, track: draftTrack({ creator_id: OTHER }) });
  assert.equal(result, false);
});

test('playlist privée + track public -> ajout autorisé', () => {
  const result = canAddTrackToPlaylist({ playlistIsPublic: false, playlistOwnerId: OWNER, track: publicTrack({ creator_id: OTHER }) });
  assert.equal(result, true);
});

// --- Passage privé -> public -------------------------------------------------

test('passage privé -> public avec un morceau privé dans la playlist : comportement choisi = refus explicite (findNonPublicTracks non vide)', () => {
  const tracks = [publicTrack({ id: 't1' }), draftTrack({ id: 't2' })];
  const blocking = findNonPublicTracks(tracks);
  assert.equal(blocking.length, 1);
  assert.equal(blocking[0].id, 't2');
  // Le call site (PUT /api/playlists/[id]) doit refuser la publication tant que
  // cette liste n'est pas vide, sans jamais retirer de morceaux automatiquement.
});

test('passage privé -> public avec uniquement des morceaux publics : aucun blocage', () => {
  const tracks = [publicTrack({ id: 't1' }), publicTrack({ id: 't2', audio_url: 'https://cdn.example/a2.mp3' })];
  assert.deepEqual(findNonPublicTracks(tracks), []);
});

test('playlist vide -> jamais bloquante', () => {
  assert.deepEqual(findNonPublicTracks([]), []);
});
