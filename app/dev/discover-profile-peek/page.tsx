import { notFound } from 'next/navigation';
import DiscoverProfilePeekLab from './DiscoverProfilePeekLab';

export const metadata = { title: 'Discover Profile Peek Lab — Synaura' };

export default function DiscoverProfilePeekLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DiscoverProfilePeekLab />;
}
