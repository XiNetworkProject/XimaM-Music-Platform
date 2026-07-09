import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { attachLikedFlag, getRadarTracks } from '@/lib/discoverData';
import { SynauraAppShell, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import RadarSection from '@/components/radar/RadarSection';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Radar des petits createurs - Synaura',
  description: 'Decouvre les sons prometteurs avant tout le monde sur Synaura.',
  alternates: { canonical: '/radar' },
  openGraph: {
    title: 'Radar des petits createurs - Synaura',
    description: 'Sur Synaura, meme un petit createur peut trouver ses premiers vrais auditeurs.',
    type: 'website',
    url: '/radar',
  },
};

export default async function RadarPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id as string | undefined;
  const radarRaw = await getRadarTracks(30);
  const radarTracks = await attachLikedFlag(radarRaw, userId);

  return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar searchHref="/radar" searchLabel="Chercher un son Radar, un artiste, une ambiance..." secondaryHref="/discover" secondaryLabel="Decouvrir" />
      <SynauraRouteNav />
      <div className="pb-24">
        <RadarSection tracks={radarTracks as any} />
      </div>
    </SynauraAppShell>
  );
}
