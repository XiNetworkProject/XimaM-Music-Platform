import { notFound } from 'next/navigation';
import WheelPreview from './WheelPreview';

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <WheelPreview />;
}
