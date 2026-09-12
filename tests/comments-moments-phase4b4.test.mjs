import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { normalizeComment, normalizeReactions, mergeComments, clusterMusicalMoments, commentsEndpoint, supportsMoments } from '../lib/commentsModel.ts';

test('les identités track, post et clip restent distinctes', () => {
  assert.equal(commentsEndpoint('clip', 'a'), '/api/music-clips/a/comments');
  assert.equal(commentsEndpoint('post', 'a'), '/api/posts/a/comments');
  assert.equal(supportsMoments('post', 'a'), false);
  assert.equal(supportsMoments('clip', 'a'), false);
  assert.equal(supportsMoments('track', 'radio-ximam'), false);
  assert.equal(supportsMoments('track', 'ai-a'), false);
});
test('un timestamp null reste général, zéro reste un instant musical', () => {
  assert.equal(normalizeComment({ id: 'a', timestampSeconds: null }).timestampSeconds, null);
  assert.equal(normalizeComment({ id: 'a', timestampSeconds: 0 }).timestampSeconds, 0);
  assert.equal(normalizeComment({ id: 'a', timestampSeconds: -1 }).timestampSeconds, null);
  assert.equal(normalizeComment({ id: 'a', timestampSeconds: 'bad' }).timestampSeconds, null);
});
test('normalisation partagée et fusion des mutations sans doublons', () => {
  const a = normalizeComment({ id: 'a', content: 'Avant', created_at: '2026-09-12', user_id: 'u', replies: [{ id: 'b' }] });
  const next = { ...a, content: 'Après', likesCount: 1, isLiked: true };
  assert.equal(a.user.id, 'u'); assert.equal(a.replies[0].id, 'b');
  assert.deepEqual(mergeComments([a], [next]), [next]);
});
test('clusters bornés conservent tous les commentaires et réactions, sans contenu modéré', () => {
  const comments = Array.from({ length: 200 }, (_, i) => normalizeComment({ id: `c${i}`, timestampSeconds: i }));
  const reactions = normalizeReactions(Array.from({ length: 300 }, (_, i) => ({ id: `r${i}`, timestampSeconds: i, reactionType: 'drop' })));
  const clusters = clusterMusicalMoments([...comments, normalizeComment({ id: 'hidden', timestampSeconds: 2, customFiltered: true })], reactions, 300);
  assert.ok(clusters.length <= 6);
  assert.equal(clusters.flatMap(c => c.comments).length, 200);
  assert.equal(clusters.flatMap(c => c.reactions).length, 300);
  assert.deepEqual(normalizeReactions([{ id: 'x', timestampSeconds: 0, reactionType: 'drop' }, { id: 'x', timestampSeconds: 0, reactionType: 'drop' }]).length, 1);
});
test('le cache choisi déduplique les consommateurs et annule la dernière souscription', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let requests = 0; let aborted = 0;
  const options = { queryKey: ['comments', 'track', 'a', 'viewer'], queryFn: ({ signal }) => new Promise((resolve, reject) => { requests++; signal.addEventListener('abort', () => { aborted++; reject(new Error('aborted')); }); }), gcTime: 0 };
  const a = new QueryObserver(client, options), b = new QueryObserver(client, options);
  const offA = a.subscribe(() => {}), offB = b.subscribe(() => {});
  assert.equal(requests, 1); offA(); assert.equal(aborted, 0); offB(); assert.equal(aborted, 1); client.clear();
});
test('les deux lectures track convergent et les upserts Phase1B restent intacts', async () => {
  const main = await readFile('app/api/tracks/[id]/comments/route.ts', 'utf8');
  const read = await readFile('app/api/tracks/[id]/comments/moderation/route.ts', 'utf8');
  assert.match(main, /export const GET = readModeratedComments/);
  assert.match(read, /timestamp_seconds/); assert.match(read, /modError/); assert.match(read, /canViewTrack/);
  for (const file of ['app/api/tracks/[id]/comments/[commentId]/route.ts', 'app/api/tracks/[id]/comments/[commentId]/moderation/route.ts']) assert.match(await readFile(file, 'utf8'), /onConflict: 'comment_id,creator_id'/);
});

test('la fermeture libère les références DOM et la route Track partage AudioCore', async () => {
  const controller = await readFile('components/context-surfaces/ContextSurfaceController.tsx', 'utf8');
  assert.match(controller, /for \(const entry of result.closed\) triggersRef.current.delete\(entry.historyKey\)/);
  const track = await readFile('app/track/[id]/TrackPageClient.tsx', 'utf8');
  assert.doesNotMatch(track, /<audio\b/);
  assert.match(track, /useCommentsSurface/);
  const surface = await readFile('components/comments/CommentsSurface.tsx', 'utf8');
  assert.match(surface, /comment-avatar-\$\{entity.type\}-\$\{comment.id\}/);
  assert.match(surface, /comments.isPending/);
  assert.doesNotMatch(surface, /new Audio\(|setInterval\(/);
});

test('les fenêtres courtes gardent conversation et composer accessibles au scroll', async () => {
  const css = await readFile('app/globals.css', 'utf8');
  assert.match(css, /@media \(max-height: 600px\)\s*\{\s*\.comments-surface \{ overflow-y: auto; overscroll-behavior: contain; \}\s*\.comments-surface #comments-panel \{ flex-shrink: 0; min-height: 8rem; \}/);
  assert.match(css, /height: min\(82dvh, calc\(100dvh - var\(--comments-keyboard, 0px\)\)\)/);
});

test('le compteur est un abonné au cache sans queryFn manquante ni requête réseau', async () => {
  const client = await readFile('lib/commentsClient.ts', 'utf8');
  assert.match(client, /queryKey: \['comment-count', type, id, viewer\], queryFn: skipToken, enabled: false/);
});
