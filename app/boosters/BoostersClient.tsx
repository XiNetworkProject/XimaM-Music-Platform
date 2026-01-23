'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Calendar,
  Crown,
  Filter,
  Gift,
  Gem,
  History,
  LayoutDashboard,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';
import { useBoosters } from '@/hooks/useBoosters';
import BoosterOpenModal from '@/components/BoosterOpenModal';
import BoosterPackOpenModal, { PackReceivedItem } from '@/components/BoosterPackOpenModal';
import TrackSelectModal from '@/components/TrackSelectModal';
import { notify } from '@/components/NotificationCenter';

type TabKey = 'dashboard' | 'inventory' | 'active' | 'missions' | 'shop' | 'history' | 'insights';
type BoosterType = 'track' | 'artist';
type BoosterRarity = 'common' | 'rare' | 'epic' | 'legendary';

type ActiveTrackBoost = { track_id: string; multiplier: number; expires_at: string };
type ActiveArtistBoost = { artist_id: string; multiplier: number; expires_at: string };

type TrackLite = {
  id: string;
  title: string;
  coverUrl: string | null;
  duration: number;
  artist: { id: string; username: string | null; name: string | null; avatar: string | null };
};

type Mission = {
  id: string;
  key: string;
  title: string;
  goal_type: 'plays' | 'likes' | 'shares';
  threshold: number;
  cooldown_hours: number;
  reward_booster_id: string | null;
  enabled: boolean;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

async function safeJson(res: Response) {
  return await res.json().catch(() => ({}));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(n: number) {
  return `${clamp(n, 0, 100).toFixed(0)}%`;
}

function formatRemaining(ms: number) {
  const v = Math.max(0, Number(ms || 0));
  if (v <= 0) return 'Disponible';
  const h = Math.floor(v / 3_600_000);
  const m = Math.floor((v % 3_600_000) / 60_000);
  const s = Math.floor((v % 60_000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function rarityRank(r: BoosterRarity) {
  if (r === 'legendary') return 3;
  if (r === 'epic') return 2;
  if (r === 'rare') return 1;
  return 0;
}

function rarityLabel(r: BoosterRarity) {
  if (r === 'legendary') return 'Légendaire';
  if (r === 'epic') return 'Épique';
  if (r === 'rare') return 'Rare';
  return 'Commun';
}

function rarityIcon(r: BoosterRarity) {
  if (r === 'legendary') return <Gem className="w-4 h-4 text-yellow-400" />;
  if (r === 'epic') return <Crown className="w-4 h-4 text-purple-400" />;
  if (r === 'rare') return <Star className="w-4 h-4 text-blue-400" />;
  return <Sparkles className="w-4 h-4 text-zinc-400" />;
}

function rarityChipClass(r: BoosterRarity) {
  if (r === 'legendary') return 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200';
  if (r === 'epic') return 'border-purple-400/40 bg-purple-400/10 text-purple-200';
  if (r === 'rare') return 'border-blue-400/40 bg-blue-400/10 text-blue-200';
  return 'border-white/10 bg-white/5 text-white/80';
}

function computeDailyOdds(plan: 'free' | 'starter' | 'pro' | 'enterprise') {
  // Align avec /api/boosters/open: legendaryCut = 1 + luck*1.5 ; epicCut += 3 + luck*4
  // Fair & safe: luck pro/enterprise 0.5, starter 0.3, free 0
  const luck = plan === 'pro' || plan === 'enterprise' ? 0.5 : plan === 'starter' ? 0.3 : 0;
  const legendary = 1 + luck * 1.5;
  const epic = (3 + luck * 4);
  const rare = 18;
  return {
    legendaryPct: legendary,
    epicPct: epic,
    rarePct: rare,
    commonPct: Math.max(0, 100 - legendary - epic - rare),
  };
}

function computePackOdds(packKey: string, plan: 'free' | 'starter' | 'pro' | 'enterprise') {
  // Align avec /api/boosters/claim-pack: legendaryCut = 1 + luck*1.2 ; epicCut += 3 + luck*3 ; rareCut += 20
  const baseLuck = plan === 'pro' || plan === 'enterprise' ? 0.5 : 0.3;
  const luck = packKey === 'pro_weekly' ? baseLuck : 0.3;
  const legendary = 1 + luck * 1.2;
  const epic = 3 + luck * 3;
  const rare = 20;
  return {
    legendaryPct: legendary,
    epicPct: epic,
    rarePct: rare,
    commonPct: Math.max(0, 100 - legendary - epic - rare),
  };
}

export default function BoostersClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const {
    audioState,
  } = useAudioPlayer();

  const {
    inventory,
    remainingMs,
    canOpen,
    openDaily,
    useOnTrack,
    useOnArtist,
    lastOpened,
    loading: boostersLoading,
    fetchInventory,
    plan,
    pity,
    packs,
    streak,
  } = useBoosters();

  // Tabs + search
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [q, setQ] = useState('');

  // Filters (inventory)
  const [showFilters, setShowFilters] = useState(false);
  const [filterRarity, setFilterRarity] = useState<BoosterRarity | 'all'>('all');
  const [filterType, setFilterType] = useState<BoosterType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'owned' | 'used' | 'all'>('owned');
  const [sort, setSort] = useState<'new' | 'rarity' | 'multiplier' | 'duration'>('new');

  // Modals
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [packKey, setPackKey] = useState<string | null>(null);
  const [packReceived, setPackReceived] = useState<PackReceivedItem[]>([]);
  const [selectTrackOpen, setSelectTrackOpen] = useState(false);
  const [pendingInventoryId, setPendingInventoryId] = useState<string | null>(null);

  // Active boosts
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [activeTrackBoosts, setActiveTrackBoosts] = useState<ActiveTrackBoost[]>([]);
  const [activeArtistBoosts, setActiveArtistBoosts] = useState<ActiveArtistBoost[]>([]);
  const [trackMap, setTrackMap] = useState<Record<string, TrackLite>>({});

  // Missions
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsError, setMissionsError] = useState<string | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [claimingMissionId, setClaimingMissionId] = useState<string | null>(null);

  // History (opens)
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [opens, setOpens] = useState<any[]>([]);
  const [opensCursor, setOpensCursor] = useState<string | null>(null);
  const [opensMore, setOpensMore] = useState<boolean>(true);
  const [opensLoadingMore, setOpensLoadingMore] = useState<boolean>(false);

  const nowTs = useNowTicker(1000);

  const playing = audioState.tracks[audioState.currentTrackIndex];
  const playingTrackId = playing?._id as string | undefined;

  useEffect(() => {
    if (!session) router.push('/auth/signin');
  }, [router, session]);

  useEffect(() => {
    if (lastOpened) setShowDailyModal(true);
  }, [lastOpened]);

  const owned = useMemo(() => inventory.filter((i) => i.status === 'owned'), [inventory]);
  const used = useMemo(() => inventory.filter((i) => i.status === 'used'), [inventory]);

  const filteredInventory = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = inventory;
    if (filterStatus !== 'all') list = list.filter((i) => i.status === filterStatus);
    if (filterRarity !== 'all') list = list.filter((i) => i.booster.rarity === filterRarity);
    if (filterType !== 'all') list = list.filter((i) => i.booster.type === filterType);
    if (needle) {
      list = list.filter((i) => {
        const b = i.booster;
        return (
          String(b.name || '').toLowerCase().includes(needle) ||
          String(b.key || '').toLowerCase().includes(needle) ||
          String(b.description || '').toLowerCase().includes(needle)
        );
      });
    }
    const arr = [...list];
    arr.sort((a, b) => {
      if (sort === 'multiplier') return (b.booster.multiplier || 0) - (a.booster.multiplier || 0);
      if (sort === 'duration') return (b.booster.duration_hours || 0) - (a.booster.duration_hours || 0);
      if (sort === 'rarity') return rarityRank(b.booster.rarity as any) - rarityRank(a.booster.rarity as any);
      return new Date(b.obtained_at || 0).getTime() - new Date(a.obtained_at || 0).getTime();
    });
    return arr;
  }, [filterRarity, filterStatus, filterType, inventory, q, sort]);

  const refreshActive = useCallback(async () => {
    setActiveLoading(true);
    setActiveError(null);
    try {
      const res = await fetch('/api/boosters/my-active', { cache: 'no-store' });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur boosts actifs');
      const boosts = Array.isArray(j?.boosts) ? j.boosts : [];
      const artistBoosts = Array.isArray(j?.artistBoosts) ? j.artistBoosts : [];
      setActiveTrackBoosts(boosts);
      setActiveArtistBoosts(artistBoosts);

      const ids = boosts.map((b: any) => String(b.track_id)).filter(Boolean);
      if (ids.length) {
        const trRes = await fetch(`/api/tracks/by-ids?ids=${encodeURIComponent(ids.join(','))}`, { cache: 'no-store' });
        const trJson = await safeJson(trRes);
        if (trRes.ok) {
          const list = Array.isArray(trJson?.tracks) ? trJson.tracks : [];
          const map: Record<string, TrackLite> = {};
          for (const t of list) map[t.id] = t;
          setTrackMap(map);
        }
      } else {
        setTrackMap({});
      }
    } catch (e: any) {
      setActiveError(e?.message || 'Erreur boosts actifs');
    } finally {
      setActiveLoading(false);
    }
  }, []);

  const refreshMissions = useCallback(async () => {
    setMissionsLoading(true);
    setMissionsError(null);
    try {
      const res = await fetch('/api/missions', { cache: 'no-store' });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur missions');
      setMissions(Array.isArray(j?.missions) ? j.missions : []);
    } catch (e: any) {
      setMissionsError(e?.message || 'Erreur missions');
    } finally {
      setMissionsLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch('/api/boosters/history?limit=30', { cache: 'no-store' });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur historique');
      const items = Array.isArray(j?.items) ? j.items : [];
      setOpens(items);
      setOpensCursor(j?.nextCursor || null);
      setOpensMore(Boolean(j?.nextCursor) && items.length > 0);
    } catch (e: any) {
      setHistoryError(e?.message || 'Erreur historique');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    // light prefetch
    if (!userId) return;
    refreshActive();
    refreshMissions();
    refreshHistory();
  }, [refreshActive, refreshHistory, refreshMissions, userId]);

  const claimMission = useCallback(async (missionId: string) => {
    setClaimingMissionId(missionId);
    try {
      const res = await fetch('/api/missions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Claim impossible');
      notify.success('Mission', 'Récompense récupérée !');
      await Promise.all([fetchInventory(), refreshMissions(), refreshHistory()]);
    } catch (e: any) {
      notify.error('Mission', e?.message || 'Erreur');
    } finally {
      setClaimingMissionId(null);
    }
  }, [fetchInventory, refreshHistory, refreshMissions]);

  const openTrackSelect = useCallback((inventoryId: string) => {
    setPendingInventoryId(inventoryId);
    setSelectTrackOpen(true);
  }, []);

  const onSelectTrack = useCallback(async (trackId: string) => {
    const invId = pendingInventoryId;
    setSelectTrackOpen(false);
    setPendingInventoryId(null);
    if (!invId) return;
    const r = await useOnTrack(invId, trackId);
    if (r.ok) {
      notify.success('Booster', 'Boost activé sur la piste !');
      await Promise.all([fetchInventory(), refreshActive()]);
    } else {
      notify.error('Booster', 'Activation impossible');
    }
  }, [fetchInventory, pendingInventoryId, refreshActive, useOnTrack]);

  const applyToCurrentTrack = useCallback(async (inventoryId: string) => {
    if (!playingTrackId) return;
    const r = await useOnTrack(inventoryId, playingTrackId);
    if (r.ok) {
      notify.success('Booster', 'Boost appliqué au morceau en cours !');
      await Promise.all([fetchInventory(), refreshActive()]);
    } else {
      notify.error('Booster', 'Activation impossible');
    }
  }, [fetchInventory, playingTrackId, refreshActive, useOnTrack]);

  const claimPack = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/boosters/claim-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packKey: key }),
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      const received = (Array.isArray(j?.received) ? j.received : []) as PackReceivedItem[];
      setPackKey(key);
      setPackReceived(received);
      setShowPackModal(true);
      notify.success('Pack', `${received.length} booster(s) ajouté(s) à ton inventaire.`);
      await Promise.all([fetchInventory(), refreshHistory()]);
    } catch (e: any) {
      notify.error('Pack', e?.message || 'Erreur');
    }
  }, [fetchInventory, refreshHistory]);

  // Dashboard “smart” ideas (pin local)
  const [pinnedIdeas, setPinnedIdeas] = useLocalStorage<string[]>('boosters:pinnedIdeas', []);
  const ideas = useMemo(() => {
    const list = [
      { id: 'idea:daily', title: 'Streak: ouvre ton booster chaque jour', desc: 'J7 Rare, J14 Épique, J30 Légendaire. Le meilleur “ROI” à long terme.' },
      { id: 'idea:apply', title: 'Boost une piste juste avant un pic de trafic', desc: 'Sortie / promo / post TikTok. Active un boost 30–60 min avant.' },
      { id: 'idea:loop', title: 'Routine hebdo: Packs + missions', desc: 'Réclame tes packs, puis enchaîne missions (plays/likes/shares) pour remplir l’inventaire.' },
      { id: 'idea:focus', title: 'Focus 1 piste / 48h', desc: 'Active 1 boost et pousse la même piste partout: la reco apprend plus vite.' },
    ];
    return list;
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedIdeas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, [setPinnedIdeas]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Connexion requise</h1>
          <p className="text-[var(--text-muted)]">Connecte-toi pour gérer tes boosters.</p>
        </div>
      </div>
    );
  }

  const dailyOdds = computeDailyOdds(plan);
  const starterPackOdds = computePackOdds('starter_weekly', plan);
  const proPackOdds = computePackOdds('pro_weekly', plan);

  const tabs: Array<{ id: TabKey; label: string; icon: React.ComponentType<any> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventaire', icon: Target },
    { id: 'active', label: 'Actifs', icon: Zap },
    { id: 'missions', label: 'Missions', icon: Trophy },
    { id: 'shop', label: 'Shop', icon: Gift },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header sticky (style Library) */}
        <div className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-3 bg-[var(--bg-primary)]/85 backdrop-blur-xl border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] truncate">Boosters</h1>
                <span className="text-xs px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]">
                  Plan: <span className="text-[var(--text)] font-semibold">{plan}</span>
                </span>
              </div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                Inventaire, missions, packs, boosts actifs et analytics — au même endroit.
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDailyModal(true)}
                disabled={!canOpen || boostersLoading}
                className={cx(
                  'px-3 py-2 rounded-xl font-semibold transition-colors border',
                  canOpen ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500/40' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]',
                )}
              >
                {canOpen ? 'Ouvrir (daily)' : formatRemaining(remainingMs)}
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)]"
                aria-label="Filtres"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search + tabs */}
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher boosters / missions / historique…"
                  className="w-full bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-muted)] text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => { setQ(''); setFilterRarity('all'); setFilterType('all'); setFilterStatus('owned'); setSort('new'); }}
                className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] text-sm font-semibold"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cx(
                      'shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors',
                      active ? 'bg-purple-600 text-white border-purple-500/40' : 'bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-3)]',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <StatCard title="Inventaire (dispos)" value={owned.length} subtitle="boosters prêts à être utilisés" icon={<Target className="w-5 h-5 text-green-400" />} />
                  <StatCard title="Boosters utilisés" value={used.length} subtitle="historique d’utilisation" icon={<ShieldCheck className="w-5 h-5 text-blue-400" />} />
                  <StatCard title="Streak" value={streak} subtitle="garde le rythme (J7/J14/J30)" icon={<Calendar className="w-5 h-5 text-purple-400" />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Panel title="Daily (garanties & odds)">
                    <div className="text-sm text-[var(--text-muted)]">
                      La <b>pity</b> + la <b>streak</b> sont partagées pour tout le monde. Ton plan joue surtout sur le confort.
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <OddsRow label="Commun" v={dailyOdds.commonPct} />
                      <OddsRow label="Rare" v={dailyOdds.rarePct} />
                      <OddsRow label="Épique" v={dailyOdds.epicPct} />
                      <OddsRow label="Légendaire" v={dailyOdds.legendaryPct} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDailyModal(true)}
                        disabled={!canOpen || boostersLoading}
                        className={cx(
                          'px-3 py-2 rounded-xl font-semibold transition-colors border',
                          canOpen ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500/40' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]',
                        )}
                      >
                        {canOpen ? 'Ouvrir maintenant' : formatRemaining(remainingMs)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('insights')}
                        className="px-3 py-2 rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)]"
                      >
                        Voir détails
                      </button>
                    </div>
                  </Panel>

                  <Panel title="Boost rapide (morceau en cours)">
                    {playingTrackId ? (
                      <>
                        <div className="text-sm text-[var(--text-muted)]">
                          Morceau: <span className="text-[var(--text)] font-semibold">{playing?.title || playingTrackId}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {owned.filter((i) => i.booster.type === 'track').slice(0, 4).map((i) => (
                            <div key={i.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {rarityIcon(i.booster.rarity as any)}
                                  <div className="text-sm font-semibold text-[var(--text)] truncate">{i.booster.name}</div>
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  x{Number(i.booster.multiplier).toFixed(2)} • {i.booster.duration_hours}h
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => applyToCurrentTrack(i.id)}
                                disabled={boostersLoading}
                                className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-60"
                              >
                                Appliquer
                              </button>
                            </div>
                          ))}
                          {owned.filter((i) => i.booster.type === 'track').length === 0 && (
                            <div className="text-sm text-[var(--text-muted)]">Aucun booster “piste” disponible.</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-[var(--text-muted)]">
                        Lance une piste dans le player pour activer le “boost rapide”.
                      </div>
                    )}
                  </Panel>

                  <Panel title="Idées & stratégie (pin)">
                    <div className="space-y-2">
                      {ideas.map((it) => {
                        const pinned = pinnedIdeas.includes(it.id);
                        return (
                          <div key={it.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[var(--text)]">{it.title}</div>
                                <div className="text-xs text-[var(--text-muted)] mt-1">{it.desc}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => togglePin(it.id)}
                                className={cx(
                                  'px-3 py-1.5 rounded-full text-xs font-semibold border',
                                  pinned ? 'bg-purple-600 text-white border-purple-500/40' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10',
                                )}
                              >
                                {pinned ? 'Épinglé' : 'Épingler'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>
              </motion.div>
            )}

            {tab === 'inventory' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-[var(--text-muted)]">
                    Affichage: <span className="text-[var(--text)] font-semibold">{filteredInventory.length}</span> booster(s)
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      label="Statut"
                      value={filterStatus}
                      onChange={(v) => setFilterStatus(v as any)}
                      options={[
                        { value: 'owned', label: 'Disponibles' },
                        { value: 'used', label: 'Utilisés' },
                        { value: 'all', label: 'Tout' },
                      ]}
                    />
                    <Select
                      label="Tri"
                      value={sort}
                      onChange={(v) => setSort(v as any)}
                      options={[
                        { value: 'new', label: 'Récents' },
                        { value: 'rarity', label: 'Rareté' },
                        { value: 'multiplier', label: 'Multiplicateur' },
                        { value: 'duration', label: 'Durée' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredInventory.map((item) => {
                    const b = item.booster;
                    const canQuick = item.status === 'owned' && b.type === 'track' && Boolean(playingTrackId);
                    return (
                      <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {rarityIcon(b.rarity as any)}
                              <div className="text-[var(--text)] font-bold truncate">{b.name}</div>
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{b.description}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={cx('text-xs px-2 py-1 rounded-full border', rarityChipClass(b.rarity as any))}>
                                {rarityLabel(b.rarity as any)}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/80">
                                {b.type === 'track' ? 'Piste' : 'Artiste'}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/80">
                                x{Number(b.multiplier).toFixed(2)} • {b.duration_hours}h
                              </span>
                            </div>
                          </div>
                          <span className={cx('text-xs px-2 py-1 rounded-full border', item.status === 'owned' ? 'border-green-400/40 bg-green-400/10 text-green-200' : 'border-white/10 bg-white/5 text-white/70')}>
                            {item.status === 'owned' ? 'Disponible' : 'Utilisé'}
                          </span>
                        </div>

                        {item.status === 'owned' && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {b.type === 'track' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openTrackSelect(item.id)}
                                  disabled={boostersLoading}
                                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm disabled:opacity-60"
                                >
                                  Choisir une piste
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyToCurrentTrack(item.id)}
                                  disabled={!canQuick || boostersLoading}
                                  className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-50"
                                  title={!playingTrackId ? 'Lance une piste dans le player' : 'Appliquer au morceau en cours'}
                                >
                                  Sur la piste en cours
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  const r = await useOnArtist(item.id);
                                  if (r.ok) {
                                    notify.success('Booster', 'Boost artiste activé !');
                                    await Promise.all([fetchInventory(), refreshActive()]);
                                  } else {
                                    notify.error('Booster', 'Activation impossible');
                                  }
                                }}
                                disabled={boostersLoading}
                                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-60"
                              >
                                Activer sur mon profil
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  navigator.clipboard?.writeText(`${b.key} • x${b.multiplier} • ${b.duration_hours}h`);
                                  notify.success('Copié', 'Info booster copiée');
                                } catch {}
                              }}
                              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-3)] text-[var(--text)] text-sm font-semibold"
                            >
                              Copier
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredInventory.length === 0 && (
                  <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-center">
                    <div className="text-[var(--text)] font-bold">Aucun résultat</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">Essaye d’enlever des filtres ou va au Shop.</div>
                    <button
                      type="button"
                      onClick={() => setTab('shop')}
                      className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      Aller au Shop
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-[var(--text-muted)]">Boosts en cours (pistes + profil)</div>
                  <button
                    type="button"
                    onClick={refreshActive}
                    disabled={activeLoading}
                    className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-semibold text-sm disabled:opacity-60"
                  >
                    {activeLoading ? 'Refresh…' : 'Refresh'}
                  </button>
                </div>
                {activeError && <div className="text-red-400">{activeError}</div>}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <Panel title="Boosts piste">
                    {activeTrackBoosts.length === 0 ? (
                      <div className="text-sm text-[var(--text-muted)]">Aucun boost piste actif.</div>
                    ) : (
                      <div className="space-y-2">
                        {activeTrackBoosts.map((b, idx) => {
                          const t = trackMap[String(b.track_id)];
                          const msLeft = new Date(b.expires_at).getTime() - nowTs;
                          return (
                            <div key={`${b.track_id}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/30 border border-[var(--border)] shrink-0">
                                {t?.coverUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={t.coverUrl} alt={t.title} className="w-full h-full object-cover" />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[var(--text)] font-semibold truncate">{t?.title || String(b.track_id)}</div>
                                <div className="text-xs text-[var(--text-muted)] truncate">
                                  {t?.artist?.name || t?.artist?.username ? `${t.artist.name || t.artist.username}` : '—'}
                                </div>
                                <div className="mt-1 text-xs text-[var(--text-muted)]">
                                  x{Number(b.multiplier).toFixed(2)} • expire dans {formatRemaining(msLeft)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Boosts artiste (profil)">
                    {activeArtistBoosts.length === 0 ? (
                      <div className="text-sm text-[var(--text-muted)]">Aucun boost artiste actif.</div>
                    ) : (
                      <div className="space-y-2">
                        {activeArtistBoosts.map((b, idx) => {
                          const msLeft = new Date(b.expires_at).getTime() - nowTs;
                          return (
                            <div key={`${b.artist_id}-${idx}`} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                              <div className="text-[var(--text)] font-semibold">Mon profil</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">
                                x{Number(b.multiplier).toFixed(2)} • expire dans {formatRemaining(msLeft)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </div>
              </motion.div>
            )}

            {tab === 'missions' && (
              <motion.div
                key="missions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-[var(--text-muted)]">
                    Missions actives (progression + récompenses). Astuce: fais-les après avoir boosté une piste.
                  </div>
                  <button
                    type="button"
                    onClick={refreshMissions}
                    disabled={missionsLoading}
                    className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-semibold text-sm disabled:opacity-60"
                  >
                    {missionsLoading ? 'Refresh…' : 'Refresh'}
                  </button>
                </div>
                {missionsError && <div className="text-red-400">{missionsError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {missions.map((m) => {
                    const progress = clamp((Number(m.progress || 0) / Math.max(1, Number(m.threshold || 1))) * 100, 0, 100);
                    const done = Boolean(m.completed) || Number(m.progress || 0) >= Number(m.threshold || 0);
                    const canClaim = done && !m.claimed;
                    return (
                      <div key={m.id} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[var(--text)] font-bold">{m.title}</div>
                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              Objectif: {m.goal_type} • {m.progress}/{m.threshold}
                            </div>
                          </div>
                          <span className={cx('text-xs px-2 py-1 rounded-full border', done ? 'border-green-400/40 bg-green-400/10 text-green-200' : 'border-white/10 bg-white/5 text-white/70')}>
                            {done ? (m.claimed ? 'Réclamée' : 'Terminée') : 'En cours'}
                          </span>
                        </div>
                        <div className="mt-3 w-full h-2 rounded-full bg-black/20 overflow-hidden">
                          <div className="h-2 bg-purple-500" style={{ width: pct(progress) }} />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="text-xs text-[var(--text-muted)]">
                            Cooldown: {Number(m.cooldown_hours || 0)}h
                          </div>
                          <button
                            type="button"
                            onClick={() => claimMission(m.id)}
                            disabled={!canClaim || claimingMissionId === m.id}
                            className={cx(
                              'px-3 py-2 rounded-xl font-semibold text-sm border transition-colors',
                              canClaim ? 'bg-green-600 hover:bg-green-700 text-white border-green-500/40' : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]',
                            )}
                          >
                            {claimingMissionId === m.id ? '...' : canClaim ? 'Réclamer' : 'Indispo'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Panel title="Idées de missions (à ajouter ensuite)">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <IdeaCard title="Daily: 3 écoutes complètes" desc="Simple, rapide, parfait pour la rétention." />
                    <IdeaCard title="Weekly: 1 boost + 1 partage" desc="Encourage l’action + la promo (monétisable)." />
                    <IdeaCard title="Créateur: 10 likes reçus" desc="Motive à publier et engager la communauté." />
                    <IdeaCard title="Exploration: 5 genres différents" desc="Améliore la reco + découverte." />
                  </div>
                </Panel>
              </motion.div>
            )}

            {tab === 'shop' && (
              <motion.div
                key="shop"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Panel title="Streak & garanties">
                    <div className="text-sm text-[var(--text-muted)]">
                      Paliers: J7 Rare • J14 Épique • J30 Légendaire. La streak est ton “battle pass” gratuit.
                    </div>
                    <div className="mt-3 text-3xl font-bold text-[var(--text)]">{streak}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">Garde le rythme, même si tu ne joues pas longtemps.</div>
                  </Panel>
                  <Panel title="Pity">
                    <div className="text-xs text-[var(--text-muted)]">Rare: {pity?.opens_since_rare ?? 0}/6 • Épique: {pity?.opens_since_epic ?? 0}/24 • Légendaire: {pity?.opens_since_legendary ?? 0}/79</div>
                    <div className="mt-3 space-y-2">
                      <Bar label="Rare" value={(Number(pity?.opens_since_rare || 0) / 6) * 100} color="bg-blue-500" />
                      <Bar label="Épique" value={(Number(pity?.opens_since_epic || 0) / 24) * 100} color="bg-purple-500" />
                      <Bar label="Légendaire" value={(Number(pity?.opens_since_legendary || 0) / 79) * 100} color="bg-yellow-500" />
                    </div>
                  </Panel>
                  <Panel title="Odds packs (approx)">
                    <div className="text-xs text-[var(--text-muted)]">Starter: Rare garanti • Pro: Rare garanti</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <OddsRow label="Starter • Épique" v={starterPackOdds.epicPct} />
                      <OddsRow label="Starter • Légendaire" v={starterPackOdds.legendaryPct} />
                      <OddsRow label="Pro • Épique" v={proPackOdds.epicPct} />
                      <OddsRow label="Pro • Légendaire" v={proPackOdds.legendaryPct} />
                    </div>
                  </Panel>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <PackCard
                    title="Pack Starter (hebdo)"
                    subtitle="3 boosters • rare garanti • 1/sem"
                    disabled={plan === 'free' || (packs?.starter_weekly ? packs.starter_weekly.claimed >= packs.starter_weekly.perWeek : false)}
                    meta={packs?.starter_weekly ? `${packs.starter_weekly.claimed}/${packs.starter_weekly.perWeek} (semaine ${packs.starter_weekly.periodStart})` : '—'}
                    cta="Réclamer"
                    tone="purple"
                    onClick={() => claimPack('starter_weekly')}
                  />
                  <PackCard
                    title="Pack Pro (hebdo)"
                    subtitle="5 boosters • rare garanti • 2/sem"
                    disabled={(plan !== 'pro' && plan !== 'enterprise') || (packs?.pro_weekly ? packs.pro_weekly.claimed >= packs.pro_weekly.perWeek : false)}
                    meta={packs?.pro_weekly ? `${packs.pro_weekly.claimed}/${packs.pro_weekly.perWeek} (semaine ${packs.pro_weekly.periodStart})` : '—'}
                    cta="Réclamer (Pro)"
                    tone="gold"
                    onClick={() => claimPack('pro_weekly')}
                  />
                </div>

                {plan === 'free' && (
                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                    <div className="text-[var(--text)] font-bold">Débloque les packs</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">Les packs hebdo sont réservés aux abonnés.</div>
                    <a href="/subscriptions" className="inline-flex mt-3 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                      Voir abonnements
                    </a>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-[var(--text-muted)]">Ouvertures (daily/packs/missions)</div>
                  <button
                    type="button"
                    onClick={refreshHistory}
                    disabled={historyLoading}
                    className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-semibold text-sm disabled:opacity-60"
                  >
                    {historyLoading ? 'Refresh…' : 'Refresh'}
                  </button>
                </div>
                {historyError && <div className="text-red-400">{historyError}</div>}
                <div className="space-y-2">
                  {opens.map((o: any) => (
                    <div key={o.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {o.rarity ? rarityIcon(o.rarity as any) : <Sparkles className="w-4 h-4 text-zinc-400" />}
                          <div className="text-[var(--text)] font-semibold truncate">{o.booster_key || 'Booster'}</div>
                          {o.rarity ? <span className={cx('text-xs px-2 py-0.5 rounded-full border', rarityChipClass(o.rarity as any))}>{rarityLabel(o.rarity as any)}</span> : null}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate mt-1">
                          {String(o.source || 'daily')} • {o.opened_at ? new Date(o.opened_at).toLocaleString() : ''}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {o.multiplier ? <div className="text-sm text-green-300 font-bold">x{Number(o.multiplier).toFixed(2)}</div> : null}
                        {o.duration_hours ? <div className="text-xs text-[var(--text-muted)]">{Number(o.duration_hours)}h</div> : null}
                      </div>
                    </div>
                  ))}

                  {opens.length === 0 && !historyLoading && (
                    <div className="text-sm text-[var(--text-muted)]">Aucune ouverture enregistrée.</div>
                  )}

                  {opensMore && (
                    <button
                      type="button"
                      disabled={opensLoadingMore}
                      onClick={async () => {
                        if (!opensCursor || opensLoadingMore) return;
                        setOpensLoadingMore(true);
                        try {
                          const res = await fetch(`/api/boosters/history?limit=30&cursor=${encodeURIComponent(opensCursor)}`, { cache: 'no-store' });
                          const j = await safeJson(res);
                          if (!res.ok) throw new Error(j?.error || 'Erreur');
                          const items = Array.isArray(j?.items) ? j.items : [];
                          setOpens((prev) => [...prev, ...items]);
                          setOpensCursor(j?.nextCursor || null);
                          setOpensMore(Boolean(j?.nextCursor) && items.length > 0);
                        } catch {}
                        setOpensLoadingMore(false);
                      }}
                      className="w-full mt-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-semibold disabled:opacity-60"
                    >
                      {opensLoadingMore ? 'Chargement…' : 'Charger plus'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <Panel title="Comment ça marche (vraiment)">
                  <div className="text-sm text-[var(--text-muted)] space-y-2">
                    <p>
                      - <b>Streak</b>: tous les 7/14/30 jours, tu as une garantie Rare/Épique/Légendaire.
                    </p>
                    <p>
                      - <b>Pity</b>: si tu n’obtiens pas certaines raretés pendant longtemps, la prochaine ouverture force une rareté minimale.
                    </p>
                    <p>
                      - <b>Plan</b>: “fair & safe” → l’abonnement n’écrase pas les odds; il aide surtout via cooldown/packs.
                    </p>
                  </div>
                </Panel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Panel title="Odds (daily, approx)">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <OddsRow label="Commun" v={dailyOdds.commonPct} />
                      <OddsRow label="Rare" v={dailyOdds.rarePct} />
                      <OddsRow label="Épique" v={dailyOdds.epicPct} />
                      <OddsRow label="Légendaire" v={dailyOdds.legendaryPct} />
                    </div>
                    <div className="mt-3 text-xs text-[var(--text-muted)]">Valeurs indicatives (hors garanties).</div>
                  </Panel>
                  <Panel title="Améliorations à venir (idées)">
                    <div className="space-y-2 text-sm text-[var(--text-muted)]">
                      <div>• Missions “smart” personnalisées (selon écoute/genres).</div>
                      <div>• Analytics boost: plays/likes gagnés pendant la fenêtre de boost.</div>
                      <div>• “Boost presets”: pack de boosts + calendrier (ex: sortie hebdo).</div>
                      <div>• Shop: boosters cosmétiques (badges/skins) + drops rares.</div>
                    </div>
                  </Panel>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals (portals like Library) */}
      <BoosterOpenModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        onOpenBooster={openDaily}
        isOpening={boostersLoading}
        openedBooster={lastOpened ? ({ id: lastOpened.inventoryId, status: 'owned', obtained_at: new Date().toISOString(), booster: lastOpened.booster } as any) : null}
        item={lastOpened as any}
      />

      <BoosterPackOpenModal
        isOpen={showPackModal}
        onClose={() => setShowPackModal(false)}
        packKey={packKey}
        received={packReceived}
      />

      <TrackSelectModal
        isOpen={selectTrackOpen}
        onClose={() => setSelectTrackOpen(false)}
        onSelect={onSelectTrack}
      />

      {isMounted && showFilters && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="relative w-[95vw] max-w-[520px] rounded-2xl border border-white/10 bg-gradient-to-b from-black/75 to-black/60 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <Settings2 className="w-5 h-5 text-purple-300" />
                Filtres inventaire
              </div>
              <button onClick={() => setShowFilters(false)} className="text-white/70 hover:text-white" aria-label="Fermer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Statut</div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none"
                  >
                    <option value="owned">Disponibles</option>
                    <option value="used">Utilisés</option>
                    <option value="all">Tout</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Type</div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none"
                  >
                    <option value="all">Tous</option>
                    <option value="track">Piste</option>
                    <option value="artist">Artiste</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Rareté</div>
                  <select
                    value={filterRarity}
                    onChange={(e) => setFilterRarity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none"
                  >
                    <option value="all">Toutes</option>
                    <option value="common">Commun</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Épique</option>
                    <option value="legendary">Légendaire</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Tri</div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none"
                  >
                    <option value="new">Récents</option>
                    <option value="rarity">Rareté</option>
                    <option value="multiplier">Multiplicateur</option>
                    <option value="duration">Durée</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setFilterRarity('all'); setFilterType('all'); setFilterStatus('owned'); setSort('new'); }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/10"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => { setShowFilters(false); setTab('inventory'); }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  Voir inventaire
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: any; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-black/20 border border-white/10">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-[var(--text-muted)]">{title}</div>
          <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
          <div className="text-xs text-[var(--text-muted)]">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="text-[var(--text)] font-bold mb-2">{title}</div>
      {children}
    </div>
  );
}

function OddsRow({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-white/10 bg-white/5">
      <div className="text-white/80">{label}</div>
      <div className="text-white font-bold">{Number(v).toFixed(1)}%</div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const w = clamp(value, 0, 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
        <span>{label}</span>
        <span>{pct(w)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
        <div className={cx('h-2', color)} style={{ width: pct(w) }} />
      </div>
    </div>
  );
}

function PackCard({
  title,
  subtitle,
  meta,
  cta,
  disabled,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  meta: string;
  cta: string;
  disabled: boolean;
  tone: 'purple' | 'gold';
  onClick: () => void;
}) {
  const cls =
    tone === 'gold'
      ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500/30'
      : 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30';
  const btn =
    tone === 'gold'
      ? 'bg-yellow-600 hover:bg-yellow-700'
      : 'bg-purple-600 hover:bg-purple-700';
  return (
    <div className={cx('rounded-2xl p-5 border', cls)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[var(--text)] font-bold">{title}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</div>
          <div className="text-xs text-[var(--text-muted)] mt-2">{meta}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cx('mt-4 w-full px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed', btn)}
      >
        {cta}
      </button>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-sm outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function IdeaCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="text-[var(--text)] font-bold">{title}</div>
      <div className="text-sm text-[var(--text-muted)] mt-1">{desc}</div>
    </div>
  );
}

function useNowTicker(ms: number) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

