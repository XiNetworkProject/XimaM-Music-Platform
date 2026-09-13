import { notFound } from 'next/navigation';
import ReactionLab from './ReactionLab';

export default function LiveReactionsLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ReactionLab />;
}
