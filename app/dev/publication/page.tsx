import { notFound } from 'next/navigation';
import PublicationWorkspace from '@/components/publication/PublicationWorkspace';
export default function PublicationPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PublicationWorkspace preview/>;
}
