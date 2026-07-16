import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MIN_TRACK_RATIO as WEB_MIN_TRACK_RATIO,
  composeScrollFeed as composeWebFeed,
  normalizeScrollPosts,
} from '../lib/scrollFeed.ts';
import {
  MIN_TRACK_RATIO as NATIVE_MIN_TRACK_RATIO,
  composeScrollFeed as composeNativeFeed,
} from '../synaura-app/src/components/swipe/feedTypes.ts';

function webTrack(index) {
  return {
    _id: `track-${index}`,
    title: `Track ${index}`,
    artist: { _id: `artist-${index % 4}`, name: `Artist ${index % 4}`, username: `artist${index % 4}` },
    audioUrl: `https://example.test/audio-${index}.mp3`,
    coverUrl: `https://example.test/cover-${index}.jpg`,
    duration: 180,
    likes: 0,
    comments: 0,
    plays: 0,
  };
}

function nativeTrack(index) {
  return {
    _id: `track-${index}`,
    title: `Track ${index}`,
    artist: { _id: `artist-${index % 4}`, name: `Artist ${index % 4}`, username: `artist${index % 4}` },
    audioUrl: `https://example.test/audio-${index}.mp3`,
    coverUrl: `https://example.test/cover-${index}.jpg`,
    duration: 180,
    likesCount: 0,
    commentsCount: 0,
    plays: 0,
  };
}

function assertFeedRules(items, discriminator, minimumRatio) {
  const isTrack = (item) => item[discriminator] === 'track';
  const trackCount = items.filter(isTrack).length;
  assert.ok(trackCount / items.length >= minimumRatio);
  for (let index = 1; index < items.length; index += 1) {
    assert.ok(isTrack(items[index - 1]) || isTrack(items[index]), 'two non-track cards must never be adjacent');
  }
}

test('web and native feeds prioritize sound-attached posts and preserve the music ratio', () => {
  const webTracks = Array.from({ length: 30 }, (_, index) => webTrack(index));
  const nativeTracks = Array.from({ length: 30 }, (_, index) => nativeTrack(index));
  const webPosts = [
    {
      id: 'plain-post',
      type: 'text',
      content: 'Context around a track',
      image_url: null,
      likes_count: 2,
      comments_count: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      creator: { id: 'creator-1', username: 'creator1', name: 'Creator 1' },
      track: null,
    },
    {
      id: 'attached-post',
      type: 'track_share',
      content: 'Story behind the track',
      image_url: null,
      likes_count: 4,
      comments_count: 2,
      created_at: '2026-01-02T00:00:00.000Z',
      creator: { id: 'creator-2', username: 'creator2', name: 'Creator 2' },
      track: {
        id: nativeTracks[3]._id,
        title: nativeTracks[3].title,
        artist_name: nativeTracks[3].artist.name,
        cover_url: nativeTracks[3].coverUrl,
        audio_url: nativeTracks[3].audioUrl,
        duration: nativeTracks[3].duration,
      },
    },
  ];
  const nativePosts = [
    {
      id: 'plain-post',
      type: 'text',
      author: 'Creator 1',
      handle: '@creator1',
      avatar: '',
      time: '',
      mood: '',
      text: 'Context around a track',
      likesCount: 2,
      commentsCount: 1,
      isLiked: false,
    },
    {
      id: 'attached-post',
      type: 'track_share',
      author: 'Creator 2',
      handle: '@creator2',
      avatar: '',
      time: '',
      mood: '',
      text: 'Story behind the track',
      likesCount: 4,
      commentsCount: 2,
      isLiked: false,
      track: nativeTracks[3],
    },
  ];
  const webFeed = composeWebFeed({ tracks: webTracks, posts: webPosts });
  const nativeFeed = composeNativeFeed({ tracks: nativeTracks, posts: nativePosts });

  assertFeedRules(webFeed, 'type', WEB_MIN_TRACK_RATIO);
  assertFeedRules(nativeFeed, 'kind', NATIVE_MIN_TRACK_RATIO);
  assert.equal(webFeed.find((item) => item.type === 'post')?.post.id, 'attached-post');
  assert.equal(nativeFeed.find((item) => item.kind === 'post')?.post.id, 'attached-post');
});

test('post normalization keeps only real, renderable records', () => {
  const posts = normalizeScrollPosts([
    { id: 'missing-creator', content: 'Hidden' },
    {
      id: 'valid',
      content: 'A real post',
      created_at: '2026-01-01T00:00:00.000Z',
      creator: { id: 'creator-1', username: 'creator1', name: 'Creator 1' },
    },
    {
      id: 'valid',
      content: 'Duplicate',
      creator: { id: 'creator-1', username: 'creator1', name: 'Creator 1' },
    },
  ]);

  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, 'valid');
});
