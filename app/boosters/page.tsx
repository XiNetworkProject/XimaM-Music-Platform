'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Zap, 
  Star, 
  Crown, 
  Gem, 
  Clock, 
  TrendingUp, 
  Gift, 
  Target,
  Calendar,
  Trophy,
  Sparkles
} from 'lucide-react';
import { useBoosters } from '@/hooks/useBoosters';
import BoosterOpenModal from '@/components/BoosterOpenModal';
import TrackSelectModal from '@/components/TrackSelectModal';
import { notify } from '@/components/NotificationCenter';

export default function BoostersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'inventory' | 'missions' | 'history'>('inventory');
  const [showBoosterModal, setShowBoosterModal] = useState(false);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [pendingInventoryId, setPendingInventoryId] = useState<string | null>(null);

  const {
    inventory,
    remainingMs,
    canOpen,
    openDaily,
    useOnTrack,
    useOnArtist,
    lastOpened,
    loading: boostersLoading,
    fetchInventory
  } = useBoosters();

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, router]);

  useEffect(() => {
    if (lastOpened) {
      setShowBoosterModal(true);
    }
  }, [lastOpened]);

  const formatRemaining = (ms: number) => {
    if (!ms || ms <= 0) return 'Disponible';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return <Sparkles className="w-4 h-4 text-zinc-400" />;
      case 'rare': return <Star className="w-4 h-4 text-blue-400" />;
      case 'epic': return <Crown className="w-4 h-4 text-purple-400" />;
      case 'legendary': return <Gem className="w-4 h-4 text-yellow-400" />;
      default: return <Sparkles className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-zinc-400 bg-zinc-400/10';
      case 'rare': return 'border-blue-400 bg-blue-400/10';
      case 'epic': return 'border-purple-400 bg-purple-400/10';
      case 'legendary': return 'border-yellow-400 bg-yellow-400/10';
      default: return 'border-zinc-400 bg-zinc-400/10';
    }
  };

  const handleUseBooster = async (inventoryId: string, trackId: string) => {
    try {
      const result = await useOnTrack(inventoryId, trackId);
      if (result.ok) {
        notify.success('Booster activé !', 'Booster activé avec succès !');
        fetchInventory();
      } else {
        notify.error('Erreur activation', 'Erreur lors de l\'activation du booster');
      }
    } catch (error) {
      notify.error('Erreur activation', 'Erreur lors de l\'activation du booster');
    }
  };

  const openSelectTrack = (inventoryId: string) => {
    setPendingInventoryId(inventoryId);
    setSelectModalOpen(true);
  };

  const onSelectTrack = async (trackId: string) => {
    const inv = pendingInventoryId;
    setSelectModalOpen(false);
    if (!inv) return;
    await handleUseBooster(inv, trackId);
    setPendingInventoryId(null);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-4">Connexion requise</h1>
          <p className="text-[var(--text-muted)]">Veuillez vous connecter pour accéder aux boosters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Zap className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-[var(--text)]">Boosters Synaura</h1>
            <Zap className="w-8 h-8 text-purple-400" />
          </motion.div>
          <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
            Boostez vos pistes et augmentez leur visibilité avec nos boosters magiques. 
            Ouvrez un booster quotidien et complétez des missions pour en obtenir plus !
          </p>
        </div>

        {/* Daily Booster Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Gift className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text)]">Booster Quotidien</h2>
                <p className="text-[var(--text-muted)]">
                  {canOpen ? 'Votre booster quotidien est disponible !' : `Prochain booster dans ${formatRemaining(remainingMs)}`}
                </p>
              </div>
            </div>
            <motion.button
              onClick={() => setShowBoosterModal(true)}
              disabled={!canOpen || boostersLoading}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                canOpen 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700' 
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]'
              }`}
              whileHover={canOpen ? { scale: 1.05 } : {}}
              whileTap={canOpen ? { scale: 0.95 } : {}}
            >
              {boostersLoading ? 'Ouverture...' : canOpen ? 'Ouvrir le booster' : 'Indisponible'}
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'inventory', label: 'Inventaire', icon: Target },
            { id: 'missions', label: 'Missions', icon: Trophy },
            { id: 'history', label: 'Historique', icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Inventory Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Boosters possédés</p>
                      <p className="text-xl font-bold text-[var(--text)]">
                        {inventory.filter(i => i.status === 'owned').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Boosters utilisés</p>
                      <p className="text-xl font-bold text-[var(--text)]">
                        {inventory.filter(i => i.status === 'used').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-400" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Prochain booster</p>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {formatRemaining(remainingMs)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Grid */}
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-bold text-[var(--text)] mb-4">Mes Boosters</h3>
                {inventory.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] mb-4">Aucun booster dans votre inventaire</p>
                    <p className="text-sm text-[var(--text-muted)]">Ouvrez un booster quotidien pour commencer !</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inventory.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`border-2 rounded-xl p-4 transition-all duration-300 hover:scale-105 ${
                          item.status === 'owned' 
                            ? getRarityColor(item.booster.rarity)
                            : 'border-gray-400 bg-gray-400/10 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getRarityIcon(item.booster.rarity)}
                            <span className="text-sm font-semibold capitalize text-[var(--text)]">
                              {item.booster.rarity}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'owned' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.status === 'owned' ? 'Disponible' : 'Utilisé'}
                          </span>
                        </div>
                        
                        <h4 className="font-bold text-[var(--text)] mb-2">{item.booster.name}</h4>
                        <p className="text-sm text-[var(--text-muted)] mb-3">{item.booster.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-muted)]">Multiplicateur:</span>
                            <span className="font-semibold text-green-400">x{item.booster.multiplier.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-muted)]">Durée:</span>
                            <span className="font-semibold text-[var(--text)]">{item.booster.duration_hours}h</span>
                          </div>
                        </div>

                        {item.status === 'owned' && item.booster.type === 'track' && (
                          <button
                            onClick={() => openSelectTrack(item.id)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                          >
                            Activer sur une piste
                          </button>
                        )}
                        {item.status === 'owned' && item.booster.type === 'artist' && (
                          <button
                            onClick={async () => {
                              const r = await useOnArtist(item.id);
                              if (r.ok) {
                                notify.success('Boost artiste activé !', 'Votre profil est maintenant boosté !');
                                fetchInventory();
                              } else {
                                notify.error('Activation impossible', 'Impossible d\'activer le boost artiste');
                              }
                            }}
                            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                          >
                            Activer sur mon profil
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'missions' && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6"
            >
              <h3 className="text-lg font-bold text-[var(--text)] mb-4">Missions</h3>
              <MissionsSection />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6"
            >
              <h3 className="text-lg font-bold text-[var(--text)] mb-4">Historique</h3>
              <HistorySection />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Booster Open Modal */}
        <BoosterOpenModal
          isOpen={showBoosterModal}
          onClose={() => setShowBoosterModal(false)}
          onOpenBooster={openDaily}
          isOpening={boostersLoading}
          openedBooster={lastOpened ? { id: lastOpened.inventoryId, status: 'owned', obtained_at: new Date().toISOString(), booster: lastOpened.booster } : null}
          item={lastOpened || null}
        />

        {/* Track Select Modal */}
        <TrackSelectModal
          isOpen={selectModalOpen}
          onClose={() => setSelectModalOpen(false)}
          onSelect={onSelectTrack}
        />
      </div>
    </div>
  );
}

function HistorySection() {
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [activeArtist, setActiveArtist] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [invRes, actRes] = await Promise.all([
          fetch('/api/boosters', { cache: 'no-store' }),
          fetch('/api/boosters/my-active', { cache: 'no-store' }),
        ]);
        if (!invRes.ok) throw new Error('Erreur inventaire');
        const invJson = await invRes.json();
        const usedItems = (invJson?.inventory || []).filter((i: any) => i.status === 'used');
        setUsed(usedItems);

        if (!actRes.ok) throw new Error('Erreur boosts actifs');
        const actJson = await actRes.json();
        setActive(actJson?.boosts || []);
        setActiveArtist(actJson?.artistBoosts || []);
      } catch (e: any) {
        setError(e?.message || 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-[var(--text-muted)]">Chargement…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const formatRemaining = (ms: number) => {
    if (!ms || ms <= 0) return '0s';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    if (h > 0) return `${h}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-md font-semibold text-[var(--text)] mb-2">Boosts actifs (pistes)</h4>
        {active.length === 0 ? (
          <div className="text-[var(--text-muted)] text-sm">Aucun boost actif</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {active.map((b, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-3)]">
                <div className="text-[var(--text)] font-medium">Track: {b.track_id}</div>
                <div className="text-sm text-[var(--text-muted)]">Multiplicateur: x{Number(b.multiplier).toFixed(2)}</div>
                <div className="text-sm text-[var(--text-muted)]">Expire dans: {formatRemaining(new Date(b.expires_at).getTime() - nowTs)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-md font-semibold text-[var(--text)] mb-2">Boosts actifs (artiste)</h4>
        {activeArtist.length === 0 ? (
          <div className="text-[var(--text-muted)] text-sm">Aucun boost artiste actif</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeArtist.map((b, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-3)]">
                <div className="text-[var(--text)] font-medium">Artiste: moi</div>
                <div className="text-sm text-[var(--text-muted)]">Multiplicateur: x{Number(b.multiplier).toFixed(2)}</div>
                <div className="text-sm text-[var(--text-muted)]">Expire dans: {formatRemaining(new Date(b.expires_at).getTime() - nowTs)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-md font-semibold text-[var(--text)] mb-2">Inventaire utilisé</h4>
        {used.length === 0 ? (
          <div className="text-[var(--text-muted)] text-sm">Aucun booster utilisé</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {used.map((i: any) => (
              <div key={i.id} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-3)]">
                <div className="text-[var(--text)] font-semibold">{i.booster?.name || 'Booster'}</div>
                <div className="text-sm text-[var(--text-muted)]">Rareté: {i.booster?.rarity}</div>
                <div className="text-sm text-[var(--text-muted)]">Multiplicateur: x{Number(i.booster?.multiplier || 1).toFixed(2)}</div>
                <div className="text-sm text-[var(--text-muted)]">Utilisé le: {i.used_at ? new Date(i.used_at).toLocaleString() : '-'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MissionsSection() {
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/missions', { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur chargement missions');
      const json = await res.json();
      setMissions(json?.missions || []);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const claim = async (missionId: string) => {
    setClaiming(missionId);
    try {
      const res = await fetch('/api/missions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      });
      if (!res.ok) throw new Error('Claim impossible');
      await refresh();
      notify.success('Récompense récupérée !', 'Mission accomplie !');
    } catch (e: any) {
      notify.error('Erreur', e?.message || 'Erreur lors de la récupération de la récompense');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return <div className="text-[var(--text-muted)]">Chargement…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      {missions.length === 0 ? (
        <div className="text-[var(--text-muted)]">Aucune mission disponible</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missions.map((m) => (
            <div key={m.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-3)]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[var(--text)] font-semibold">{m.title}</div>
                {m.completed ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Complétée</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">En cours</span>
                )}
              </div>
              <div className="text-sm text-[var(--text-muted)] mb-2">Objectif: {m.threshold} {m.goal_type}</div>
              <div className="w-full h-2 bg-black/20 rounded overflow-hidden mb-3">
                <div
                  className="h-2 bg-purple-500"
                  style={{ width: `${Math.min(100, Math.round(((m.progress || 0) / Math.max(1, m.threshold)) * 100))}%` }}
                />
              </div>
              <div className="text-sm text-[var(--text)] mb-3">Progression: {m.progress || 0} / {m.threshold}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-[var(--text-muted)]">Récompense: booster</div>
                <button
                  disabled={!m.completed || m.claimed || claiming === m.id}
                  onClick={() => claim(m.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    m.claimed
                      ? 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed'
                      : m.completed
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  {m.claimed ? 'Déjà réclamé' : (claiming === m.id ? '...' : m.completed ? 'Réclamer' : 'En cours')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
