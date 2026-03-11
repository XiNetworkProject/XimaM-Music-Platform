'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Synaura Unified Design System
   Reference: ai-generator page DA
   ═══════════════════════════════════════════════════════ */

// ─── UModal ──────────────────────────────────────────────

interface UModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** max-w class, default "max-w-md" */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show close button in top-right, default true */
  showClose?: boolean;
  /** z-index class, default "z-[200]" */
  zClass?: string;
  className?: string;
}

const MODAL_SIZES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-3xl',
};

export function UModal({ open, onClose, children, size = 'md', showClose = true, zClass = 'z-[200]', className = '' }: UModalProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`fixed inset-0 ${zClass} bg-black/70 backdrop-blur-md flex items-center justify-center p-4`}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`w-full ${MODAL_SIZES[size]} rounded-2xl border border-white/[0.08] bg-[#0c0c14]/98 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,.8)] max-h-[90vh] overflow-y-auto ${className}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {showClose && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition"
              >
                <X size={16} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Shortcut for modal body padding */
export function UModalBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

/** Modal title */
export function UModalTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-bold text-white mb-4 ${className}`}>{children}</h3>;
}

/** Modal footer with action buttons */
export function UModalFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex gap-2 mt-5 ${className}`}>{children}</div>;
}

// ─── UDrawer ─────────────────────────────────────────────

interface UDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
  zClass?: string;
}

export function UDrawer({ open, onClose, children, side = 'right', width = 'w-full sm:w-[420px]', zClass = 'z-[100]' }: UDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const translate = side === 'right' ? 'translate-x-full' : '-translate-x-full';
  const position = side === 'right' ? 'right-0' : 'left-0';
  const border = side === 'right' ? 'sm:border-l' : 'sm:border-r';

  return (
    <div className={`fixed inset-0 ${zClass} transition ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition ${open ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute ${position} top-0 h-full ${width} bg-[#0c0c14] ${border} border-white/[0.06] shadow-2xl transform transition-transform duration-300 ${open ? 'translate-x-0' : translate}`}>
        {children}
      </div>
    </div>
  );
}

// ─── UButton ─────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

interface UButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-white text-black font-semibold hover:bg-white/90 active:bg-white/80',
  secondary: 'bg-white/[0.06] text-white/70 font-medium hover:bg-white/[0.1] active:bg-white/[0.14]',
  ghost: 'bg-transparent text-white/50 font-medium hover:bg-white/[0.06] hover:text-white/70',
  danger: 'bg-rose-500/10 text-rose-400 font-medium hover:bg-rose-500/20',
  accent: 'bg-gradient-to-r from-[#6e56cf] to-[#00d3a7] text-white font-semibold hover:opacity-90',
};

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-1.5',
  lg: 'h-11 px-6 text-sm gap-2',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',
};

export function UButton({ variant = 'primary', size = 'md', children, loading, fullWidth, className = '', disabled, ...rest }: UButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-full transition select-none ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${fullWidth ? 'w-full' : ''} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  );
}

// ─── UInput ──────────────────────────────────────────────

interface UInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string;
  onChange?: (value: string) => void;
  onChangeNative?: React.ChangeEventHandler<HTMLInputElement>;
  icon?: React.ReactNode;
}

export function UInput({ label, onChange, onChangeNative, icon, className = '', ...rest }: UInputProps) {
  return (
    <div>
      {label && <label className="block text-xs text-white/40 mb-1.5 font-medium">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">{icon}</div>}
        <input
          {...rest}
          onChange={onChange ? (e) => onChange(e.target.value) : onChangeNative}
          className={`w-full h-10 ${icon ? 'pl-9' : 'pl-3.5'} pr-3.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition ${className}`}
        />
      </div>
    </div>
  );
}

// ─── UTextarea ───────────────────────────────────────────

interface UTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  onChange?: (value: string) => void;
  onChangeNative?: React.ChangeEventHandler<HTMLTextAreaElement>;
}

export function UTextarea({ label, onChange, onChangeNative, className = '', rows = 3, ...rest }: UTextareaProps) {
  return (
    <div>
      {label && <label className="block text-xs text-white/40 mb-1.5 font-medium">{label}</label>}
      <textarea
        rows={rows}
        {...rest}
        onChange={onChange ? (e) => onChange(e.target.value) : onChangeNative}
        className={`w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] resize-none transition ${className}`}
      />
    </div>
  );
}

// ─── USelect ─────────────────────────────────────────────

interface USelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string;
  onChange?: (value: string) => void;
  onChangeNative?: React.ChangeEventHandler<HTMLSelectElement>;
  options: { value: string; label: string }[];
}

export function USelect({ label, onChange, onChangeNative, options, className = '', ...rest }: USelectProps) {
  return (
    <div>
      {label && <label className="block text-xs text-white/40 mb-1.5 font-medium">{label}</label>}
      <div className="relative">
        <select
          {...rest}
          onChange={onChange ? (e) => onChange(e.target.value) : onChangeNative}
          className={`w-full h-10 pl-3.5 pr-8 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] appearance-none transition ${className}`}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
      </div>
    </div>
  );
}

// ─── UCard ───────────────────────────────────────────────

interface UCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function UCard({ children, className = '', padding = true }: UCardProps) {
  return (
    <div className={`bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ─── UTabs ───────────────────────────────────────────────

interface UTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function UTabs({ tabs, active, onChange, className = '', size = 'md' }: UTabsProps) {
  const sz = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs';
  return (
    <div className={`inline-flex items-center gap-0.5 bg-white/[0.04] rounded-full p-0.5 ${className}`}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`${sz} rounded-full font-medium transition inline-flex items-center gap-1.5 ${
            active === t.id
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-white/30 hover:text-white/50'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── UBadge ──────────────────────────────────────────────

type BadgeVariant = 'default' | 'purple' | 'green' | 'rose' | 'blue';

interface UBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.06] text-white/40 border-white/[0.06]',
  purple: 'bg-[#6e56cf]/10 text-[#a78bfa] border-[#6e56cf]/20',
  green: 'bg-[#00d3a7]/10 text-[#00d3a7] border-[#00d3a7]/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function UBadge({ children, variant = 'default', className = '' }: UBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full border ${BADGE_VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ─── UDivider ────────────────────────────────────────────

export function UDivider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-white/[0.06] ${className}`} />;
}

// ─── USectionTitle ───────────────────────────────────────

export function USectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-bold text-white ${className}`}>{children}</h2>;
}
