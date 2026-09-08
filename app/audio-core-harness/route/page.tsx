import { notFound } from 'next/navigation';
import AudioCoreRouteProbe from './AudioCoreRouteProbe';

export default function AudioCoreRouteProbePage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <AudioCoreRouteProbe />;
}
