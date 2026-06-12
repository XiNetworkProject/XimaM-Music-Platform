'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Activity, Flame, RadioTower, Sparkles, Zap } from 'lucide-react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const tones = {
  violet: { className: 'bg-[#7c5cff] text-white', Icon: Sparkles },
  cyan: { className: 'bg-[#00a7b2] text-white', Icon: RadioTower },
  coral: { className: 'bg-[#ff6f61] text-[#171313]', Icon: Zap },
  ink: { className: 'bg-[#171313] text-white', Icon: Activity },
  fire: { className: 'bg-[#ff4b7a] text-white', Icon: Flame },
} as const;

export default function SynauraTickerBanner({
  text,
  tone = 'violet',
  className = '',
  action,
}: {
  text: string;
  tone?: keyof typeof tones;
  className?: string;
  action?: ReactNode;
}) {
  const { className: toneClassName, Icon } = tones[tone];

  return (
    <div className={cx('relative flex min-h-12 w-full min-w-0 items-center overflow-hidden rounded-[1.25rem] shadow-[0_12px_34px_rgba(30,25,20,0.12)]', toneClassName, className)}>
      <div className="relative z-10 grid h-12 w-12 shrink-0 place-items-center bg-black/10 backdrop-blur-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="synaura-ticker-mask min-w-0 flex-1 overflow-hidden">
        <motion.div
          className="flex w-max items-center gap-14 whitespace-nowrap py-3 text-xs font-black uppercase tracking-[0.12em] sm:text-sm"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          <span className="px-5">{text}</span>
          <span className="px-5" aria-hidden>{text}</span>
        </motion.div>
      </div>
      {action ? <div className="relative z-10 shrink-0 pr-2">{action}</div> : null}
    </div>
  );
}
