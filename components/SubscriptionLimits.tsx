'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

interface UsageInfo {
  tracks: {
    used: number;
    limit: number;
    percentage: number;
  };
  playlists: {
    used: number;
    limit: number;
    percentage: number;
  };
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

interface SubscriptionData {
  hasSubscription: boolean;
  subscription: any;
  limits: {
    maxTracks: number;
    maxPlaylists: number;
    maxStorageGB: number;
  };
}

export default function SubscriptionLimits() {
  const { data: session } = useSession();
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscriptionData();
      fetchUsageInfo();
    }
  }, [session]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscriptions/my-subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement:', error);
    }
  };

  const fetchUsageInfo = async () => {
    try {
      const response = await fetch('/api/subscriptions/usage');
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisation:', error);
    } finally {
      setLoading(false);
    }
  };


  const getPlanName = () => {
    if (subscriptionData?.hasSubscription) {
      return subscriptionData.subscription?.name || 'Premium';
    }
    return 'Gratuit';
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
        <div className="relative p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/20 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-white/20 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full rounded-2xl p-3 sm:p-4 backdrop-blur-lg border border-[var(--border)] bg-transparent [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
    >
      <div className="flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
        {/* Informations du plan */}
        <div className="space-between flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {/* Plan actuel */}
          <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
            <span className="text-xs text-[var(--text-muted)]/90">Plan actuel</span>
            <span className="text-sm text-[var(--text)] capitalize">
              <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                {getPlanName()}
              </span>
            </span>
          </div>

          {/* Période */}
          <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
            <span className="text-xs text-[var(--text-muted)]/90">Période</span>
            <span className="text-sm text-[var(--text)]">
              <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                {subscriptionData?.subscription?.interval === 'month' ? 'Mois' : 
                 subscriptionData?.subscription?.interval === 'year' ? 'Année' : '—'}
              </span>
            </span>
          </div>

          {/* Prochain prélèvement */}
          <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
            <span className="text-xs text-[var(--text-muted)]/90">Prochain prélèvement</span>
            <span className="text-sm text-[var(--text)]">
              <span className="flex w-full flex-row items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                  <line x1="16" x2="16" y1="2" y2="6"></line>
                  <line x1="8" x2="8" y1="2" y2="6"></line>
                  <line x1="3" x2="21" y1="10" y2="10"></line>
                </svg>
                <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                  {subscriptionData?.hasSubscription ? '—' : '—'}
                </span>
              </span>
            </span>
          </div>

          {/* Pistes uploadées */}
          <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
            <span className="text-xs text-[var(--text-muted)]/90">Pistes uploadées</span>
            <span className="text-sm text-[var(--text)]">
              <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                {usageInfo ? `${usageInfo.tracks.used}/${usageInfo.tracks.limit}` : '—'}
              </span>
            </span>
          </div>

          {/* Stockage */}
          <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
            <span className="text-xs text-[var(--text-muted)]/90">Stockage</span>
            <span className="text-sm text-[var(--text)]">
              <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                {usageInfo ? `${usageInfo.storage.used.toFixed(2)}/${usageInfo.storage.limit} GB` : '—'}
              </span>
            </span>
          </div>

          {/* Playlists */}
          <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
            <span className="text-xs text-[var(--text-muted)]/90">Playlists</span>
            <span className="text-sm text-[var(--text)]">
              <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                {usageInfo ? `${usageInfo.playlists.used}/${usageInfo.playlists.limit}` : '—'}
              </span>
            </span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-row flex-wrap justify-center gap-2">
          {subscriptionData?.hasSubscription && (
            <button 
              type="button" 
              className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-purple-400/30 transition"
            >
              <span className="relative flex flex-row items-center justify-center gap-2">Annuler l'abonnement</span>
            </button>
          )}
          
          <button 
            type="button" 
            className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-cyan-400/30 transition"
          >
            <span className="relative flex flex-row items-center justify-center gap-2">Mettre à jour le paiement</span>
          </button>
          
          <div className="flex">
            <button 
              type="button" 
              className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_24px_rgba(124,58,237,0.25)]"
            >
              <span className="relative flex flex-row items-center justify-center gap-2">Acheter plus</span>
            </button>
          </div>
          
          {subscriptionData?.hasSubscription && (
            <button 
              type="button" 
              className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-red-400/30 transition"
            >
              <span className="relative flex flex-row items-center justify-center gap-2">Revenir au plan gratuit</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
} 