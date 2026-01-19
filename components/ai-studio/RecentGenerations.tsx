// components/ai-studio/RecentGenerations.tsx
'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw, Music2, Clock, Play } from 'lucide-react';
import type { AIGeneration } from '@/lib/aiGenerationService';
import { SUNO_BTN_BASE, SUNO_ICON_PILL, SUNO_PILL_OUTLINE } from '@/components/ui/sunoClasses';

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
    <div className="panel-suno flex flex-col min-h-0">
      <div className="px-3.5 pt-3.5 pb-2 flex items-center justify-between gap-2">
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
            className={`${SUNO_PILL_OUTLINE} px-2 py-1 text-[10px] sm:text-[11px]`}
            title="Voir toute la bibliothèque IA"
          >
            <span className="relative">Voir tout</span>
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className={`${SUNO_PILL_OUTLINE} px-2 py-1 text-[10px] sm:text-[11px] disabled:opacity-60`}
            title="Rafraîchir"
          >
            <RefreshCw
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            <span className="relative hidden sm:inline">Rafraîchir</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="px-3.5 pb-2 text-[11px] text-red-300">
          Impossible de charger la bibliothèque : {error}
        </p>
      )}

      {loading && !generations.length && (
        <div className="px-3.5 pb-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-9 rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && !generations.length && (
        <p className="px-3.5 pb-3 text-[12px] text-foreground-tertiary">
          Tu n'as pas encore de génération sauvegardée. Lance une génération, elle
          apparaîtra ici automatiquement.
        </p>
      )}

      {generations.length > 0 && (
        <div className="clip-browser-list-scroller flex-1 min-h-0 overflow-y-auto px-2.5 pb-2 space-y-0.5">
          {generations.slice(0, limit).map((gen) => {
            const firstTrack = gen.tracks?.[0];
            const hasAudio = firstTrack?.audio_url || firstTrack?.stream_audio_url;
            
            return (
              <div
                key={gen.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-overlay-on-primary transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => onUseGeneration(gen)}
                  className="flex-1 flex items-center gap-1.5 sm:gap-2 text-left min-w-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-background-tertiary border border-border-primary flex items-center justify-center shrink-0">
                    <Music2 className="w-4 h-4 text-foreground-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground-primary truncate">
                      {firstTrack?.title || gen.prompt || 'Génération IA'}
                    </p>
                    <p className="text-[11px] text-foreground-tertiary truncate">
                      {gen.model || 'Modèle IA'} ·{' '}
                      {new Date(gen.created_at).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-foreground-tertiary shrink-0 hidden sm:flex">
                    <Clock className="w-3 h-3" />
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
                    className={`${SUNO_ICON_PILL} p-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity`}
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

