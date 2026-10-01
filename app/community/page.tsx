import { Suspense } from 'react';
import CommunityHub from '@/components/community/CommunityHub';

export default function CommunityPage() {
  return <Suspense fallback={<p className="p-8" role="status">Chargement de la communauté…</p>}><CommunityHub /></Suspense>;
}
