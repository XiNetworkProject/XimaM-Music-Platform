import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="v2-personal v2-personal--auth v2-auth-canvas relative min-h-[100svh] w-full overflow-hidden text-[var(--syn-text-primary)]" data-v2-area="auth">
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center p-3 sm:p-6">
        {children}
      </div>
    </div>
  );
}
