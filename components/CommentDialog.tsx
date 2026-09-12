'use client';
import LegacyCommentsBridge from '@/components/comments/LegacyCommentsBridge';
type CommentUser = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
};

export type Comment = {
  id: string;
  user: CommentUser;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  replies?: Comment[];
  isDeleted?: boolean;
  isCreatorFavorite?: boolean;
  customFiltered?: boolean;
  customFilterReason?: string | null;
  createdAt: string;
  updatedAt?: string;
};

interface CommentDialogProps {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  initialComments: Comment[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}


export default function CommentDialog({ trackId, trackTitle, trackArtist, isOpen, onClose }: CommentDialogProps) {
  return <LegacyCommentsBridge entity={{ type: 'track', id: trackId, title: trackTitle, artist: trackArtist }} isOpen={isOpen} onClose={onClose} />;
}
