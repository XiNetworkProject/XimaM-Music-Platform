import type { ReactNode } from 'react';
import PersonalRouteFrame from '@/components/v2/PersonalRouteFrame';
import ServiceFrame from '@/components/v2/ServiceFrame';

export default function Layout({ children }: { children: ReactNode }) {
  return <PersonalRouteFrame area="support"><ServiceFrame>{children}</ServiceFrame></PersonalRouteFrame>;
}
