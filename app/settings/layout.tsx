import type { ReactNode } from 'react';
import PersonalRouteFrame from '@/components/v2/PersonalRouteFrame';

export default function Layout({ children }: { children: ReactNode }) {
  return <PersonalRouteFrame area="settings">{children}</PersonalRouteFrame>;
}
