// components/ai-studio/RecentGenerations.tsx
'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw, Music2, Clock, Play } from 'lucide-react';
import type { AIGeneration } from '@/lib/aiGenerationService';

interface RecentGenerationsProps {
  generations: AIGeneration[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onUseGeneration: (generation: AIGeneration) => void;
  onPlayGeneration?: (generation: AIGeneration) => void;
  limit?: number;
}

export function RecentGenerations({
  generations,
  loading,
  error,
  onReload,
  onUseGeneration,
  onPlayGeneration,
  limit = 4,
}: RecentGenerationsProps) {
  const router = useRouter();

  return (
    <div className="bg-white-upload backdrop-blur-upload rounded-xl border border-upload p-2.5 sm:p-3.5 space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-foreground-tertiary">
            Générations récentes
          </p>
          <p className="text-[10px] sm:text-[11px] text-foreground-tertiary hidden sm:block">
            Historique des pistes créées avec Synaura IA
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => router.push('/ai-library', { scroll: false })}
            className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-upload text-[10px] sm:text-[11px] text-foreground-secondary hover:bg-overlay-on-primary"
            title="Voir toute la bibliothèque IA"
          >
            <span>Voir tout</span>
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-upload text-[10px] sm:text-[11px] text-foreground-secondary hover:bg-overlay-on-primary disabled:opacity-60"
            title="Rafraîchir"
          >
            <RefreshCw
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-300">
          Impossible de charger la bibliothèque : {error}
        </p>
      )}

      {loading && !generations.length && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-9 rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && !generations.length && (
        <p className="text-[12px] text-foreground-tertiary">
          Tu n'as pas encore de génération sauvegardée. Lance une génération, elle
          apparaîtra ici automatiquement.
        </p>
      )}

      {generations.length > 0 && (
        <div className="space-y-1.5">
          {generations.slice(0, limit).map((gen) => {
            const firstTrack = gen.tracks?.[0];
            const hasAudio = firstTrack?.audio_url || firstTrack?.stream_audio_url;
            
            return (
              <div
                key={gen.id}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-overlay-on-primary transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => onUseGeneration(gen)}
                  className="flex-1 flex items-center gap-1.5 sm:gap-2 text-left min-w-0"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-gradient-to-br from-accent-purple/70 to-accent-blue/70 flex items-center justify-center shrink-0">
                    <Music2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] sm:text-[13px] font-medium text-foreground-primary truncate">
                      {firstTrack?.title || gen.prompt || 'Génération IA'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-foreground-tertiary truncate">
                      {gen.model || 'Modèle IA'} ·{' '}
                      {new Date(gen.created_at).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-foreground-tertiary shrink-0 hidden sm:flex">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>{gen.tracks?.length ?? 0} pistes</span>
                  </div>
                </button>
                {hasAudio && onPlayGeneration && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayGeneration(gen);
                    }}
                    className="p-1 sm:p-1.5 rounded-lg bg-accent-brand/20 border border-accent-brand/50 text-accent-brand hover:bg-accent-brand/30 transition-colors shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Lire (playlist de la génération)"
                  >
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

