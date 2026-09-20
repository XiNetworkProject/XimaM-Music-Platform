import { notFound } from 'next/navigation';
import StudioLab from './StudioLab';

export const metadata = { title: 'Studio — aperçu local', robots: { index: false, follow: false } };
export default function StudioLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <StudioLab />;
}
