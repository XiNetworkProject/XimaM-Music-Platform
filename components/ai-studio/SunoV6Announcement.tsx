import { Sparkles } from 'lucide-react';

export default function SunoV6Announcement({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <aside aria-label="Nouveauté Suno V6" className={`flex shrink-0 items-start gap-3 border-y border-[var(--v2-line)] bg-[var(--v2-selected)] px-4 py-3 text-[var(--v2-text)] ${className}`}>
      <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--v2-line)] text-[var(--v2-accent)]"><Sparkles size={15} /></span>
      <div className="min-w-0">
        <p className="text-xs font-semibold"><span className="mr-2 text-[10px] uppercase tracking-[0.16em] text-[var(--v2-accent)]">Nouveau</span>Suno V6 entre dans l’atelier.</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--v2-muted)]">{compact ? 'V6 Mini pour tous. V6 et Wild avec un abonnement.' : 'V6 Mini pour tous, V6 et Wild avec un abonnement. En mode sur mesure, choisis une durée de 10 secondes à 6 minutes.'}</p>
      </div>
    </aside>
  );
}
