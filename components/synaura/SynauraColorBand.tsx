import type { ReactNode } from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const tones = {
  violet: 'from-[#7c5cff]/24 via-[#ba8cff]/15 to-[#fffaf2]/82',
  cyan: 'from-[#00c2cb]/22 via-[#7ce4dc]/14 to-[#fffaf2]/82',
  coral: 'from-[#ff6f61]/24 via-[#ffb09e]/16 to-[#fffaf2]/82',
  sunset: 'from-[#ff6f61]/22 via-[#7c5cff]/16 to-[#00c2cb]/12',
} as const;

export default function SynauraColorBand({
  children,
  tone = 'sunset',
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div className={cx(
      'relative overflow-hidden rounded-[1.5rem] border border-black/[0.07] bg-gradient-to-br p-5 shadow-[0_16px_45px_rgba(30,25,20,0.09)] sm:rounded-[2rem] sm:p-7',
      tones[tone],
      className,
    )}>
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.48)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.48)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative">{children}</div>
    </div>
  );
}
