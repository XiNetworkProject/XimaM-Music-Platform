"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Headphones, Heart, Music, TrendingUp, Users, ArrowRight } from 'lucide-react';

type Track = {
  id: string;
  _id?: string;
  title: string;
  plays: number;
  likes: number;
  cover_url?: string;
  coverUrl?: string;
  duration?: number;
  created_at?: string;
};

export default function StatsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!session?.user?.username) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/users/${session.user.username}`, { headers: { 'Cache-Control': 'no-store' } });
        if (!res.ok) {
          throw new Error('Erreur de récupération des stats');
        }
        const data = await res.json();
        const userTracks: Track[] = (data?.tracks || []).map((t: any) => ({
          id: t.id || t._id,
          title: t.title,
          plays: t.plays || 0,
          likes: t.likes || 0,
          cover_url: t.cover_url || t.coverUrl,
          duration: t.duration,
          created_at: t.created_at
        }));
        setTracks(userTracks);
      } catch (e: any) {
        setError(e.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [session?.user?.username]);

  const totals = useMemo(() => {
    const totalPlays = tracks.reduce((s, t) => s + (t.plays || 0), 0);
    const totalLikes = tracks.reduce((s, t) => s + (t.likes || 0), 0);
    const totalTracks = tracks.length;
    return { totalPlays, totalLikes, totalTracks };
  }, [tracks]);

  const topTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10);
  }, [tracks]);

  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-10 pb-24 text-[var(--text)]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Statistiques</h1>
            <p className="text-[var(--text-muted)]">Vue d’ensemble de vos performances</p>
          </div>
          <Link href="/profile" className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10">
            <Users size={16} /> Voir mon profil
          </Link>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">Chargement…</div>
        ) : error ? (
          <div className="panel-suno border border-red-500/40 rounded-2xl p-4">{error}</div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <Kpi icon={<Headphones size={16} />} label="Écoutes totales" value={formatNumber(totals.totalPlays)} />
              <Kpi icon={<Heart size={16} />} label="Likes totaux" value={formatNumber(totals.totalLikes)} />
              <Kpi icon={<Music size={16} />} label="Pistes" value={formatNumber(totals.totalTracks)} />
              <Kpi icon={<TrendingUp size={16} />} label="Top (10)" value={formatNumber(topTracks.length)} />
            </div>

            {/* Top tracks */}
            <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.07),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.06),transparent)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Vos titres les plus écoutés</h2>
                <Link href="/library" className="hidden sm:inline-flex items-center gap-1 text-sm text-white/80 hover:underline">
                  Gérer <ArrowRight size={14} />
                </Link>
              </div>
              {topTracks.length === 0 ? (
                <div className="text-[var(--text-muted)]">Aucune piste pour le moment.</div>
              ) : (
                <div className="flex flex-col divide-y divide-[var(--border)]/50">
                  {topTracks.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 py-2">
                      <div className="w-6 text-white/70">{i + 1}</div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 ring-1 ring-[var(--border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.cover_url || t.coverUrl || '/default-cover.jpg'} alt={t.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{t.title}</div>
                        <div className="text-xs text-white/60">{formatNumber(t.plays)} écoutes • {formatNumber(t.likes)} likes</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-2xl p-3 sm:p-4 bg-white/5">
      <div className="text-white/70 text-xs flex items-center gap-2">{icon}<span>{label}</span></div>
      <div className="text-2xl sm:text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function formatNumber(num: number) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(num);
}


