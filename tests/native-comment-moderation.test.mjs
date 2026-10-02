import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../app/api/tracks/[id]/comments/[commentId]/moderation/route.ts', import.meta.url), 'utf8');
const code = ts.transpile(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), { target: ts.ScriptTarget.ES2022 });
function host(userId, commentExists = true) {
  const writes = [];
  const context = {
    getApiSession: async request => request.headers.get('authorization') === 'Bearer test-authorized-session' && userId ? { user: { id: userId } } : null,
    NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) },
    dbAdmin: { from(table) { return {
      select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: table === 'tracks' ? { id: 'track', creator_id: 'owner' } : table === 'comments' ? commentExists ? { id: 'comment' } : null : null }; },
      async upsert(patch, options) { writes.push({ table, patch, options }); return { error: null }; },
    }; } },
  };
  vm.createContext(context); vm.runInContext(code, context);
  return { writes, call: () => context.POST({ headers: new Headers({ authorization: 'Bearer test-authorized-session' }), json: async () => ({ action: 'delete' }) }, { params: { id: 'track', commentId: 'comment' } }) };
}
test('native creator moderation accepts the shared API auth adapter and preserves its compound key', async () => {
  assert.match(source, /getApiSession\(request\)/);
  const h = host('owner'); assert.equal((await h.call()).status, 200);
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].patch.is_deleted, true);
  assert.equal(h.writes[0].options.onConflict, 'comment_id,creator_id');
});
test('creator moderation rejects unauthenticated, non-owner and wrong-entity requests without writes', async () => {
  for (const [user, exists, status] of [[null, true, 401], ['other', true, 403], ['owner', false, 404]]) {
    const h = host(user, exists); assert.equal((await h.call()).status, status); assert.equal(h.writes.length, 0);
  }
});
