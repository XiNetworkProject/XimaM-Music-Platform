import type { ReactNode } from 'react';

/** Presentation boundary only: route state, data, media and handoffs stay with their owners. */
export default function PersonalRouteFrame({ children, area }: { children: ReactNode; area: string }) {
  return <div className={`v2-personal v2-personal--${area}`} data-v2-area={area} data-chambre-space={area}>{children}</div>;
}
