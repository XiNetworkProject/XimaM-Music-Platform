import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[#07070f]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(139,92,246,0.08),transparent_50%)]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
