// components/ai-studio/PresetStrip.tsx
'use client';

import { motion } from 'framer-motion';
import type { AIStudioPreset } from '@/lib/aiStudioTypes';

interface PresetStripProps {
  presets: AIStudioPreset[];
  activePresetId?: string | null;
  onPresetClick: (preset: AIStudioPreset) => void;
}

export function PresetStrip({
  presets,
  activePresetId,
  onPresetClick,
}: PresetStripProps) {
  if (!presets.length) return null;

  return (
    <div className="mb-3 sm:mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-foreground-tertiary">
          Presets rapides
        </p>
        <span className="text-[10px] sm:text-[11px] text-foreground-tertiary hidden sm:inline">
          Clique pour pré-remplir
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {presets.map((preset, index) => {
          const isActive = preset.id === activePresetId;
          return (
            <motion.button
              key={preset.id}
              type="button"
              onClick={() => onPresetClick(preset)}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`group relative flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs 
              border backdrop-blur-sm whitespace-nowrap
              ${
                isActive
                  ? 'border-accent-brand/80 bg-accent-brand/10 shadow-[0_0_18px_rgba(120,95,255,0.45)]'
                  : 'border-white/10 bg-black/30 hover:bg-white/5'
              }`}
            >
              <span className="text-sm sm:text-base">{preset.emoji}</span>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground-primary">
                    {preset.label}
                  </span>
                  {isActive && (
                    <span className="text-[9px] uppercase tracking-[0.2em] text-accent-brand">
                      Actif
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-foreground-tertiary max-w-[180px] truncate">
                  {preset.description}
                </p>
              </div>
              <span className="text-xs sm:hidden font-medium text-foreground-primary">
                {preset.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

