import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[var(--syn-background)] text-[var(--syn-text-primary)]">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(217,109,99,.24),transparent_30rem),radial-gradient(circle_at_92%_14%,rgba(115,87,198,.25),transparent_34rem),radial-gradient(circle_at_52%_100%,rgba(74,158,170,.18),transparent_38rem)]" />
      <div className="fixed inset-0 opacity-[0.13] [background-image:radial-gradient(currentColor_.55px,transparent_.55px)] [background-size:5px_5px]" />

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center p-3 sm:p-6">
        {children}
      </div>
    </div>
  );
}
