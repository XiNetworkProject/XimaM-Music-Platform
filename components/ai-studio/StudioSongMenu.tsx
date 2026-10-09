'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { ArrowLeft, ChevronRight, Download, Folder, Image, Info, Music2, RefreshCw, Share2, SlidersHorizontal } from 'lucide-react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import { STUDIO_TOOLS, type StudioTool } from '@/lib/studio/tools';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';

type Props = {
  open: boolean; track: GeneratedTrack; trashed: boolean; anchor: HTMLButtonElement;
  onClose: () => void; onCompose: (action: 'reuse' | 'remix', track: GeneratedTrack) => void;
  onTool: (action: StudioTool, track: GeneratedTrack) => void;
  onDownload: (track: GeneratedTrack) => void; onShare: (track: GeneratedTrack) => void;
  onInspect: (track: GeneratedTrack) => void;
};

export default function StudioSongMenu(p: Props) {
  const reduced = useReducedMotion();
  const { preferred, constrained } = useLivingMotion();
  const animate = !reduced && preferred && !constrained;
  const [group, setGroup] = useState('');
  const [mobile, setMobile] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(p.onClose);
  closeRef.current = p.onClose;
  const close = (restore = true) => { closeRef.current(); if (restore) p.anchor.focus({ preventScroll: true }); };
  const run = (action: () => void) => { close(); action(); };
  useLayoutEffect(() => {
    const query = window.matchMedia('(max-width: 899px)');
    const update = () => setMobile(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    if (mobile || !p.open) return;
    const place = () => {
      const anchor = p.anchor.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!menu) return;
      setPosition({ left: Math.max(12, Math.min(anchor.right - menu.width, window.innerWidth - menu.width - 12)), top: Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - menu.height - 12)) });
    };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [mobile, group, p.anchor, p.open]);
  useEffect(() => { if (p.open) setGroup(''); }, [p.open]);
  useEffect(() => {
    if (!p.open) return;
    const id = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus());
    return () => cancelAnimationFrame(id);
  }, [group, mobile, p.open]);
  useEffect(() => {
    if (mobile || !p.open) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && !p.anchor.contains(event.target as Node)) closeRef.current(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [mobile, p.anchor, p.open]);
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || (event.key === 'ArrowLeft' && group)) {
      event.preventDefault(); event.stopPropagation(); if (group) setGroup(''); else close();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') || []);
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === 'Tab' && !mobile) { close(); }
  };
  const toolButton = (action: StudioTool) => <button key={action} role="menuitem" onClick={() => run(() => p.onTool(action, p.track))}>{STUDIO_TOOLS.find(tool => tool.id === action)?.label}</button>;
  const content = <motion.div key={group || 'root'} ref={menuRef} className="sw-action-menu" role="menu" aria-label={`${group || 'Actions'} : ${p.track.title}`} onKeyDown={keyboard} initial={animate ? { opacity: 0, x: group ? 8 : -4 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: .16 }}>
    {group ? <>
      <button role="menuitem" className="sw-menu-back" onClick={() => setGroup('')}><ArrowLeft size={16}/>{group}</button>
      {group === 'Remixer' && <><button role="menuitem" onClick={() => run(() => p.onCompose('remix', p.track))}>Faire une reprise / cover</button><button role="menuitem" onClick={() => run(() => p.onCompose('reuse', p.track))}>Réutiliser le prompt & les paroles</button>{toolButton('mashup')}{toolButton('persona')}</>}
      {group === 'Modifier' && (['extend', 'replace', 'vocals', 'instrumental'] as StudioTool[]).map(toolButton)}
      {group === 'Télécharger' && <><button role="menuitem" onClick={() => run(() => p.onDownload(p.track))}><Download size={16}/>Audio original</button>{(['wav', 'stems', 'stems_multi', 'stems_instrument', 'midi', 'recovery'] as StudioTool[]).map(toolButton)}</>}
    </> : <>
      {!p.trashed && <>
        <button role="menuitem" aria-haspopup="menu" onClick={() => setGroup('Remixer')}><RefreshCw size={17}/><span>Remixer</span><ChevronRight size={15}/></button>
        <button role="menuitem" aria-haspopup="menu" onClick={() => setGroup('Modifier')}><SlidersHorizontal size={17}/><span>Modifier</span><ChevronRight size={15}/></button>
        <hr/>
        <button role="menuitem" onClick={() => run(() => p.onShare(p.track))}><Share2 size={17}/><span>Partager</span></button>
        <button role="menuitem" aria-haspopup="menu" onClick={() => setGroup('Télécharger')}><Download size={17}/><span>Télécharger</span><ChevronRight size={15}/></button>
        <button role="menuitem" onClick={() => run(() => p.onTool('cover', p.track))}><Image size={17}/><span>Créer une pochette</span></button>
        <hr/>
      </>}
      <button role="menuitem" onClick={() => run(() => p.onInspect(p.track))}><Info size={17}/><span>{p.trashed ? 'Restaurer cette génération…' : 'Détails & paroles'}</span></button>
      {!p.trashed && <button role="menuitem" onClick={() => run(() => p.onInspect(p.track))}><Folder size={17}/><span>Organiser / publier…</span></button>}
    </>}
  </motion.div>;
  if (mobile) return <SynauraOverlay open={p.open} onClose={() => close()} closeOnEscape={!group} ariaLabel={`Options de ${p.track.title}`} presentation="responsive" size="sm" className="sw-actions-overlay"><div className="sw-mobile-menu-title"><Music2 size={18}/><strong>{p.track.title}</strong></div>{content}</SynauraOverlay>;
  return createPortal(<AnimatePresence>{p.open && <motion.div className="sw-menu-portal" style={{ position: 'fixed', ...position, transformOrigin: 'top right' }} initial={animate ? { opacity: 0, y: -6, scale: .97 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: animate ? -4 : 0 }} transition={{ duration: animate ? .16 : 0 }}>{content}</motion.div>}</AnimatePresence>, document.body);
}
