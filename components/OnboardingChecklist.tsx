'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, UserPlus, Upload, Sparkles, Music, X } from 'lucide-react';
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
  const [dismissed, setDismissed] = useState(false);
  const [triedStudio, setTriedStudio] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const refreshUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } });
      if (res.ok) {
        setUsage(await res.json());
      }
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } });
        if (res.ok) setUsage(await res.json());
        setDismissed(!!localStorage.getItem('onboarding.dismissed'));
        setTriedStudio(!!localStorage.getItem('onboarding.triedStudio'));
      } catch {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
        setTimeout(() => setInitialLoadComplete(true), 300);
      }
    };
    load();

    const onFocus = () => {
      refreshUsage();
      setTriedStudio(!!localStorage.getItem('onboarding.triedStudio'));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUsage]);

  const steps = useMemo(() => {
    const hasAccount = !!user?.id;
    const hasOneTrack = (usage?.tracks?.used || 0) > 0;
    const hasTriedStudio = triedStudio;
    const hasListened = typeof window !== 'undefined' && !!localStorage.getItem('onboarding.listened');
    return [
      { key: 'account', label: 'Creer un compte', done: hasAccount, icon: UserPlus, action: '/auth/signup', actionLabel: 'Creer' },
      { key: 'listen', label: 'Ecouter un titre', done: hasListened, icon: Music, action: '/discover', actionLabel: 'Ecouter' },
      { key: 'studio', label: 'Essayer le Studio IA', done: hasTriedStudio, icon: Sparkles, action: '/ai-generator', actionLabel: 'Essayer' },
      { key: 'upload', label: 'Uploader ou publier', done: hasOneTrack, icon: Upload, action: '/upload', actionLabel: 'Uploader' },
    ];
  }, [user?.id, usage?.tracks?.used, triedStudio]);

  const completedCount = steps.filter(s => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  if (!initialLoadComplete || dismissed) return null;
  if (!loading && !error && completedCount === steps.length) return null;

  return (
    <div className="w-full mb-5">
      <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-r from-violet-500/[0.06] to-fuchsia-500/[0.04] backdrop-blur-sm p-4 md:p-5">
        <button
          onClick={() => { setDismissed(true); localStorage.setItem('onboarding.dismissed', '1'); }}
          className="absolute top-3 right-3 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">Bienvenue sur Synaura</div>
            <div className="text-[11px] text-white/50">{completedCount}/{steps.length} etapes completees</div>
          </div>
          <div className="ml-auto text-xs font-medium text-violet-300 tabular-nums">{progress}%</div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            style={{ width: `${progress}%`, transition: 'width 300ms ease' }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.key}
                onClick={() => {
                  if (step.key === 'studio') localStorage.setItem('onboarding.triedStudio', '1');
                  if (step.key === 'listen') localStorage.setItem('onboarding.listened', '1');
                  router.push(step.action);
                }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  step.done
                    ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  step.done ? 'bg-emerald-500/20' : 'bg-white/[0.06]'
                }`}>
                  {step.done ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <Icon size={13} className="text-white/60" />
                  )}
                </div>
                <span className={`text-xs truncate ${step.done ? 'text-emerald-300/80 line-through' : 'text-white/70'}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>

        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </div>
    </div>
  );
}
