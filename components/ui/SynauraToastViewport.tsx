'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Info, Music, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { notificationStore, type SynauraTransientNotification } from '@/lib/ui/notifications';

function Toast({ notification }: { notification: SynauraTransientNotification }) {
  const Icon = notification.type === 'error' || notification.type === 'warning' ? AlertCircle : notification.type === 'success' ? Check : notification.type === 'music' ? Music : Info;
  const isError = notification.type === 'error';
  return <motion.div role={isError ? 'alert' : 'status'} aria-atomic="true" initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }} className={`relative flex w-full items-start gap-3 rounded-[var(--syn-radius-lg)] border p-4 shadow-[var(--syn-shadow-medium)] backdrop-blur-xl ${isError ? 'border-transparent bg-[var(--syn-destructive)] text-white' : 'border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] text-[var(--syn-text-primary)]'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${isError ? 'bg-white/15' : 'bg-[var(--syn-soft)] text-[var(--syn-accent)]'}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><strong className="block text-sm font-black">{notification.title}</strong>{notification.message ? <span className={`mt-0.5 block text-xs leading-5 ${isError ? 'text-white/80' : 'text-[var(--syn-text-secondary)]'}`}>{notification.message}</span> : null}{notification.action ? <button type="button" onClick={() => { notification.action?.onClick(); notificationStore.remove(notification.id); }} className="mt-2 text-xs font-black underline">{notification.action.label}</button> : null}</span><button type="button" onClick={() => notificationStore.remove(notification.id)} aria-label="Fermer" className="syn-interactive grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-black/10"><X className="h-4 w-4" /></button></motion.div>;
}

export function SynauraToastViewport() {
  const [toasts, setToasts] = useState<SynauraTransientNotification[]>([]);
  useEffect(() => notificationStore.subscribe(setToasts), []);
  return <div aria-label="Notifications temporaires" className="pointer-events-none fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[var(--syn-z-toast)] space-y-2 sm:left-auto sm:right-4 sm:w-[420px]"><AnimatePresence mode="popLayout">{toasts.slice(0, 3).map((toast) => <div key={toast.id} className="pointer-events-auto"><Toast notification={toast} /></div>)}</AnimatePresence></div>;
}
