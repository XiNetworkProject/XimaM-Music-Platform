'use client';

import type { ChangeEvent } from 'react';

function tickOpacity(tickValue: number, value: number) {
  const d = Math.abs(tickValue - value);
  // suno-like: very faint far ticks, strong near current
  const x = Math.max(0, 1 - d / 50);
  const o = 0.1 + 0.9 * x * x;
  return Math.max(0.1, Math.min(1, o));
}

interface SunoSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  midLabel?: string; // label shown near the thumb (ex: "Moderate")
}

export function SunoSlider({
  label,
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 100,
  step = 1,
  midLabel,
}: SunoSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const ticks = Array.from({ length: 11 }).map((_, i) => min + i * ((max - min) / 10));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={disabled ? 'opacity-60' : ''}>
      <div className="flex items-center justify-between text-[10px] text-foreground-tertiary mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="relative h-8 select-none">
        {/* ticks */}
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 rounded bg-foreground-primary"
            style={{
              left: `${((t - min) / (max - min)) * 100}%`,
              opacity: tickOpacity(t, value),
            }}
          />
        ))}

        {/* thumb + label */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `${pct}%` }}
        >
          <div className="relative -translate-x-1/2">
            {midLabel ? (
              <div className="threshold-label text-[10px] text-foreground-secondary bg-background-primary/80 border border-border-primary rounded-full px-2 py-0.5 backdrop-blur-sm mb-1 whitespace-nowrap">
                {midLabel}
              </div>
            ) : null}
            <div className="w-4 h-4 rounded-full bg-background-tertiary border border-border-primary shadow-sm" />
          </div>
        </div>

        {/* actual input overlay */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label={label}
        />
      </div>
    </div>
  );
}

