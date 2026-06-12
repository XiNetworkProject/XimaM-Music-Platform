'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type SynauraButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'event';
};

const variants = {
  primary: 'bg-[#171313] text-white shadow-[0_12px_28px_rgba(23,19,19,0.18)] hover:bg-black',
  secondary: 'bg-white/72 text-[#171313] shadow-[inset_0_0_0_1px_rgba(23,19,19,0.08)] hover:bg-white',
  accent: 'bg-[#7c5cff]/12 text-[#5b3fe8] hover:bg-[#7c5cff]/18',
  ghost: 'bg-black/[0.045] text-black/58 hover:bg-black/[0.08] hover:text-[#171313]',
  event: 'bg-white/88 text-[#171313] shadow-[0_12px_30px_rgba(23,19,19,0.12)] hover:bg-white',
} as const;

export function SynauraButton({
  children,
  icon,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
  ...props
}: SynauraButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      whileHover={disabled ? undefined : { y: -1 }}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
}

export function SynauraAccentButton(props: Omit<SynauraButtonProps, 'variant'>) {
  return <SynauraButton {...props} variant="accent" />;
}

export function SynauraGhostButton(props: Omit<SynauraButtonProps, 'variant'>) {
  return <SynauraButton {...props} variant="ghost" />;
}

export function SynauraEventButton(props: Omit<SynauraButtonProps, 'variant'>) {
  return <SynauraButton {...props} variant="event" />;
}
