import { notFound } from 'next/navigation';
import AudioCoreHarnessClient from './AudioCoreHarnessClient';

export default function AudioCoreHarnessPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <AudioCoreHarnessClient />;
}
