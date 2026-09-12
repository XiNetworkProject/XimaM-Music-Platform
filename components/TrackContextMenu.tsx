'use client';
import TrackActionButton from '@/components/actions/TrackActionButton';
export default function TrackContextMenu({ track }: { track: any; children?: React.ReactNode }) {
  return <TrackActionButton track={track} />;
}
