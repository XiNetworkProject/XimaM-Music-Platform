import SynauraLogo from '@/components/brand/SynauraLogo';

export default function SynauraEntryLoading({ label = 'Synaura se prépare…' }: { label?: string }) {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[var(--syn-background)] px-6 text-[var(--syn-text-primary)]" aria-busy="true" aria-live="polite">
      <div className="relative text-center">
        <span className="mx-auto flex justify-center py-5">
          <SynauraLogo variant="wordmark" size={52} priority decorative />
        </span>
        <p className="mt-5 text-sm font-black text-[var(--syn-text-secondary)]">{label}</p>
      </div>
    </main>
  );
}
