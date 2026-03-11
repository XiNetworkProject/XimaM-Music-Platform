'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  ChevronRight,
  Clock,
  Crown,
  Filter,
  Flame,
  Gem,
  Gift,
  History,
  Package,
  Search,
  Settings2,
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
import DailySpinModal from '@/components/DailySpinModal';
import TrackSelectModal from '@/components/TrackSelectModal';
import { notify } from '@/components/NotificationCenter';

type TabKey = 'boosters' | 'missions' | 'shop' | 'history';
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
  goal_type: 'plays' | 'likes' | 'shares' | 'boosts';
  threshold: number;
  cooldown_hours: number;
  reward_booster_id: string | null;
  reward?: {
    id: string;
    key: string;
    name: string;
    rarity: BoosterRarity;
    type: BoosterType;
    multiplier: number;
    duration_hours: number;
  } | null;
  enabled: boolean;
  progress: number;
  completed: boolean;
  claimed: boolean;
  canClaim?: boolean;
  resetsAt?: string | null;
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

function formatCountdown(ms: number) {
  const v = Math.max(0, Number(ms || 0));
  if (v <= 0) return '0s';
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
  if (r === 'legendary') return 'Legendaire';
  if (r === 'epic') return 'Epique';
  if (r === 'rare') return 'Rare';
  return 'Commun';
}

const RARITY_CFG: Record<BoosterRarity, { gradient: string; glow: string; border: string; text: string; icon: typeof Sparkles; bg: string }> = {
  common: { gradient: 'from-zinc-500 to-zinc-700', glow: 'shadow-zinc-500/20', border: 'border-zinc-500/30', text: 'text-zinc-400', icon: Sparkles, bg: 'bg-zinc-500' },
  rare: { gradient: 'from-blue-400 to-indigo-600', glow: 'shadow-blue-500/30', border: 'border-blue-500/30', text: 'text-blue-400', icon: Star, bg: 'bg-blue-500' },
  epic: { gradient: 'from-purple-400 to-fuchsia-600', glow: 'shadow-purple-500/40', border: 'border-purple-500/30', text: 'text-purple-400', icon: Crown, bg: 'bg-purple-500' },
  legendary: { gradient: 'from-amber-400 via-orange-500 to-red-500', glow: 'shadow-orange-500/50', border: 'border-amber-500/40', text: 'text-amber-400', icon: Gem, bg: 'bg-amber-500' },
};

function rarityIcon(r: BoosterRarity) {
  const cfg = RARITY_CFG[r];
  const Icon = cfg.icon;
  return <Icon className={`w-4 h-4 ${cfg.text}`} />;
}

function computeDailyOdds(plan: 'free' | 'starter' | 'pro' | 'enterprise') {
  const luck = plan === 'pro' || plan === 'enterprise' ? 0.5 : plan === 'starter' ? 0.3 : 0;
  const legendary = 1 + luck * 1.5;
  const epic = (3 + luck * 4);
  const rare = 18;
  return { legendaryPct: legendary, epicPct: epic, rarePct: rare, commonPct: Math.max(0, 100 - legendary - epic - rare) };
}

const KEYFRAMES = `
  @keyframes booster-float {
    0%, 100% { transform: translateY(0) rotateY(0deg); }
    25% { transform: translateY(-12px) rotateY(-3deg); }
    75% { transform: translateY(-8px) rotateY(3deg); }
  }
  @keyframes booster-glow-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.15); }
  }
  @keyframes foil-sweep {
    0% { transform: translateX(-100%) rotate(25deg); }
    100% { transform: translateX(200%) rotate(25deg); }
  }
  @keyframes streak-fire {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 4px currentColor); }
    50% { filter: brightness(1.4) drop-shadow(0 0 12px currentColor); }
  }
  @keyframes pity-glow {
    0%, 100% { box-shadow: 0 0 0px transparent; }
    50% { box-shadow: 0 0 12px currentColor; }
  }
  @keyframes blob-drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -20px) scale(1.1); }
    66% { transform: translate(-20px, 15px) scale(0.9); }
  }
`;

function BoosterCard({
  item,
  onApplyTrack,
  onApplyCurrentTrack,
  onApplyArtist,
  canQuickApply,
  disabled,
}: {
  item: { id: string; status: 'owned' | 'used'; booster: { key: string; name: string; description?: string; type: BoosterType; rarity: BoosterRarity; multiplier: number; duration_hours: number } };
  onApplyTrack?: () => void;
  onApplyCurrentTrack?: () => void;
  onApplyArtist?: () => void;
  canQuickApply?: boolean;
  disabled?: boolean;
}) {
  const b = item.booster;
  const cfg = RARITY_CFG[b.rarity];
  const Icon = cfg.icon;
  const isOwned = item.status === 'owned';
  const isLegendary = b.rarity === 'legendary';
  const isEpic = b.rarity === 'epic';

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={cx(
        'relative aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300',
        'border',
        isOwned ? cfg.border : 'border-white/5',
        isOwned && `shadow-lg ${cfg.glow}`,
        isOwned && 'group-hover:scale-[1.03] group-hover:shadow-xl',
        !isOwned && 'opacity-50 grayscale-[50%]',
      )}>
        {/* Gradient background */}
        <div className={cx('absolute inset-0 bg-gradient-to-br opacity-20', cfg.gradient)} />
        <div className="absolute inset-0 bg-[#0a0a15]/80" />

        {/* Foil sweep effect for rare+ */}
        {isOwned && (isLegendary || isEpic || b.rarity === 'rare') && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.12) 55%, transparent 60%)',
                animation: 'foil-sweep 1.5s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-3">
          {/* Top: rarity + type */}
          <div className="flex items-center justify-between">
            <div className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', 'bg-white/5 border border-white/10', cfg.text)}>
              <Icon className="w-3 h-3" />
              {rarityLabel(b.rarity)}
            </div>
            {isOwned && (
              <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                x{Number(b.multiplier).toFixed(2)}
              </div>
            )}
          </div>

          {/* Center icon */}
          <div className="flex-1 flex items-center justify-center">
            <div className={cx('relative')}>
              <div className={cx('absolute inset-0 rounded-full blur-xl opacity-30', cfg.bg)} style={{ transform: 'scale(2)' }} />
              <Icon className={cx('relative w-10 h-10', cfg.text)} />
            </div>
          </div>

          {/* Bottom: info */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-white leading-tight line-clamp-2">{b.name}</div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/40">{b.type === 'track' ? 'Piste' : 'Artiste'}</span>
              <span className="text-white/40 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{b.duration_hours}h</span>
            </div>

            {isOwned && (
              <div className="pt-1.5 space-y-1">
                {b.type === 'track' ? (
                  <>
                    <button
                      type="button"
                      onClick={onApplyTrack}
                      disabled={disabled}
                      className="w-full h-7 rounded-lg text-[10px] font-bold text-white transition-all bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-40"
                    >
                      Choisir piste
                    </button>
                    {canQuickApply && (
                      <button
                        type="button"
                        onClick={onApplyCurrentTrack}
                        disabled={disabled}
                        className="w-full h-7 rounded-lg text-[10px] font-bold text-white/60 border border-white/10 hover:bg-white/5 transition disabled:opacity-40"
                      >
                        Piste en cours
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onApplyArtist}
                    disabled={disabled}
                    className="w-full h-7 rounded-lg text-[10px] font-bold text-white transition-all bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-40"
                  >
                    Boost profil
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Used overlay */}
        {!isOwned && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Utilise</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function BoostersClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { audioState } = useAudioPlayer();
  const {
    inventory, remainingMs, canOpen, openDaily, useOnTrack, useOnArtist,
    lastOpened, loading: boostersLoading, fetchInventory, plan, pity, packs, streak,
  } = useBoosters();

  const [tab, setTab] = useState<TabKey>('boosters');
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterRarity, setFilterRarity] = useState<BoosterRarity | 'all'>('all');
  const [filterType, setFilterType] = useState<BoosterType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'owned' | 'used' | 'all'>('owned');
  const [sort, setSort] = useState<'new' | 'rarity' | 'multiplier' | 'duration'>('new');

  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [packKey, setPackKey] = useState<string | null>(null);
  const [packReceived, setPackReceived] = useState<PackReceivedItem[]>([]);
  const [selectTrackOpen, setSelectTrackOpen] = useState(false);
  const [pendingInventoryId, setPendingInventoryId] = useState<string | null>(null);

  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [activeTrackBoosts, setActiveTrackBoosts] = useState<ActiveTrackBoost[]>([]);
  const [activeArtistBoosts, setActiveArtistBoosts] = useState<ActiveArtistBoost[]>([]);
  const [trackMap, setTrackMap] = useState<Record<string, TrackLite>>({});

  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsError, setMissionsError] = useState<string | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [claimingMissionId, setClaimingMissionId] = useState<string | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [opens, setOpens] = useState<any[]>([]);
  const [opensCursor, setOpensCursor] = useState<string | null>(null);
  const [opensMore, setOpensMore] = useState<boolean>(true);
  const [opensLoadingMore, setOpensLoadingMore] = useState<boolean>(false);

  const nowTs = useNowTicker(1000);
  const playing = audioState.tracks[audioState.currentTrackIndex];
  const playingTrackId = playing?._id as string | undefined;

  useEffect(() => { if (!session) router.push('/auth/signin'); }, [router, session]);
  useEffect(() => { if (lastOpened) setShowDailyModal(true); }, [lastOpened]);

  const owned = useMemo(() => inventory.filter((i) => i.status === 'owned'), [inventory]);
  const used = useMemo(() => inventory.filter((i) => i.status === 'used'), [inventory]);

  const filteredInventory = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = inventory;
    if (filterStatus !== 'all') list = list.filter((i) => i.status === filterStatus);
    if (filterRarity !== 'all') list = list.filter((i) => i.booster.rarity === filterRarity);
    if (filterType !== 'all') list = list.filter((i) => i.booster.type === filterType);
    if (needle) list = list.filter((i) => {
      const b = i.booster;
      return String(b.name || '').toLowerCase().includes(needle) || String(b.key || '').toLowerCase().includes(needle) || String(b.description || '').toLowerCase().includes(needle);
    });
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
    setActiveLoading(true); setActiveError(null);
    try {
      const res = await fetch('/api/boosters/my-active', { cache: 'no-store' });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      setActiveTrackBoosts(Array.isArray(j?.boosts) ? j.boosts : []);
      setActiveArtistBoosts(Array.isArray(j?.artistBoosts) ? j.artistBoosts : []);
      const ids = (Array.isArray(j?.boosts) ? j.boosts : []).map((b: any) => String(b.track_id)).filter(Boolean);
      if (ids.length) {
        const trRes = await fetch(`/api/tracks/by-ids?ids=${encodeURIComponent(ids.join(','))}`, { cache: 'no-store' });
        const trJson = await safeJson(trRes);
        if (trRes.ok) { const map: Record<string, TrackLite> = {}; for (const t of (Array.isArray(trJson?.tracks) ? trJson.tracks : [])) map[t.id] = t; setTrackMap(map); }
      } else { setTrackMap({}); }
    } catch (e: any) { setActiveError(e?.message || 'Erreur'); } finally { setActiveLoading(false); }
  }, []);

  const refreshMissions = useCallback(async () => {
    setMissionsLoading(true); setMissionsError(null);
    try { const res = await fetch('/api/missions', { cache: 'no-store' }); const j = await safeJson(res); if (!res.ok) throw new Error(j?.error || 'Erreur'); setMissions(Array.isArray(j?.missions) ? j.missions : []); } catch (e: any) { setMissionsError(e?.message || 'Erreur'); } finally { setMissionsLoading(false); }
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true); setHistoryError(null);
    try { const res = await fetch('/api/boosters/history?limit=30', { cache: 'no-store' }); const j = await safeJson(res); if (!res.ok) throw new Error(j?.error || 'Erreur'); const items = Array.isArray(j?.items) ? j.items : []; setOpens(items); setOpensCursor(j?.nextCursor || null); setOpensMore(Boolean(j?.nextCursor) && items.length > 0); } catch (e: any) { setHistoryError(e?.message || 'Erreur'); } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { if (!userId) return; refreshActive(); refreshMissions(); refreshHistory(); }, [refreshActive, refreshHistory, refreshMissions, userId]);

  const claimMission = useCallback(async (missionId: string) => {
    setClaimingMissionId(missionId);
    try { const res = await fetch('/api/missions/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ missionId }) }); const j = await safeJson(res); if (!res.ok) throw new Error(j?.error || 'Erreur'); notify.success('Mission', 'Recompense recuperee !'); await Promise.all([fetchInventory(), refreshMissions(), refreshHistory()]); } catch (e: any) { notify.error('Mission', e?.message || 'Erreur'); } finally { setClaimingMissionId(null); }
  }, [fetchInventory, refreshHistory, refreshMissions]);

  const claimManyMissions = useCallback(async (missionIds: string[]) => {
    const ids = Array.from(new Set((missionIds || []).map((x) => String(x || '').trim()).filter(Boolean))).slice(0, 20);
    if (!ids.length) return;
    try { const res = await fetch('/api/missions/claim-many', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ missionIds: ids }) }); const j = await safeJson(res); if (!res.ok) throw new Error(j?.error || 'Erreur'); const claimed = Array.isArray(j?.claimed) ? j.claimed : []; if (claimed.length) notify.success('Missions', `${claimed.length} mission(s) reclamee(s)`); await Promise.all([fetchInventory(), refreshMissions(), refreshHistory()]); } catch (e: any) { notify.error('Missions', e?.message || 'Erreur'); }
  }, [fetchInventory, refreshHistory, refreshMissions]);

  const openTrackSelect = useCallback((inventoryId: string) => { setPendingInventoryId(inventoryId); setSelectTrackOpen(true); }, []);
  const onSelectTrack = useCallback(async (trackId: string) => {
    const invId = pendingInventoryId; setSelectTrackOpen(false); setPendingInventoryId(null);
    if (!invId) return;
    const r = await useOnTrack(invId, trackId);
    if (r.ok) { notify.success('Booster', 'Boost active !'); await Promise.all([fetchInventory(), refreshActive()]); } else { notify.error('Booster', 'Activation impossible'); }
  }, [fetchInventory, pendingInventoryId, refreshActive, useOnTrack]);

  const applyToCurrentTrack = useCallback(async (inventoryId: string) => {
    if (!playingTrackId) return;
    const r = await useOnTrack(inventoryId, playingTrackId);
    if (r.ok) { notify.success('Booster', 'Boost applique !'); await Promise.all([fetchInventory(), refreshActive()]); } else { notify.error('Booster', 'Activation impossible'); }
  }, [fetchInventory, playingTrackId, refreshActive, useOnTrack]);

  const claimPack = useCallback(async (key: string) => {
    try { const res = await fetch('/api/boosters/claim-pack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packKey: key }) }); const j = await safeJson(res); if (!res.ok) throw new Error(j?.error || 'Erreur'); const received = (Array.isArray(j?.received) ? j.received : []) as PackReceivedItem[]; setPackKey(key); setPackReceived(received); setShowPackModal(true); notify.success('Pack', `${received.length} booster(s) ajoute(s)`); await Promise.all([fetchInventory(), refreshHistory()]); } catch (e: any) { notify.error('Pack', e?.message || 'Erreur'); }
  }, [fetchInventory, refreshHistory]);

  if (!session) {
    return (
      <div className="min-h-[70vh] px-4 py-10 flex items-center justify-center" style={{ background: '#050510' }}>
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 grid place-items-center mb-4"><Zap className="h-8 w-8 text-white" /></div>
          <div className="text-lg font-bold text-white">Connecte-toi</div>
          <div className="mt-2 text-sm text-white/50">Tes boosters et recompenses sont lies a ton compte.</div>
          <button type="button" onClick={() => router.push('/auth/signin')} className="mt-5 h-11 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold hover:opacity-90 transition">Se connecter</button>
        </div>
      </div>
    );
  }

  const dailyOdds = computeDailyOdds(plan);

  const tabs: Array<{ id: TabKey; label: string; icon: React.ComponentType<any> }> = [
    { id: 'boosters', label: 'Mes Boosters', icon: Zap },
    { id: 'missions', label: 'Missions', icon: Trophy },
    { id: 'shop', label: 'Shop', icon: Gift },
    { id: 'history', label: 'Historique', icon: History },
  ];

  const activeCount = activeTrackBoosts.length + activeArtistBoosts.length;

  return (
    <div className="min-h-screen text-white" style={{ background: '#050510' }}>
      <style>{KEYFRAMES}</style>

      {/* Animated background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-15%] w-[55%] h-[55%] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'blob-drift 20s ease-in-out infinite' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.6) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'blob-drift 25s ease-in-out infinite reverse' }} />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'blob-drift 18s ease-in-out infinite 5s' }} />
      </div>

      <div className="relative z-10">
        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <section className="relative overflow-hidden px-4 pt-8 pb-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Left: floating booster visual */}
              <div className="relative w-40 h-52 shrink-0 hidden sm:block" style={{ animation: 'booster-float 6s ease-in-out infinite', perspective: '800px' }}>
                {/* Glow behind card */}
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.4) 0%, transparent 70%)', filter: 'blur(30px)', animation: 'booster-glow-pulse 3s ease-in-out infinite' }} />
                {/* Card */}
                <div className="relative w-full h-full rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#0f0a20] to-[#1a0a2e] overflow-hidden shadow-2xl shadow-violet-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-pink-600/10" />
                  <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-violet-600/40 to-pink-600/40 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest">Synaura Booster</span>
                  </div>
                  <div className="h-full flex items-center justify-center">
                    <Zap className="w-14 h-14 text-violet-400/60" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[10px] text-white/40 font-medium">Mystere</span>
                  </div>
                  {/* Foil sweep */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)', animation: 'foil-sweep 3s ease-in-out infinite' }} />
                  </div>
                </div>
              </div>

              {/* Center: main CTA */}
              <div className="flex-1 min-w-0 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 mb-3">
                  <Zap className="w-3 h-3 text-violet-400" />
                  <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">Boosters Synaura</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-2">
                  <span className="text-white">Ouvre, collectionne,</span><br />
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #ec4899, #f59e0b)' }}>
                    domine le classement.
                  </span>
                </h1>
                <p className="text-sm text-white/40 max-w-md mx-auto lg:mx-0 mb-5">
                  Chaque booster augmente la visibilite de tes pistes et de ton profil. Ouvre ton booster quotidien, tourne la roue, complete des missions.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDailyModal(true)}
                    disabled={!canOpen || boostersLoading}
                    className={cx(
                      'h-12 px-6 rounded-2xl font-bold text-sm transition-all',
                      canOpen
                        ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-violet-500/30'
                        : 'border border-white/10 bg-white/5 text-white/40',
                    )}
                  >
                    {canOpen ? (
                      <span className="flex items-center gap-2"><Zap className="w-4 h-4" />Ouvrir le booster</span>
                    ) : (
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{formatRemaining(remainingMs)}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSpinModal(true)}
                    className="h-12 px-6 rounded-2xl font-bold text-sm border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><Gift className="w-4 h-4" />Roue quotidienne</span>
                  </button>
                </div>
              </div>

              {/* Right: streak + stats */}
              <div className="flex sm:flex-col items-center sm:items-end gap-4 shrink-0">
                {/* Streak counter */}
                <div className="relative flex items-center gap-2">
                  <div className={cx('relative h-14 w-14 rounded-2xl border flex items-center justify-center', streak >= 7 ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-white/5')}>
                    <div className="text-xl font-black text-white">{streak}</div>
                    {streak >= 7 && <Flame className="absolute -top-2 -right-2 w-5 h-5 text-amber-400" style={{ animation: 'streak-fire 1.5s ease-in-out infinite' }} />}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white/70">Streak</div>
                    <div className="text-[10px] text-white/30">
                      {streak >= 30 ? 'Legendaire garanti !' : streak >= 14 ? 'Epique bientot' : streak >= 7 ? 'Rare garanti' : `J${7 - streak} pour Rare`}
                    </div>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{owned.length}</div>
                    <div className="text-white/30">Dispo</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{activeCount}</div>
                    <div className="text-white/30">Actifs</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{used.length}</div>
                    <div className="text-white/30">Utilises</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            NAVIGATION
        ══════════════════════════════════════ */}
        <nav className="sticky top-0 z-20 border-y border-white/5 backdrop-blur-xl" style={{ background: 'rgba(5,5,16,0.8)' }}>
          <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cx(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                    tab === t.id
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/5',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..."
                  className="h-9 pl-8 pr-3 w-32 sm:w-40 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/20 outline-none focus:border-violet-500/50 transition" />
              </div>
              <button type="button" onClick={() => setShowFilters(true)} className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/40 hover:text-white hover:bg-white/10 transition">
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════
            CONTENT
        ══════════════════════════════════════ */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">

            {/* ── BOOSTERS (Inventaire + Actifs) ──────── */}
            {tab === 'boosters' && (
              <motion.div key="boosters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">

                {/* Active boosts banner */}
                {activeCount > 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">{activeCount} boost{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeTrackBoosts.map((b, idx) => {
                        const t = trackMap[String(b.track_id)];
                        const msLeft = new Date(b.expires_at).getTime() - nowTs;
                        return (
                          <div key={`t-${idx}`} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                            {t?.coverUrl && <img src={t.coverUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white truncate">{t?.title || 'Piste'}</div>
                              <div className="text-[10px] text-white/40">x{Number(b.multiplier).toFixed(2)} · {formatRemaining(msLeft)}</div>
                            </div>
                          </div>
                        );
                      })}
                      {activeArtistBoosts.map((b, idx) => {
                        const msLeft = new Date(b.expires_at).getTime() - nowTs;
                        return (
                          <div key={`a-${idx}`} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/20 grid place-items-center"><Star className="w-4 h-4 text-violet-400" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white">Profil artiste</div>
                              <div className="text-[10px] text-white/40">x{Number(b.multiplier).toFixed(2)} · {formatRemaining(msLeft)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filters display */}
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-white/30">{filteredInventory.length} booster{filteredInventory.length !== 1 ? 's' : ''}</div>
                  <div className="flex items-center gap-2">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="h-8 px-2 rounded-lg border border-white/10 bg-white/5 text-[11px] text-white/60 outline-none">
                      <option value="owned">Disponibles</option><option value="used">Utilises</option><option value="all">Tout</option>
                    </select>
                    <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-8 px-2 rounded-lg border border-white/10 bg-white/5 text-[11px] text-white/60 outline-none">
                      <option value="new">Recents</option><option value="rarity">Rarete</option><option value="multiplier">Multi</option><option value="duration">Duree</option>
                    </select>
                  </div>
                </div>

                {/* Card grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredInventory.map((item, idx) => (
                    <BoosterCard
                      key={item.id}
                      item={item}
                      onApplyTrack={() => openTrackSelect(item.id)}
                      onApplyCurrentTrack={() => applyToCurrentTrack(item.id)}
                      onApplyArtist={async () => {
                        const r = await useOnArtist(item.id);
                        if (r.ok) { notify.success('Booster', 'Boost artiste active !'); await Promise.all([fetchInventory(), refreshActive()]); } else { notify.error('Booster', 'Impossible'); }
                      }}
                      canQuickApply={item.status === 'owned' && item.booster.type === 'track' && Boolean(playingTrackId)}
                      disabled={boostersLoading}
                    />
                  ))}
                </div>

                {filteredInventory.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 grid place-items-center mb-4"><Package className="w-8 h-8 text-white/20" /></div>
                    <div className="text-sm font-semibold text-white/40">Aucun booster</div>
                    <div className="text-xs text-white/20 mt-1">Ouvre ton daily ou va au Shop.</div>
                    <button type="button" onClick={() => setTab('shop')} className="mt-4 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 transition">Aller au Shop</button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── MISSIONS ────────────────────────── */}
            {tab === 'missions' && (
              <motion.div key="missions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                {missionsError && <div className="text-red-400 text-sm">{missionsError}</div>}

                {(() => {
                  const claimableIds = missions.filter((m) => Boolean(m.canClaim ?? (m.completed && !m.claimed))).map((m) => m.id);
                  return claimableIds.length > 0 ? (
                    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                      <div className="text-sm font-semibold text-emerald-400">{claimableIds.length} recompense{claimableIds.length > 1 ? 's' : ''} a recuperer</div>
                      <button type="button" onClick={() => claimManyMissions(claimableIds)} className="h-9 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition">Tout reclamer</button>
                    </div>
                  ) : null;
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {missions.map((m) => {
                    const progress = clamp((Number(m.progress || 0) / Math.max(1, Number(m.threshold || 1))) * 100, 0, 100);
                    const done = Boolean(m.completed) || Number(m.progress || 0) >= Number(m.threshold || 0);
                    const canClaim = Boolean(m.canClaim ?? (done && !m.claimed));
                    const resetsAtTs = m.resetsAt ? new Date(m.resetsAt).getTime() : null;
                    const msToReset = resetsAtTs ? (resetsAtTs - nowTs) : null;
                    const reward = m.reward || null;
                    const rewardCfg = reward ? RARITY_CFG[reward.rarity] : null;

                    return (
                      <div key={m.id} className={cx('rounded-2xl border p-4 transition-all', canClaim ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]')}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white">{m.title}</div>
                            <div className="text-[11px] text-white/30 mt-0.5">{m.progress}/{m.threshold} · {m.goal_type}</div>
                          </div>
                          {done && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{m.claimed ? 'Reclamee' : 'OK'}</span>}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500" initial={{ width: 0 }} animate={{ width: pct(progress) }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                        </div>

                        {/* Reward + action */}
                        <div className="flex items-center justify-between gap-3">
                          {reward && rewardCfg ? (
                            <div className="flex items-center gap-2 min-w-0">
                              {React.createElement(rewardCfg.icon, { className: `w-3.5 h-3.5 ${rewardCfg.text}` })}
                              <span className={cx('text-[11px] font-semibold', rewardCfg.text)}>{reward.name}</span>
                              <span className="text-[10px] text-white/25">x{Number(reward.multiplier).toFixed(2)}</span>
                            </div>
                          ) : <div />}
                          <button
                            type="button"
                            onClick={() => claimMission(m.id)}
                            disabled={!canClaim || claimingMissionId === m.id}
                            className={cx('h-8 px-4 rounded-lg text-xs font-bold transition', canClaim ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90' : 'bg-white/5 text-white/20 border border-white/5')}
                          >
                            {claimingMissionId === m.id ? '...' : canClaim ? 'Reclamer' : m.claimed ? `Reset ${msToReset ? formatCountdown(msToReset) : ''}` : 'En cours'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {missions.length === 0 && !missionsLoading && (
                  <div className="py-12 text-center text-sm text-white/30">Aucune mission disponible pour le moment.</div>
                )}
              </motion.div>
            )}

            {/* ── SHOP ────────────────────────────── */}
            {tab === 'shop' && (
              <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">

                {/* Pity meters */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-white/40" />
                    <span className="text-sm font-bold text-white">Systeme de garantie (Pity)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Rare', current: pity?.opens_since_rare ?? 0, max: 6, color: 'from-blue-500 to-indigo-500', text: 'text-blue-400' },
                      { label: 'Epique', current: pity?.opens_since_epic ?? 0, max: 24, color: 'from-purple-500 to-fuchsia-500', text: 'text-purple-400' },
                      { label: 'Legendaire', current: pity?.opens_since_legendary ?? 0, max: 79, color: 'from-amber-500 to-orange-500', text: 'text-amber-400' },
                    ].map((p) => {
                      const ratio = clamp((p.current / p.max) * 100, 0, 100);
                      return (
                        <div key={p.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={cx('text-xs font-bold', p.text)}>{p.label}</span>
                            <span className="text-[10px] text-white/30">{p.current}/{p.max}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className={cx('h-full rounded-full bg-gradient-to-r transition-all duration-500', p.color)}
                              style={{ width: pct(ratio), boxShadow: ratio > 70 ? `0 0 8px currentColor` : 'none' }} />
                          </div>
                          {ratio >= 80 && <div className={cx('text-[10px] mt-1 font-semibold', p.text)} style={{ animation: 'pity-glow 2s infinite' }}>Bientot garanti !</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Packs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Starter Pack */}
                  <div className="group relative rounded-2xl border border-violet-500/20 overflow-hidden transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 to-purple-900/20" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                    <div className="relative p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-5 h-5 text-violet-400" />
                            <span className="text-base font-black text-white">Pack Starter</span>
                          </div>
                          <div className="text-xs text-white/40">3 boosters · 1 rare garanti · Hebdo</div>
                        </div>
                        <div className="px-2 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase">Rare+</div>
                      </div>
                      <div className="text-[11px] text-white/25 mb-3">{packs?.starter_weekly ? `${packs.starter_weekly.claimed}/${packs.starter_weekly.perWeek} cette semaine` : '---'}</div>
                      <button
                        type="button"
                        onClick={() => claimPack('starter_weekly')}
                        disabled={plan === 'free' || (packs?.starter_weekly ? packs.starter_weekly.claimed >= packs.starter_weekly.perWeek : false)}
                        className="w-full h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Ouvrir le pack
                      </button>
                    </div>
                  </div>

                  {/* Pro Pack */}
                  <div className="group relative rounded-2xl border border-amber-500/20 overflow-hidden transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-orange-900/15" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                    <div className="relative p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="w-5 h-5 text-amber-400" />
                            <span className="text-base font-black text-white">Pack Pro</span>
                          </div>
                          <div className="text-xs text-white/40">5 boosters · 1 rare garanti · 2/sem</div>
                        </div>
                        <div className="px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-400 uppercase">Premium</div>
                      </div>
                      <div className="text-[11px] text-white/25 mb-3">{packs?.pro_weekly ? `${packs.pro_weekly.claimed}/${packs.pro_weekly.perWeek} cette semaine` : '---'}</div>
                      <button
                        type="button"
                        onClick={() => claimPack('pro_weekly')}
                        disabled={(plan !== 'pro' && plan !== 'enterprise') || (packs?.pro_weekly ? packs.pro_weekly.claimed >= packs.pro_weekly.perWeek : false)}
                        className="w-full h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Ouvrir le pack
                      </button>
                    </div>
                  </div>
                </div>

                {plan === 'free' && (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center">
                    <div className="text-sm font-bold text-white/60">Les packs sont reserves aux abonnes</div>
                    <a href="/subscriptions" className="inline-flex mt-3 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm items-center hover:opacity-90 transition">Voir les abonnements</a>
                  </div>
                )}

                {/* Odds */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="text-sm font-bold text-white mb-3">Probabilites (daily)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Commun', pct: dailyOdds.commonPct, color: 'text-zinc-400' },
                      { label: 'Rare', pct: dailyOdds.rarePct, color: 'text-blue-400' },
                      { label: 'Epique', pct: dailyOdds.epicPct, color: 'text-purple-400' },
                      { label: 'Legendaire', pct: dailyOdds.legendaryPct, color: 'text-amber-400' },
                    ].map((o) => (
                      <div key={o.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                        <div className={cx('text-lg font-black', o.color)}>{Number(o.pct).toFixed(1)}%</div>
                        <div className="text-[10px] text-white/30 mt-0.5">{o.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-[10px] text-white/20">Valeurs indicatives hors garanties (pity/streak). Plan: {plan}</div>
                </div>
              </motion.div>
            )}

            {/* ── HISTORIQUE ──────────────────────── */}
            {tab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-3">
                {historyError && <div className="text-red-400 text-sm">{historyError}</div>}

                <div className="space-y-2">
                  {opens.map((o: any) => {
                    const rarity = o.rarity as BoosterRarity | undefined;
                    const cfg = rarity ? RARITY_CFG[rarity] : null;
                    return (
                      <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition">
                        <div className={cx('w-8 h-8 rounded-lg grid place-items-center shrink-0', cfg ? `${cfg.bg}/20` : 'bg-white/5')}>
                          {cfg ? React.createElement(cfg.icon, { className: `w-4 h-4 ${cfg.text}` }) : <Sparkles className="w-4 h-4 text-white/30" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">{o.booster_key || 'Booster'}</div>
                          <div className="text-[10px] text-white/25">{String(o.source || 'daily')} · {o.opened_at ? new Date(o.opened_at).toLocaleString('fr-FR') : ''}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          {o.multiplier && <div className="text-xs text-emerald-400 font-bold">x{Number(o.multiplier).toFixed(2)}</div>}
                          {rarity && <div className={cx('text-[10px] font-semibold', cfg?.text)}>{rarityLabel(rarity)}</div>}
                        </div>
                      </div>
                    );
                  })}

                  {opens.length === 0 && !historyLoading && <div className="py-12 text-center text-sm text-white/30">Aucune ouverture enregistree.</div>}

                  {opensMore && (
                    <button type="button" disabled={opensLoadingMore}
                      onClick={async () => {
                        if (!opensCursor || opensLoadingMore) return; setOpensLoadingMore(true);
                        try { const res = await fetch(`/api/boosters/history?limit=30&cursor=${encodeURIComponent(opensCursor)}`, { cache: 'no-store' }); const j = await safeJson(res); if (!res.ok) throw new Error(); const items = Array.isArray(j?.items) ? j.items : []; setOpens((prev) => [...prev, ...items]); setOpensCursor(j?.nextCursor || null); setOpensMore(Boolean(j?.nextCursor) && items.length > 0); } catch {} setOpensLoadingMore(false);
                      }}
                      className="w-full h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white/40 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
                    >
                      {opensLoadingMore ? 'Chargement...' : 'Charger plus'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals ──────────────────────────── */}
      <BoosterOpenModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        onOpenBooster={openDaily}
        isOpening={boostersLoading}
        openedBooster={lastOpened ? ({ id: lastOpened.inventoryId, status: 'owned', obtained_at: new Date().toISOString(), booster: lastOpened.booster } as any) : null}
        item={lastOpened as any}
      />
      <BoosterPackOpenModal isOpen={showPackModal} onClose={() => setShowPackModal(false)} packKey={packKey} received={packReceived} />
      <DailySpinModal isOpen={showSpinModal} onClose={() => setShowSpinModal(false)} />
      <TrackSelectModal isOpen={selectTrackOpen} onClose={() => setSelectTrackOpen(false)} onSelect={onSelectTrack} />

      {isMounted && showFilters && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowFilters(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="relative w-[90vw] max-w-[440px] rounded-2xl border border-white/[0.08] bg-[#0c0c14]/98 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,.8)] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2"><Settings2 className="w-4 h-4 text-white/40" />Filtres</span>
              <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Statut', value: filterStatus, setter: (v: string) => setFilterStatus(v as any), opts: [{ value: 'owned', label: 'Disponibles' }, { value: 'used', label: 'Utilises' }, { value: 'all', label: 'Tout' }] },
                  { label: 'Type', value: filterType, setter: (v: string) => setFilterType(v as any), opts: [{ value: 'all', label: 'Tous' }, { value: 'track', label: 'Piste' }, { value: 'artist', label: 'Artiste' }] },
                  { label: 'Rarete', value: filterRarity, setter: (v: string) => setFilterRarity(v as any), opts: [{ value: 'all', label: 'Toutes' }, { value: 'common', label: 'Commun' }, { value: 'rare', label: 'Rare' }, { value: 'epic', label: 'Epique' }, { value: 'legendary', label: 'Legendaire' }] },
                  { label: 'Tri', value: sort, setter: (v: string) => setSort(v as any), opts: [{ value: 'new', label: 'Recents' }, { value: 'rarity', label: 'Rarete' }, { value: 'multiplier', label: 'Multi' }, { value: 'duration', label: 'Duree' }] },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">{f.label}</div>
                    <select value={f.value} onChange={(e) => f.setter(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm text-white outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] appearance-none transition">
                      {f.opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setFilterRarity('all'); setFilterType('all'); setFilterStatus('owned'); setSort('new'); }} className="flex-1 inline-flex items-center justify-center rounded-full h-9 text-sm font-medium bg-white/[0.06] text-white/70 hover:bg-white/[0.1] transition">Reset</button>
                <button type="button" onClick={() => { setShowFilters(false); setTab('boosters'); }} className="flex-1 inline-flex items-center justify-center rounded-full h-9 text-sm font-semibold bg-white text-black hover:bg-white/90 transition">Voir</button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function useNowTicker(ms: number) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), ms); return () => window.clearInterval(id); }, [ms]);
  return now;
}
