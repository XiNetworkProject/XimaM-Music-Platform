import type { ReactNode } from 'react';
import PersonalRouteFrame from '@/components/v2/PersonalRouteFrame';
import '@/components/messaging/messaging-experience.css';

export default function Layout({ children }: { children: ReactNode }) {
  return <PersonalRouteFrame area="messages">{children}</PersonalRouteFrame>;
}
