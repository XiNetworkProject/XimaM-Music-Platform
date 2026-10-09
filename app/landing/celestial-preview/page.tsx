import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import CelestialReview from './review';

export const metadata = { title: 'Synaura · Revue céleste locale', robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Suspense><CelestialReview/></Suspense>;
}
