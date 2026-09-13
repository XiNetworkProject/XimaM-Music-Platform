'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/navigation/HandoffLink';
import { useSession } from 'next-auth/react';
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

// Intentions creatives (onboarding "Personnaliser mes gouts") qui mettent un Club
// en avant. Ne masque jamais les autres Clubs, se contente de les prioriser.
const INTENTION_TO_CLUB_SLUG: Record<string, string> = {
  remix: 'remix',
  collab: 'collab',
  create_ai: 'ai',
};

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

function ClubCard({ club, aggregate, highlighted, index }: { club: ClubConfig; aggregate?: ClubAggregate; highlighted?: boolean; index: number }) {
  const postsCount = aggregate?.postsCount || 0;
  const latestPost = aggregate?.latestPost;

  return (
    <article className="v2-club">
      <span className="v2-club-index" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
      <div className="min-w-0">
        {highlighted ? <p className="v2-kicker mb-2">Selon tes envies</p> : null}
        <h3>{club.name}</h3>
        <p className="mt-2 text-sm">{club.promise}</p>

        <div>
          {latestPost ? (
            <Link
              href={latestPost.id ? `/community/forum/${latestPost.id}` : `/community/${club.slug}`}
              className="v2-club-latest"
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
            <div className="v2-club-empty">
              <p>La première discussion reste à écrire.</p>
            </div>
          )}
        </div>

        <div className="v2-club-footer">
          <span className="text-xs font-black uppercase tracking-[0.1em] text-black/34">
            {postsCount} post{postsCount > 1 ? 's' : ''}
          </span>
          <Link
            href={`/community/${club.slug}`}
            className="text-sm"
          >
            Explorer le club
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function CommunityClubsLandingPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [aggregates, setAggregates] = useState<Record<string, ClubAggregate>>({});
  const [highlightedSlugs, setHighlightedSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let mounted = true;
    fetch('/api/user/preferences', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted) return;
        const intentions: string[] = Array.isArray(json?.preferences?.onboarding?.creatorIntentions)
          ? json.preferences.onboarding.creatorIntentions
          : [];
        const slugs = intentions.map((id) => INTENTION_TO_CLUB_SLUG[id]).filter((slug): slug is string => Boolean(slug));
        setHighlightedSlugs(slugs);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [status]);

  const orderedClubs = useMemo(() => {
    if (!highlightedSlugs.length) return COMMUNITY_CLUBS;
    return [...COMMUNITY_CLUBS].sort((a, b) => {
      const aFav = highlightedSlugs.includes(a.slug) ? 0 : 1;
      const bFav = highlightedSlugs.includes(b.slug) ? 0 : 1;
      return aFav - bFav;
    });
  }, [highlightedSlugs]);

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
        secondaryLabel="Créer avec l’IA"
      />
      <SynauraRouteNav />

      <div className="space-y-6 pb-24">
        <header className="v2-community-intro">
          <div>
            <p className="v2-kicker mb-4">Communauté · Les clubs</p>
            <h1>Le son nous rapproche.</h1>
          </div>
          <div>
            <p className="v2-intro mb-5">Un avis qui fait avancer. Une idée à partager. La personne avec qui créer la suite.</p>
            <nav className="v2-community-links" aria-label="Explorer la communauté">
              <Link href="/community/forum">Toutes les discussions <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/city">City & événements</Link>
              <Link href="/community/faq">Questions fréquentes</Link>
              <Link href="/posts">Posts des créateurs</Link>
              <Link href="/partnerships">Collaborer avec Synaura</Link>
            </nav>
          </div>
        </header>

        {loading ? (
          <SynauraPanel className="grid min-h-[300px] place-items-center p-8">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
              <p className="mt-3 text-sm font-black text-black/42">Chargement des Clubs...</p>
            </div>
          </SynauraPanel>
        ) : (
          <div className="v2-clubs">
            {orderedClubs.map((club, index) => (
              <ClubCard key={club.slug} club={club} index={index} aggregate={aggregates[club.slug]} highlighted={highlightedSlugs.includes(club.slug)} />
            ))}
          </div>
        )}
      </div>
    </SynauraAppShell>
  );
}
