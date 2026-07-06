'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Music2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { notify } from '@/components/NotificationCenter';
import {
  SynauraAppShell,
  SynauraPanel,
  SynauraRouteNav,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';
import { COMMUNITY_CLUBS, type ClubConfig } from '@/lib/communityClubs';

type ClubAggregate = {
  slug: string;
  postsCount: number;
  latestPost: {
    id?: string;
    title?: string;
    content?: string;
    author?: { name?: string; username?: string; avatar?: string | null };
  } | null;
};

function formatDate(value?: string) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return '';
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function ClubCard({ club, aggregate }: { club: ClubConfig; aggregate?: ClubAggregate }) {
  const postsCount = aggregate?.postsCount || 0;
  const latestPost = aggregate?.latestPost;

  return (
    <div className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[1.8rem] border border-black/[0.08] bg-[#fffaf2]/90 p-5 shadow-[0_20px_60px_rgba(30,25,20,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(30,25,20,0.14)]">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-16 blur-3xl" style={{ background: club.accent }} />
      <div className="relative flex flex-1 flex-col">
        <div className="grid h-11 w-11 place-items-center rounded-[1rem] text-white shadow-[0_14px_32px_rgba(30,25,20,0.16)]" style={{ background: club.accent }}>
          <Music2 className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-[#171313]">{club.name}</h3>
        <p className="mt-1.5 text-sm font-semibold leading-6 text-black/50">{club.promise}</p>

        <div className="mt-4 flex-1">
          {latestPost ? (
            <Link
              href={latestPost.id ? `/community/forum/${latestPost.id}` : `/community/${club.slug}`}
              className="block rounded-[1.15rem] border border-black/[0.06] bg-white/70 p-3 transition hover:bg-white"
            >
              <div className="flex items-center gap-2.5">
                <Avatar src={latestPost.author?.avatar} name={latestPost.author?.name || 'Créateur'} username={latestPost.author?.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-[#171313]">{latestPost.title || 'Discussion'}</p>
                  <p className="truncate text-[11px] font-semibold text-black/40">{latestPost.author?.name || 'Créateur Synaura'}</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-black/[0.12] p-3 text-center">
              <p className="text-xs font-semibold text-black/38">Aucun post pour l'instant. Sois le premier.</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.1em] text-black/34">
            {postsCount > 0 ? `${postsCount} post${postsCount > 1 ? 's' : ''}` : 'Nouveau'}
          </span>
          <Link
            href={`/community/${club.slug}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-black text-white transition hover:scale-[1.03]"
            style={{ background: club.accent }}
          >
            Entrer
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CommunityClubsLandingPage() {
  const [loading, setLoading] = useState(true);
  const [aggregates, setAggregates] = useState<Record<string, ClubAggregate>>({});

  useEffect(() => {
    let mounted = true;
    fetch('/api/community/clubs', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!mounted || !json) return;
        const map: Record<string, ClubAggregate> = {};
        (Array.isArray(json.clubs) ? json.clubs : []).forEach((club: ClubAggregate) => {
          map[club.slug] = club;
        });
        setAggregates(map);
      })
      .catch(() => {
        if (mounted) notify.error('Clubs', 'Impossible de charger les Clubs.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar
        searchHref="/community"
        searchLabel="Chercher un Club, un avis, un feat..."
        secondaryHref="/ai-generator"
        secondaryLabel="Studio"
      />
      <SynauraRouteNav />

      <div className="space-y-6 pb-24">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Espace musical</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#171313] sm:text-5xl">Clubs</h1>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-black/48 sm:text-base">
            Trouve des personnes, des idées et des sons à faire évoluer.
          </p>
        </div>

        {loading ? (
          <SynauraPanel className="grid min-h-[300px] place-items-center p-8">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
              <p className="mt-3 text-sm font-black text-black/42">Chargement des Clubs...</p>
            </div>
          </SynauraPanel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {COMMUNITY_CLUBS.map((club) => (
              <ClubCard key={club.slug} club={club} aggregate={aggregates[club.slug]} />
            ))}
          </div>
        )}
      </div>
    </SynauraAppShell>
  );
}
