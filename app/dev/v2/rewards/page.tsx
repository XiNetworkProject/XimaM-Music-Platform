import { notFound } from 'next/navigation';
import RewardsReview from './RewardsReview';

export default function RewardsReviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <RewardsReview />;
}
