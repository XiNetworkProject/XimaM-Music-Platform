'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { SYNAURA_MOTION } from '@/lib/ui/motion';

type OverlayPresentation = 'modal' | 'drawer-left' | 'drawer-right' | 'sheet' | 'responsive' | 'context-responsive' | 'context-menu';
type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

type OverlayContextValue = {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);
const overlayStack: string[] = [];
let scrollLocks = 0;
let previousOverflow = '';
const backgroundScrollLocks = new Map<HTMLElement, { overflow: string; touchAction: string }>();

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const sizeClasses: Record<OverlaySize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[min(96vw,112rem)]',
};

export interface SynauraOverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  presentation?: OverlayPresentation;
  size?: OverlaySize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showClose?: boolean;
  history?: boolean;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  className?: string;
}

export function SynauraOverlay({
  open,
  onClose,
  children,
  presentation = 'modal',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
  history = false,
  labelledBy,
  describedBy,
  ariaLabel,
  initialFocusRef,
  className = '',
}: SynauraOverlayProps) {
  const reactId = useId();
  const overlayId = `syn-overlay-${reactId.replace(/:/g, '')}`;
  const titleId = `${overlayId}-title`;
  const descriptionId = `${overlayId}-description`;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayStack.push(overlayId);
    if (scrollLocks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.querySelectorAll<HTMLElement>('.app-scroll-container, [data-testid="synaura-scroll-feed"]').forEach((element) => {
        backgroundScrollLocks.set(element, {
          overflow: element.style.overflow,
          touchAction: element.style.touchAction,
        });
        element.style.overflow = 'hidden';
        element.style.touchAction = 'none';
      });
    }
    scrollLocks += 1;

    const focusPanel = window.setTimeout(() => {
      const target = initialFocusRef?.current
        || panelRef.current?.querySelector<HTMLElement>('[data-context-surface-initial-focus]')
        || panelRef.current?.querySelector<HTMLElement>(focusableSelector)
        || panelRef.current;
      target?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (overlayStack.at(-1) !== overlayId) return;
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    let pushedHistory = false;
    const handlePopState = () => {
      if (overlayStack.at(-1) === overlayId) closeRef.current();
    };
    if (history) {
      window.history.pushState({ ...window.history.state, synauraOverlay: overlayId }, '');
      pushedHistory = true;
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.clearTimeout(focusPanel);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      const stackIndex = overlayStack.lastIndexOf(overlayId);
      if (stackIndex >= 0) overlayStack.splice(stackIndex, 1);
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) {
        document.body.style.overflow = previousOverflow;
        backgroundScrollLocks.forEach((styles, element) => {
          element.style.overflow = styles.overflow;
          element.style.touchAction = styles.touchAction;
        });
        backgroundScrollLocks.clear();
      }
      if (pushedHistory && window.history.state?.synauraOverlay === overlayId) window.history.back();
      restoreFocusRef.current?.focus();
    };
  }, [closeOnEscape, history, initialFocusRef, open, overlayId]);

  const resolvedPresentation = presentation === 'responsive' ? 'responsive' : presentation;
  const placement = resolvedPresentation === 'drawer-left'
    ? 'items-stretch justify-start'
    : resolvedPresentation === 'drawer-right'
      ? 'items-stretch justify-end'
      : resolvedPresentation === 'sheet'
        ? 'items-end justify-center'
        : resolvedPresentation === 'context-menu'
          ? 'items-end justify-center md:items-start md:justify-end md:p-5'
        : resolvedPresentation === 'context-responsive'
          ? 'items-end justify-center md:items-stretch md:justify-end'
        : resolvedPresentation === 'responsive'
          ? 'items-end justify-center sm:items-center sm:p-5'
        : 'items-center justify-center p-3 sm:p-5';
  const panelShape = resolvedPresentation.startsWith('drawer')
    ? 'h-full w-[min(92vw,30rem)] rounded-none'
    : resolvedPresentation === 'sheet'
      ? 'max-h-[88dvh] w-full max-w-3xl rounded-t-[var(--syn-radius-xl)] sm:mb-3 sm:rounded-[var(--syn-radius-xl)]'
      : resolvedPresentation === 'context-menu'
        ? 'max-h-[88dvh] w-full rounded-t-[var(--syn-radius-xl)] md:mt-12 md:max-h-[min(80dvh,46rem)] md:w-80 md:rounded-[var(--syn-radius-xl)]'
      : resolvedPresentation === 'context-responsive'
        ? 'max-h-[88dvh] w-full rounded-t-[var(--syn-radius-xl)] pb-[env(safe-area-inset-bottom)] md:h-full md:max-h-none md:w-[clamp(23.75rem,30vw,30rem)] md:max-w-none md:rounded-none md:pb-0'
      : resolvedPresentation === 'responsive'
        ? `max-h-[88dvh] w-full rounded-t-[var(--syn-radius-xl)] sm:max-h-[min(90dvh,56rem)] sm:rounded-[var(--syn-radius-xl)] ${sizeClasses[size]}`
      : `max-h-[min(90dvh,56rem)] w-full rounded-[var(--syn-radius-xl)] ${sizeClasses[size]}`;
  const contextDesktop = resolvedPresentation === 'context-responsive' && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  const x = resolvedPresentation === 'drawer-left' ? -24 : resolvedPresentation === 'drawer-right' || contextDesktop ? 24 : 0;
  const y = resolvedPresentation === 'sheet' || resolvedPresentation === 'responsive' || (resolvedPresentation === 'context-responsive' && !contextDesktop) ? 24 : resolvedPresentation === 'modal' ? 8 : 0;
  const context = useMemo(() => ({ titleId, descriptionId, onClose }), [descriptionId, onClose, titleId]);

  if (typeof document === 'undefined') return null;
  const root = document.getElementById('synaura-overlay-root') || document.body;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`fixed inset-0 z-[var(--syn-z-overlay)] flex ${placement}`}
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reducedMotion ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : SYNAURA_MOTION.duration.fast / 1000 }}
        >
          <div
            aria-hidden="true"
            data-synaura-overlay-backdrop
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <OverlayContext.Provider value={context}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabel ? undefined : labelledBy || titleId}
              aria-describedby={describedBy}
              tabIndex={-1}
              initial={reducedMotion ? false : { opacity: 0, x, y, scale: resolvedPresentation === 'modal' ? 0.98 : 1 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x, y, scale: resolvedPresentation === 'modal' ? 0.98 : 1 }}
              transition={{ duration: reducedMotion ? 0 : SYNAURA_MOTION.duration.standard / 1000, ease: SYNAURA_MOTION.easing.standard }}
              className={`relative z-10 overflow-y-auto border border-[var(--syn-border)] bg-[var(--syn-elevated-surface)] text-[var(--syn-text-primary)] shadow-[var(--syn-shadow-high)] outline-none ${panelShape} ${className}`}
            >
              {showClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer"
                  className="syn-interactive syn-touch-target absolute right-3 top-3 z-10 grid place-items-center rounded-full bg-[var(--syn-soft)] text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft-strong)] hover:text-[var(--syn-text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              {children}
            </motion.div>
          </OverlayContext.Provider>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    root,
  );
}

export const SynauraOverlayTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function SynauraOverlayTitle({ className = '', ...props }, ref) {
    const context = useContext(OverlayContext);
    return <h2 ref={ref} id={context?.titleId} className={`pr-12 text-xl font-black ${className}`} {...props} />;
  },
);

export const SynauraOverlayDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function SynauraOverlayDescription({ className = '', ...props }, ref) {
    const context = useContext(OverlayContext);
    return <p ref={ref} id={context?.descriptionId} className={`text-sm leading-6 text-[var(--syn-text-secondary)] ${className}`} {...props} />;
  },
);

export function SynauraConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <SynauraOverlay open={open} onClose={onClose} size="sm" closeOnBackdrop={!pending} closeOnEscape={!pending}>
      <div className="p-5 sm:p-6">
        <SynauraOverlayTitle>{title}</SynauraOverlayTitle>
        <SynauraOverlayDescription className="mt-2">{description}</SynauraOverlayDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={pending} onClick={onClose} className="syn-interactive min-h-11 rounded-full bg-[var(--syn-soft)] px-5 text-sm font-black disabled:opacity-50">{cancelLabel}</button>
          <button type="button" disabled={pending} onClick={onConfirm} className={`syn-interactive min-h-11 rounded-full px-5 text-sm font-black text-white disabled:opacity-50 ${destructive ? 'bg-[var(--syn-destructive)]' : 'bg-[var(--syn-accent)]'}`}>{pending ? 'En cours…' : confirmLabel}</button>
        </div>
      </div>
    </SynauraOverlay>
  );
}
