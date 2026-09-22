import type { ReactNode } from 'react';
import PersonalRouteFrame from '@/components/v2/PersonalRouteFrame';
import './library-experience.css';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';

export default function Layout({ children }: { children: ReactNode }) {
  return <ExperienceMotionFrame className="collection-redesign"><PersonalRouteFrame area="library">{children}</PersonalRouteFrame></ExperienceMotionFrame>;
}
