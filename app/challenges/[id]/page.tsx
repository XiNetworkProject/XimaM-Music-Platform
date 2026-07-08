'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Clock3, Loader2, Trophy, Users } from 'lucide-react';
import { SynauraAppShell, SynauraPanel } from '@/components/synaura/SynauraShell';
import { SynauraButton } from '@/components/synaura/SynauraButton';

type ChallengeContentType = 'clip' | 'variation' | 'track' | 'open';
type ChallengeStatus = 'upcoming' | 'active' | 'ended';

type ChallengeEntry = {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  contentType: 'clip' | 'variation' | 'track';
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  href: string;
  createdAt: string;
};

type ChallengeDetail = {
  id: string;
  title: string;
  prompt: string;
  contentType: ChallengeContentType;
  startsAt: string;
  endsAt: string;
  status: ChallengeStatus;
  accentColor: string | null;
  coverUrl: string | null;
  sourceTrackId: string | null;
  sourceTrackType: 'track' | 'ai_track' | null;
  clubSlug: string | null;
  entryCount: number;
  entries: ChallengeEntry[];
  userHasEntry: boolean;
};

const CONTENT_TYPE_LABEL: Record<ChallengeContentType, string> = {
  clip: 'Clip',
  variation: 'Variation IA',
  track: 'Morceau',
  open: 'Création libre',
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function remainingLabel(status: ChallengeStatus, startsAt: string, endsAt: string) {
  const now = Date.now();
  if (status === 'upcoming') {
    const delta = new Date(startsAt).getTime() - now;
    const hours = Math.max(1, Math.round(delta / 3_600_000));
    return hours < 24 ? `Démarre dans ${hours} h` : `Démarre dans ${Math.ceil(hours / 24)} j`;
  }
  if (status === 'ended') return 'Terminé';
  const delta = new Date(endsAt).getTime() - now;
  const hours = Math.max(1, Math.round(delta / 3_600_000));
  return hours < 24 ? `${hours} h restantes` : `${Math.ceil(hours / 24)} j restants`;
}

function participateHref(challenge: ChallengeDetail) {
  const params = new URLSearchParams({ challengeId: challenge.id });
  if (challenge.contentType === 'clip') {
    if (challenge.sourceTrackId) {
      params.set('trackId', challenge.sourceTrackId);
      if (challenge.sourceTrackType) params.set('trackType', challenge.sourceTrackType);
    }
    return `/clips/new?${params.toString()}`;
  }
  if (challenge.contentType === 'variation') {
    params.set('mode', 'remix');
    if (challenge.sourceTrackId) {
      params.set('sourceTrackId', challenge.sourceTrackId);
      if (challenge.sourceTrackType) params.set('sourceTrackType', challenge.sourceTrackType);
    }
    return `/ai-generator?${params.toString()}`;
  }
  if (challenge.contentType === 'track') {
    return `/upload?${params.toString()}`;
  }
  return `/create?${params.toString()}`;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const challengeId = String(params?.id || '');
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!challengeId) return;
    let mounted = true;
    setLoading(true);
    fetch(`/api/challenges/${encodeURIComponent(challengeId)}`, { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!mounted) return;
        if (!ok || !json?.challenge) {
          setNotFound(true);
          return;
        }
        setChallenge(json.challenge);
      })
      .catch(() => mounted && setNotFound(true))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [challengeId]);

  const accent = challenge?.accentColor || '#D96D63';

  const handleParticipate = () => {
    if (!challenge) return;
    const href = participateHref(challenge);
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(href)}`);
      return;
    }
    router.push(href);
  };

  if (loading) {
    return (
      <SynauraAppShell contentClassName="max-w-[900px]">
        <SynauraPanel className="grid min-h-[420px] place-items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#7357C6]" />
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  if (notFound || !challenge) {
    return (
      <SynauraAppShell contentClassName="max-w-[900px]">
        <SynauraPanel className="grid min-h-[320px] place-items-center gap-4 p-8 text-center">
          <p className="text-lg font-black text-[#111111]">Défi introuvable</p>
          <p className="text-sm font-semibold text-black/50">Ce défi n'existe plus ou n'est plus disponible.</p>
          <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-black text-white">
            <ArrowLeft className="h-4 w-4" /> Retour au Scroll
          </Link>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-[900px]">
      <div className="space-y-4 pb-24">
        <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black text-black/58 transition hover:bg-[#111111] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Retour au Scroll
        </Link>

        <SynauraPanel className="overflow-hidden p-0">
          <div className="p-6 sm:p-8" style={{ backgroundImage: `linear-gradient(145deg, ${accent}2b, rgba(255,250,242,.96) 62%)` }}>
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[1rem] bg-[#171313] text-white shadow-[0_12px_26px_rgba(23,19,19,0.17)]">
                <Trophy className="h-5 w-5" />
              </span>
              <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.12em] ${challenge.status === 'active' ? 'bg-[#2bc96f]/14 text-[#168746]' : 'bg-black/[0.055] text-black/48'}`}>
                <span className={`h-2 w-2 rounded-full ${challenge.status === 'active' ? 'animate-pulse bg-[#2bc96f]' : 'bg-black/30'}`} />
                {challenge.status === 'active' ? 'Défi actif' : challenge.status === 'upcoming' ? 'À venir' : 'Terminé'}
              </span>
            </div>

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-black/42">{CONTENT_TYPE_LABEL[challenge.contentType]}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111111] sm:text-4xl">{challenge.title}</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-black/56">{challenge.prompt}</p>

            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-black/50">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/72 px-3 py-2">
                <Clock3 className="h-3.5 w-3.5" /> {remainingLabel(challenge.status, challenge.startsAt, challenge.endsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/72 px-3 py-2">
                <Users className="h-3.5 w-3.5" /> {challenge.entryCount} participation{challenge.entryCount > 1 ? 's' : ''}
              </span>
            </div>
            <p className="mt-3 text-xs font-bold text-black/44">
              Du {formatDate(challenge.startsAt)} au {formatDate(challenge.endsAt)}
            </p>

            <div className="mt-6">
              <SynauraButton onClick={handleParticipate} disabled={challenge.status !== 'active'} icon={<ArrowRight className="h-4 w-4" />}>
                {challenge.status === 'active' ? 'Participer' : challenge.status === 'upcoming' ? "Ce défi n'a pas encore commencé" : 'Ce défi est terminé'}
              </SynauraButton>
              {challenge.userHasEntry ? (
                <p className="mt-3 text-xs font-bold text-[#168746]">Tu as déjà une participation publiée dans ce défi.</p>
              ) : null}
            </div>
          </div>
        </SynauraPanel>

        <SynauraPanel className="p-5 sm:p-7">
          <h2 className="text-lg font-black text-[#111111]">Participations</h2>
          {challenge.entries.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-black/48">Aucune participation pour l'instant.</p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {challenge.entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.href}
                  className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-3 transition hover:bg-black/[0.03]"
                >
                  <img
                    src={entry.coverUrl || '/brand/2026/synaura-symbol-2026.png'}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[#111111]">{entry.title}</span>
                    <span className="mt-1 block truncate text-xs font-bold text-black/46">
                      {entry.name} · {CONTENT_TYPE_LABEL[entry.contentType]}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SynauraPanel>
      </div>
    </SynauraAppShell>
  );
}
