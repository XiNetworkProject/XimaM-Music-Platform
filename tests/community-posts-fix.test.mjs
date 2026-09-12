import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDatabaseClient } from '../lib/database.ts';
import { loadCommunityModules } from '../scripts/lib/community-posts-harness.mjs';

function fixture({ posts = [], profiles = [], tracks = [], failTable, session = null } = {}) {
  const calls = [];
  const db = createDatabaseClient({ async query(sql, values = []) {
    calls.push({ sql, values });
    if (sql.includes('pg_constraint')) throw new Error('Legacy relationship must not be resolved by the posts list');
    if (failTable && sql.includes(`"public"."${failTable}"`)) throw Object.assign(new Error('Isolated DB permission failure'), { code: '42501' });
    if (sql.includes('"public"."forum_posts"')) {
      let rows = [...posts];
      const category = sql.match(/"base"\."category" = \$(\d+)/);
      if (category) rows = rows.filter(p => p.category === values[Number(category[1]) - 1]);
      if (/count\(/i.test(sql)) return { rows: [{ count: rows.length }], rowCount: 1 };
      const sort = sql.includes('"likes_count" DESC') ? 'likes_count' : sql.includes('"replies_count" DESC') ? 'replies_count' : 'created_at';
      rows.sort((a,b) => String(b[sort]).localeCompare(String(a[sort]), undefined, { numeric: true }) || b.id.localeCompare(a.id));
      const limit = sql.match(/LIMIT \$(\d+)/), offset = sql.match(/OFFSET \$(\d+)/);
      const start = offset ? values[Number(offset[1]) - 1] : 0;
      rows = rows.slice(start, limit ? start + values[Number(limit[1]) - 1] : undefined);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes('"public"."profiles"')) return { rows: profiles.filter(p => values.flat().includes(p.id)), rowCount: profiles.length };
    if (sql.includes('"public"."tracks"')) return { rows: tracks, rowCount: tracks.length };
    if (sql.includes('"public"."forum_post_likes"')) return { rows: [{ post_id: posts[0]?.id }], rowCount: 1 };
    throw new Error('Unexpected SQL: ' + sql);
  }});
  return { ...loadCommunityModules(db, session), calls };
}
const post = (id, category = 'feedback', user_id = 'author-1', overrides = {}) => ({ id, category, user_id, title: 'Published fixture', content: 'Feedback', created_at: '2026-01-01T12:00:00Z', likes_count: 0, replies_count: 0, ...overrides });
const author = { id: 'author-1', name: 'Real fixture author', username: 'fixture-author', avatar: null };
const request = query => new Request('http://localhost/api/community/posts?' + query);

for (const category of ['feedback','collab','remix','ai','ai_prompt']) {
  test(`${category} list preserves exact category and JSON contract`, async () => {
    const f = fixture({ posts: [post('p1', category),post('p2','general')], profiles: [author] });
    const res = await f.route.GET(request(`category=${category}&limit=30&sort=recent`));
    assert.equal(res.status, 200); const json = await res.json();
    assert.deepEqual(json.posts.map(p => p.id), ['p1']);
    assert.deepEqual(json.posts[0].author, author);
    assert.deepEqual(json.pagination, { page: 1, limit: 30, total: 1, totalPages: 1 });
    assert.equal(f.calls.length, 3, 'posts + count + one batch of profiles');
    assert.equal(f.calls.filter(c => c.sql.includes('"category"')).length, 2);
  });
}
test('empty category stays empty, never reclassified from historical question/suggestion', async () => {
  const f = fixture({ posts: [post('old','question')] });
  const json = await (await f.route.GET(request('category=feedback&limit=30'))).json();
  assert.deepEqual(json.posts, []); assert.equal(json.pagination.total, 0); assert.equal(f.calls.length, 2);
});
test('missing profile, orphan author and null author do not invent a user or drop posts', async () => {
  const f = fixture({ posts: [post('p1'),post('p2','feedback','orphan'),post('p3','feedback',null)], profiles: [author] });
  const res = await f.route.GET(request('category=feedback')); assert.equal(res.status,200);
  const json = await res.json(); assert.equal(json.posts.length,3);
  assert.deepEqual(json.posts.find(p=>p.id==='p1').author,author);
  for(const id of ['p2','p3']) assert.equal('author' in json.posts.find(p=>p.id===id),false);
  assert.equal(f.calls.filter(c=>c.sql.includes('"public"."profiles"')).length,1);
});
test('30 posts sharing authors use one batch over unique IDs, with public profile fields only', async () => {
  const f = fixture({posts:Array.from({length:30},(_,i)=>post('p'+i)),profiles:[author]});
  assert.equal((await f.route.GET(request('limit=30'))).status,200);
  const profileCalls=f.calls.filter(c=>c.sql.includes('"public"."profiles"'));
  assert.equal(f.calls.length,3); assert.equal(profileCalls.length,1); assert.deepEqual(profileCalls[0].values,[['author-1']]);
  assert.doesNotMatch(profileCalls[0].sql,/email|preferences|subscription|role/);
});
for (const sort of ['recent','popular','most_replied']) test(`${sort} pagination has stable ID tie-break, bounded pages and no duplicates`, async () => {
  const f=fixture({posts:[post('p1'),post('p3'),post('p2')],profiles:[author]});
  const first=await (await f.route.GET(request(`sort=${sort}&limit=2&page=1`))).json();
  const second=await (await f.route.GET(request(`sort=${sort}&limit=2&page=2`))).json();
  assert.deepEqual(first.posts.map(p=>p.id),['p3','p2']); assert.deepEqual(second.posts.map(p=>p.id),['p1']);
  assert.equal(first.pagination.totalPages,2);
  for(const c of f.calls.filter(c=>c.sql.includes('LIMIT'))) assert.match(c.sql,/"id" DESC/);
});
for (const failTable of ['forum_posts','profiles']) test(`real ${failTable} DB error remains HTTP 500, not success with missing data`, async()=>{
  const f=fixture({posts:[post('p1')],profiles:[author],failTable});
  const res=await f.route.GET(request('category=feedback')); assert.equal(res.status,500);
  assert.ok((await res.json()).error); assert.ok(f.errors.length);
});
test('track visibility, locked posts and viewer-specific likes retain existing semantics', async()=>{
  for(const viewer of [null,'author-1','other']) {
    const session=viewer?{user:{id:viewer}}:null;
    const f=fixture({session, posts:[post('p1','feedback','author-1',{content:'Body\n<!--synaura-track:private-->',is_locked:true})], profiles:[author], tracks:[{id:'private',creator_id:'author-1',is_public:false,audio_url:'/private.mp3',title:'Private'}]});
    // Simulate the pre-existing optional track relation failing, then its batch fallback.
    const res=await f.route.GET(request('category=feedback')); const json=await res.json(); assert.equal(res.status,200);
    assert.equal(json.posts[0].is_locked,true,'locked affects writing, not public list visibility');
    assert.equal(json.posts[0].track?.id||null,viewer==='author-1'?'private':null);
    assert.equal(json.posts[0].track_id,viewer==='author-1'?'private':null);
    if(viewer) {assert.equal(json.posts[0].is_liked,true); const q=f.calls.find(c=>c.sql.includes('"forum_post_likes"')); assert.ok(q.values.includes(viewer));}
  }
});
test('legacy forum relationship cannot return to the list and POST remains authenticated',async()=>{
  const source=fs.readFileSync('app/api/community/posts/route.ts','utf8');
  assert.doesNotMatch(source.split('export async function POST')[0],/profiles:user_id\s*\(/);
  const f=fixture(); assert.equal((await f.route.POST(new Request('http://localhost/api/community/posts',{method:'POST'}))).status,401); assert.equal(f.calls.length,0);
});

test('forum does not refetch every profile already batch-resolved by the list API',()=>{
  const source=fs.readFileSync('app/community/forum/page.tsx','utf8');
  assert.match(source,/if \(!post\.user_id \|\| post\.author\) return post;/);
  assert.ok(source.indexOf('if (!post.user_id || post.author) return post;') < source.indexOf('fetch(`/api/users/by-id/'));
});
