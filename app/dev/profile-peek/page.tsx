import { notFound } from 'next/navigation';
import ProfilePeekLab from './ProfilePeekLab';

export const metadata = { title: 'Profile Peek Lab — Synaura' };

export default function ProfilePeekLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ProfilePeekLab />;
}
