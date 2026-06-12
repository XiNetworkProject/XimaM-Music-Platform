import { Flame, RadioTower, Rocket, Sparkles, Zap } from 'lucide-react';
import type { CityPulseTrack } from '@/lib/synauraCity';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const stateStyles: Record<CityPulseTrack['pulseState'], { className: string; Icon: typeof Zap }> = {
  Calme: { className: 'bg-black/[0.055] text-black/52', Icon: RadioTower },
  'Ca demarre': { className: 'bg-[#00a7b2]/12 text-[#007a82]', Icon: Sparkles },
  'Ca chauffe': { className: 'bg-[#ffb020]/16 text-[#9c6300]', Icon: Zap },
  'En feu': { className: 'bg-[#ff6f61]/15 text-[#c43d33]', Icon: Flame },
  'Viral potentiel': { className: 'bg-[#7c5cff]/14 text-[#5b3fe8]', Icon: Rocket },
};

export default function SynauraPulseBadge({
  state,
  pulse,
  className = '',
}: {
  state: CityPulseTrack['pulseState'];
  pulse?: number;
  className?: string;
}) {
  const { className: stateClassName, Icon } = stateStyles[state] || stateStyles.Calme;
  return (
    <span className={cx('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.1em]', stateClassName, className)}>
      <Icon className="h-3.5 w-3.5" />
      {state}{typeof pulse === 'number' ? ` · ${pulse}%` : ''}
    </span>
  );
}
