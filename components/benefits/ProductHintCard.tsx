'use client';
import { ArrowUpRight, Sparkles, X, Zap } from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import type { Hint, HintPlacement } from '@/lib/productHints';
import './product-hints.css';

export default function ProductHintCard({ hint, placement, compact = false, onDismiss, onQuiet, onNavigate }: {
  hint: Hint; placement: HintPlacement; compact?: boolean; onDismiss: () => void; onQuiet: () => void; onNavigate?: (href: string) => void;
}) {
  const Icon = hint.kind === 'boost' ? Zap : Sparkles;
  return <aside className={`syn-hint ${compact ? 'syn-hint--compact' : ''}`} data-kind={hint.kind} data-placement={placement} aria-label={hint.kind === 'membership' ? 'Suggestion d’abonnement Synaura' : 'Conseil boosters Synaura'}>
    <span className="syn-hint-symbol" aria-hidden="true"><Icon size={20} /><i /></span>
    <div className="syn-hint-copy">
      {!compact && <span className="syn-hint-source">{placement === 'messages' ? 'Le petit mot Synaura' : placement === 'notifications' ? 'À découvrir · Synaura' : 'Le petit plus Synaura'}{hint.kind === 'membership' && ' · Abonnements'}</span>}
      {compact ? <Link href={hint.href} title={`${hint.title} ${hint.body}`} aria-label={`${hint.short}. ${hint.cta}`} onClick={event => { if (onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onNavigate(hint.href); } }}><span>{hint.short}</span><ArrowUpRight size={14} /></Link> : <><h3>{hint.title}</h3><p>{hint.body}</p><div className="syn-hint-actions"><Link href={hint.href} onClick={event => { if (onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onNavigate(hint.href); } }}>{hint.cta}<ArrowUpRight size={15} /></Link><button type="button" onClick={onQuiet} title="Masquer toutes les suggestions pendant 30 jours sur cet appareil">Moins de suggestions</button></div></>}
    </div>
    <button type="button" className="syn-hint-dismiss" onClick={onDismiss} aria-label="Masquer ce rappel pendant 14 jours" title="Masquer ce rappel"><X size={15} /></button>
  </aside>;
}
