'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, UserPlus, Upload, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UsageResponse {
  tracks: { used: number; limit: number; percentage: number };
  playlists: { used: number; limit: number; percentage: number };
  storage: { used: number; limit: number; percentage: number };
}

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsViewed, setStatsViewed] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const refreshUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      } else {
        setUsage(null);
      }
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial avec toutes les données
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        setLoading(true);
        
        // Charger les données d'usage
        const res = await fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } });
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
        
        // Charger l'état viewedStats depuis localStorage ET sessionStorage
        const localViewed = localStorage.getItem('onboarding.viewedStats');
        const sessionViewed = sessionStorage.getItem('onboarding.viewedStats');
        setStatsViewed(!!(localViewed || sessionViewed));
        
      } catch (err) {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
        // Marquer le chargement initial comme terminé après un délai pour éviter le flash
        setTimeout(() => setInitialLoadComplete(true), 300);
      }
    };

    loadOnboardingData();

    // Écouter les changements
    const onFocus = () => {
      refreshUsage();
      const localViewed = localStorage.getItem('onboarding.viewedStats');
      const sessionViewed = sessionStorage.getItem('onboarding.viewedStats');
      setStatsViewed(!!(localViewed || sessionViewed));
    };
    
    window.addEventListener('focus', onFocus);
    window.addEventListener('onboardingStatsViewed', onFocus as any);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('onboardingStatsViewed', onFocus as any);
    };
  }, [refreshUsage]);

  const steps = useMemo(() => {
    const hasAccount = !!user?.id; // connecté
    const hasOneTrack = (usage?.tracks?.used || 0) > 0;
    const hasViewedStats = statsViewed;
    return {
      hasAccount,
      hasOneTrack,
      hasViewedStats,
      completedCount: [hasAccount, hasOneTrack, hasViewedStats].filter(Boolean).length,
    };
  }, [user?.id, usage?.tracks?.used, statsViewed]);

  const progress = Math.round((steps.completedCount / 3) * 100);

  // Ne rien afficher tant que le chargement initial n'est pas terminé
  if (!initialLoadComplete) {
    return null;
  }

  // Masquer si tout est complété
  if (!loading && !error && steps.completedCount === 3) {
    return null;
  }

  return (
    <div className="w-full mb-4">
      <div className="panel-suno border border-[var(--border)] rounded-xl p-3 md:p-4 bg-white/[0.03]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-400" size={18} />
            <div className="text-sm md:text-base font-medium">Onboarding • Terminez ces 3 étapes</div>
          </div>
          <div className="text-xs text-white/60 tabular-nums">{progress}%</div>
        </div>

        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${progress}%`, transition: 'width 180ms ease' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Step 1 */}
          <div className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 ${steps.hasAccount ? 'bg-green-500/10 border-green-500/20' : 'bg-white/[0.02]'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${steps.hasAccount ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/80'}`}>
                <UserPlus size={14} />
              </div>
              <div className="text-xs md:text-sm truncate">Créer un compte</div>
            </div>
            {steps.hasAccount ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <button onClick={() => router.push('/auth/signin')} className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20">Créer</button>
            )}
          </div>

          {/* Step 2 */}
          <div className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 ${steps.hasOneTrack ? 'bg-green-500/10 border-green-500/20' : 'bg-white/[0.02]'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${steps.hasOneTrack ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/80'}`}>
                <Upload size={14} />
              </div>
              <div className="text-xs md:text-sm truncate">Uploader 1 piste</div>
            </div>
            {steps.hasOneTrack ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <button onClick={() => router.push('/upload')} className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20">Uploader</button>
            )}
          </div>

          {/* Step 3 */}
          <div className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 ${steps.hasViewedStats ? 'bg-green-500/10 border-green-500/20' : 'bg-white/[0.02]'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${steps.hasViewedStats ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/80'}`}>
                <BarChart3 size={14} />
              </div>
              <div className="text-xs md:text-sm truncate">Voir les stats de base</div>
            </div>
            {steps.hasViewedStats ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <button onClick={() => router.push('/stats')} className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20">Voir</button>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-2 text-xs text-white/50">Chargement…</div>
        )}
        {error && (
          <div className="mt-2 text-xs text-red-400">{error}</div>
        )}
      </div>
    </div>
  );
}


