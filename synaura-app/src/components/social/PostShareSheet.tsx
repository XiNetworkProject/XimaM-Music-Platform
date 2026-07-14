import React from 'react';
import { API_BASE_URL } from '@/api/client';
import type { HomePost } from '@/api/types';
import { EntityShareSheet } from '@/components/sharing/EntityShareSheet';

export function PostShareSheet({ visible, post, onClose }: { visible: boolean; post: HomePost | null; onClose: () => void }) {
  const postUrl = post ? `${API_BASE_URL}/posts/${encodeURIComponent(post.id)}` : '';
  return (
    <EntityShareSheet
      visible={visible && Boolean(post)}
      title={post?.text || 'Publication Synaura'}
      subtitle={post ? `${post.author} · ${post.handle}` : undefined}
      kindLabel="Publication"
      url={postUrl}
      imageUrl={post ? `${postUrl}/opengraph-image` : null}
      fileKey={`publication-${post?.id || 'synaura'}`}
      onClose={onClose}
    />
  );
}
