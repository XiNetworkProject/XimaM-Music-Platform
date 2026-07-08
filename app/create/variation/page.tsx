'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2, Music2, Wand2 } from 'lucide-react';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

type VariationSource = {
  sourceTrackId: string;
  sourceTrackType: 'track' | 'ai_track';
  title: string;
  artist: string;
  artistUsername?: string;
  coverUrl: string | null;
};

const FALLBACK_COVER = '/brand/2026/synaura-symbol-2026.png';

export default function CreateVariationPage() {
  return (
    <Suspense
      fallback={
        <SynauraAppShell contentClassName="max-w-[1000px]">
          <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#4A9EAA]" />
          </SynauraPanel>
        </SynauraAppShell>
      }
    >
      <CreateVariationContent />
    </Suspense>
  );
}

function CreateVariationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId') || '';
  const { status } = useSession();
  const [sources, setSources] = useState<VariationSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    const current = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/create/variation';
    router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(current)}`);
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let mounted = true;
    fetch('/api/remixes/sources?limit=80', { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!mounted) return;
        if (!ok) throw new Error(json?.error || 'Connexion requise');
        setSources(Array.isArray(json?.sources) ? json.sources : []);
      })
      .catch((e) => mounted && setError(e?.message || 'Impossible de charger les morceaux autorises'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [status]);

  function openStudioWith(source: VariationSource) {
    const params = new URLSearchParams({
      mode: 'remix',
      sourceTrackId: source.sourceTrackId,
      sourceTrackType: source.sourceTrackType,
      title: source.title,
    });
    if (challengeId) params.set('challengeId', challengeId);
    router.push(`/ai-generator?${params.toString()}`);
  }

  return (
    <SynauraAppShell contentClassName="max-w-[1000px]">
      <SynauraTopBar secondaryHref="/ai-generator" secondaryLabel="Studio" primaryHref="/upload" primaryLabel="Publier" />
      <div className="space-y-4 pb-24">
        <Link
          href="/create"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black text-black/58 transition hover:bg-[#111111] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à Créer
        </Link>

        <div>
          <span className="inline-flex rounded-full bg-[#4A9EAA]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#4A9EAA]">
            Variation IA
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111111] sm:text-4xl">Choisis un morceau à transformer</h1>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-black/54">
            Seuls les morceaux Synaura dont le créateur a autorisé la variation IA apparaissent ici. Le créateur original reste toujours crédité.
          </p>
        </div>

        <SynauraPanel className="p-4 sm:p-5">
          {loading ? (
            <div className="grid min-h-[220px] place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#4A9EAA]" />
            </div>
          ) : error ? (
            <p className="rounded-2xl bg-[#D96D63]/10 px-4 py-3 text-sm font-bold text-[#9b352e]">{error}</p>
          ) : sources.length ? (
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {sources.map((source) => (
                <button
                  key={`${source.sourceTrackType}-${source.sourceTrackId}`}
                  type="button"
                  onClick={() => openStudioWith(source)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-black/[0.08] bg-[#F7F6F3] p-3 text-left transition hover:border-[#4A9EAA]/40 hover:bg-[#4A9EAA]/8"
                >
                  <img src={source.coverUrl || FALLBACK_COVER} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{source.title}</span>
                    <span className="mt-1 block truncate text-xs font-bold text-black/46">{source.artist || 'Artiste Synaura'}</span>
                    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em] text-[#4A9EAA]">Créer une variation</span>
                  </span>
                  <Wand2 className="h-4 w-4 shrink-0 text-[#4A9EAA]" />
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center gap-3 text-center">
              <Music2 className="h-10 w-10 text-black/16" />
              <p className="text-sm font-semibold text-black/48">Aucun morceau n&apos;autorise la variation IA pour le moment.</p>
            </div>
          )}
        </SynauraPanel>
      </div>
    </SynauraAppShell>
  );
}
