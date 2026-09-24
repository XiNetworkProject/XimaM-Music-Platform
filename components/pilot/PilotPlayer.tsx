'use client';

import SynauraMiniPlayer from '@/components/FullScreenPlayer';

/** The public library uses the same dock and the same current audio session. */
export default function PilotPlayer() {
  return <SynauraMiniPlayer forceVisible />;
}
