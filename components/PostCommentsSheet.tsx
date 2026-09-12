'use client';
import LegacyCommentsBridge from '@/components/comments/LegacyCommentsBridge';
import type { Post } from '@/components/PostCard';
interface PostCommentsSheetProps { post: Post | null; isOpen: boolean; onClose: () => void; onCommentCountChange?: (postId: string, delta: number) => void }
export default function PostCommentsSheet({ post, isOpen, onClose }: PostCommentsSheetProps) {
  if (!post) return null;
  return <LegacyCommentsBridge entity={{ type: 'post', id: post.id, title: 'Publication', artist: post.creator?.name || post.creator?.username, creatorId: post.creator?.id, count: post.comments_count }} isOpen={isOpen} onClose={onClose} />;
}
