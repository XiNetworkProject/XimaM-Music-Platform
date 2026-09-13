'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, Info, Music, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { notificationStore, type SynauraTransientNotification } from '@/lib/ui/notifications';

function Toast({ notification }: { notification: SynauraTransientNotification }) {
  const reduced = useReducedMotion();
  const Icon = notification.type === 'error' || notification.type === 'warning' ? AlertCircle : notification.type === 'success' ? Check : notification.type === 'music' ? Music : Info;
  const isError = notification.type === 'error';
  return <motion.div role={isError ? 'alert' : 'status'} aria-atomic="true"
    initial={reduced ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.15 }}
    className={`relative flex w-full items-start gap-3 rounded-[var(--v2-radius)] border bg-[var(--v2-surface)] p-4 text-[var(--v2-text)] shadow-[var(--v2-shadow)] ${isError ? 'border-[var(--v2-danger)]' : 'border-[var(--v2-line)]'}`}>
    <span className={`grid h-9 w-9 shrink-0 place-items-center ${isError ? 'text-[var(--v2-danger)]' : 'text-[var(--v2-accent)]'}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
    <span className="min-w-0 flex-1"><strong className="block text-sm font-medium">{notification.title}</strong>
      {notification.message ? <span className="mt-0.5 block text-xs leading-5 text-[var(--v2-muted)]">{notification.message}</span> : null}
      {notification.action ? <button type="button" onClick={() => { notification.action?.onClick(); notificationStore.remove(notification.id); }} className="mt-1 min-h-11 text-xs font-medium underline">{notification.action.label}</button> : null}
    </span>
    <button type="button" onClick={() => notificationStore.remove(notification.id)} aria-label="Fermer" className="syn-interactive grid h-11 w-11 shrink-0 place-items-center rounded-[var(--v2-radius-sm)] hover:bg-[var(--v2-raised)]"><X className="h-4 w-4" /></button>
  </motion.div>;
}

export function SynauraToastViewport() {
  const [toasts, setToasts] = useState<SynauraTransientNotification[]>([]);
  useEffect(() => notificationStore.subscribe(setToasts), []);
  return <div aria-label="Notifications temporaires" className="pointer-events-none fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[var(--syn-z-toast)] space-y-2 sm:left-auto sm:right-4 sm:w-[420px]"><AnimatePresence mode="popLayout">{toasts.slice(0, 3).map((toast) => <div key={toast.id} className="pointer-events-auto"><Toast notification={toast} /></div>)}</AnimatePresence></div>;
}
