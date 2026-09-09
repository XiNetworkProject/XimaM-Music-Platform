import Image from 'next/image';

export default function SynauraEntryLoading({ label = 'Synaura se prépare…' }: { label?: string }) {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[var(--syn-background)] px-6 text-[var(--syn-text-primary)]" aria-busy="true" aria-live="polite">
      <div className="pointer-events-none absolute h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(115,87,198,.38),rgba(74,158,170,.16)_42%,transparent_70%)]" />
      <div className="relative text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-[1.7rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] shadow-[var(--syn-glow-accent)] backdrop-blur-xl">
          <Image src="/favicon.svg" alt="" width={48} height={48} priority />
        </span>
        <p className="mt-5 text-sm font-black text-[var(--syn-text-secondary)]">{label}</p>
      </div>
    </main>
  );
}
