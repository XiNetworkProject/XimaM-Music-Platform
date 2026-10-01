import { notFound } from 'next/navigation';
import BenefitsPreview from './BenefitsPreview';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <BenefitsPreview />;
}
