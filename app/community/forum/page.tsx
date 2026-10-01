import { Suspense } from 'react';
import CommunityHub from '@/components/community/CommunityHub';

/** Historic URLs and category deep links, with one discussion experience. */
export default function CommunityForumPage() {
  return <Suspense fallback={<p className="p-8" role="status">Chargement des discussions…</p>}><CommunityHub forum /></Suspense>;
}
