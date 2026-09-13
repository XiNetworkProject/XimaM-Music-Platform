import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicClip } from './clipData';
import SynauraLogo from '@/components/brand/SynauraLogo';

const PUBLIC_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const clip = await getPublicClip(params.id);
  if (!clip) return { title: 'Clip introuvable · Synaura' };
  const creator = clip.creator.name || clip.creator.username || 'Créateur Synaura';
  const title = clip.caption || `Clip de ${creator}`;
  const description = `${clip.sourceTrack.title} · ${creator}`;
  const url = `${PUBLIC_URL}/clips/${encodeURIComponent(clip.id)}`;
  const image = `${url}/opengraph-image`;
  return {
    title: `${title} · Synaura`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'video.other', images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function ClipPage({ params }: { params: { id: string } }) {
  const clip = await getPublicClip(params.id);
  if (!clip?.videoUrl) notFound();
  const creator = clip.creator.name || clip.creator.username || 'Créateur Synaura';
  const flowUrl = `/?filter=clips&clipId=${encodeURIComponent(clip.id)}`;

  return (
    <main className="min-h-screen bg-[var(--v2-bg)] px-5 py-8 text-[var(--v2-text)] sm:px-10 sm:py-12">
      <div className="v2-clip-stage">
        <div className="overflow-hidden rounded-lg bg-[#111111] shadow-2xl shadow-black/20">
          <video
            className="aspect-[9/16] w-full bg-[#111111] object-cover"
            src={clip.videoUrl}
            poster={clip.posterUrl || undefined}
            controls
            playsInline
            preload="metadata"
          />
        </div>
        <section className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-3 py-2 text-xs font-black text-[#F7F6F3]">
            <SynauraLogo size={24} decorative />
            CLIP SYNAURA
          </div>
          <h1 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">{clip.caption || clip.sourceTrack.title}</h1>
          <Link href={`/profile/${encodeURIComponent(clip.creator.username)}`} className="mt-4 inline-flex font-black text-[#7357C6]">
            @{clip.creator.username || creator}
          </Link>
          <div className="v2-clip-source">
            <p className="text-xs font-black text-[#4A9EAA]">SON ORIGINAL</p>
            <p className="mt-2 text-lg font-black">{clip.sourceTrack.title}</p>
            <p className="mt-1 text-sm font-bold text-white/55">{clip.sourceTrack.artist.name}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={flowUrl} className="rounded-lg bg-[var(--v2-text)] px-5 py-3 text-sm font-medium text-[var(--v2-bg)]">Voir le clip dans Live</Link>
            <Link href={clip.sourceTrack.trackUrl} className="rounded-lg bg-[#111111] px-5 py-3 text-sm font-black text-[#F7F6F3]">Ouvrir le morceau</Link>
          </div>
          <p className="mt-6 text-sm font-bold text-black/45">{clip.likesCount} j’aime · {clip.commentsCount} commentaires</p>
        </section>
      </div>
    </main>
  );
}
