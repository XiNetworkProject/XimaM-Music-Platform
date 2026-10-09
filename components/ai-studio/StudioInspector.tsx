'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';

/** Desktop inspector does not trap focus: composer and collection remain usable. */
export default function StudioInspector({ open, onClose, title, children, resize }: { open: boolean; onClose: () => void; title: string; children: ReactNode; resize?: ReactNode }) {
  const [docked, setDocked] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { const media = matchMedia('(min-width: 1200px)'); const update = () => setDocked(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { if (panel.current) panel.current.inert = !open; }, [open, docked]);
  useEffect(() => {
    if (!open || !docked) return;
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open, docked]);
  if (!docked) return <SynauraOverlay open={open} onClose={onClose} ariaLabel={title} presentation="responsive" size="lg" className="us-detail-overlay">{children}</SynauraOverlay>;
  return <aside ref={panel} className="sc-inspector" data-open={open} aria-hidden={!open} aria-label={`Détails de ${title}`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>{resize}<button ref={close} className="sc-inspector-close" aria-label="Fermer les détails du morceau" onClick={onClose}><X size={18}/></button><div className="sc-inspector-scroll" tabIndex={0}>{open && children}</div></aside>;
}
