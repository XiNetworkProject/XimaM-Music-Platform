import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { sameStudioTrack, uniqueStudioTracks } from '../lib/studio/trackIdentity.ts';
import { mergeProviderTrack, persistPreparedTracks } from '../lib/studio/trackPersistence.ts';
import { initialGenerationFolder } from '../lib/studio/generationSettings.ts';
import { isAiTrackPublic, canViewAiTrack } from '../lib/publicTracks.ts';
import { lyricSegments } from '../lib/studio/lyricAlignment.ts';

const read = path => fs.readFileSync(path, 'utf8');
function load(path, bindings) {
  const module = { exports: {} };
  const source = ts.transpileModule(read(path), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', source)(name => { assert.ok(name in bindings, `Unexpected dependency: ${name}`); return bindings[name]; }, module, module.exports);
  return module.exports;
}
function databaseFixture() {
  const tables = { ai_generations: [{ id: 'gen', user_id: 'owner', task_id: 'job', status: 'completed', is_public: false, metadata: { title: 'Idée' } }], ai_tracks: [] };
  let failReads = false;
  const db = { from(table) {
    const filters = []; let operation = 'select', payload, fields = '*'; let one = false;
    const q = {
      select(value) { fields = value; return q; }, eq(key, value) { filters.push(row => row[key] === value); return q; }, order() { return q; },
      insert(value) { operation = 'insert'; payload = value; return q; }, update(value) { operation = 'update'; payload = value; return q; },
      single() { one = true; return q; }, maybeSingle() { one = true; return q; },
      async then(resolve, reject) { try {
        if (failReads && operation === 'select' && table === 'ai_tracks') return resolve({ error: { message: 'read failed' } });
        let matches = tables[table].filter(row => filters.every(filter => filter(row)));
        if (operation === 'insert') { matches = (Array.isArray(payload) ? payload : [payload]).map(row => ({ id: `row-${tables[table].length + 1}`, ...structuredClone(row) })); tables[table].push(...matches); }
        if (operation === 'update') matches.forEach(row => Object.assign(row, structuredClone(payload)));
        const output = matches.map(row => ({ ...structuredClone(row), ...(fields.includes('generation:') ? { generation: structuredClone(tables.ai_generations.find(g => g.id === row.generation_id)) } : {}) }));
        return resolve({ data: one ? output[0] : output, error: null });
      } catch (error) { return reject(error); } },
    }; return q;
  } };
  let queue = Promise.resolve(); let locks = 0;
  const tx = async callback => {
    const previous = queue; let release; queue = new Promise(resolve => { release = resolve; }); await previous;
    let locked = false;
    try { return await callback({ query: async (sql, args) => {
      assert.match(sql, /FROM ai_generations WHERE id = \$1.*FOR UPDATE/); assert.equal(args[0], 'gen'); locked = true; locks++;
      const rows = tables.ai_generations.filter(row => row.id === args[0] && (!args[1] || row.user_id === args[1])); return { rows, rowCount: rows.length };
    } }); } finally { assert.ok(locked, 'writes require the generation lock'); release(); }
  };
  return { tables, db, tx, locks: () => locks, failReads: () => { failReads = true; } };
}

test('ten competing callback/browser saves persist two provider versions, not four', async () => {
  const fixture = databaseFixture();
  const { aiGenerationService } = load('lib/aiGenerationService.ts', {
    './database': { db: fixture.db, dbAdmin: fixture.db, createDatabaseClient: () => fixture.db },
    './postgres': { withDatabaseTransaction: fixture.tx }, './studio/generationSettings': { initialGenerationFolder },
    './studio/trackPersistence': { persistPreparedTracks },
    '@/lib/suno-media-cache': { cacheSunoTrackMedia: async input => { await new Promise(resolve => setImmediate(resolve)); return { audioUrl: input.audioUrl, streamUrl: '', imageUrl: 'cover', sourceLinksPatch: {} }; } },
    '@/lib/remixServer': { upsertDraftRemixesForGeneration: async () => {} },
  });
  const tracks = [{ id: 'audio-A', title: 'Même titre', audio: 'final-A', duration: 180 }, { id: 'audio-B', title: 'Même titre', audio: 'final-B', duration: 180 }];
  await Promise.all(Array.from({ length: 10 }, () => aiGenerationService.saveTracks('gen', [...tracks, tracks[0]])));
  assert.equal(fixture.tables.ai_tracks.length, 2); assert.equal(fixture.locks(), 10);
  fixture.failReads(); await assert.rejects(aiGenerationService.saveTracks('gen', tracks)); assert.equal(fixture.tables.ai_tracks.length, 2);
});

test('late provider enrichment preserves artist title/cover/folder and refreshes media metadata', () => {
  const old = { title: 'Mon titre', image_url: 'own-cover', audio_url: 'final', source_links: { artist_title_edited_at: 'now', artist_cover_edited_at: 'now', library_folder: null, provider_audio_url: 'expired' } };
  const patch = mergeProviderTrack({ generation_id: 'g', suno_id: 'a', title: 'Provider', image_url: 'provider-cover', audio_url: '', source_links: JSON.stringify({ library_folder: 'Original', provider_audio_url: 'fresh' }) }, old);
  assert.equal(patch.title, 'Mon titre'); assert.equal(patch.image_url, 'own-cover'); assert.equal(patch.audio_url, 'final');
  assert.equal(JSON.parse(patch.source_links).library_folder, null); assert.equal(JSON.parse(patch.source_links).provider_audio_url, 'fresh'); assert.equal(patch.suno_id, undefined);
});

test('provisional and saved IDs merge without hiding distinct versions of the same title', () => {
  const a = { id: 'db-A', sunoAudioId: 'provider-A', generationTaskId: 'job', title: 'Identique' };
  assert.ok(sameStudioTrack(a, { id: 'provider-A', generationTaskId: 'job' }));
  assert.ok(!sameStudioTrack(a, { id: 'provider-A', generationTaskId: 'other-job' }));
  assert.equal(uniqueStudioTracks([{ track: a }, { track: { ...a, id: 'duplicate' } }, { track: { ...a, id: 'db-B', sunoAudioId: 'provider-B' } }]).length, 2);
});

test('publication opens both visibility gates, never publishes the sibling, and enforces ownership', async () => {
  const fixture = databaseFixture();
  fixture.tables.ai_tracks.push({ id: 'a', generation_id: 'gen', audio_url: 'audio', is_public: false }, { id: 'b', generation_id: 'gen', audio_url: 'audio', is_public: null });
  let who = 'owner';
  const route = load('app/api/ai/tracks/[id]/visibility/route.ts', {
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
    '@/lib/getApiSession': { getApiSession: async () => who ? { user: { id: who } } : null },
    '@/lib/database': { dbAdmin: fixture.db, createDatabaseClient: () => fixture.db }, '@/lib/postgres': { withDatabaseTransaction: fixture.tx },
    '@/lib/security/requestSecurity': { rejectUntrustedMutationOrigin: () => null, enforceRequestRateLimit: () => null, readLimitedJson: async req => ({ ok: true, value: await req.json() }) },
    '@/lib/remixPermissions': { remixPermissionsFromRow: () => ({}), remixPermissionsToRow: () => ({}), sanitizeRemixPermissions: () => ({}) },
    '@/lib/remixServer': { applyRemixPublicationGuard: async ({ requestedPublic }) => ({ effectivePublic: requestedPublic, remixStatus: requestedPublic ? 'published' : 'draft' }) },
  });
  const request = value => route.PATCH({ json: async () => ({ isPublic: value }) }, { params: Promise.resolve({ id: 'a' }) });
  who = 'other'; assert.equal((await request(true)).status, 403); assert.equal(fixture.locks(), 0);
  who = ''; assert.equal((await request(true)).status, 401);
  who = 'owner'; assert.equal((await request(true)).data.isPublic, true);
  assert.ok(isAiTrackPublic({ ...fixture.tables.ai_tracks[0], generation: fixture.tables.ai_generations[0] }));
  assert.equal(fixture.tables.ai_tracks[1].is_public, false);
  assert.equal((await request(false)).data.isPublic, false);
  assert.ok(!isAiTrackPublic({ ...fixture.tables.ai_tracks[0], generation: fixture.tables.ai_generations[0] }));
  fixture.tables.ai_generations[0].status = 'pending'; assert.equal((await request(true)).status, 409);
});

test('metadata edits reject foreign covers, keep owner checks and expose one lyric surface', () => {
  const route = read('app/api/ai/tracks/[id]/route.ts');
  for (const text of ['isLocalMediaOwnedBy(body.coverPublicId, session.user.id)', "isLocalMediaReference(body.coverUrl, body.coverPublicId, 'ai-cover')", 'artist_title_edited_at', 'artist_cover_edited_at', 'FOR UPDATE', 'readLimitedJson', 'rejectUntrustedMutationOrigin', 'canViewAiTrack(data, session?.user?.id)']) assert.ok(route.includes(text), text);
  const view = read('components/ai-studio/UnifiedStudio.tsx');
  assert.match(view, /<StudioSyncedLyrics/); assert.doesNotMatch(view, /\{p.actions.timedLyrics\}/);
  assert.match(read('components/ai-studio/StudioPanelResize.tsx'), /setPointerCapture/);
  assert.match(read('components/ai-studio/StudioPanelResize.tsx'), /ArrowLeft/);
  assert.match(read('components/ai-studio/StudioLibrary.tsx'), /sw-pending-song/);
  assert.doesNotMatch(read('components/ai-studio/StudioLibrary.tsx'), /<progress|sw-fresh/);
});

test('metadata route persists title/cover/folder, forbids other owners and protects private GET', async () => {
  const fixture = databaseFixture(); let who = 'owner';
  fixture.tables.ai_tracks.push({ id: 'a', generation_id: 'gen', title: 'Avant', image_url: 'old-cover', is_public: false, source_links: { library_folder: 'Album', provider_audio_url: 'audio' } });
  const route = load('app/api/ai/tracks/[id]/route.ts', {
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
    '@/lib/getApiSession': { getApiSession: async () => who ? { user: { id: who } } : null },
    '@/lib/database': { dbAdmin: fixture.db, createDatabaseClient: () => fixture.db }, '@/lib/postgres': { withDatabaseTransaction: fixture.tx },
    '@/lib/localMediaStorage': { isLocalMediaOwnedBy: (id, owner) => id === `cover-${owner}`, isLocalMediaReference: (url, id, kind) => url === 'own-cover-url' && id === 'cover-owner' && kind === 'ai-cover' },
    '@/lib/publicTracks': { canViewAiTrack },
    '@/lib/security/requestSecurity': { rejectUntrustedMutationOrigin: () => null, enforceRequestRateLimit: () => null, readLimitedJson: async req => ({ ok: true, value: await req.json() }) },
  });
  const request = body => route.PATCH({ json: async () => body }, { params: { id: 'a' } });
  assert.equal((await request({ title: ' ' })).status, 400);
  assert.equal((await request({ title: 'x'.repeat(161) })).status, 400);
  assert.equal((await request({ coverUrl: 'remote-url', coverPublicId: 'cover-other' })).status, 400);
  who = 'other'; assert.equal((await request({ title: 'Volé' })).status, 403);
  assert.equal((await route.GET({}, { params: { id: 'a' } })).status, 404);
  who = 'owner'; const result = await request({ title: '  Mon titre  ', coverUrl: 'own-cover-url', coverPublicId: 'cover-owner' });
  assert.equal(result.status, 200); assert.equal(fixture.tables.ai_tracks[0].title, 'Mon titre'); assert.equal(fixture.tables.ai_tracks[0].image_url, 'own-cover-url');
  assert.equal(JSON.parse(fixture.tables.ai_tracks[0].source_links).library_folder, 'Album');
  await request({ libraryFolder: null }); assert.equal(JSON.parse(fixture.tables.ai_tracks[0].source_links).library_folder, null);
  assert.ok(JSON.parse(fixture.tables.ai_tracks[0].source_links).artist_cover_edited_at);
});

test('sharing uses the canonical saved song, rejects private songs and falls back to clipboard', async () => {
  const source = read('app/ai-generator/page.tsx'); const ast = ts.createSourceFile('page.tsx', source, 99, true, ts.ScriptKind.TSX); let handler;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'shareGenerated') handler = node.initializer.getText(ast); ts.forEachChild(node, visit); }; visit(ast);
  const code = ts.transpileModule(`const handler = ${handler};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let published = false, copied, native = 0; const warnings = [];
  const run = new Function('allTracks', 'fetch', 'notify', 'navigator', 'window', code + '; return handler;')(
    [{ id: 'saved-id', suno_id: 'provider-id' }], async () => ({ ok: true, json: async () => ({ isPublic: published }) }),
    { warning: (...args) => warnings.push(args), success: () => {}, error: error => { throw new Error(error); } },
    { share: async () => { native++; throw Object.assign(new Error('unavailable'), { name: 'NotAllowedError' }); }, clipboard: { writeText: async value => { copied = value; } } },
    { location: { origin: 'https://synaura.fr', href: 'https://synaura.fr/studio' } },
  );
  await run({ id: 'provider-id', title: 'Mon son' }); assert.equal(native, 0); assert.equal(copied, undefined); assert.equal(warnings.length, 1);
  published = true; await run({ id: 'provider-id', title: 'Mon son' }); assert.equal(copied, 'https://synaura.fr/track/ai-saved-id');
});

test('synchronized lyrics preserve the original paragraphs and never duplicate the words', () => {
  const text = '[Couplet]\nLa ville s’éveille.\n\n[Refrain]\nEncore !';
  const parts = lyricSegments(text, [{ word: 'La', startS: 0, endS: 1 }, { word: 'ville', startS: 1, endS: 2 }, { word: "s’éveille", startS: 2, endS: 3 }, { word: 'Encore', startS: 4, endS: 5 }]);
  assert.equal(parts.map(part => part.text).join(''), text);
  assert.equal(parts.filter(part => part.start !== undefined).length, 4);
  assert.equal(parts.find(part => part.text === '[Refrain]').start, undefined);
});

test('preview streams stay temporary until the actual complete audio arrives', async () => {
  const stored = [];
  const { cacheSunoTrackMedia } = load('lib/suno-media-cache.ts', {
    '@/lib/media-url-health': { isHttpUrl: url => !!url, isKnownTemporaryAIProviderUrl: url => String(url).includes('provider'), isUsableHttpMediaUrl: url => String(url || '').startsWith('local') },
    '@/lib/localMediaStorage': { storeRemoteMedia: async (url, kind) => { stored.push([url, kind]); return { secure_url: 'local-final', public_id: 'stored' }; } },
  });
  const preview = await cacheSunoTrackMedia({ streamUrl: 'provider-preview' });
  assert.equal(stored.length, 0); assert.equal(preview.audioUrl, ''); assert.equal(preview.streamUrl, 'provider-preview');
  const complete = await cacheSunoTrackMedia({ audioUrl: 'provider-final', streamUrl: 'provider-preview' });
  assert.deepEqual(stored, [['provider-final', 'ai-audio']]); assert.equal(complete.audioUrl, 'local-final');
});
