import LiveHandoffEntry from '@/components/navigation/LiveHandoffEntry';
import PilotLive from '@/components/pilot/PilotLive';
export const metadata = { title: 'Live — La salle d’écoute' };
export default function PilotLivePage() {
  return <LiveHandoffEntry><PilotLive /></LiveHandoffEntry>;
}
