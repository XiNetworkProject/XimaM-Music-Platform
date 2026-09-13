import { notFound } from 'next/navigation';
import V2Review from './V2Review';

export default function V2ReviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <V2Review />;
}
