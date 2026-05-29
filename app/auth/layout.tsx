import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f5ecdf] text-[#171313]">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(255,111,97,0.24),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(124,92,255,0.18),transparent_32%),radial-gradient(circle_at_52%_95%,rgba(0,194,203,0.14),transparent_34%),linear-gradient(135deg,#fffaf2_0%,#f3e6d6_48%,#ead9c4_100%)]" />
      <div className="fixed inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(99,80,59,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(99,80,59,0.16)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="fixed -left-24 top-20 h-72 w-72 rounded-full bg-[#ff6f61]/18 blur-3xl" />
      <div className="fixed -right-28 bottom-10 h-80 w-80 rounded-full bg-[#00c2cb]/14 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-3 sm:p-6">
        {children}
      </div>
    </div>
  );
}
