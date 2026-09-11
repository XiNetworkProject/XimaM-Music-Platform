import { notFound } from 'next/navigation';
import SynauraScroll from '@/components/home/SynauraScroll';

export const metadata = { title: 'Live Profile Peek Lab — Synaura' };

export default function LiveProfilePeekLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <SynauraScroll />;
}
