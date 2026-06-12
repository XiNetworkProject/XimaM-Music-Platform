import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Headphones, Music2, Sparkles } from 'lucide-react';
import type { CityArtist } from '@/lib/synauraCity';
import SynauraPulseBar from '@/components/synaura/SynauraPulseBar';

export default function SynauraCreatorSpotlight({ artist }: { artist: CityArtist }) {
  const href = artist.username ? `/profile/${encodeURIComponent(artist.username)}` : '/discover';
  const progress = artist.nextLevelXp > 0 ? Math.min(100, Math.round((artist.xp / artist.nextLevelXp) * 100)) : 100;
  return (
    <article className="min-w-[270px] flex-1 rounded-[1.5rem] border border-black/[0.07] bg-[#fffaf2]/88 p-4 shadow-[0_14px_36px_rgba(30,25,20,0.08)]">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[1.1rem] bg-black/[0.06]">
          {artist.avatar ? <Image src={artist.avatar} alt={artist.name} fill className="object-cover" unoptimized /> : <div className="grid h-full w-full place-items-center text-lg font-black">{artist.name.slice(0, 1)}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#7c5cff]"><Sparkles className="h-3.5 w-3.5" /> Nouveau talent</div>
          <h3 className="mt-1 truncate text-lg font-black text-[#171313]">{artist.name}</h3>
          <p className="truncate text-xs font-bold text-black/42">@{artist.username}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-black/48">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.045] px-2.5 py-2"><Music2 className="h-3.5 w-3.5" /> {artist.trackCount} sons</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.045] px-2.5 py-2"><Headphones className="h-3.5 w-3.5" /> {artist.totalPlays} ecoutes</span>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.08em] text-black/42">
          <span>{artist.levelName}</span><span>Niveau {artist.level}</span>
        </div>
        <SynauraPulseBar value={progress} />
      </div>
      <Link href={href} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white transition hover:scale-[1.01]">
        Decouvrir <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
