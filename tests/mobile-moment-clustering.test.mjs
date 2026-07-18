import assert from 'node:assert/strict';
import test from 'node:test';

import { clusterMoments, fitMomentClusters } from '../synaura-app/src/waveform/momentClustering.ts';

function comment(id, timestampSeconds) {
  return {
    id,
    content: `Commentaire ${id}`,
    createdAt: '2026-07-18T12:00:00.000Z',
    timestampSeconds,
    user: { id: `user-${id}`, username: `user${id}`, name: `User ${id}`, avatar: '' },
    replies: [],
  };
}

function reaction(id, timestampSeconds, reactionType = 'favorite') {
  return { id, timestampSeconds, reactionType };
}

test('regroupe les commentaires et réactions proches sans perdre leurs compteurs', () => {
  const clusters = clusterMoments(
    [comment('a', 10), comment('b', 11.5), comment('c', 40)],
    [reaction('r1', 10.5), reaction('r2', 11, 'favorite'), reaction('r3', 11.2, 'drop')],
    3,
  );

  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].comments.length, 2);
  assert.equal(clusters[0].reactions.length, 3);
  assert.equal(clusters[0].byType.favorite, 2);
  assert.equal(clusters[0].topType, 'favorite');
  assert.ok(Math.abs(clusters[0].timestampSeconds - 10.84) < 0.001);
});

test('borne le nombre de marqueurs pour une waveform très dense', () => {
  const comments = Array.from({ length: 120 }, (_, index) => comment(String(index), index * 1.4));
  const reactions = Array.from({ length: 320 }, (_, index) => reaction(`r${index}`, index * 0.55, index % 2 ? 'drop' : 'production'));
  const clusters = fitMomentClusters(comments, reactions, 0.6, 34);

  assert.ok(clusters.length <= 34);
  assert.equal(
    clusters.reduce((total, cluster) => total + cluster.comments.length + cluster.reactions.length, 0),
    comments.length + reactions.length,
  );
});

test('ignore les timestamps invalides au lieu de polluer le rendu', () => {
  const invalidComment = comment('invalid', Number.NaN);
  const clusters = clusterMoments([invalidComment, comment('valid', 8)], [reaction('bad', Number.NaN)], 2);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].comments[0].id, 'valid');
});
